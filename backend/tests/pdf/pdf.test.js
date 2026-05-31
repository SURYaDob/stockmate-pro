/**
 * PDF Generation Endpoint Tests
 * 
 * Tests all 6 PDF generation endpoints:
 * - Sales, Purchases, Inventory, Suppliers, Customers, Expenses
 */

const request = require('supertest');
const app = require('../../src/index');
const { mockPrisma } = require('../setup');

// ── Sample Data ──

const sampleItem = {
  id: 'item-1',
  name: 'PVC Pipe 4 inch',
  sku: 'PLU-PV-PVC-001',
  category: 'PLUMBING',
  brand: 'Supreme',
  model: 'SP-4',
  currentStock: 100,
  minStock: 10,
  maxStock: 200,
  purchasePrice: 50000,
  sellingPrice: 75000,
  gstRate: 'RATE_18',
  unitType: 'PCS',
  description: 'High quality PVC pipe',
  location: 'A-01-B',
  barcode: '8901234567890',
  images: [],
  suppliers: [{ supplier: { id: 'sup-1', name: 'Test Supplier' } }],
  stockMovements: [
    { id: 'mov-1', type: 'IN', quantity: 50, reason: 'Purchase', createdAt: new Date() },
  ],
  createdAt: new Date(),
};

const sampleSupplier = {
  id: 'sup-1',
  name: 'Test Supplier',
  gstNumber: '27AAAPL1234C1Z1',
  contactPerson: 'Ramesh Kumar',
  phone: '9876543210',
  email: 'supplier@test.com',
  address: '456 Industrial Area',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: '400001',
  outstanding: 150000,
  bankName: 'SBI',
  bankAccount: '12345678901',
  bankIfsc: 'SBIN0001234',
  purchases: [
    { poNumber: 'PO-202506-0001', orderDate: new Date(), status: 'RECEIVED', grandTotal: 75000, paymentStatus: 'PAID' },
  ],
  createdAt: new Date(),
};

const sampleCustomer = {
  id: 'cust-1',
  name: 'Test Customer',
  phone: '9876543210',
  email: 'customer@test.com',
  address: '789 Market Road',
  city: 'Pune',
  state: 'Maharashtra',
  gstNumber: '27AABCT1234C1Z1',
  outstanding: 25000,
  sales: [
    { invoiceNo: 'INV-202506-0001', createdAt: new Date(), items: [{ quantity: 5 }], grandTotal: 37500, paymentStatus: 'PAID' },
  ],
  createdAt: new Date(),
};

const sampleExpense = {
  id: 'exp-1',
  category: 'UTILITIES',
  amount: 15000,
  date: new Date(),
  description: 'Monthly electricity bill',
  user: { firstName: 'Test', lastName: 'Admin' },
  createdAt: new Date(),
};

const samplePurchase = {
  id: 'po-1',
  poNumber: 'PO-202506-0001',
  status: 'ORDERED',
  orderDate: new Date(),
  expectedDate: new Date(Date.now() + 7 * 86400000),
  subtotal: 75000,
  gstTotal: 13500,
  grandTotal: 88500,
  paidAmount: 0,
  balanceAmount: 88500,
  paymentStatus: 'PENDING',
  notes: 'Urgent delivery',
  supplier: sampleSupplier,
  branch: { id: 'branch-1', name: 'Main Branch', address: '123 St', phone: '9876543210', gstNumber: '27AAAPL1234C1Z1' },
  user: { firstName: 'Test', lastName: 'Admin' },
  items: [
    {
      quantity: 10,
      unitPrice: 7500,
      gstAmount: 1350,
      totalPrice: 8850,
      gstRate: 'RATE_18',
      receivedQty: 0,
      item: { id: 'item-1', name: 'PVC Pipe 4 inch', sku: 'PLU-PV-PVC-001' },
    },
  ],
};

const sampleSale = {
  id: 'sale-1',
  invoiceNo: 'INV-202506-0001',
  createdAt: new Date(),
  subtotal: 75000,
  discountTotal: 0,
  gstTotal: 13500,
  grandTotal: 88500,
  paidAmount: 88500,
  balanceAmount: 0,
  paymentMethod: 'CASH',
  paymentStatus: 'PAID',
  notes: '',
  customer: sampleCustomer,
  branch: { id: 'branch-1', name: 'Main Branch', address: '123 St', phone: '9876543210', gstNumber: '27AAAPL1234C1Z1' },
  user: { firstName: 'Test', lastName: 'Admin' },
  items: [
    {
      quantity: 5,
      unitPrice: 15000,
      totalPrice: 17700,
      discount: 0,
      gstAmount: 2700,
      gstRate: 'RATE_18',
      item: { id: 'item-1', name: 'PVC Pipe 4 inch', sku: 'PLU-PV-PVC-001' },
    },
  ],
};

// ── Helper ──
const AUTH = 'Bearer test-token';

// ──────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────

