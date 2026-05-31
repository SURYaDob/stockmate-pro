const { prisma } = require('../utils/prisma');
const { sendEmail } = require('../utils/mail');

/**
 * Format a price from paise to rupees (e.g., 19900 -> "₹199.00")
 */
const formatPrice = (paise) => {
  if (paise == null) return '₹0.00';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Build an HTML email body for low stock alerts.
 */
const buildLowStockHtml = (items, userName) => {
  const rows = items
    .map(
      (item, i) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${i + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-weight: 500;">${item.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-family: monospace;">${item.sku}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-weight: 600; text-align: center;">${item.currentStock}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b; text-align: center;">${item.minStock}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: right;">${formatPrice(item.sellingPrice)}</td>
        </tr>`
    )
    .join('');

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto;">
      <div style="background: #dc2626; padding: 24px; border-radius: 8px 8px 0 0;">
        <h1 style="color: #fff; margin: 0; font-size: 20px;">⚠️ Low Stock Alert</h1>
        <p style="color: #fca5a5; margin: 4px 0 0 0; font-size: 14px;">${items.length} item${items.length > 1 ? 's' : ''} running low on stock</p>
      </div>
      <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Hi${userName ? ` ${userName}` : ''},
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
          The following inventory items have fallen below their minimum stock threshold and require attention:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">#</th>
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">Item</th>
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: left; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">SKU</th>
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: center; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">Stock</th>
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: center; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">Min</th>
              <th style="padding: 10px 12px; font-size: 12px; color: #64748b; text-align: right; border-bottom: 2px solid #e2e8f0; text-transform: uppercase;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin-top: 16px;">
          Please review and restock these items at your earliest convenience to avoid stockouts.
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/inventory?filter=low-stock"
             style="display: inline-block; background: #059669; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600;">
            View Low Stock Items
          </a>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
          This is an automated alert from StockMate Pro. Adjust your notification preferences in Settings to control which alerts you receive.
        </p>
      </div>
    </div>
  `;
};

/**
 * Build a plain-text fallback body for low stock alerts.
 */
const buildLowStockText = (items) => {
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.name} (${item.sku}) — Stock: ${item.currentStock} / Min: ${item.minStock} — ${formatPrice(item.sellingPrice)}`
  );
  return [
    `LOW STOCK ALERT — ${items.length} item(s) running low`,
    '',
    ...lines,
    '',
    `View in app: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/inventory?filter=low-stock`,
  ].join('\n');
};

/**
 * Send a low stock alert email to a single user.
 * @param {object} user - User object with { id, firstName, email }
 * @param {Array} lowStockItems - Array of inventory items with { name, sku, currentStock, minStock, sellingPrice }
 */
const sendLowStockAlert = async (user, lowStockItems) => {
  if (!user?.email) return;
  if (!lowStockItems?.length) return;

  const subject = `⚠️ Low Stock Alert — ${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} need attention`;

  await sendEmail({
    to: user.email,
    subject,
    html: buildLowStockHtml(lowStockItems, user.firstName),
    text: buildLowStockText(lowStockItems),
  });
};

/**
 * Check all inventory for low stock items and email all users who have emailNotify enabled.
 * @returns {Promise<{ notifiedUsers: number, lowStockCount: number }>}
 */
const checkAndSendLowStockAlerts = async () => {
  // Fetch all low stock items
  const allItems = await prisma.inventory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      currentStock: true,
      minStock: true,
      sellingPrice: true,
    },
  });

  const lowStockItems = allItems.filter((item) => item.currentStock <= item.minStock);
  if (lowStockItems.length === 0) {
    return { notifiedUsers: 0, lowStockCount: 0 };
  }

  // Fetch all active users with email notification preference enabled
  const usersWithEmailPref = await prisma.user.findMany({
    where: {
      isActive: true,
      notificationPref: { emailNotify: true },
    },
    select: {
      id: true,
      email: true,
      firstName: true,
    },
  });

  if (usersWithEmailPref.length === 0) {
    return { notifiedUsers: 0, lowStockCount: lowStockItems.length };
  }

  // Send emails in parallel (non-blocking, catch errors individually)
  const results = await Promise.allSettled(
    usersWithEmailPref.map((user) => sendLowStockAlert(user, lowStockItems))
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  if (succeeded < usersWithEmailPref.length) {
    console.warn(
      `[EmailNotification] Sent ${succeeded}/${usersWithEmailPref.length} low stock alert emails`
    );
  }

  return { notifiedUsers: succeeded, lowStockCount: lowStockItems.length };
};

/**
 * Send real-time low stock alert emails to all users with emailNotify enabled.
 * Called immediately when stock drops below minimum (e.g., after a sale or adjustment).
 * Non-blocking — failures are caught silently.
 * @param {Array} items - Array of low stock inventory items
 */
const notifyUsersAboutLowStock = async (items) => {
  try {
    if (!items?.length) return;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        notificationPref: { emailNotify: true },
      },
      select: { id: true, email: true, firstName: true },
    });

    if (users.length === 0) return;

    await Promise.allSettled(
      users.map((user) => sendLowStockAlert(user, items))
    );
  } catch (err) {
    console.error('[EmailNotification] Error in notifyUsersAboutLowStock:', err.message);
  }
};

module.exports = { sendLowStockAlert, checkAndSendLowStockAlerts, notifyUsersAboutLowStock };
