const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');
const PDFDocument = require('pdfkit');
const { generateInvoicePDF } = require('../utils/pdf');
const { sendEmail } = require('../utils/mail');
const { sendToUser } = require('../services/pushNotification.service');
const { notifyUsersAboutLowStock } = require('../services/emailNotification.service');

const generateInvoiceNo = async () => {
  const date = new Date();
  const prefix = `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const last = await prisma.sale.findFirst({
    where: { invoiceNo: { startsWith: prefix } },
    orderBy: { invoiceNo: 'desc' },
  });
  const num = last ? parseInt(last.invoiceNo.split('-')[2]) + 1 : 1;
  return `${prefix}-${String(num).padStart(4, '0')}`;
};

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, startDate, endDate, search, paymentStatus } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, firstName: true, lastName: true } },
        items: { include: { item: { select: { id: true, name: true, sku: true } } } },
      },
    }),
    prisma.sale.count({ where }),
  ]);

  sendSuccess(res, sales, 'Sales fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      branch: true,
      items: {
        include: { item: { include: { images: { take: 1, where: { isPrimary: true } } } } },
      },
    },
  });
  if (!sale) throw new AppError('Sale not found', 404);
  sendSuccess(res, sale);
});

const create = catchAsync(async (req, res) => {
  const { customerId, items, paymentMethod, paidAmount, discountType, discountValue, notes, branchId } = req.body;
  const targetBranchId = branchId || req.branchId;

  if (!items?.length) throw new AppError('At least one item is required', 400);

  const invoiceNo = await generateInvoiceNo();
  let subtotal = 0;
  let discountTotal = 0;
  let gstTotal = 0;

  const saleItems = [];

  for (const item of items) {
    const inventory = await prisma.inventory.findUnique({ where: { id: item.itemId } });
    if (!inventory) throw new AppError(`Item ${item.itemId} not found`, 404);
    if (inventory.currentStock < item.quantity) {
      throw new AppError(`Insufficient stock for ${inventory.name}`, 400);
    }

    const unitPrice = inventory.sellingPrice;
    const qty = item.quantity;
    const lineTotal = unitPrice * qty;
    const itemDiscount = item.discount || 0;
    const gstPercent = parseInt(inventory.gstRate.replace('RATE_', ''));
    const gstAmount = Math.round((lineTotal - itemDiscount) * gstPercent / 100);

    subtotal += lineTotal;
    discountTotal += itemDiscount;
    gstTotal += gstAmount;

    saleItems.push({
      itemId: item.itemId,
      quantity: qty,
      unitPrice,
      discount: itemDiscount,
      gstAmount,
      totalPrice: lineTotal - itemDiscount + gstAmount,
      gstRate: inventory.gstRate,
    });
  }

  // Apply overall discount
  let finalDiscount = 0;
  if (discountType === 'PERCENTAGE' && discountValue) {
    finalDiscount = Math.round(subtotal * discountValue / 100);
  } else if (discountType === 'FLAT' && discountValue) {
    finalDiscount = discountValue;
  }

  const grandTotal = subtotal - finalDiscount + gstTotal;
  const paidAmt = paidAmount || 0;
  const balanceAmt = grandTotal - paidAmt;

  const sale = await prisma.$transaction(async (tx) => {
    // Create sale
    const newSale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: customerId || null,
        branchId: targetBranchId,
        userId: req.user.id,
        subtotal,
        discountTotal: finalDiscount,
        gstTotal,
        grandTotal,
        paidAmount: paidAmt,
        balanceAmount: balanceAmt,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: balanceAmt <= 0 ? 'PAID' : paidAmt > 0 ? 'PARTIAL' : 'PENDING',
        discountType: discountType || null,
        discountValue: discountValue || null,
        notes,
        items: { create: saleItems },
      },
      include: { items: true },
    });

    // Update stock
    for (const item of items) {
      const inventory = await tx.inventory.findUnique({ where: { id: item.itemId } });
      await tx.inventory.update({
        where: { id: item.itemId },
        data: {
          currentStock: { decrement: item.quantity },
          lastMovement: new Date(),
        },
      });
      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          branchId: targetBranchId,
          type: 'OUT',
          quantity: item.quantity,
          reason: 'Sale',
          reference: newSale.invoiceNo,
          oldStock: inventory.currentStock,
          newStock: inventory.currentStock - item.quantity,
          createdById: req.user.id,
        },
      });
    }

    // Update customer ledger
    if (customerId) {
      const lastEntry = await tx.customerLedger.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      await tx.customerLedger.create({
        data: {
          customerId,
          type: 'SALE',
          amount: grandTotal,
          balance: (lastEntry?.balance || 0) + grandTotal,
          description: `Invoice ${newSale.invoiceNo}`,
          referenceId: newSale.id,
        },
      });
      await tx.customer.update({
        where: { id: customerId },
        data: { outstanding: { increment: grandTotal } },
      });
    }

    return newSale;
  });

  // Check for low stock notifications
  const lowStockItems = [];
  for (const item of items) {
    const inventory = await prisma.inventory.findUnique({ where: { id: item.itemId } });
    if (inventory && inventory.currentStock <= inventory.minStock) {
      const notification = await prisma.notification.create({
        data: {
          userId: req.user.id,
          title: 'Low Stock Alert',
          message: `${inventory.name} (${inventory.sku}) has only ${inventory.currentStock} units remaining`,
          type: 'LOW_STOCK',
          reference: inventory.id,
        },
      });
      // Send push notification (non-blocking)
      sendToUser(req.user.id, notification).catch(() => {});
      // Collect for email notification
      lowStockItems.push({
        name: inventory.name,
        sku: inventory.sku,
        currentStock: inventory.currentStock,
        minStock: inventory.minStock,
        sellingPrice: inventory.sellingPrice,
      });
    }
  }
  // Send email notification to all users with emailNotify enabled (non-blocking)
  if (lowStockItems.length > 0) {
    notifyUsersAboutLowStock(lowStockItems).catch(() => {});
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      newValue: { invoiceNo, grandTotal },
    },
  });

  sendSuccess(res, sale, 'Sale created successfully', 201);
});

const createReturn = catchAsync(async (req, res) => {
  const { items, reason } = req.body;
  const originalSale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  });
  if (!originalSale) throw new AppError('Original sale not found', 404);

  const invoiceNo = `R${originalSale.invoiceNo}`;
  let totalReturn = 0;

  const returnItems = [];
  for (const returnItem of items) {
    const originalItem = originalSale.items.find((i) => i.itemId === returnItem.itemId);
    if (!originalItem) throw new AppError(`Item not in original sale`, 400);
    if (returnItem.quantity > originalItem.quantity) {
      throw new AppError('Return quantity exceeds original quantity', 400);
    }

    const refundAmount = originalItem.totalPrice * returnItem.quantity / originalItem.quantity;
    totalReturn += refundAmount;

    returnItems.push({
      itemId: returnItem.itemId,
      quantity: returnItem.quantity,
      unitPrice: originalItem.unitPrice,
      discount: Math.round(originalItem.discount * returnItem.quantity / originalItem.quantity),
      gstAmount: Math.round(originalItem.gstAmount * returnItem.quantity / originalItem.quantity),
      totalPrice: Math.round(refundAmount),
      gstRate: originalItem.gstRate,
    });
  }

  const returnSale = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: originalSale.customerId,
        branchId: originalSale.branchId,
        userId: req.user.id,
        subtotal: Math.round(totalReturn),
        grandTotal: Math.round(totalReturn),
        paidAmount: Math.round(totalReturn),
        paymentStatus: 'PAID',
        notes: `Return for ${originalSale.invoiceNo} - ${reason || 'Customer return'}`,
        isReturn: true,
        returnOfId: originalSale.id,
        items: { create: returnItems },
      },
    });

    // Restore stock
    for (const item of items) {
      const inventory = await tx.inventory.findUnique({ where: { id: item.itemId } });
      await tx.inventory.update({
        where: { id: item.itemId },
        data: { currentStock: { increment: item.quantity }, lastMovement: new Date() },
      });
      await tx.stockMovement.create({
        data: {
          itemId: item.itemId,
          type: 'RETURN',
          quantity: item.quantity,
          reason: `Sale return - ${originalSale.invoiceNo}`,
          reference: invoiceNo,
          oldStock: inventory.currentStock,
          newStock: inventory.currentStock + item.quantity,
        },
      });
    }

    return sale;
  });

  sendSuccess(res, returnSale, 'Return processed successfully', 201);
});

const recordPayment = catchAsync(async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const sale = await prisma.sale.findUnique({ where: { id: req.params.id } });
  if (!sale) throw new AppError('Sale not found', 404);

  const newPaid = sale.paidAmount + amount;
  const newBalance = sale.grandTotal - newPaid;

  const updated = await prisma.sale.update({
    where: { id: req.params.id },
    data: {
      paidAmount: newPaid,
      balanceAmount: newBalance,
      paymentMethod: paymentMethod || sale.paymentMethod,
      paymentStatus: newBalance <= 0 ? 'PAID' : 'PARTIAL',
    },
  });

  // Update customer ledger
  if (sale.customerId) {
    const lastEntry = await prisma.customerLedger.findFirst({
      where: { customerId: sale.customerId },
      orderBy: { createdAt: 'desc' },
    });
    await prisma.customerLedger.create({
      data: {
        customerId: sale.customerId,
        type: 'PAYMENT',
        amount: -amount,
        balance: (lastEntry?.balance || 0) - amount,
        description: `Payment received for ${sale.invoiceNo}`,
        referenceId: sale.id,
      },
    });
    await prisma.customer.update({
      where: { id: sale.customerId },
      data: { outstanding: { decrement: amount } },
    });
  }

  sendSuccess(res, updated, 'Payment recorded');
});

const getRegisterData = catchAsync(async (req, res) => {
  const { startDate, endDate, search, paymentStatus } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (search) {
    where.OR = [
      { invoiceNo: { contains: search } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const sales = await prisma.sale.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      items: { include: { item: { select: { id: true, name: true, sku: true } } } },
    },
  });

  sendSuccess(res, sales, 'Register data fetched');
});

const getDailySummary = catchAsync(async (req, res) => {
  const branchId = req.branchId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      createdAt: { gte: today, lt: tomorrow },
      isReturn: false,
    },
  });

  const summary = {
    totalSales: sales.length,
    totalAmount: sales.reduce((sum, s) => sum + s.grandTotal, 0),
    totalPaid: sales.reduce((sum, s) => sum + s.paidAmount, 0),
    totalPending: sales.reduce((sum, s) => sum + s.balanceAmount, 0),
    cashSales: sales.filter((s) => s.paymentMethod === 'CASH').length,
    upiSales: sales.filter((s) => s.paymentMethod === 'UPI').length,
    cardSales: sales.filter((s) => s.paymentMethod === 'CARD').length,
    creditSales: sales.filter((s) => s.paymentMethod === 'CREDIT').length,
  };

  sendSuccess(res, summary);
});

const generatePdf = catchAsync(async (req, res) => {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      branch: true,
      items: { include: { item: true } },
    },
  });
  if (!sale) throw new AppError('Sale not found', 404);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=invoice-${sale.invoiceNo}.pdf`);
  doc.pipe(res);

  // Header
  doc.fontSize(24).font('Helvetica-Bold').text('STOCKMATE PRO', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(sale.branch.name || 'Your Store Name', { align: 'center' });
  doc.text(sale.branch.address || '123, Main Street, City - 400001', { align: 'center' });
  doc.text(`GST: ${sale.branch.gstNumber || 'N/A'}`, { align: 'center' });
  doc.moveDown();

  // Invoice details
  doc.fontSize(16).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
  doc.moveDown(0.5);

  const topLeftX = 50;
  const topRightX = 350;

  doc.fontSize(10).font('Helvetica');
  doc.text(`Invoice No: ${sale.invoiceNo}`, topLeftX);
  doc.text(`Date: ${new Date(sale.createdAt).toLocaleDateString('en-IN')}`, topLeftX);
  doc.text(`Payment: ${sale.paymentMethod}`, topLeftX);

  if (sale.customer) {
    doc.text(`Bill To:`, topRightX);
    doc.text(sale.customer.name, topRightX);
    doc.text(sale.customer.phone, topRightX);
    if (sale.customer.gstNumber) doc.text(`GST: ${sale.customer.gstNumber}`, topRightX);
  }
  doc.moveDown(2);

  // Table header
  const tableTop = doc.y;
  const colWidths = [30, 200, 50, 70, 70, 70];
  const startX = 50;

  doc.fontSize(9).font('Helvetica-Bold');
  ['#', 'Item', 'Qty', 'Rate', 'GST', 'Total'].forEach((header, i) => {
    doc.text(header, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), tableTop, {
      width: colWidths[i], align: i > 1 ? 'right' : 'left',
    });
  });

  doc.moveDown(0.5);
  doc
    .moveTo(startX, doc.y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), doc.y)
    .stroke();

  let y = doc.y + 5;
  doc.font('Helvetica').fontSize(9);

  sale.items.forEach((item, i) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }
    doc.text(String(i + 1), startX, y, { width: colWidths[0] });
    doc.text(item.item.name, startX + colWidths[0], y, { width: colWidths[1] });
    doc.text(String(item.quantity), startX + colWidths[0] + colWidths[1], y, { width: colWidths[2], align: 'right' });
    doc.text(`₹${(item.unitPrice / 100).toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2], y, { width: colWidths[3], align: 'right' });
    doc.text(`₹${(item.gstAmount / 100).toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y, { width: colWidths[4], align: 'right' });
    doc.text(`₹${(item.totalPrice / 100).toFixed(2)}`, startX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y, { width: colWidths[5], align: 'right' });
    y += 18;
  });

  // Totals
  y += 10;
  doc
    .moveTo(startX, y)
    .lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y)
    .stroke();
  y += 5;

  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Subtotal:', startX + 300, y, { width: 80, align: 'right' });
  doc.text(`₹${(sale.subtotal / 100).toFixed(2)}`, startX + 380, y, { width: 90, align: 'right' });
  y += 18;

  if (sale.discountTotal > 0) {
    doc.text('Discount:', startX + 300, y, { width: 80, align: 'right' });
    doc.text(`-₹${(sale.discountTotal / 100).toFixed(2)}`, startX + 380, y, { width: 90, align: 'right' });
    y += 18;
  }

  doc.text('GST:', startX + 300, y, { width: 80, align: 'right' });
  doc.text(`₹${(sale.gstTotal / 100).toFixed(2)}`, startX + 380, y, { width: 90, align: 'right' });
  y += 18;

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Grand Total:', startX + 300, y, { width: 80, align: 'right' });
  doc.text(`₹${(sale.grandTotal / 100).toFixed(2)}`, startX + 380, y, { width: 90, align: 'right' });
  y += 18;

  doc.fontSize(9).font('Helvetica');
  doc.text(`Amount in words: ${numberToWords(sale.grandTotal / 100)}`, startX, y + 20);
  doc.text(`Paid: ₹${(sale.paidAmount / 100).toFixed(2)} | Balance: ₹${(sale.balanceAmount / 100).toFixed(2)}`, startX, y + 35);

  // Footer
  doc.fontSize(8).text('This is a computer-generated invoice', 50, 780, { align: 'center' });

  doc.end();
});

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n) => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  const [rupees, paise] = num.toFixed(2).split('.');
  let words = convert(parseInt(rupees)) + ' Rupees';
  if (parseInt(paise) > 0) words += ' and ' + convert(parseInt(paise)) + ' Paise';
  return words + ' Only';
};

