const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');
const XLSX = require('xlsx');
const { generatePOPDF } = require('../utils/pdf');
const { sendEmail } = require('../utils/mail');

const generatePONumber = async () => {
  const date = new Date();
  const prefix = `PO-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const last = await prisma.purchase.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: 'desc' },
  });
  const num = last ? parseInt(last.poNumber.split('-')[2]) + 1 : 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
};

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, status, startDate, endDate, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (status) where.status = status;
  if (startDate) where.orderDate = { gte: new Date(startDate) };
  if (endDate) where.orderDate = { ...where.orderDate, lte: new Date(endDate) };
  if (search) {
    where.OR = [
      { poNumber: { contains: search } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [purchases, total] = await Promise.all([
    prisma.purchase.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === 'asc' ? 'asc' : 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        supplier: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { item: { select: { id: true, name: true, sku: true } } } },
      },
    }),
    prisma.purchase.count({ where }),
  ]);

  sendSuccess(res, purchases, 'Purchases fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      branch: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      items: { include: { item: { include: { images: { take: 1 } } } } },
    },
  });
  if (!purchase) throw new AppError('Purchase not found', 404);
  sendSuccess(res, purchase);
});

const create = catchAsync(async (req, res) => {
  const { supplierId, items, expectedDate, notes, branchId, paidAmount, paymentMethod, discountType, discountValue } = req.body;
  const targetBranchId = branchId || req.branchId;

  if (!items?.length) throw new AppError('At least one item is required', 400);

  const poNumber = await generatePONumber();
  let subtotal = 0;
  let gstTotal = 0;
  let grandTotal = 0;
  let discountTotal = 0;

  const purchaseItems = [];
  for (const item of items) {
    const inventory = await prisma.inventory.findUnique({ where: { id: item.itemId } });
    if (!inventory) throw new AppError(`Item not found: ${item.itemId}`, 404);

    const qty = parseInt(item.quantity);
    // unitPrice comes from frontend in rupees (e.g., 18.50).
    // If not provided, use inventory.purchasePrice which is already in paise.
    let unitPrice;
    if (item.unitPrice != null && item.unitPrice !== '') {
      unitPrice = Math.round(parseFloat(item.unitPrice) * 100);
    } else {
      unitPrice = inventory.purchasePrice;
    }
    const lineTotal = unitPrice * qty;
    const gstPercent = parseInt((item.gstRate || inventory.gstRate).replace('RATE_', ''));
    const gstAmount = Math.round(lineTotal * gstPercent / 100);

    subtotal += lineTotal;
    gstTotal += gstAmount;
    grandTotal += lineTotal + gstAmount;

    purchaseItems.push({
      itemId: item.itemId,
      quantity: qty,
      unitPrice,
      gstAmount,
      totalPrice: lineTotal + gstAmount,
      gstRate: item.gstRate || inventory.gstRate,
    });
  }

  // Apply overall discount
  if (discountType && discountValue) {
    if (discountType === 'PERCENTAGE') {
      discountTotal = Math.round(subtotal * parseFloat(discountValue) / 100);
    } else if (discountType === 'FLAT') {
      discountTotal = Math.round(parseFloat(discountValue) * 100);
    }
  }

  grandTotal = grandTotal - discountTotal;
  const initialPaid = paidAmount ? Math.round(parseFloat(paidAmount)) : 0;

  const purchase = await prisma.purchase.create({
    data: {
      poNumber,
      supplierId,
      branchId: targetBranchId,
      userId: req.user.id,
      orderDate: new Date(),
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      status: 'ORDERED',
      subtotal,
      discountTotal,
      gstTotal,
      grandTotal,
      paidAmount: initialPaid,
      balanceAmount: grandTotal - initialPaid,
      paymentStatus: initialPaid >= grandTotal ? 'PAID' : initialPaid > 0 ? 'PARTIAL' : 'PENDING',
      paymentMethod: paymentMethod || null,
      discountType: discountType || null,
      discountValue: discountValue ? Math.round(parseFloat(discountValue)) : null,
      notes,
      items: { create: purchaseItems },
    },
    include: { items: true, supplier: true },
  });

  // Update supplier ledger
  const lastEntry = await prisma.supplierLedger.findFirst({
    where: { supplierId },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.supplierLedger.create({
    data: {
      supplierId,
      type: 'PURCHASE',
      amount: grandTotal,
      balance: (lastEntry?.balance || 0) + grandTotal,
      description: `PO ${purchase.poNumber}`,
      referenceId: purchase.id,
    },
  });
  if (initialPaid > 0) {
    await prisma.supplierLedger.create({
      data: {
        supplierId,
        type: 'PAYMENT',
        amount: -initialPaid,
        balance: (lastEntry?.balance || 0) + grandTotal - initialPaid,
        description: `Payment for ${purchase.poNumber}`,
        referenceId: purchase.id,
      },
    });
  }
  await prisma.supplier.update({
    where: { id: supplierId },
    data: { outstanding: { increment: grandTotal - initialPaid } },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase.id,
      newValue: JSON.stringify({ poNumber, grandTotal, paidAmount: initialPaid, discountTotal }),
    },
  });

  sendSuccess(res, purchase, 'Purchase order created', 201);
});

const update = catchAsync(async (req, res) => {
  const { notes, status } = req.body;
  const purchase = await prisma.purchase.update({
    where: { id: req.params.id },
    data: { notes, status },
  });
  sendSuccess(res, purchase, 'Purchase updated');
});

const receiveStock = catchAsync(async (req, res) => {
  const { items } = req.body;
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!purchase) throw new AppError('Purchase not found', 404);

  await prisma.$transaction(async (tx) => {
    for (const received of items) {
      const poItem = purchase.items.find((i) => i.itemId === received.itemId);
      if (!poItem) throw new AppError(`Item not in PO: ${received.itemId}`, 400);

      const newReceived = poItem.receivedQty + parseInt(received.quantity);
      if (newReceived > poItem.quantity) {
        throw new AppError('Received quantity exceeds ordered quantity', 400);
      }

      await tx.purchaseItem.update({
        where: { id: poItem.id },
        data: { receivedQty: newReceived },
      });

      // Update inventory
      const inventory = await tx.inventory.findUnique({ where: { id: received.itemId } });
      await tx.inventory.update({
        where: { id: received.itemId },
        data: {
          currentStock: { increment: parseInt(received.quantity) },
          lastMovement: new Date(),
        },
      });

      await tx.stockMovement.create({
        data: {
          itemId: received.itemId,
          type: 'IN',
          quantity: parseInt(received.quantity),
          reason: `Purchase receipt - ${purchase.poNumber}`,
          reference: purchase.poNumber,
          oldStock: inventory.currentStock,
          newStock: inventory.currentStock + parseInt(received.quantity),
          createdById: req.user.id,
        },
      });
    }

    // Update PO status
    const updatedItems = await tx.purchaseItem.findMany({ where: { purchaseId: purchase.id } });
    const allReceived = updatedItems.every((i) => i.receivedQty >= i.quantity);
    const anyReceived = updatedItems.some((i) => i.receivedQty > 0);

    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL' : 'ORDERED' },
    });
  });

  sendSuccess(res, null, 'Stock received successfully');
});

const returnToSupplier = catchAsync(async (req, res) => {
  const { items, reason } = req.body;
  const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id }, include: { items: true } });
  if (!purchase) throw new AppError('Purchase not found', 404);

  let totalReturn = 0;
  await prisma.$transaction(async (tx) => {
    for (const returnItem of items) {
      const poItem = purchase.items.find((i) => i.itemId === returnItem.itemId);
      if (!poItem) throw new AppError('Item not in purchase', 400);

      const inventory = await tx.inventory.findUnique({ where: { id: returnItem.itemId } });
      const qty = parseInt(returnItem.quantity);
      const refund = poItem.unitPrice * qty;

      await tx.inventory.update({
        where: { id: returnItem.itemId },
        data: { currentStock: { decrement: qty }, lastMovement: new Date() },
      });

      await tx.stockMovement.create({
        data: {
          itemId: returnItem.itemId,
          type: 'RETURN',
          quantity: qty,
          reason: `Return to supplier - ${reason || 'Defective'}`,
          reference: purchase.poNumber,
          oldStock: inventory.currentStock,
          newStock: inventory.currentStock - qty,
        },
      });

      await tx.purchaseItem.update({
        where: { id: poItem.id },
        data: { receivedQty: { decrement: qty } },
      });

      totalReturn += refund;
    }

    // Create debit note
    const lastEntry = await tx.supplierLedger.findFirst({
      where: { supplierId: purchase.supplierId },
      orderBy: { createdAt: 'desc' },
    });
    await tx.supplierLedger.create({
      data: {
        supplierId: purchase.supplierId,
        type: 'DEBIT_NOTE',
        amount: -totalReturn,
        balance: (lastEntry?.balance || 0) - totalReturn,
        description: `Return to supplier - ${purchase.poNumber}`,
        referenceId: purchase.id,
      },
    });
  });

  sendSuccess(res, null, 'Return processed successfully');
});

const recordPayment = catchAsync(async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const purchase = await prisma.purchase.findUnique({ where: { id: req.params.id } });
  if (!purchase) throw new AppError('Purchase not found', 404);

  const newPaid = purchase.paidAmount + amount;
  const newBalance = purchase.grandTotal - newPaid;

  const updated = await prisma.purchase.update({
    where: { id: req.params.id },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBalance,
      paymentStatus: newBalance <= 0 ? 'PAID' : 'PARTIAL',
      paymentMethod: paymentMethod || purchase.paymentMethod,
    },
  });

  // Update supplier ledger
  const lastEntry = await prisma.supplierLedger.findFirst({
    where: { supplierId: purchase.supplierId },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.supplierLedger.create({
    data: {
      supplierId: purchase.supplierId,
      type: 'PAYMENT',
      amount: -amount,
      balance: (lastEntry?.balance || 0) - amount,
      description: `Payment for ${purchase.poNumber}`,
      referenceId: purchase.id,
    },
  });
  await prisma.supplier.update({
    where: { id: purchase.supplierId },
    data: { outstanding: { decrement: amount } },
  });

  sendSuccess(res, updated, 'Payment recorded');
});

const exportExcel = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const where = {};
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = purchases.map((p) => ({
    'PO No': p.poNumber,
    Date: new Date(p.orderDate).toLocaleDateString('en-IN'),
    Supplier: p.supplier.name,
    Status: p.status,
    Subtotal: (p.subtotal / 100).toFixed(2),
    GST: (p.gstTotal / 100).toFixed(2),
    'Grand Total': (p.grandTotal / 100).toFixed(2),
    Paid: (p.paidAmount / 100).toFixed(2),
    Balance: (p.balanceAmount / 100).toFixed(2),
    'Payment Status': p.paymentStatus,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=purchases-${Date.now()}.xlsx`);
  res.send(buffer);
});

