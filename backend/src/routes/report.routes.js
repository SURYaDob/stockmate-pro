const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'));

router.get('/inventory-valuation', reportController.inventoryValuation);
router.get('/sales', reportController.salesReport);
router.get('/purchases', reportController.purchaseReport);
router.get('/profit-loss', reportController.profitLoss);
router.get('/gst', reportController.gstReport);
router.get('/low-stock', reportController.lowStockReport);
router.get('/dead-stock', reportController.deadStockReport);
router.get('/audit-log', reportController.auditLog);

module.exports = router;