const exportExcel = catchAsync(async (req, res) => {
  const XLSX = require('xlsx');
  const { startDate, endDate } = req.query;

  const where = {};
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, items: { include: { item: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const data = sales.map((s) => ({
    'Invoice No': s.invoiceNo,
    Date: new Date(s.createdAt).toLocaleDateString('en-IN'),
    Customer: s.customer?.name || 'Walk-in',
    'Items Count': s.items.length,
    Subtotal: (s.subtotal / 100).toFixed(2),
    Discount: (s.discountTotal / 100).toFixed(2),
    GST: (s.gstTotal / 100).toFixed(2),
    'Grand Total': (s.grandTotal / 100).toFixed(2),
    Paid: (s.paidAmount / 100).toFixed(2),
    Balance: (s.balanceAmount / 100).toFixed(2),
    Payment: s.paymentMethod,
    Status: s.paymentStatus,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sales');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=sales-${Date.now()}.xlsx`);
  res.send(buffer);
});

const emailInvoice = catchAsync(async (req, res) => {
  const { to, note } = req.body;
  if (!to) throw new AppError('Recipient email is required', 400);

  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      customer: true,
      branch: true,
      user: { select: { id: true, firstName: true, lastName: true } },
      items: { include: { item: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!sale) throw new AppError('Sale not found', 404);

  // Fetch company profile for PDF header
  const companyProfile = await prisma.companyProfile.findFirst();

  // Generate PDF with company profile
  const pdfBuffer = await generateInvoicePDF(sale, companyProfile);

  // Send email
  const subject = `Invoice ${sale.invoiceNo} from ${sale.branch?.name || 'StockMate Pro'}`;
  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">Tax Invoice</h1>
        <p style="color: #a7f3d0; margin: 4px 0 0 0; font-size: 14px;">${sale.invoiceNo}</p>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          ${sale.customer ? `Dear ${sale.customer.name},` : 'Hello,'}
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          Thank you for your purchase! Please find attached the invoice
          <strong>${sale.invoiceNo}</strong>
          dated ${new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Payment Status</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0; font-weight: 600;">${sale.paymentStatus}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Payment Method</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">${sale.paymentMethod?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'CASH'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Items</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">${sale.items?.length || 0}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Grand Total</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0; font-weight: 600;">₹${(sale.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Paid Amount</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #334155; border: 1px solid #e2e8f0;">₹${(sale.paidAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
          ${sale.balanceAmount > 0 ? `<tr>
            <td style="padding: 8px 12px; background: #f8fafc; font-size: 13px; color: #64748b; border: 1px solid #e2e8f0;">Balance Due</td>
            <td style="padding: 8px 12px; font-size: 13px; color: #d97706; border: 1px solid #e2e8f0; font-weight: 600;">₹${(sale.balanceAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>` : ''}
        </table>
        ${note ? `<p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 12px;"><strong>Note:</strong> ${note}</p>` : ''}
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 16px;">
          Regards,<br>
          <strong>${sale.user ? sale.user.firstName + ' ' + sale.user.lastName : 'StockMate Pro'}</strong><br>
          ${sale.branch?.name || 'StockMate Pro'}
          ${sale.branch?.phone ? `| ${sale.branch.phone}` : ''}
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
    attachments: [{ filename: `Invoice-${sale.invoiceNo}.pdf`, content: pdfBuffer }],
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'EMAIL',
      entity: 'Sale',
      entityId: sale.id,
      newValue: { emailedTo: to, invoiceNo: sale.invoiceNo },
    },
  });

  sendSuccess(res, null, `Invoice emailed to ${to}`);
});

const update = catchAsync(async (req, res) => {
  const { notes, paymentStatus } = req.body;
  const sale = await prisma.sale.update({
    where: { id: req.params.id },
    data: { notes, paymentStatus },
  });
  sendSuccess(res, sale, 'Sale updated');
});

module.exports = { getAll, getById, create, createReturn, recordPayment, getRegisterData, getDailySummary, generatePdf, exportExcel, emailInvoice, update };