const generatePdf = catchAsync(async (req, res) => {
  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      branch: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      items: { include: { item: true } },
    },
  });
  if (!purchase) throw new AppError('Purchase not found', 404);

  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generatePOPDF(purchase, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=PO-${purchase.poNumber}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

const emailPO = catchAsync(async (req, res) => {
  const { to, note } = req.body;
  if (!to) throw new AppError('Recipient email is required', 400);

  const purchase = await prisma.purchase.findUnique({
    where: { id: req.params.id },
    include: {
      supplier: true,
      branch: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      items: { include: { item: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!purchase) throw new AppError('Purchase not found', 404);

  // Fetch company profile for PDF header
  const companyProfile = await prisma.companyProfile.findFirst();

  // Generate PDF with company profile
  const pdfBuffer = await generatePOPDF(purchase, companyProfile);

  // Send email
  const subject = `Purchase Order ${purchase.poNumber} from ${purchase.branch?.name || 'StockMate Pro'}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">Purchase Order</h1>
        <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 14px;">${purchase.poNumber}</p>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">Dear ${purchase.supplier?.name || 'Supplier'},</p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Please find attached Purchase Order <strong>${purchase.poNumber}</strong>
          dated ${new Date(purchase.orderDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Status</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0; font-weight: 600;">${purchase.status}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Items</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">${purchase.items?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Grand Total</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0; font-weight: 600;">₹${(purchase.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${purchase.expectedDate ? `<tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Expected Delivery</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">${new Date(purchase.expectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
          </tr>` : ''}
        </table>
        ${note ? `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 12px;"><strong>Note:</strong> ${note}</p>` : ''}
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 16px;">
          Please review the attached PO and confirm receipt at your earliest convenience.
        </p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 16px;">
          Regards,<br>
          <strong>${purchase.user ? purchase.user.firstName + ' ' + purchase.user.lastName : 'StockMate Pro'}</strong><br>
          ${purchase.branch?.name || 'StockMate Pro'}
          ${purchase.branch?.phone ? `| ${purchase.branch.phone}` : ''}
        </p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 12px;">
        This is an automated email from StockMate Pro. Please do not reply directly to this message.
      </p>
    </div>
  `;

  await sendEmail({
    to,
    subject,
    html,
    attachments: [{ filename: `PO-${purchase.poNumber}.pdf`, content: pdfBuffer }],
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'EMAIL',
      entity: 'Purchase',
      entityId: purchase.id,
      newValue: JSON.stringify({ emailedTo: to, poNumber: purchase.poNumber }),
    },
  });

  sendSuccess(res, null, `PO emailed to ${to}`);
});

module.exports = { getAll, getById, create, update, receiveStock, returnToSupplier, recordPayment, exportExcel, generatePdf, emailPO };
