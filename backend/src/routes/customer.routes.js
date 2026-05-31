const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', customerController.getAll);
router.get('/:id', customerController.getById);
router.get('/:id/ledger', customerController.getLedger);
router.post('/', customerController.create);
router.put('/:id', customerController.update);
router.post('/:id/payment', customerController.recordPayment);
router.post('/:id/credit-note', authorize('ADMIN', 'STORE_MANAGER'), customerController.createCreditNote);
router.get('/:id/pdf', customerController.generatePdf);

module.exports = router;
