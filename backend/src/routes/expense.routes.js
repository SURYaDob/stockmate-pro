const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', expenseController.getAll);
router.get('/:id', expenseController.getById);
router.post('/', expenseController.create);
router.put('/:id', authorize('ADMIN', 'STORE_MANAGER'), expenseController.update);
router.delete('/:id', authorize('ADMIN'), expenseController.delete);
router.get('/:id/pdf', expenseController.generatePdf);

module.exports = router;
