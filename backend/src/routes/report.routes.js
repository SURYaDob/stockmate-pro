const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'));

// Root handler — returns available report endpoints
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StockMate Pro Reports API',
    endpoints: {
      '/api/reports/sales': 'Sales report with date filters',
      '/api/reports/purchases': 'Purchase report with date filters',
      '/api/reports/profit-loss': 'Profit & Loss statement',
      '/api/reports/gst': 'GST summary report',
      '/api/reports/inventory-valuation': 'Current inventory valuation',
      '/api/reports/low-stock': 'Items below minimum stock threshold',
      '/api/reports/dead-stock': 'Items with no recent sales',
      '/api/reports/audit-log': 'User activity audit trail',
    },
  });
});

router.get('/inventory-valuation', reportController.inventoryValuation);
router.get('/sales', reportController.salesReport);
router.get('/purchases', reportController.purchaseReport);
router.get('/profit-loss', reportController.profitLoss);
router.get('/gst', reportController.gstReport);
router.get('/low-stock', reportController.lowStockReport);
router.get('/dead-stock', reportController.deadStockReport);
router.get('/audit-log', reportController.auditLog);

module.exports = router;
