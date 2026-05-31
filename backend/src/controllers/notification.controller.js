const { prisma } = require('../utils/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');
const { checkAndSendLowStockAlerts } = require('../services/emailNotification.service');

const getAll = catchAsync(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  sendSuccess(res, notifications);
});

const getUnreadCount = catchAsync(async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  sendSuccess(res, { count });
});

const markAsRead = catchAsync(async (req, res) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'Notification marked as read');
});

const markAllAsRead = catchAsync(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  sendSuccess(res, null, 'All notifications marked as read');
});

const getPreferences = catchAsync(async (req, res) => {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId: req.user.id },
  });
  sendSuccess(res, prefs || {});
});

const updatePreferences = catchAsync(async (req, res) => {
  const { lowStock, paymentDue, itemExpiry, overduePayment, emailNotify, pushNotify } = req.body;
  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: req.user.id },
    create: { userId: req.user.id, lowStock, paymentDue, itemExpiry, overduePayment, emailNotify, pushNotify },
    update: { lowStock, paymentDue, itemExpiry, overduePayment, emailNotify, pushNotify },
  });
  sendSuccess(res, prefs, 'Preferences updated');
});

const checkLowStock = catchAsync(async (req, res) => {
  const result = await checkAndSendLowStockAlerts();
  const message = result.notifiedUsers > 0
    ? `Low stock alert sent to ${result.notifiedUsers} user(s) for ${result.lowStockCount} item(s)`
    : result.lowStockCount > 0
      ? `${result.lowStockCount} low stock item(s) found, but no users have email notifications enabled`
      : 'No low stock items found';
  sendSuccess(res, result, message);
});

module.exports = { getAll, getUnreadCount, markAsRead, markAllAsRead, getPreferences, updatePreferences, checkLowStock };
