const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchase.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', purchaseController.getAll);
router.get('/export', authorize('ADMIN', 'ACCOUNTANT'), purchaseController.exportExcel);
router.get('/:id', purchaseController.getById);
router.post('/', purchaseController.create);
router.put('/:id', purchaseController.update);
router.post('/:id/receive', purchaseController.receiveStock);
router.post('/:id/return', purchaseController.returnToSupplier);
router.post('/:id/payment', purchaseController.recordPayment);
router.get('/:id/pdf', purchaseController.generatePdf);
router.post('/:id/email', purchaseController.emailPO);

module.exports = router;
