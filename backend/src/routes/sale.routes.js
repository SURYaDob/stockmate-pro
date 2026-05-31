const express = require('express');
const router = express.Router();
const saleController = require('../controllers/sale.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', saleController.getAll);
router.get('/register', saleController.getRegisterData);
router.get('/daily-summary', saleController.getDailySummary);
router.get('/export', authorize('ADMIN', 'ACCOUNTANT'), saleController.exportExcel);
router.get('/:id', saleController.getById);
router.get('/:id/pdf', saleController.generatePdf);
router.post('/', saleController.create);
router.post('/:id/return', saleController.createReturn);
router.post('/:id/payment', saleController.recordPayment);
router.post('/:id/email', saleController.emailInvoice);
router.put('/:id', authorize('ADMIN', 'STORE_MANAGER'), saleController.update);

module.exports = router;
