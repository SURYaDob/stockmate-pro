const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/summary', dashboardController.getSummary);
router.get('/monthly-sales', dashboardController.getMonthlySales);
router.get('/category-stock', dashboardController.getCategoryStock);
router.get('/top-selling', dashboardController.getTopSelling);
router.get('/profit-trend', dashboardController.getProfitTrend);

module.exports = router;