describe('PDF Generation Endpoints', () => {
  // Reset default mock state before each test
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
    // Set all entity findUnique to null by default (tests override as needed)
    mockPrisma.sale.findUnique.mockResolvedValue(null);
    mockPrisma.purchase.findUnique.mockResolvedValue(null);
    mockPrisma.inventory.findUnique.mockResolvedValue(null);
    mockPrisma.supplier.findUnique.mockResolvedValue(null);
    mockPrisma.customer.findUnique.mockResolvedValue(null);
    mockPrisma.expense.findUnique.mockResolvedValue(null);
  });

  // ── Authentication ──
  describe('Authentication', () => {
    test('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/sales/1/pdf');
      expect(res.status).toBe(401);
    });

    test('returns 401 when user not found (inactive)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const res = await request(app)
        .get('/api/sales/1/pdf')
        .set('Authorization', AUTH);
      expect(res.status).toBe(401);
    });
  });

  // ── Sale PDF ──
  describe('GET /api/sales/:id/pdf', () => {
    test('returns PDF for valid sale', async () => {
      mockPrisma.sale.findUnique.mockResolvedValue(sampleSale);

      const res = await request(app)
        .get('/api/sales/sale-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('INV-202506-0001');
    });

    test('returns 404 for non-existent sale', async () => {
      const res = await request(app)
        .get('/api/sales/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Purchase PDF ──
  describe('GET /api/purchases/:id/pdf', () => {
    test('returns PDF for valid purchase', async () => {
      mockPrisma.purchase.findUnique.mockResolvedValue(samplePurchase);

      const res = await request(app)
        .get('/api/purchases/po-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('PO-202506-0001');
    });

    test('returns 404 for non-existent purchase', async () => {
      const res = await request(app)
        .get('/api/purchases/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Inventory PDF ──
  describe('GET /api/inventory/:id/pdf', () => {
    test('returns PDF for valid inventory item', async () => {
      mockPrisma.inventory.findUnique.mockResolvedValue(sampleItem);

      const res = await request(app)
        .get('/api/inventory/item-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('PLU-PV-PVC-001');
    });

    test('returns 404 for non-existent item', async () => {
      const res = await request(app)
        .get('/api/inventory/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Supplier PDF ──
  describe('GET /api/suppliers/:id/pdf', () => {
    test('returns PDF for valid supplier', async () => {
      mockPrisma.supplier.findUnique.mockResolvedValue(sampleSupplier);

      const res = await request(app)
        .get('/api/suppliers/sup-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('Test_Supplier');
    });

    test('returns 404 for non-existent supplier', async () => {
      const res = await request(app)
        .get('/api/suppliers/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Customer PDF ──
  describe('GET /api/customers/:id/pdf', () => {
    test('returns PDF for valid customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(sampleCustomer);

      const res = await request(app)
        .get('/api/customers/cust-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('Test_Customer');
    });

    test('returns 404 for non-existent customer', async () => {
      const res = await request(app)
        .get('/api/customers/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Expense PDF ──
  describe('GET /api/expenses/:id/pdf', () => {
    test('returns PDF for valid expense', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(sampleExpense);

      const res = await request(app)
        .get('/api/expenses/exp-1/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('expense-exp-1');
    });

    test('returns 404 for non-existent expense', async () => {
      const res = await request(app)
        .get('/api/expenses/non-existent/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  // ── Bulk Inventory List PDF ──
  describe('GET /api/inventory/export/pdf', () => {
    test('returns PDF for inventory list', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([
        { id: 'item-1', name: 'Item A', sku: 'SKU-001', category: 'PLUMBING', brand: 'A', currentStock: 10, minStock: 5, purchasePrice: 50000, sellingPrice: 75000, isActive: true },
        { id: 'item-2', name: 'Item B', sku: 'SKU-002', category: 'ELECTRICAL', brand: 'B', currentStock: 2, minStock: 5, purchasePrice: 30000, sellingPrice: 45000, isActive: true },
      ]);

      const res = await request(app)
        .get('/api/inventory/export/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('inventory-list');
    });

    test('returns PDF for filtered inventory list', async () => {
      mockPrisma.inventory.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/inventory/export/pdf?category=PLUMBING')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });

    test('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/inventory/export/pdf');
      expect(res.status).toBe(401);
    });
  });

  // ── Bulk Supplier List PDF ──
  describe('GET /api/suppliers/export/pdf', () => {
    test('returns PDF for supplier list', async () => {
      mockPrisma.supplier.findMany.mockResolvedValue([
        { id: 'sup-1', name: 'Supplier A', contactPerson: 'Person A', phone: '1111111111', email: 'a@test.com', outstanding: 50000, isActive: true },
        { id: 'sup-2', name: 'Supplier B', contactPerson: 'Person B', phone: '2222222222', email: 'b@test.com', outstanding: 0, isActive: false },
      ]);

      const res = await request(app)
        .get('/api/suppliers/export/pdf')
        .set('Authorization', AUTH);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('supplier-list');
    });

    test('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/suppliers/export/pdf');
      expect(res.status).toBe(401);
    });
  });
});
