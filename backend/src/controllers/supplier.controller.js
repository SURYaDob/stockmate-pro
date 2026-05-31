const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search, isActive } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: { _count: { select: { purchases: true } } },
    }),
    prisma.supplier.count({ where }),
  ]);

  sendSuccess(res, suppliers, 'Suppliers fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      purchases: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      items: { include: { item: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!supplier) throw new AppError('Supplier not found', 404);
  sendSuccess(res, supplier);
});

const create = catchAsync(async (req, res) => {
  const { name, gstNumber, contactPerson, phone, email, address, city, state, pincode, bankName, bankAccount, bankIfsc, paymentTerms, creditLimit } = req.body;

  // Validate GST
  if (gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) throw new AppError('Invalid GST number format', 400);
  }

  const supplier = await prisma.supplier.create({
    data: {
      name, gstNumber, contactPerson, phone, email, address, city, state, pincode,
      bankName, bankAccount, bankIfsc, paymentTerms,
      creditLimit: creditLimit ? Math.round(creditLimit * 100) : null,
    },
  });

  await prisma.auditLog.create({
    data: { userId: req.user.id, action: 'CREATE', entity: 'Supplier', entityId: supplier.id, newValue: { name } },
  });

  sendSuccess(res, supplier, 'Supplier created', 201);
});

const update = catchAsync(async (req, res) => {
  const existing = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Supplier not found', 404);

  const { name, gstNumber, contactPerson, phone, email, address, city, state, pincode, bankName, bankAccount, bankIfsc, paymentTerms, creditLimit } = req.body;

  if (gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) throw new AppError('Invalid GST number format', 400);
  }

  const supplier = await prisma.supplier.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      gstNumber: gstNumber !== undefined ? gstNumber : existing.gstNumber,
      contactPerson: contactPerson !== undefined ? contactPerson : existing.contactPerson,
      phone: phone || existing.phone,
      email: email !== undefined ? email : existing.email,
      address: address !== undefined ? address : existing.address,
      city: city !== undefined ? city : existing.city,
      state: state !== undefined ? state : existing.state,
      pincode: pincode !== undefined ? pincode : existing.pincode,
      bankName: bankName !== undefined ? bankName : existing.bankName,
      bankAccount: bankAccount !== undefined ? bankAccount : existing.bankAccount,
      bankIfsc: bankIfsc !== undefined ? bankIfsc : existing.bankIfsc,
      paymentTerms: paymentTerms !== undefined ? paymentTerms : existing.paymentTerms,
      creditLimit: creditLimit !== undefined ? Math.round(creditLimit * 100) : existing.creditLimit,
    },
  });

  sendSuccess(res, supplier, 'Supplier updated');
});

const getLedger = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, startDate, endDate, type } = req.query;
  const where = { supplierId: req.params.id };

  if (startDate) where.date = { gte: new Date(startDate) };
  if (endDate) where.date = { ...where.date, lte: new Date(endDate + 'T23:59:59.999Z') };
  if (type) where.type = type;

  const [ledger, total] = await Promise.all([
    prisma.supplierLedger.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
    }),
    prisma.supplierLedger.count({ where }),
  ]);

  sendSuccess(res, ledger, 'Ledger fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const recordPayment = catchAsync(async (req, res) => {
  const { amount, description } = req.body;
  const supplier = await prisma.supplier.findUnique({ where: { id: req.params.id } });
  if (!supplier) throw new AppError('Supplier not found', 404);

  const amt = Math.round(amount * 100);
  const lastEntry = await prisma.supplierLedger.findFirst({
    where: { supplierId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  const ledgerEntry = await prisma.supplierLedger.create({
    data: {
      supplierId: req.params.id,
      type: 'PAYMENT',
      amount: -amt,
      balance: (lastEntry?.balance || 0) - amt,
      description: description || 'Payment made',
    },
  });

  await prisma.supplier.update({
    where: { id: req.params.id },
    data: { outstanding: { decrement: amt } },
  });

  sendSuccess(res, ledgerEntry, 'Payment recorded');
});

const createDebitNote = catchAsync(async (req, res) => {
  const { amount, description } = req.body;
  const amt = Math.round(amount * 100);
  const lastEntry = await prisma.supplierLedger.findFirst({
    where: { supplierId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  const entry = await prisma.supplierLedger.create({
    data: {
      supplierId: req.params.id,
      type: 'DEBIT_NOTE',
      amount: -amt,
      balance: (lastEntry?.balance || 0) - amt,
      description: description || 'Debit note',
    },
  });

  await prisma.supplier.update({
    where: { id: req.params.id },
    data: { outstanding: { decrement: amt } },
  });

  sendSuccess(res, entry, 'Debit note created');
});

const generatePdf = catchAsync(async (req, res) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id: req.params.id },
    include: {
      purchases: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
  if (!supplier) throw new AppError('Supplier not found', 404);

  const { generateSupplierPDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateSupplierPDF(supplier, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=supplier-${supplier.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

const exportPdf = catchAsync(async (req, res) => {
  const { search, isActive } = req.query;
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      phone: true,
      email: true,
      outstanding: true,
      isActive: true,
    },
  });

  const { generateSupplierListPDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateSupplierListPDF(suppliers, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=supplier-list-${Date.now()}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

module.exports = { getAll, getById, create, update, getLedger, recordPayment, createDebitNote, generatePdf, exportPdf };
