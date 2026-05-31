const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplier.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', supplierController.getAll);
router.get('/export/pdf', supplierController.exportPdf);
router.get('/:id', supplierController.getById);
router.get('/:id/ledger', supplierController.getLedger);
router.post('/', authorize('ADMIN', 'STORE_MANAGER'), supplierController.create);
router.put('/:id', authorize('ADMIN', 'STORE_MANAGER'), supplierController.update);
router.post('/:id/payment', authorize('ADMIN', 'ACCOUNTANT'), supplierController.recordPayment);
router.post('/:id/debit-note', authorize('ADMIN', 'STORE_MANAGER'), supplierController.createDebitNote);
router.get('/:id/pdf', supplierController.generatePdf);

module.exports = router;
