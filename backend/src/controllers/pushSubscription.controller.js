const { prisma } = require('../utils/prisma');
const { catchAsync } = require('../middleware/error.middleware');
const { sendSuccess } = require('../utils/response');

/**
 * POST /api/notifications/subscribe
 * Save a push subscription for the authenticated user.
 */
const subscribe = catchAsync(async (req, res) => {
  const { endpoint, keys, userAgent } = req.body;

  if (!endpoint || !keys?.auth || !keys?.p256dh) {
    return res.status(400).json({
      success: false,
      message: 'Invalid subscription object. Requires endpoint, keys.auth, and keys.p256dh.',
    });
  }

  // Upsert subscription — update existing, create new
  const subscription = await prisma.pushSubscription.upsert({
    where: {
      userId_endpoint: {
        userId: req.user.id,
        endpoint,
      },
    },
    create: {
      userId: req.user.id,
      endpoint,
      auth: keys.auth,
      p256dh: keys.p256dh,
      userAgent: userAgent || null,
    },
    update: {
      auth: keys.auth,
      p256dh: keys.p256dh,
      userAgent: userAgent || null,
    },
  });

  sendSuccess(res, { id: subscription.id }, 'Push subscription saved');
});

/**
 * DELETE /api/notifications/unsubscribe
 * Remove a push subscription for the authenticated user.
 */
const unsubscribe = catchAsync(async (req, res) => {
  const { endpoint } = req.body;

  if (!endpoint) {
    // Unsubscribe all subscriptions for the user
    const result = await prisma.pushSubscription.deleteMany({
      where: { userId: req.user.id },
    });
    return sendSuccess(res, { deleted: result.count }, 'All push subscriptions removed');
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      userId: req.user.id,
      endpoint,
    },
  });

  sendSuccess(res, null, 'Push subscription removed');
});

/**
 * GET /api/notifications/vapid-public-key
 * Return the VAPID public key so the frontend can subscribe.
 */
const getVapidPublicKey = catchAsync(async (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null;
  sendSuccess(res, { publicKey });
});

module.exports = { subscribe, unsubscribe, getVapidPublicKey };
