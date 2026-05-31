const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/company', settingsController.getCompanyProfile);
router.put('/company', authorize('ADMIN', 'STORE_MANAGER'), settingsController.updateCompanyProfile);

module.exports = router;
