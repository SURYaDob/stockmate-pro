/**
 * Email Notification Tests
 *
 * Tests:
 * - Low stock email service (sendLowStockAlert, checkAndSendLowStockAlerts)
 * - POST /api/notifications/check-low-stock endpoint
 */

const request = require('supertest');
const app = require('../../src/index');
const { mockPrisma } = require('../setup');
const { checkAndSendLowStockAlerts } = require('../../src/services/emailNotification.service');
const { sendEmail } = require('../../src/utils/mail');

const AUTH = 'Bearer test-token';

describe('Low Stock Email Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Re-set the default user lookup
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'mock-user-id',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      role: 'ADMIN',
      isActive: true,
      branches: [
        {
          isDefault: true,
          branchId: 'mock-branch-id',
          branch: {
            id: 'mock-branch-id',
            name: 'Main Branch',
            address: '123 Test St',
            phone: '9876543210',
            gstNumber: '27AAAPL1234C1Z1',
          },
        },
      ],
    });
  });

  // ── sendLowStockAlert ──
  describe('sendLowStockAlert (unit)', () => {
    test('calls sendEmail with correct params for a single item', async () => {
      const { sendLowStockAlert } = require('../../src/services/emailNotification.service');

      await sendLowStockAlert(
        { email: 'test@example.com', firstName: 'Test' },
        [{ name: 'Item A', sku: 'SKU-001', currentStock: 3, minStock: 10, sellingPrice: 50000 }]
      );

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: expect.stringContaining('Low Stock Alert'),
        html: expect.stringContaining('Item A'),
        text: expect.stringContaining('Item A'),
      });
    });

    test('calls sendEmail with correct params for multiple items', async () => {
      const { sendLowStockAlert } = require('../../src/services/emailNotification.service');

      await sendLowStockAlert(
        { email: 'manager@example.com', firstName: 'Manager' },
        [
          { name: 'Item A', sku: 'SKU-001', currentStock: 3, minStock: 10, sellingPrice: 50000 },
          { name: 'Item B', sku: 'SKU-002', currentStock: 1, minStock: 5, sellingPrice: 30000 },
        ]
      );

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'manager@example.com',
          html: expect.stringContaining('Item A'),
        })
      );
      // Should mention "2 items" (plural)
      expect(sendEmail.mock.calls[0][0].subject).toContain('2 items');
    });

    test('does nothing when user has no email', async () => {
      const { sendLowStockAlert } = require('../../src/services/emailNotification.service');

      await sendLowStockAlert(
        { firstName: 'NoEmail' },
        [{ name: 'Item A', sku: 'SKU-001', currentStock: 3, minStock: 10, sellingPrice: 50000 }]
      );

      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('does nothing when items array is empty', async () => {
      const { sendLowStockAlert } = require('../../src/services/emailNotification.service');

      await sendLowStockAlert(
        { email: 'test@example.com', firstName: 'Test' },
        []
      );

      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('HTML email contains table headers and action button', async () => {
      const { sendLowStockAlert } = require('../../src/services/emailNotification.service');

      await sendLowStockAlert(
        { email: 'test@example.com', firstName: 'Test' },
        [{ name: 'Item A', sku: 'SKU-001', currentStock: 3, minStock: 10, sellingPrice: 50000 }]
      );

      const html = sendEmail.mock.calls[0][0].html;
      expect(html).toContain('Low Stock Alert');
      expect(html).toContain('Item A');
      expect(html).toContain('SKU-001');
      expect(html).toContain('3'); // currentStock
      expect(html).toContain('10'); // minStock
      expect(html).toContain('View Low Stock Items');
      expect(html).toContain('http://localhost:3000/inventory?filter=low-stock');
    });
  });

  // ── checkAndSendLowStockAlerts ──
  describe('checkAndSendLowStockAlerts (integration)', () => {
    test('sends emails to all users with emailNotify enabled when low stock items exist', async () => {
      // Mock inventory: 2 low stock items
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Low Item A', sku: 'SKU-001', currentStock: 2, minStock: 10, sellingPrice: 50000 },
        { id: 'item-2', name: 'Low Item B', sku: 'SKU-002', currentStock: 5, minStock: 5, sellingPrice: 30000 },
      ]);

      // Mock users with emailNotify: true
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'admin@test.com', firstName: 'Admin' },
        { id: 'user-2', email: 'manager@test.com', firstName: 'Manager' },
      ]);

      const result = await checkAndSendLowStockAlerts();

      expect(result.notifiedUsers).toBe(2);
      expect(result.lowStockCount).toBe(2);
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'admin@test.com' })
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'manager@test.com' })
      );
    });

    test('returns zero notified when no users have emailNotify enabled', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Low Item', sku: 'SKU-001', currentStock: 2, minStock: 10, sellingPrice: 50000 },
      ]);

      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await checkAndSendLowStockAlerts();

      expect(result.notifiedUsers).toBe(0);
      expect(result.lowStockCount).toBe(1);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('returns zero low stock when no items are low', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'OK Item', sku: 'SKU-001', currentStock: 50, minStock: 10, sellingPrice: 50000 },
      ]);

      const result = await checkAndSendLowStockAlerts();

      expect(result.notifiedUsers).toBe(0);
      expect(result.lowStockCount).toBe(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  // ── POST /api/notifications/check-low-stock ──
  describe('POST /api/notifications/check-low-stock', () => {
    test('returns success when low stock items found and emails sent', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Low Item', sku: 'SKU-001', currentStock: 2, minStock: 10, sellingPrice: 50000 },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1', email: 'admin@test.com', firstName: 'Admin' },
      ]);

      const res = await request(app)
        .post('/api/notifications/check-low-stock')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('alert sent');
      expect(res.body.data.notifiedUsers).toBe(1);
      expect(res.body.data.lowStockCount).toBe(1);
    });

    test('returns message when no low stock items', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'OK Item', sku: 'SKU-001', currentStock: 50, minStock: 10, sellingPrice: 50000 },
      ]);

      const res = await request(app)
        .post('/api/notifications/check-low-stock')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('No low stock items found');
      expect(res.body.data.lowStockCount).toBe(0);
    });

    test('returns 401 without auth token', async () => {
      const res = await request(app).post('/api/notifications/check-low-stock');
      expect(res.status).toBe(401);
    });
  });
});
