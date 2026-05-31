const { prisma } = require('../utils/prisma');
const { AppError, catchAsync } = require('../middleware/error.middleware');
const { sendSuccess, getPagination } = require('../utils/response');

const getAll = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, category, startDate, endDate } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (category) where.category = category;
  if (startDate) where.date = { gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.date = { ...where.date, lte: end };
  }

  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.expense.count({ where }),
  ]);

  const summary = {
    total: expenses.reduce((s, e) => s + e.amount, 0),
    byCategory: expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {}),
  };

  sendSuccess(res, { expenses, summary }, 'Expenses fetched', 200, getPagination(total, parseInt(page), parseInt(limit)));
});

const getById = catchAsync(async (req, res) => {
  const expense = await prisma.expense.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!expense) throw new AppError('Expense not found', 404);
  sendSuccess(res, expense);
});

const create = catchAsync(async (req, res) => {
  const { category, amount, description, date, billImage, isRecurring } = req.body;

  const expense = await prisma.expense.create({
    data: {
      branchId: req.branchId,
      userId: req.user.id,
      category: category || 'OTHER',
      amount: Math.round(amount * 100),
      description,
      date: date ? new Date(date) : new Date(),
      billImage,
      isRecurring: isRecurring || false,
    },
  });

  sendSuccess(res, expense, 'Expense recorded', 201);
});

const update = catchAsync(async (req, res) => {
  const { category, amount, description, date, billImage, isRecurring } = req.body;
  const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
  if (!existing) throw new AppError('Expense not found', 404);

  const expense = await prisma.expense.update({
    where: { id: req.params.id },
    data: {
      category: category || existing.category,
      amount: amount ? Math.round(amount * 100) : existing.amount,
      description: description !== undefined ? description : existing.description,
      date: date ? new Date(date) : existing.date,
      billImage: billImage !== undefined ? billImage : existing.billImage,
      isRecurring: isRecurring !== undefined ? isRecurring : existing.isRecurring,
    },
  });

  sendSuccess(res, expense, 'Expense updated');
});

const delete_ = catchAsync(async (req, res) => {
  await prisma.expense.delete({ where: { id: req.params.id } });
  sendSuccess(res, null, 'Expense deleted');
});

const generatePdf = catchAsync(async (req, res) => {
  const expense = await prisma.expense.findUnique({
    where: { id: req.params.id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });
  if (!expense) throw new AppError('Expense not found', 404);

  const { generateExpensePDF } = require('../utils/pdf');
  const companyProfile = await prisma.companyProfile.findFirst();
  const pdfBuffer = await generateExpensePDF(expense, companyProfile);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=expense-${expense.id}.pdf`);
  res.setHeader('Content-Length', pdfBuffer.length);
  res.send(pdfBuffer);
});

module.exports = { getAll, getById, create, update, delete: delete_, generatePdf };
