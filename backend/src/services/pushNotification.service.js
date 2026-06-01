// ─── Optional web-push import ────────────────────────────────────────────────
// web-push is optional — when not installed (e.g. desktop builds without VAPID),
// push notifications are silently skipped instead of crashing the process.

let webpush;

try {
  webpush = require('web-push');
} catch {
  console.warn('[PushNotification] web-push not installed — push notifications are disabled.');
}

const { prisma } = require('../utils/prisma');

// Configure VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_MAILTO = process.env.VAPID_MAILTO || 'mailto:noreply@stockmatepro.com';

let isConfigured = false;

const configure = () => {
  if (!webpush) return false;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn(
      '\x1b[33m[WARN] VAPID keys not configured. Push notifications will not work.\x1b[0m\n' +
      '\x1b[33m  Generate keys: npx web-push generate-vapid-keys\x1b[0m\n' +
      '\x1b[33m  Then set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env\x1b[0m'
    );
    return false;
  }

  webpush.setVapidDetails(VAPID_MAILTO, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  isConfigured = true;
  return true;
};

/**
 * Send a push notification to all subscriptions for a given user.
 * @param {string} userId
 * @param {object} notification - { id, title, message, type, reference }
 */
const sendToUser = async (userId, notification) => {
  if (!isConfigured && !configure()) return;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return;

    const payload = {
      title: notification.title,
      body: notification.message || '',
      data: {
        type: notification.type,
        reference: notification.reference,
        notificationId: notification.id,
        url: getNotificationUrl(notification),
      },
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-192x192.svg',
      vibrate: [200, 100, 200],
      requireInteraction: notification.type === 'PAYMENT_DUE' || notification.type === 'LOW_STOCK',
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth,
            p256dh: sub.p256dh,
          },
        };
        return webpush.sendNotification(pushSub, JSON.stringify(payload));
      })
    );

    // Clean up expired/invalid subscriptions
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected' && result.reason?.statusCode === 410) {
        await prisma.pushSubscription.delete({
          where: { id: subscriptions[i].id },
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[PushNotification] Error sending push:', err.message);
  }
};

/**
 * Get the deep-link URL for a notification based on its type and reference.
 */
const getNotificationUrl = (notification) => {
  if (!notification.reference) return '/notifications';

  // The reference field may contain a JSON string like {"type":"inventory","id":"..."}
  // or just a plain ID
  let refData;
  try {
    refData = JSON.parse(notification.reference);
  } catch {
    refData = { id: notification.reference };
  }

  switch (notification.type) {
    case 'LOW_STOCK':
      return `/inventory?filter=low-stock`;
    case 'PAYMENT_DUE':
    case 'PAYMENT_RECEIVED':
      return refData.type === 'sale'
        ? `/sales/${refData.id || notification.reference}`
        : `/purchases/${refData.id || notification.reference}`;
    case 'SALE_CREATED':
      return `/sales/${refData.id || notification.reference}`;
    case 'PURCHASE_CREATED':
    case 'ORDER_RECEIVED':
      return `/purchases/${refData.id || notification.reference}`;
    case 'STOCK_EXPIRY':
      return `/inventory/${refData.id || notification.reference}`;
    default:
      return '/notifications';
  }
};

module.exports = { configure, sendToUser, getNotificationUrl };
