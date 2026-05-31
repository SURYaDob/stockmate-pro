const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const pushSubscriptionController = require('../controllers/pushSubscription.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

// Notification CRUD
router.get('/', notificationController.getAll);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.get('/preferences', notificationController.getPreferences);
router.put('/preferences', notificationController.updatePreferences);

// Low stock email check
router.post('/check-low-stock', notificationController.checkLowStock);

// Push subscription
router.post('/subscribe', pushSubscriptionController.subscribe);
router.delete('/unsubscribe', pushSubscriptionController.unsubscribe);
router.get('/vapid-public-key', pushSubscriptionController.getVapidPublicKey);

module.exports = router;
