const { prisma } = require('../utils/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

const getSummary = catchAsync(async (req, res) => {
  const branchId = req.branchId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    inventoryValue,
    todaySales,
    pendingPayables,
    pendingReceivables,
    totalItems,
    totalCustomers,
    totalSuppliers,
  ] = await Promise.all([
    // Total inventory value (cost price) — fetch all and calculate per-item
    prisma.inventory.findMany({
      where: { isActive: true },
      select: { purchasePrice: true, currentStock: true, minStock: true },
    }),
    // Today's sales
    prisma.sale.findMany({
      where: { branchId, createdAt: { gte: today, lt: tomorrow }, isReturn: false },
    }),
    // Pending payables
    prisma.purchase.aggregate({
      _sum: { balanceAmount: true },
      where: { branchId, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
    }),
    // Pending receivables
    prisma.sale.aggregate({
      _sum: { balanceAmount: true },
      where: { branchId, paymentStatus: { in: ['PENDING', 'PARTIAL'] } },
    }),
    // Total items
    prisma.inventory.count({ where: { isActive: true } }),
    // Total customers
    prisma.customer.count({ where: { isActive: true } }),
    // Total suppliers
    prisma.supplier.count({ where: { isActive: true } }),
  ]);

  // Calculate inventory value as sum(purchasePrice * currentStock) per-item
  const totalInventoryValue = inventoryValue.reduce((sum, item) => {
    return sum + (item.purchasePrice || 0) * (item.currentStock || 0);
  }, 0);
  // Count low stock items via JS filter
  const lowStockCount = inventoryValue.filter((item) => item.currentStock <= item.minStock).length;

  const summary = {
    totalInventoryValue,
    todaySalesCount: todaySales.length,
    todaySalesAmount: todaySales.reduce((sum, s) => sum + s.grandTotal, 0),
    todaySalesPaid: todaySales.reduce((sum, s) => sum + s.paidAmount, 0),
    lowStockCount,
    pendingPayables: pendingPayables._sum.balanceAmount || 0,
    pendingReceivables: pendingReceivables._sum.balanceAmount || 0,
    totalItems,
    totalCustomers,
    totalSuppliers,
  };

  sendSuccess(res, summary);
});

const getMonthlySales = catchAsync(async (req, res) => {
  const branchId = req.branchId;
  const months = 6;

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: {
        branchId,
        createdAt: { gte: monthStart, lte: monthEnd },
        isReturn: false,
      },
    });

    data.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      amount: sales.reduce((sum, s) => sum + s.grandTotal, 0),
      count: sales.length,
    });
  }

  sendSuccess(res, data);
});

const getCategoryStock = catchAsync(async (req, res) => {
  const categories = await prisma.inventory.groupBy({
    by: ['category'],
    where: { isActive: true },
    _sum: { currentStock: true },
  });

  const data = categories.map((c) => ({
    name: c.category,
    value: c._sum.currentStock || 0,
  }));

  sendSuccess(res, data);
});

const getTopSelling = catchAsync(async (req, res) => {
  const branchId = req.branchId;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const items = await prisma.saleItem.groupBy({
    by: ['itemId'],
    where: { sale: { branchId, createdAt: { gte: startDate }, isReturn: false } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 10,
  });

  const itemIds = items.map((i) => i.itemId);
  const inventoryItems = await prisma.inventory.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, sku: true },
  });

  const itemMap = {};
  inventoryItems.forEach((item) => { itemMap[item.id] = item; });

  const data = items.map((i) => ({
    id: i.itemId,
    name: itemMap[i.itemId]?.name || 'Unknown',
    sku: itemMap[i.itemId]?.sku || '',
    totalSold: i._sum.quantity || 0,
  }));

  sendSuccess(res, data);
});

const getProfitTrend = catchAsync(async (req, res) => {
  const branchId = req.branchId;
  const months = 6;

  const data = [];
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: { branchId, createdAt: { gte: monthStart, lte: monthEnd }, isReturn: false },
      include: { items: true },
    });

    let revenue = 0;
    let cost = 0;

    for (const sale of sales) {
      revenue += sale.grandTotal;
      for (const item of sale.items) {
        const inventory = await prisma.inventory.findUnique({ where: { id: item.itemId } });
        if (inventory) {
          cost += inventory.purchasePrice * item.quantity;
        }
      }
    }

    data.push({
      month: monthStart.toLocaleString('default', { month: 'short', year: '2-digit' }),
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0,
    });
  }

  sendSuccess(res, data);
});

module.exports = { getSummary, getMonthlySales, getCategoryStock, getTopSelling, getProfitTrend };
