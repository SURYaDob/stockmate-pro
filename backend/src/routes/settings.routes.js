const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);

// Root handler — returns available settings endpoints
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'StockMate Pro Settings API',
    endpoints: {
      '/api/settings/company': 'Get/Update company profile (name, address, GST, logo, footer)',
    },
  });
});

router.get('/company', settingsController.getCompanyProfile);
router.put('/company', authorize('ADMIN', 'STORE_MANAGER'), settingsController.updateCompanyProfile);

module.exports = router;
