const { prisma } = require('../utils/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const inventoryValuation = catchAsync(async (req, res) => {
  const items = await prisma.inventory.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  const data = items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    category: item.category,
    currentStock: item.currentStock,
    purchasePrice: item.purchasePrice,
    sellingPrice: item.sellingPrice,
    totalCost: item.purchasePrice * item.currentStock,
    totalValue: item.sellingPrice * item.currentStock,
    potentialProfit: (item.sellingPrice - item.purchasePrice) * item.currentStock,
  }));

  const summary = {
    totalItems: data.length,
    totalCost: data.reduce((s, i) => s + i.totalCost, 0),
    totalValue: data.reduce((s, i) => s + i.totalValue, 0),
    totalProfit: data.reduce((s, i) => s + i.potentialProfit, 0),
  };

  sendSuccess(res, { items: data, summary });
});

const salesReport = catchAsync(async (req, res) => {
  const { startDate, endDate, category, userId } = req.query;
  const branchId = req.branchId;

  const where = { branchId, isReturn: false };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    where.createdAt = { ...where.createdAt, lte: end };
  }
  if (userId) where.userId = userId;

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: { include: { item: true } },
      customer: { select: { name: true } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by category if specified
  let filtered = sales;
  if (category) {
    filtered = sales.filter((s) => s.items.some((i) => i.item.category === category));
  }

  const summary = {
    totalSales: filtered.length,
    totalRevenue: filtered.reduce((s, i) => s + i.grandTotal, 0),
    totalGst: filtered.reduce((s, i) => s + i.gstTotal, 0),
    totalDiscount: filtered.reduce((s, i) => s + i.discountTotal, 0),
    averageOrderValue: filtered.length > 0 ? filtered.reduce((s, i) => s + i.grandTotal, 0) / filtered.length : 0,
    paymentBreakdown: {
      cash: filtered.filter((s) => s.paymentMethod === 'CASH').length,
      upi: filtered.filter((s) => s.paymentMethod === 'UPI').length,
      card: filtered.filter((s) => s.paymentMethod === 'CARD').length,
      credit: filtered.filter((s) => s.paymentMethod === 'CREDIT').length,
    },
  };

  sendSuccess(res, { sales: filtered, summary });
});

const purchaseReport = catchAsync(async (req, res) => {
  const { startDate, endDate, supplierId } = req.query;
  const branchId = req.branchId;

  const where = { branchId };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  if (supplierId) where.supplierId = supplierId;

  const purchases = await prisma.purchase.findMany({
    where,
    include: { supplier: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    totalOrders: purchases.length,
    totalAmount: purchases.reduce((s, i) => s + i.grandTotal, 0),
    totalPaid: purchases.reduce((s, i) => s + i.paidAmount, 0),
    totalPending: purchases.reduce((s, i) => s + i.balanceAmount, 0),
  };

  sendSuccess(res, { purchases, summary });
});

const profitLoss = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const branchId = req.branchId;

  const where = { branchId, isReturn: false };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: true },
  });

  // Build expense date filter independently from sale date range
  const expenseWhere = { branchId };
  if (startDate) expenseWhere.date = { ...expenseWhere.date, gte: new Date(startDate) };
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    expenseWhere.date = { ...expenseWhere.date, lte: end };
  }

  const expenses = await prisma.expense.findMany({ where: expenseWhere });

  let revenue = 0;
  let cogs = 0;
  let gstCollected = 0;

  for (const sale of sales) {
    revenue += sale.grandTotal;
    gstCollected += sale.gstTotal;
    for (const item of sale.items) {
      const inventory = await prisma.inventory.findUnique({ where: { id: item.itemId } });
      if (inventory) {
        cogs += inventory.purchasePrice * item.quantity;
      }
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - totalExpenses;

  sendSuccess(res, {
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
    totalExpenses,
    netProfit,
    netMargin: revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0,
    gstCollected,
    totalSales: sales.length,
  });
});

const gstReport = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  const branchId = req.branchId;

  const where = { branchId, isReturn: false };
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: true, customer: { select: { gstNumber: true, name: true } } },
  });

  const gstSummary = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      const rate = item.gstRate;
      if (!gstSummary[rate]) gstSummary[rate] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      const taxableValue = item.unitPrice * item.quantity - item.discount;
      const gstHalf = item.gstAmount / 2;
      gstSummary[rate].taxableValue += taxableValue;
      gstSummary[rate].cgst += gstHalf;
      gstSummary[rate].sgst += gstHalf;
    }
  }

  // B2B invoices
  const b2bInvoices = sales
    .filter((s) => s.customer?.gstNumber)
    .map((s) => ({
      invoiceNo: s.invoiceNo,
      date: s.createdAt,
      customerName: s.customer?.name,
      customerGst: s.customer?.gstNumber,
      total: s.grandTotal,
      gst: s.gstTotal,
    }));

  sendSuccess(res, { gstSummary, b2bInvoices, totalSales: sales.length });
});

const lowStockReport = catchAsync(async (req, res) => {
  const allItems = await prisma.inventory.findMany({
    where: { isActive: true },
    orderBy: { currentStock: 'asc' },
    include: { suppliers: { include: { supplier: { select: { name: true, phone: true } } } } },
  });
  const items = allItems.filter((item) => item.currentStock <= item.minStock);
  sendSuccess(res, items);
});

const deadStockReport = catchAsync(async (req, res) => {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const items = await prisma.inventory.findMany({
    where: { isActive: true, lastMovement: { lte: ninetyDaysAgo } },
    orderBy: { lastMovement: 'asc' },
  });

  const data = items.map((item) => ({
    ...item,
    daysSinceLastMovement: Math.floor((Date.now() - new Date(item.lastMovement).getTime()) / (1000 * 60 * 60 * 24)),
    valueLocked: item.purchasePrice * item.currentStock,
  }));

  sendSuccess(res, data);
});

const auditLog = catchAsync(async (req, res) => {
  const { page = 1, limit = 50, entity, action } = req.query;
  const where = { branchId: req.branchId };
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  const total = await prisma.auditLog.count({ where });

  sendSuccess(res, logs, 'Audit logs fetched', 200, { total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = { inventoryValuation, salesReport, purchaseReport, profitLoss, gstReport, lowStockReport, deadStockReport, auditLog };
