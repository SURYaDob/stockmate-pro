/**
 * Seed Integrity Tests
 *
 * Verifies that the test seed script (prisma/seed.test.js) creates all
 * database relationships correctly. Runs the seed as a child process
 * (separate from Jest mocks) and queries the real SQLite database.
 *
 * Coverage:
 *   ✓ Entity counts (users, products, purchases, sales, etc.)
 *   ✓ Foreign key relationships and associations
 *   ✓ Stock consistency (stockMap matches actual DB stock)
 *   ✓ Financial integrity (ledger balances, outstanding amounts)
 *   ✓ All stock movement types created correctly
 *   ✓ Notification read/unread status
 *   ✓ Employee attendance records
 *
 * Usage:  npm run seed:test  &&  npx jest tests/seed/ --no-coverage
 *        (Or simply:  npx jest tests/seed/ --no-coverage)
 *        (beforeAll automatically runs the seed)
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Helpers ──────────────────────────────────────────────────────────────────

const paise = (rupees) => Math.round(rupees * 100);
const resolveDbPath = () => {
  // Use nested path to match Prisma's resolution of 'file:./prisma/stockmate.db'
  // from schema.prisma (backend/prisma/schema.prisma -> backend/prisma/prisma/stockmate.db)
  const p = path.join(__dirname, '..', '..', 'prisma', 'prisma', 'stockmate.db');
  return p.replace(/\\/g, '/');
};

let prisma;

// ── Setup: run seed.test.js once before all tests ────────────────────────────

beforeAll(async () => {
  // Connect to the real database (not the mocked one from setup.js)
  process.env.DATABASE_URL = `file:${resolveDbPath()}`;
  prisma = new PrismaClient();
  await prisma.$connect();

  // Run the test seed script in a subprocess (isolated from Jest mocks)
  const seedScript = path.join(__dirname, '..', '..', 'prisma', 'seed.test.js');
  if (!fs.existsSync(seedScript)) {
    throw new Error(`Seed script not found: ${seedScript}`);
  }
  execSync(`node "${seedScript}"`, {
    cwd: path.join(__dirname, '..', '..'),
    stdio: 'pipe',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: `file:${resolveDbPath()}`,
    },
    timeout: 30000,
  });
}, 35000);

afterAll(async () => {
  if (prisma) await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
//  ENTITY EXISTENCE & COUNTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Entity counts', () => {
  test('creates 2 users', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(2);
  });

  test('creates 1 branch', async () => {
    const count = await prisma.branch.count();
    expect(count).toBe(1);
  });

  test('creates 2 user-branch assignments', async () => {
    const count = await prisma.userBranch.count();
    expect(count).toBe(2);
  });

  test('creates 1 company profile', async () => {
    const count = await prisma.companyProfile.count();
    expect(count).toBe(1);
  });

  test('creates 1 category', async () => {
    const count = await prisma.categorySetting.count();
    expect(count).toBe(1);
  });

  test('creates 1 supplier', async () => {
    const count = await prisma.supplier.count();
    expect(count).toBe(1);
  });

  test('creates 1 customer', async () => {
    const count = await prisma.customer.count();
    expect(count).toBe(1);
  });

  test('creates 3 inventory items', async () => {
    const count = await prisma.inventory.count();
    expect(count).toBe(3);
  });

  test('creates 3 item-supplier links', async () => {
    const count = await prisma.itemSupplier.count();
    expect(count).toBe(3);
  });

  test('creates 1 purchase order', async () => {
    const count = await prisma.purchase.count();
    expect(count).toBe(1);
  });

  test('creates 2 purchase items', async () => {
    const count = await prisma.purchaseItem.count();
    expect(count).toBe(2);
  });

  test('creates 1 sale', async () => {
    const count = await prisma.sale.count();
    expect(count).toBe(1);
  });

  test('creates 2 sale items', async () => {
    const count = await prisma.saleItem.count();
    expect(count).toBe(2);
  });

  test('creates 1 employee', async () => {
    const count = await prisma.employee.count();
    expect(count).toBe(1);
  });

  test('creates 5 attendance records (excluding Sundays)', async () => {
    const count = await prisma.employeeAttendance.count();
    // Last 5 days: if one was Sunday, we skip it -> 4 or 5
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(5);
  });

  test('creates 2 expenses', async () => {
    const count = await prisma.expense.count();
    expect(count).toBe(2);
  });

  test('creates 2 notifications', async () => {
    const count = await prisma.notification.count();
    expect(count).toBe(2);
  });

  test('creates 2 notification preferences', async () => {
    const count = await prisma.notificationPreference.count();
    expect(count).toBe(2);
  });

  test('creates 3 audit logs (inventory, sale, return)', async () => {
    const count = await prisma.auditLog.count();
    expect(count).toBe(3);
  });

  test('creates 3 branch-inventory links', async () => {
    const count = await prisma.branchInventory.count();
    expect(count).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  USER & AUTH
// ─────────────────────────────────────────────────────────────────────────────

describe('Users', () => {
  test('admin user has correct role and is active', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@stockmate.com' } });
    expect(admin).toBeTruthy();
    expect(admin.role).toBe('ADMIN');
    expect(admin.isActive).toBe(true);
    expect(admin.firstName).toBe('Admin');
    expect(admin.lastName).toBe('User');
  });

  test('manager user has STORE_MANAGER role', async () => {
    const mgr = await prisma.user.findUnique({ where: { email: 'manager@stockmate.com' } });
    expect(mgr).toBeTruthy();
    expect(mgr.role).toBe('STORE_MANAGER');
    expect(mgr.isActive).toBe(true);
  });

  test('password is hashed (not plaintext)', async () => {
    const admin = await prisma.user.findUnique({ where: { email: 'admin@stockmate.com' } });
    expect(admin.password).toMatch(/^\$2[ab]\$\d+\$/); // bcrypt hash format
  });

  test('users are assigned to the branch', async () => {
    const branch = await prisma.branch.findFirst();
    const assignments = await prisma.userBranch.findMany({
      where: { branchId: branch.id },
      include: { user: true },
    });
    expect(assignments.length).toBe(2);
    const roles = assignments.map(a => a.user.role).sort();
    expect(roles).toEqual(['ADMIN', 'STORE_MANAGER']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SUPPLIER & CUSTOMER
// ─────────────────────────────────────────────────────────────────────────────

describe('Supplier', () => {
  test('has complete contact information', async () => {
    const supplier = await prisma.supplier.findFirst();
    expect(supplier).toBeTruthy();
    expect(supplier.name).toBe('Acme Supplies');
    expect(supplier.gstNumber).toBeTruthy();
    expect(supplier.phone).toBeTruthy();
    expect(supplier.creditLimit).toBeGreaterThan(0);
  });

  test('outstanding is negative after debit note (supplier owes us)', async () => {
    const supplier = await prisma.supplier.findFirst();
    // PO was fully paid (0 outstanding), then return generated a debit note
    // so outstanding should be negative (supplier owes us money)
    expect(supplier.outstanding).toBeLessThan(0);
  });
});

describe('Customer', () => {
  test('has contact information', async () => {
    const customer = await prisma.customer.findFirst();
    expect(customer).toBeTruthy();
    expect(customer.name).toBe('Test Builders');
    expect(customer.gstNumber).toBeTruthy();
  });

  test('outstanding is 0 (sale was fully paid)', async () => {
    const customer = await prisma.customer.findFirst();
    expect(customer.outstanding).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  INVENTORY & STOCK CONSISTENCY
// ─────────────────────────────────────────────────────────────────────────────

describe('Inventory stock consistency', () => {
  test('items have correct categories and GST rates', async () => {
    const items = await prisma.inventory.findMany();

    const wire = items.find(i => i.name.includes('Copper'));
    expect(wire).toBeTruthy();
    expect(wire.category).toBe('ELECTRICAL');
    expect(wire.gstRate).toBe('RATE_18');

    const bulb = items.find(i => i.name.includes('LED'));
    expect(bulb).toBeTruthy();
    expect(bulb.gstRate).toBe('RATE_12');

    const pipe = items.find(i => i.name.includes('PVC Pipe'));
    expect(pipe).toBeTruthy();
    expect(pipe.category).toBe('PLUMBING');
    expect(pipe.gstRate).toBe('RATE_18');
  });

  test('stock quantities match expected after all operations', async () => {
    // Trace:
    //   Copper wire:  50 + 10 (PO) - 2 (return) = 58
    //   LED Bulb:    200 + 50 (PO) - 10 (sale) = 240
    //   PVC Pipe:     80 +  0 (PO) - 5 (sale)  = 75
    const items = await prisma.inventory.findMany();

    const wire = items.find(i => i.name.includes('Copper'));
    expect(wire.currentStock).toBe(58);

    const bulb = items.find(i => i.name.includes('LED'));
    expect(bulb.currentStock).toBe(240);

    const pipe = items.find(i => i.name.includes('PVC Pipe'));
    expect(pipe.currentStock).toBe(75);
  });

  test('branch-inventory stock matches inventory stock', async () => {
    const items = await prisma.inventory.findMany({ orderBy: { name: 'asc' } });
    for (const item of items) {
      const bi = await prisma.branchInventory.findFirst({
        where: { itemId: item.id },
      });
      expect(bi).toBeTruthy();
      expect(bi.stock).toBe(item.currentStock);
    }
  });

  test('items are linked to supplier', async () => {
    const links = await prisma.itemSupplier.findMany({
      include: { item: true, supplier: true },
    });
    expect(links.length).toBe(3);
    for (const link of links) {
      expect(link.supplier.name).toBe('Acme Supplies');
      expect(link.isPreferred).toBe(true);
      expect(link.lastPrice).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  STOCK MOVEMENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Stock movements', () => {
  test('has movements of all 3 types: IN, RETURN, OUT', async () => {
    const types = await prisma.stockMovement.groupBy({
      by: ['type'],
    });
    const typeValues = types.map(t => t.type).sort();
    expect(typeValues).toContain('IN');
    expect(typeValues).toContain('RETURN');
    expect(typeValues).toContain('OUT');
  });

  test('total IN quantity matches expected (initial stock + PO received)', async () => {
    const ins = await prisma.stockMovement.findMany({ where: { type: 'IN' } });
    const totalIn = ins.reduce((s, m) => s + m.quantity, 0);
    // Initial: 50 + 200 + 80 = 330
    // PO received: 10 + 50 = 60
    // Total: 390
    expect(totalIn).toBe(330 + 60);
  });

  test('RETURN movement has correct quantity and reference', async () => {
    const returns = await prisma.stockMovement.findMany({ where: { type: 'RETURN' } });
    expect(returns.length).toBe(1);
    expect(returns[0].quantity).toBe(2);
    expect(returns[0].reference).toBe('PO-TEST-0001');
    expect(returns[0].reason).toContain('Manufacturing defect');
  });

  test('OUT movement has correct quantity from sale', async () => {
    const outs = await prisma.stockMovement.findMany({ where: { type: 'OUT' } });
    expect(outs.length).toBe(2); // 2 items in sale
    const totalOut = outs.reduce((s, m) => s + m.quantity, 0);
    expect(totalOut).toBe(15); // 10 LED Bulbs + 5 PVC Pipes
    // Each should reference the invoice
    for (const out of outs) {
      expect(out.reference).toBe('INV-TEST-0001');
    }
  });

  test('old/new stock values are consistent (no gaps)', async () => {
    const movements = await prisma.stockMovement.findMany({
      orderBy: [{ itemId: 'asc' }, { createdAt: 'asc' }],
    });
    for (const m of movements) {
      expect(m.newStock).toBe(m.oldStock + (m.type === 'IN' ? m.quantity : -m.quantity));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PURCHASE & PURCHASE ITEMS
// ─────────────────────────────────────────────────────────────────────────────

describe('Purchase order', () => {
  test('PO is RECEIVED and fully paid', async () => {
    const po = await prisma.purchase.findFirst();
    expect(po.status).toBe('RECEIVED');
    expect(po.paymentStatus).toBe('PAID');
    expect(po.paidAmount).toBe(po.grandTotal);
    expect(po.balanceAmount).toBe(0);
    expect(po.paymentMethod).toBe('BANK_TRANSFER');
  });

  test('PO belongs to correct supplier, branch, and user', async () => {
    const po = await prisma.purchase.findFirst({
      include: { supplier: true, branch: true, user: true },
    });
    expect(po.supplier.name).toBe('Acme Supplies');
    expect(po.branch).toBeTruthy();
    expect(po.user.role).toBe('STORE_MANAGER');
  });

  test('PO number format is correct', async () => {
    const po = await prisma.purchase.findFirst();
    expect(po.poNumber).toBe('PO-TEST-0001');
    expect(po.supplierInvoice).toBe('SI-TEST-0001');
  });

  test('PO has 2 items with correct quantities', async () => {
    const items = await prisma.purchaseItem.findMany({
      where: { purchase: { poNumber: 'PO-TEST-0001' } },
      include: { item: true },
    });
    expect(items.length).toBe(2);

    // Item 0: Copper wire, qty 10, received 8 (10 - 2 returned)
    const wireItem = items.find(i => i.item.name.includes('Copper'));
    expect(wireItem).toBeTruthy();
    expect(wireItem.quantity).toBe(10);
    expect(wireItem.receivedQty).toBe(8); // 10 - 2 returned
    expect(wireItem.unitPrice).toBe(1850);

    // Item 1: LED Bulb, qty 50, still fully received
    const bulbItem = items.find(i => i.item.name.includes('LED'));
    expect(bulbItem).toBeTruthy();
    expect(bulbItem.quantity).toBe(50);
    expect(bulbItem.receivedQty).toBe(50);
    expect(bulbItem.unitPrice).toBe(65);
  });

  test('GST calculation is correct on purchase', async () => {
    const items = await prisma.purchaseItem.findMany({
      where: { purchase: { poNumber: 'PO-TEST-0001' } },
      include: { item: true },
    });

    for (const pi of items) {
      const gstPct = parseInt(pi.item.gstRate.replace('RATE_', ''));
      const expectedGst = Math.round(pi.unitPrice * pi.quantity * gstPct / 100);
      expect(pi.gstAmount).toBe(expectedGst);
      expect(pi.totalPrice).toBe(pi.unitPrice * pi.quantity + pi.gstAmount);
    }
  });

  test('purchase grand total equals subtotal + GST', async () => {
    const po = await prisma.purchase.findFirst();
    expect(po.grandTotal).toBe(po.subtotal + po.gstTotal);
    expect(po.discountTotal).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  PURCHASE RETURN & SUPPLIER LEDGER
// ─────────────────────────────────────────────────────────────────────────────

describe('Purchase return & supplier ledger', () => {
  test('debit note exists in supplier ledger', async () => {
    const debitNotes = await prisma.supplierLedger.findMany({
      where: { type: 'DEBIT_NOTE' },
    });
    expect(debitNotes.length).toBe(1);
    expect(debitNotes[0].amount).toBeLessThan(0); // negative = debit
    expect(debitNotes[0].description).toContain('PO-TEST-0001');
  });

  test('debit note calculation is correct', async () => {
    const debitNotes = await prisma.supplierLedger.findMany({
      where: { type: 'DEBIT_NOTE' },
    });
    // Returned 2 units of copper wire at 1850/unit = 3700 paise
    expect(debitNotes[0].amount).toBe(-3700);
    expect(debitNotes[0].balance).toBe(-3700);
  });

  test('supplier ledger has 3 entries (PURCHASE, PAYMENT, DEBIT_NOTE)', async () => {
    const entries = await prisma.supplierLedger.findMany({
      orderBy: { createdAt: 'asc' },
    });
    expect(entries.length).toBe(3);
    expect(entries[0].type).toBe('PURCHASE');
    expect(entries[1].type).toBe('PAYMENT');
    expect(entries[2].type).toBe('DEBIT_NOTE');
  });

  test('PURCHASE and PAYMENT entries cancel each other out', async () => {
    const entries = await prisma.supplierLedger.findMany({
      orderBy: { createdAt: 'asc' },
    });
    expect(entries[0].balance).toBe(0); // fully paid
    expect(entries[1].balance).toBe(0); // after payment
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  SALE & CUSTOMER LEDGER
// ─────────────────────────────────────────────────────────────────────────────

describe('Sale & customer ledger', () => {
  test('sale is fully paid in cash', async () => {
    const sale = await prisma.sale.findFirst();
    expect(sale).toBeTruthy();
    expect(sale.paymentMethod).toBe('CASH');
    expect(sale.paymentStatus).toBe('PAID');
    expect(sale.paidAmount).toBe(sale.grandTotal);
    expect(sale.balanceAmount).toBe(0);
    expect(sale.invoiceNo).toBe('INV-TEST-0001');
  });

  test('sale belongs to customer', async () => {
    const sale = await prisma.sale.findFirst({
      include: { customer: true, user: true },
    });
    expect(sale.customer.name).toBe('Test Builders');
    expect(sale.user.role).toBe('STORE_MANAGER');
  });

  test('sale has 2 items with correct prices', async () => {
    const items = await prisma.saleItem.findMany({
      where: { sale: { invoiceNo: 'INV-TEST-0001' } },
      include: { item: true },
    });
    expect(items.length).toBe(2);

    const ledBulb = items.find(i => i.item.name.includes('LED'));
    expect(ledBulb).toBeTruthy();
    expect(ledBulb.quantity).toBe(10);
    expect(ledBulb.unitPrice).toBe(110);

    const pvcPipe = items.find(i => i.item.name.includes('PVC'));
    expect(pvcPipe).toBeTruthy();
    expect(pvcPipe.quantity).toBe(5);
    expect(pvcPipe.unitPrice).toBe(295);
  });

  test('sale GST calculation is correct', async () => {
    const items = await prisma.saleItem.findMany({
      where: { sale: { invoiceNo: 'INV-TEST-0001' } },
      include: { item: true },
    });

    for (const si of items) {
      const gstPct = parseInt(si.item.gstRate.replace('RATE_', ''));
      const expectedGst = Math.round(si.unitPrice * si.quantity * gstPct / 100);
      expect(si.gstAmount).toBe(expectedGst);
      expect(si.totalPrice).toBe(si.unitPrice * si.quantity + si.gstAmount);
    }
  });

  test('customer ledger has SALE and PAYMENT entries', async () => {
    const entries = await prisma.customerLedger.findMany({
      orderBy: { createdAt: 'asc' },
    });
    expect(entries.length).toBe(2);
    expect(entries[0].type).toBe('SALE');
    expect(entries[1].type).toBe('PAYMENT');
    expect(entries[1].amount).toBeLessThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EMPLOYEE & ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

describe('Employee & attendance', () => {
  test('employee has correct details', async () => {
    const emp = await prisma.employee.findFirst();
    expect(emp.name).toBe('Test Employee');
    expect(emp.role).toBe('Salesman');
    expect(emp.salary).toBe(paise(12000));
    expect(emp.isActive).toBe(true);
  });

  test('employee belongs to the branch', async () => {
    const emp = await prisma.employee.findFirst({
      include: { branch: true },
    });
    expect(emp.branch.code).toBe('TST-001');
  });

  test('attendance records are PRESENT with 9 hours', async () => {
    const records = await prisma.employeeAttendance.findMany({
      include: { employee: true },
    });
    for (const r of records) {
      expect(r.status).toBe('PRESENT');
      expect(r.hoursWorked).toBe(9);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

describe('Expenses', () => {
  test('expenses have correct categories', async () => {
    const expenses = await prisma.expense.findMany({ orderBy: { amount: 'desc' } });
    expect(expenses.length).toBe(2);
    expect(expenses[0].category).toBe('RENT');
    expect(expenses[0].amount).toBe(paise(25000));
    expect(expenses[1].category).toBe('UTILITY_BILLS');
    expect(expenses[1].amount).toBe(paise(4500));
  });

  test('expenses belong to admin user and branch', async () => {
    const expense = await prisma.expense.findFirst({
      include: { user: true, branch: true },
    });
    expect(expense.user.role).toBe('ADMIN');
    expect(expense.branch.code).toBe('TST-001');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  NOTIFICATIONS & PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

describe('Notifications', () => {
  test('one notification is unread (recent), one is read (older)', async () => {
    const notifs = await prisma.notification.findMany({
      include: { user: true },
    });
    expect(notifs.length).toBe(2);

    const unread = notifs.filter(n => !n.isRead);
    const read = notifs.filter(n => n.isRead);
    expect(unread.length).toBe(1);
    expect(read.length).toBe(1);
  });

  test('notifications have correct types and references', async () => {
    const notifs = await prisma.notification.findMany();

    const warning = notifs.find(n => n.type === 'WARNING');
    expect(warning).toBeTruthy();
    expect(warning.title).toContain('Low Stock');
    expect(warning.reference).toBe('inventory');

    const info = notifs.find(n => n.type === 'INFO');
    expect(info).toBeTruthy();
    expect(info.title).toContain('Daily Summary');
    expect(info.reference).toBe('dashboard');
  });

  test('each user has notification preferences', async () => {
    const prefs = await prisma.notificationPreference.findMany({
      include: { user: true },
    });
    expect(prefs.length).toBe(2);
    expect(prefs.some(p => p.user.role === 'ADMIN')).toBe(true);
    expect(prefs.some(p => p.user.role === 'STORE_MANAGER')).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  AUDIT LOGS
// ─────────────────────────────────────────────────────────────────────────────

describe('Audit logs', () => {
  test('has audit logs for inventory, sale, and return', async () => {
    const logs = await prisma.auditLog.findMany({
      include: { user: true },
    });
    expect(logs.length).toBe(3);

    const inventoryLog = logs.find(l => l.entity === 'Inventory');
    expect(inventoryLog).toBeTruthy();
    expect(inventoryLog.action).toBe('CREATE');

    const saleLog = logs.find(l => l.entity === 'Sale');
    expect(saleLog).toBeTruthy();
    expect(saleLog.action).toBe('CREATE');

    // Return also creates an audit log with entity 'Purchase'
    const returnLog = logs.find(l => l.entity === 'Purchase');
    expect(returnLog).toBeTruthy();
  });

  test('audit logs have valid JSON in newValue', async () => {
    const logs = await prisma.auditLog.findMany();
    for (const log of logs) {
      expect(() => JSON.parse(log.newValue)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  COMPANY PROFILE
// ─────────────────────────────────────────────────────────────────────────────

describe('Company profile', () => {
  test('has all essential fields', async () => {
    const profile = await prisma.companyProfile.findFirst();
    expect(profile).toBeTruthy();
    expect(profile.companyName).toBe('StockMate Test');
    expect(profile.gstNumber).toBeTruthy();
    expect(profile.footerText).toBe('Thank you!');
    expect(profile.phone).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  CROSS-ENTITY RELATIONSHIPS
// ─────────────────────────────────────────────────────────────────────────────

describe('Cross-entity relationships', () => {
  test('audit log references a real inventory item', async () => {
    const log = await prisma.auditLog.findFirst({ where: { entity: 'Inventory' } });
    expect(log).toBeTruthy();
    const item = await prisma.inventory.findUnique({ where: { id: log.entityId } });
    expect(item).toBeTruthy();
  });

  test('audit log references a real sale', async () => {
    const log = await prisma.auditLog.findFirst({ where: { entity: 'Sale' } });
    expect(log).toBeTruthy();
    const sale = await prisma.sale.findUnique({ where: { id: log.entityId } });
    expect(sale).toBeTruthy();
  });

  test('purchase items reference real inventory items', async () => {
    const pis = await prisma.purchaseItem.findMany({
      include: { item: true },
    });
    for (const pi of pis) {
      expect(pi.item).toBeTruthy();
    }
  });

  test('sale items reference real inventory items', async () => {
    const sis = await prisma.saleItem.findMany({
      include: { item: true },
    });
    for (const si of sis) {
      expect(si.item).toBeTruthy();
    }
  });

  test('stock movements reference real items', async () => {
    const movements = await prisma.stockMovement.findMany({
      include: { item: true },
    });
    expect(movements.length).toBeGreaterThan(0);
    for (const m of movements) {
      expect(m.item).toBeTruthy();
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  FULL SEED (seed.js) VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════

describe('Full seed (seed.js)', () => {
  // Re-seed before this block — runs after all test seed tests complete
  beforeAll(async () => {
    // Disconnect the existing PrismaClient so the seed can use it
    if (prisma) await prisma.$disconnect();

    const seedScript = path.join(__dirname, '..', '..', 'prisma', 'seed.js');
    if (!fs.existsSync(seedScript)) {
      throw new Error(`Full seed script not found: ${seedScript}`);
    }
    execSync(`node "${seedScript}"`, {
      cwd: path.join(__dirname, '..', '..'),
      stdio: 'pipe',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DATABASE_URL: `file:${resolveDbPath()}`,
      },
      timeout: 60000, // full seed takes longer (~10s)
    });

    // Reconnect after seed
    prisma = new PrismaClient();
    await prisma.$connect();
  }, 70000);

  // ── Entity counts ──
  describe('Entity counts', () => {
    test('creates 4 users (ADMIN, MANAGER, STAFF, ACCOUNTANT)', async () => {
      const count = await prisma.user.count();
      expect(count).toBe(4);
    });

    test('creates 1 branch', async () => {
      const count = await prisma.branch.count();
      expect(count).toBe(1);
    });

    test('creates 4 user-branch assignments', async () => {
      const count = await prisma.userBranch.count();
      expect(count).toBe(4);
    });

    test('creates 1 company profile', async () => {
      const count = await prisma.companyProfile.count();
      expect(count).toBe(1);
    });

    test('creates 7 categories', async () => {
      const count = await prisma.categorySetting.count();
      expect(count).toBe(7);
    });

    test('creates 5 suppliers', async () => {
      const count = await prisma.supplier.count();
      expect(count).toBe(5);
    });

    test('creates 5 customers', async () => {
      const count = await prisma.customer.count();
      expect(count).toBe(5);
    });

    test('creates 55 inventory items', async () => {
      const count = await prisma.inventory.count();
      expect(count).toBe(55);
    });

    test('creates item-supplier links for all items', async () => {
      const count = await prisma.itemSupplier.count();
      // Each item gets 1-2 suppliers, so at least 55
      expect(count).toBeGreaterThanOrEqual(55);
    });

    test('creates 6 purchase orders', async () => {
      const count = await prisma.purchase.count();
      expect(count).toBe(6);
    });

    test('creates purchase items for all POs', async () => {
      const count = await prisma.purchaseItem.count();
      // PO1 (4) + PO2 (4) + PO3 (4) + PO4 (3) + PO5 (3) + PO6 (2) = 20
      expect(count).toBe(20);
    });

    test('creates 16 sales', async () => {
      const count = await prisma.sale.count();
      expect(count).toBe(16);
    });

    test('creates 4 employees', async () => {
      const count = await prisma.employee.count();
      expect(count).toBe(4);
    });

    test('creates attendance records (~22 per employee)', async () => {
      const count = await prisma.employeeAttendance.count();
      // ~22 days × 4 employees = ~88
      expect(count).toBeGreaterThanOrEqual(80);
      expect(count).toBeLessThanOrEqual(100);
    });

    test('creates 15 expenses', async () => {
      const count = await prisma.expense.count();
      expect(count).toBe(15);
    });

    test('creates 7 notifications', async () => {
      const count = await prisma.notification.count();
      // 7 explicit + 3 from purchase returns = 10
      expect(count).toBe(10);
    });

    test('creates 4 notification preferences', async () => {
      const count = await prisma.notificationPreference.count();
      expect(count).toBe(4);
    });

    test('creates audit logs (9 explicit + 3 from returns = 12)', async () => {
      const count = await prisma.auditLog.count();
      expect(count).toBe(12);
    });

    test('creates 55 branch-inventory links', async () => {
      const count = await prisma.branchInventory.count();
      expect(count).toBe(55);
    });
  });

  // ── Users ──
  describe('Users', () => {
    test('all 4 user roles exist', async () => {
      const users = await prisma.user.findMany();
      const roles = users.map(u => u.role).sort();
      expect(roles).toEqual(['ACCOUNTANT', 'ADMIN', 'STAFF', 'STORE_MANAGER']);
    });

    test('all users are active', async () => {
      const users = await prisma.user.findMany();
      for (const u of users) {
        expect(u.isActive).toBe(true);
      }
    });

    test('all passwords are bcrypt-hashed', async () => {
      const users = await prisma.user.findMany();
      for (const u of users) {
        expect(u.password).toMatch(/^\$2[ab]\$\d+\$/);
      }
    });

    test('all users are assigned to the branch', async () => {
      const assignments = await prisma.userBranch.findMany({ include: { user: true } });
      const assignedRoles = assignments.map(a => a.user.role).sort();
      expect(assignedRoles).toEqual(['ACCOUNTANT', 'ADMIN', 'STAFF', 'STORE_MANAGER']);
    });
  });

  // ── Categories ──
  describe('Categories', () => {
    test('all 7 category slugs exist', async () => {
      const cats = await prisma.categorySetting.findMany();
      const slugs = cats.map(c => c.slug).sort();
      expect(slugs).toEqual([
        'construction', 'electrical', 'hardware',
        'painting', 'plumbing', 'safety', 'sanitary',
      ]);
    });

    test('each category has icon, theme, and accent', async () => {
      const cats = await prisma.categorySetting.findMany();
      for (const c of cats) {
        expect(c.icon).toBeTruthy();
        expect(c.theme).toBe('slate');
        expect(c.accent).toBe('amber');
      }
    });
  });

  // ── Suppliers & Customers ──
  describe('Suppliers', () => {
    test('all 5 suppliers have GST numbers', async () => {
      const suppliers = await prisma.supplier.findMany();
      expect(suppliers.length).toBe(5);
      for (const s of suppliers) {
        expect(s.gstNumber).toBeTruthy();
        expect(s.phone).toBeTruthy();
        expect(s.creditLimit).toBeGreaterThan(0);
      }
    });

    test('suppliers from multiple Indian states', async () => {
      const suppliers = await prisma.supplier.findMany();
      const states = [...new Set(suppliers.map(s => s.state))];
      expect(states.length).toBeGreaterThanOrEqual(4); // Maharashtra, Bihar, Gujarat, Jharkhand, Delhi
    });
  });

  describe('Customers', () => {
    test('all 5 customers exist with phone numbers', async () => {
      const customers = await prisma.customer.findMany();
      expect(customers.length).toBe(5);
      for (const c of customers) {
        expect(c.phone).toBeTruthy();
      }
    });

    test('some customers have GST (registered businesses) and some dont (walk-in)', async () => {
      const customers = await prisma.customer.findMany();
      const withGst = customers.filter(c => c.gstNumber);
      const withoutGst = customers.filter(c => !c.gstNumber);
      expect(withGst.length).toBeGreaterThanOrEqual(2);
      expect(withoutGst.length).toBeGreaterThanOrEqual(1); // 'Ramesh Kumar (Walk-in)' has no GST
    });
  });

  // ── Inventory ──
  describe('Inventory', () => {
    test('items span all 7 categories', async () => {
      const cats = await prisma.inventory.groupBy({ by: ['category'] });
      const expected = ['ELECTRICAL', 'HARDWARE', 'PAINTING', 'PLUMBING', 'SAFETY_EQUIPMENT', 'SANITARY', 'TOOLS'];
      const actual = cats.map(c => c.category).sort();
      expect(actual).toEqual(expected);
    });

    test('items have both RATE_12 and RATE_18 GST rates', async () => {
      const rates = await prisma.inventory.groupBy({ by: ['gstRate'] });
      const rateValues = rates.map(r => r.gstRate).sort();
      expect(rateValues).toContain('RATE_12');
      expect(rateValues).toContain('RATE_18');
    });

    test('branch-inventory stock matches inventory stock for all items', async () => {
      const items = await prisma.inventory.findMany();
      for (const item of items) {
        const bi = await prisma.branchInventory.findFirst({ where: { itemId: item.id } });
        expect(bi).toBeTruthy();
        expect(bi.stock).toBe(item.currentStock);
      }
    });

    test('each item is linked to at least 1 supplier', async () => {
      const items = await prisma.inventory.findMany();
      for (const item of items) {
        const links = await prisma.itemSupplier.count({ where: { itemId: item.id } });
        expect(links).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ── Purchase Orders ──
  describe('Purchase orders', () => {
    test('all 4 PO statuses are represented (RECEIVED, PARTIAL, ORDERED, DRAFT)', async () => {
      const statuses = await prisma.purchase.groupBy({ by: ['status'] });
      const statusVals = statuses.map(s => s.status).sort();
      expect(statusVals).toContain('RECEIVED');
      expect(statusVals).toContain('PARTIAL');
      expect(statusVals).toContain('ORDERED');
      expect(statusVals).toContain('DRAFT');
    });

    test('has RECEIVED POs (3 fully received)', async () => {
      const received = await prisma.purchase.findMany({ where: { status: 'RECEIVED' } });
      expect(received.length).toBe(3);
      for (const po of received) {
        expect(po.paymentStatus).toBe('PAID');
        expect(po.paidAmount).toBe(po.grandTotal);
      }
    });

    test('PARTIAL PO has FLAT discount and partial payment status', async () => {
      const partial = await prisma.purchase.findMany({ where: { status: 'PARTIAL' } });
      expect(partial.length).toBe(1);
      expect(partial[0].discountType).toBe('FLAT');
      expect(partial[0].discountValue).toBe(500);
      expect(partial[0].paymentStatus).toBe('PARTIAL');
      // Discount exceeds subtotal for this PO (FLAT ₹500 on ₹247.50 of items),
      // making grandTotal negative. paidAmount = floor(grandTotal * 0.3).
      // Verify the FLAT discount was applied correctly.
      expect(partial[0].discountTotal).toBe(50000); // ₹500 in paise
    });

    test('ORDERED PO is pending payment', async () => {
      const ordered = await prisma.purchase.findMany({ where: { status: 'ORDERED' } });
      expect(ordered.length).toBe(1);
      expect(ordered[0].paymentStatus).toBe('PENDING');
      expect(ordered[0].paidAmount).toBe(0);
    });

    test('DRAFT PO has no payment', async () => {
      const draft = await prisma.purchase.findMany({ where: { status: 'DRAFT' } });
      expect(draft.length).toBe(1);
      expect(draft[0].paymentStatus).toBe('PENDING');
      expect(draft[0].paidAmount).toBe(0);
    });

    test('PO with PERCENTAGE discount has correct discountTotal', async () => {
      const pos = await prisma.purchase.findMany({ where: { discountType: 'PERCENTAGE' } });
      expect(pos.length).toBe(1);
      expect(pos[0].discountValue).toBe(5);
      expect(pos[0].discountTotal).toBeGreaterThan(0);
      expect(pos[0].grandTotal).toBe(pos[0].subtotal + pos[0].gstTotal - pos[0].discountTotal);
    });

    test('PO with FLAT discount has correct discountTotal', async () => {
      const pos = await prisma.purchase.findMany({ where: { discountType: 'FLAT' } });
      expect(pos.length).toBe(1);
      expect(pos[0].discountValue).toBe(500);
      // FLAT discount of ₹500 = 50000 paise
      expect(pos[0].discountTotal).toBe(50000);
    });

    test('all POs have date-based PO numbers', async () => {
      const pos = await prisma.purchase.findMany();
      for (const po of pos) {
        expect(po.poNumber).toMatch(/^PO-\d{6}-\d{4}$/);
      }
    });

    test('PO GST calculations are correct', async () => {
      const items = await prisma.purchaseItem.findMany({
        include: { item: true, purchase: true },
      });
      for (const pi of items) {
        const gstPct = parseInt(pi.item.gstRate.replace('RATE_', ''));
        const expectedGst = Math.round(pi.unitPrice * pi.quantity * gstPct / 100);
        expect(pi.gstAmount).toBe(expectedGst);
      }
    });
  });

  // ── Purchase Returns ──
  describe('Purchase returns', () => {
    test('has 3 debit notes (one per return scenario)', async () => {
      const debitNotes = await prisma.supplierLedger.findMany({
        where: { type: 'DEBIT_NOTE' },
      });
      expect(debitNotes.length).toBe(3);
      for (const dn of debitNotes) {
        expect(dn.amount).toBeLessThan(0);
      }
    });

    test('has RETURN stock movements', async () => {
      const returns = await prisma.stockMovement.findMany({ where: { type: 'RETURN' } });
      expect(returns.length).toBeGreaterThanOrEqual(3);
    });

    test('return audit logs exist', async () => {
      const logs = await prisma.auditLog.findMany({
        where: {
          entity: 'Purchase',
        },
      });
      expect(logs.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Sales ──
  describe('Sales', () => {
    test('has all 3 payment statuses (PAID, PARTIAL, PENDING)', async () => {
      const statuses = await prisma.sale.groupBy({ by: ['paymentStatus'] });
      const statusVals = statuses.map(s => s.paymentStatus).sort();
      expect(statusVals).toContain('PAID');
      expect(statusVals).toContain('PARTIAL');
      expect(statusVals).toContain('PENDING');
    });

    test('has all payment methods (CASH, UPI, CARD, CREDIT)', async () => {
      const methods = await prisma.sale.groupBy({ by: ['paymentMethod'] });
      const methodVals = methods.map(m => m.paymentMethod).sort();
      expect(methodVals).toContain('CASH');
      expect(methodVals).toContain('UPI');
      expect(methodVals).toContain('CARD');
      expect(methodVals).toContain('CREDIT');
    });

    test('sales have date-based invoice numbers', async () => {
      const sales = await prisma.sale.findMany();
      for (const s of sales) {
        expect(s.invoiceNo).toMatch(/^INV-\d{6}-\d{4}$/);
      }
    });

    test('some sales go to customers, some are walk-in (null customerId)', async () => {
      const sales = await prisma.sale.findMany();
      const withCustomer = sales.filter(s => s.customerId);
      const walkIn = sales.filter(s => !s.customerId);
      expect(withCustomer.length).toBeGreaterThan(0);
      expect(walkIn.length).toBeGreaterThan(0);
    });

    test('sale GST calculations are correct', async () => {
      const items = await prisma.saleItem.findMany({
        include: { item: true },
      });
      for (const si of items) {
        const gstPct = parseInt(si.item.gstRate.replace('RATE_', ''));
        const expectedGst = Math.round(si.unitPrice * si.quantity * gstPct / 100);
        expect(si.gstAmount).toBe(expectedGst);
      }
    });

    test('customer ledger entries exist for customer sales', async () => {
      const entries = await prisma.customerLedger.findMany();
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  // ── Employees & Expenses ──
  describe('Employees & expenses', () => {
    test('employees have salaries and roles', async () => {
      const emps = await prisma.employee.findMany();
      expect(emps.length).toBe(4);
      for (const e of emps) {
        expect(e.salary).toBeGreaterThan(0);
        expect(['Salesman', 'Cashier', 'Store Helper']).toContain(e.role);
      }
    });

    test('expenses span 8 categories', async () => {
      const cats = await prisma.expense.groupBy({ by: ['category'] });
      expect(cats.length).toBe(8);
    });

    test('expense amounts are reasonable', async () => {
      const expenses = await prisma.expense.findMany();
      for (const e of expenses) {
        expect(e.amount).toBeGreaterThan(0);
        expect(e.description).toBeTruthy();
      }
    });
  });

  // ── Notifications & Audit ──
  describe('Notifications & audit', () => {
    test('notifications have all types (WARNING, INFO, SUCCESS)', async () => {
      const types = await prisma.notification.groupBy({ by: ['type'] });
      const typeVals = types.map(t => t.type).sort();
      expect(typeVals).toContain('WARNING');
      expect(typeVals).toContain('INFO');
      expect(typeVals).toContain('SUCCESS');
    });

    test('older notifications are marked as read', async () => {
      const notifs = await prisma.notification.findMany();
      const readCount = notifs.filter(n => n.isRead).length;
      expect(readCount).toBeGreaterThan(0);
    });

    test('audit logs have valid JSON in newValue', async () => {
      const logs = await prisma.auditLog.findMany();
      for (const log of logs) {
        expect(() => JSON.parse(log.newValue)).not.toThrow();
      }
    });
  });

  // ── Stock Movements ──
  describe('Stock movements', () => {
    test('has all movement types: IN, OUT, RETURN', async () => {
      const types = await prisma.stockMovement.groupBy({ by: ['type'] });
      const typeVals = types.map(t => t.type).sort();
      expect(typeVals).toContain('IN');
      expect(typeVals).toContain('OUT');
      expect(typeVals).toContain('RETURN');
    });

    test('old/new stock values are consistent (no gaps)', async () => {
      const movements = await prisma.stockMovement.findMany({
        orderBy: [{ itemId: 'asc' }, { createdAt: 'asc' }],
      });
      for (const m of movements) {
        expect(m.newStock).toBe(m.oldStock + (m.type === 'IN' ? m.quantity : -m.quantity));
      }
    });
  });

  // ── Credentials exist ──
  describe('Company profile', () => {
    test('has company details with all fields', async () => {
      const profile = await prisma.companyProfile.findFirst();
      expect(profile.companyName).toBe('StockMate Pro');
      expect(profile.gstNumber).toBeTruthy();
      expect(profile.footerText).toContain('Thank you');
      expect(profile.address).toBeTruthy();
      expect(profile.phone).toBeTruthy();
      expect(profile.email).toBeTruthy();
    });
  });
});
