const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', inventoryController.getAll);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/dead-stock', inventoryController.getDeadStock);
router.get('/export', inventoryController.exportExcel);
router.get('/export/pdf', inventoryController.exportPdf);
router.get('/template', inventoryController.downloadTemplate);
router.get('/:id', inventoryController.getById);
router.post('/', inventoryController.create);
router.post('/bulk-import', authorize('ADMIN', 'STORE_MANAGER'), inventoryController.bulkImport);
router.put('/:id', inventoryController.update);
router.delete('/:id', authorize('ADMIN'), inventoryController.delete);
router.post('/:id/duplicate', inventoryController.duplicate);
router.post('/:id/adjust-stock', inventoryController.adjustStock);
router.post('/:id/archive', inventoryController.archive);
router.get('/:id/pdf', inventoryController.generatePdf);

module.exports = router;
