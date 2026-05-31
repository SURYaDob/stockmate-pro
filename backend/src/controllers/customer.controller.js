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
    ];
  }
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: { _count: { select: { sales: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  sendSuccess(res, customers, 'Customers fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      sales: { orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  sendSuccess(res, customer);
});

const create = catchAsync(async (req, res) => {
  const { name, phone, email, address, city, state, pincode, gstNumber, creditLimit } = req.body;

  // Validate Indian phone number
  const phoneRegex = /^(\+91[-\s]?)?[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) throw new AppError('Invalid Indian phone number', 400);

  if (gstNumber) {
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) throw new AppError('Invalid GST number format', 400);
  }

  const customer = await prisma.customer.create({
    data: {
      name, phone, email, address, city, state, pincode, gstNumber,
      creditLimit: creditLimit ? Math.round(creditLimit * 100) : null,
    },
  });

  sendSuccess(res, customer, 'Customer created', 201);
});

const update = catchAsync(async (req, res) => {
  const existing = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Customer not found', 404);

  const { name, phone, email, address, city, state, pincode, gstNumber, creditLimit } = req.body;

  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: {
      name: name || existing.name,
      phone: phone || existing.phone,
      email: email !== undefined ? email : existing.email,
      address: address !== undefined ? address : existing.address,
      city: city !== undefined ? city : existing.city,
      state: state !== undefined ? state : existing.state,
      pincode: pincode !== undefined ? pincode : existing.pincode,
      gstNumber: gstNumber !== undefined ? gstNumber : existing.gstNumber,
      creditLimit: creditLimit !== undefined ? Math.round(creditLimit * 100) : existing.creditLimit,
    },
  });

  sendSuccess(res, customer, 'Customer updated');
});

const getLedger = catchAsync(async (req, res) => {
  const ledger = await prisma.customerLedger.findMany({
    where: { customerId: req.params.id },
    orderBy: { date: 'desc' },
    take: 100,
  });
  sendSuccess(res, ledger);
});

const recordPayment = catchAsync(async (req, res) => {
  const { amount, description } = req.body;
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) throw new AppError('Customer not found', 404);

  const amt = Math.round(amount * 100);
  const lastEntry = await prisma.customerLedger.findFirst({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  const ledgerEntry = await prisma.customerLedger.create({
    data: {
      customerId: req.params.id,
      type: 'PAYMENT',
      amount: -amt,
      balance: (lastEntry?.balance || 0) - amt,
      description: description || 'Payment received',
    },
  });

  await prisma.customer.update({
    where: { id: req.params.id },
    data: { outstanding: { decrement: amt } },
  });

  sendSuccess(res, ledgerEntry, 'Payment recorded');
});

const createCreditNote = catchAsync(async (req, res) => {
  const { amount, description } = req.body;
  const amt = Math.round(amount * 100);
  const lastEntry = await prisma.customerLedger.findFirst({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
  });

  const entry = await prisma.customerLedger.create({
    data: {
      customerId: req.params.id,
      type: 'CREDIT_NOTE',
      amount: -amt,
      balance: (lastEntry?.balance || 0) - amt,
      description: description || 'Credit note issued',
    },
  });

  await prisma.customer.update({
    where: { id: req.params.id },
    data: { outstanding: { decrement: amt } },
  });

  sendSuccess(res, entry, 'Credit note created');
});

const generatePdf = catchAsync(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      sales: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: { select: { quantity: true } } },
      },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);

  const { generateCustomerPDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateCustomerPDF(customer, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=customer-${customer.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

module.exports = { getAll, getById, create, update, getLedger, recordPayment, createCreditNote, generatePdf };
