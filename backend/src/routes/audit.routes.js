const express = require('express');
const router = express.Router();
const auditController = require('../controllers/audit.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', auditController.getAll);
router.get('/:id', auditController.getById);

module.exports = router;
