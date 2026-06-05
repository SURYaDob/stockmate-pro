/**
 * Minimal seed script — for CI / fast test runs.
 *
 * Creates just enough data to exercise all CRUD endpoints without
 * the overhead of the full seed (55 products, 16 sales, etc.).
 * Should complete in < 1 second.
 *
 * Usage:  node prisma/seed.test.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

const paise = (rupees) => Math.round(rupees * 100);
const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

// ── Minimal Data ────────────────────────────────────────────────────────────

async function main() {
  console.log('🧪 Seeding test database…\n');

  // ── Clean ──
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.employeeAttendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.customerLedger.deleteMany();
  await prisma.supplierLedger.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.purchaseItem.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.branchInventory.deleteMany();
  await prisma.itemSupplier.deleteMany();
  await prisma.inventoryImage.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.categorySetting.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.userBranch.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.companyProfile.deleteMany();

  // ═══ 1. Users (2 — admin + manager) ═══
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@stockmate.com',
      phone: '+919876543210',
      password: await bcrypt.hash('Admin@123', 4), // low cost for speed
      role: 'ADMIN',
      isActive: true,
      createdAt: daysAgo(30),
    },
  });
  const manager = await prisma.user.create({
    data: {
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'manager@stockmate.com',
      phone: '+919876543211',
      password: await bcrypt.hash('Manager@123', 4),
      role: 'STORE_MANAGER',
      isActive: true,
      createdAt: daysAgo(30),
    },
  });

  // ═══ 2. Branch & Company Profile ═══
  const branch = await prisma.branch.create({
    data: {
      name: 'Test Store',
      code: 'TST-001',
      address: '123 Test Street',
      phone: '+918080001111',
      email: 'test@stockmate.com',
      gstNumber: '27AAECS1234K1Z2',
      createdAt: daysAgo(30),
    },
  });

  for (const user of [admin, manager]) {
    await prisma.userBranch.create({
      data: { userId: user.id, branchId: branch.id, isDefault: user.role === 'ADMIN' },
    });
  }

  await prisma.companyProfile.create({
    data: {
      companyName: 'StockMate Test',
      address: '123 Test Street',
      phone: '+918080001111',
      email: 'test@stockmate.com',
      gstNumber: '27AAECS1234K1Z2',
      footerText: 'Thank you!',
    },
  });

  // ═══ 3. Category ═══
  await prisma.categorySetting.create({
    data: { name: 'Electrical Supplies', slug: 'electrical', icon: 'Zap', theme: 'slate', accent: 'amber' },
  });

  // ═══ 4. Supplier & Customer (1 each) ═══
  const supplier = await prisma.supplier.create({
    data: {
      name: 'Acme Supplies',
      gstNumber: '27AABCU1234D1Z5',
      contactPerson: 'John Doe',
      phone: '+919822145678',
      email: 'john@acme.com',
      address: '42, Industrial Area',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400093',
      bankName: 'HDFC Bank',
      bankAccount: '12345678901234',
      bankIfsc: 'HDFC0001234',
      paymentTerms: 'Net 30',
      creditLimit: paise(500000),
      createdAt: daysAgo(20),
    },
  });

  const customer = await prisma.customer.create({
    data: {
      name: 'Test Builders',
      phone: '+919829874561',
      email: 'info@testbuilders.com',
      address: '12, MG Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      gstNumber: '27AAECS1234F1Z5',
      creditLimit: paise(200000),
      createdAt: daysAgo(20),
    },
  });

  // ═══ 5. Inventory (3 items — mix of categories & GST rates) ═══
  const products = [
    { name: 'PVC Insulated Copper Wire 1.5 sqmm (90m)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Finolex', unitType: 'ROLLS', purchasePrice: 1850, sellingPrice: 2499, gstRate: 'RATE_18', currentStock: 50, minStock: 10, maxStock: 100 },
    { name: 'LED Bulb 9W Warm White', category: 'ELECTRICAL', subCategory: 'Lighting', brand: 'Philips', unitType: 'PCS', purchasePrice: 65, sellingPrice: 110, gstRate: 'RATE_12', currentStock: 200, minStock: 50, maxStock: 500 },
    { name: 'PVC Pipe 1 inch (3m)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Supreme', unitType: 'PCS', purchasePrice: 180, sellingPrice: 295, gstRate: 'RATE_18', currentStock: 80, minStock: 20, maxStock: 200 },
  ];

  const createdItems = [];
  const stockMap = new Map();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const sku = `TST-${String(i + 1).padStart(3, '0')}`;
    const item = await prisma.inventory.create({
      data: {
        name: p.name,
        sku,
        category: p.category,
        subCategory: p.subCategory,
        brand: p.brand,
        unitType: p.unitType,
        currentStock: p.currentStock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstRate: p.gstRate,
        location: `Rack 1-Shelf ${i + 1}`,
        description: `${p.brand} ${p.unitType}`,
        isActive: true,
        lastMovement: daysAgo(15),
        createdById: admin.id,
        createdAt: daysAgo(15),
      },
    });
    stockMap.set(item.id, p.currentStock);
    createdItems.push(item);

    await prisma.stockMovement.create({
      data: {
        itemId: item.id,
        branchId: branch.id,
        type: 'IN',
        quantity: p.currentStock,
        reason: 'Initial stock setup',
        oldStock: 0,
        newStock: p.currentStock,
        createdById: admin.id,
        createdAt: daysAgo(15),
      },
    });

    await prisma.itemSupplier.create({
      data: { itemId: item.id, supplierId: supplier.id, isPreferred: true, lastPrice: p.purchasePrice },
    });
  }

  // ═══ 6. Purchase Order (1 — received & paid) ═══
  const poDate = daysAgo(10);
  const poNumber = `PO-TEST-0001`;

  const poItems = [
    { item: createdItems[0], qty: 10, price: 1850 },
    { item: createdItems[1], qty: 50, price: 65 },
  ];

  let subtotal = 0;
  let gstTotal = 0;
  const purchaseItemData = [];

  for (const pi of poItems) {
    const gstPct = parseInt(pi.item.gstRate.replace('RATE_', ''));
    const lineTotal = pi.price * pi.qty;
    const gstAmt = Math.round(lineTotal * gstPct / 100);
    subtotal += lineTotal;
    gstTotal += gstAmt;
    purchaseItemData.push({ ...pi, lineTotal, gstAmt, totalPrice: lineTotal + gstAmt, gstPct });
  }

  const grandTotal = subtotal + gstTotal;

  const purchase = await prisma.purchase.create({
    data: {
      poNumber,
      supplierId: supplier.id,
      branchId: branch.id,
      userId: manager.id,
      orderDate: poDate,
      expectedDate: new Date(poDate.getTime() + 7 * 86400000),
      status: 'RECEIVED',
      subtotal,
      discountTotal: 0,
      gstTotal,
      grandTotal,
      paidAmount: grandTotal,
      balanceAmount: 0,
      paymentStatus: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      notes: `Test PO — ${poItems.length} items from ${supplier.name}`,
      supplierInvoice: 'SI-TEST-0001',
      supplierInvDate: poDate,
      createdAt: poDate,
    },
  });

  for (const pi of purchaseItemData) {
    await prisma.purchaseItem.create({
      data: {
        purchaseId: purchase.id,
        itemId: pi.item.id,
        quantity: pi.qty,
        receivedQty: pi.qty,
        unitPrice: pi.price,
        discount: 0,
        gstAmount: pi.gstAmt,
        totalPrice: pi.totalPrice,
        gstRate: pi.item.gstRate,
      },
    });

    // Stock in
    const oldStock = stockMap.get(pi.item.id) || 0;
    const newStock = oldStock + pi.qty;
    stockMap.set(pi.item.id, newStock);

    await prisma.inventory.update({
      where: { id: pi.item.id },
      data: { currentStock: { increment: pi.qty }, lastMovement: poDate },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: pi.item.id,
        branchId: branch.id,
        type: 'IN',
        quantity: pi.qty,
        reason: `Purchase Receive — ${poNumber}`,
        reference: poNumber,
        oldStock,
        newStock,
        createdById: manager.id,
        createdAt: poDate,
      },
    });
  }

  // Supplier ledger
  await prisma.supplierLedger.create({
    data: {
      supplierId: supplier.id,
      date: poDate,
      type: 'PURCHASE',
      amount: grandTotal,
      balance: 0,
      description: `Purchase ${poNumber}`,
      referenceId: purchase.id,
    },
  });
  await prisma.supplierLedger.create({
    data: {
      supplierId: supplier.id,
      date: poDate,
      type: 'PAYMENT',
      amount: -grandTotal,
      balance: 0,
      description: `Payment for ${poNumber}`,
      referenceId: purchase.id,
    },
  });

  // ═══ 7. Purchase Return (1 — defective item) ═══
  const returnDate = daysAgo(5);
  const returnItem = createdItems[0]; // Copper wire
  const returnQty = 2;
  const refund = 1850 * returnQty; // unitPrice * qty

  const oldStock = stockMap.get(returnItem.id) || 0;
  const newStock = oldStock - returnQty;
  stockMap.set(returnItem.id, newStock);

  await prisma.inventory.update({
    where: { id: returnItem.id },
    data: { currentStock: { decrement: returnQty }, lastMovement: returnDate },
  });

  await prisma.stockMovement.create({
    data: {
      itemId: returnItem.id,
      branchId: branch.id,
      type: 'RETURN',
      quantity: returnQty,
      reason: 'Return to supplier — Manufacturing defect in PVC coating',
      reference: poNumber,
      oldStock,
      newStock,
      createdById: manager.id,
      createdAt: returnDate,
    },
  });

  const purchaseItemRecord = await prisma.purchaseItem.findFirst({
    where: { purchaseId: purchase.id, itemId: returnItem.id },
  });
  if (purchaseItemRecord) {
    await prisma.purchaseItem.update({
      where: { id: purchaseItemRecord.id },
      data: { receivedQty: { decrement: returnQty } },
    });
  }

  const lastLedger = await prisma.supplierLedger.findFirst({
    where: { supplierId: supplier.id },
    orderBy: { createdAt: 'desc' },
  });
  await prisma.supplierLedger.create({
    data: {
      supplierId: supplier.id,
      date: returnDate,
      type: 'DEBIT_NOTE',
      amount: -refund,
      balance: (lastLedger?.balance || 0) - refund,
      description: `Return to supplier — ${poNumber} (Manufacturing defect)`,
      referenceId: purchase.id,
    },
  });
  await prisma.supplier.update({
    where: { id: supplier.id },
    data: { outstanding: { decrement: refund } },
  });

  await prisma.auditLog.create({
    data: {
      userId: manager.id,
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase.id,
      newValue: JSON.stringify({ action: 'return-to-supplier', poNumber, refund }),
      createdAt: returnDate,
    },
  });

  // ═══ 8. Sale (1 — cash sale to customer) ═══
  const saleDate = daysAgo(3);
  const invoiceNo = 'INV-TEST-0001';

  const saleItems = [
    { item: createdItems[1], qty: 10, price: 110 }, // LED Bulbs
    { item: createdItems[2], qty: 5, price: 295 },  // PVC Pipe
  ];

  let saleSubtotal = 0;
  let saleGstTotal = 0;
  const saleItemData = [];

  for (const si of saleItems) {
    const gstPct = parseInt(si.item.gstRate.replace('RATE_', ''));
    const itemSub = si.price * si.qty;
    const itemGst = Math.round(itemSub * gstPct / 100);
    const itemTotal = itemSub + itemGst;
    saleSubtotal += itemSub;
    saleGstTotal += itemGst;
    saleItemData.push({ ...si, itemSub, itemGst, itemTotal, gstPct });
  }

  const saleGrandTotal = saleSubtotal + saleGstTotal;

  const sale = await prisma.sale.create({
    data: {
      invoiceNo,
      customerId: customer.id,
      branchId: branch.id,
      userId: manager.id,
      subtotal: saleSubtotal,
      discountTotal: 0,
      gstTotal: saleGstTotal,
      grandTotal: saleGrandTotal,
      paidAmount: saleGrandTotal,
      balanceAmount: 0,
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      notes: `Test sale to ${customer.name}`,
      createdAt: saleDate,
    },
  });

  for (const si of saleItemData) {
    await prisma.saleItem.create({
      data: {
        saleId: sale.id,
        itemId: si.item.id,
        quantity: si.qty,
        unitPrice: si.price,
        discount: 0,
        gstAmount: si.itemGst,
        totalPrice: si.itemTotal,
        gstRate: si.item.gstRate,
      },
    });

    const so = stockMap.get(si.item.id) || 0;
    const sn = so - si.qty;
    stockMap.set(si.item.id, sn);

    await prisma.inventory.update({
      where: { id: si.item.id },
      data: { currentStock: { decrement: si.qty }, lastMovement: saleDate },
    });

    await prisma.stockMovement.create({
      data: {
        itemId: si.item.id,
        branchId: branch.id,
        type: 'OUT',
        quantity: si.qty,
        reason: `Sale — ${invoiceNo}`,
        reference: invoiceNo,
        oldStock: so,
        newStock: sn,
        createdById: manager.id,
        createdAt: saleDate,
      },
    });
  }

  // Customer ledger
  await prisma.customerLedger.create({
    data: {
      customerId: customer.id,
      date: saleDate,
      type: 'SALE',
      amount: saleGrandTotal,
      balance: 0,
      description: `Sale ${invoiceNo}`,
      referenceId: sale.id,
    },
  });
  await prisma.customerLedger.create({
    data: {
      customerId: customer.id,
      date: saleDate,
      type: 'PAYMENT',
      amount: -saleGrandTotal,
      balance: 0,
      description: `Payment for ${invoiceNo}`,
      referenceId: sale.id,
    },
  });

  // ═══ 9. Employee + Attendance ═══
  const employee = await prisma.employee.create({
    data: {
      name: 'Test Employee',
      phone: '+918765432101',
      role: 'Salesman',
      salary: paise(12000),
      branchId: branch.id,
      createdAt: daysAgo(20),
    },
  });

  for (let d = 1; d <= 5; d++) {
    const date = new Date(daysAgo(d));
    date.setHours(0, 0, 0, 0);
    if (date.getDay() === 0) continue; // skip Sunday
    const clockIn = new Date(date); clockIn.setHours(9, 0, 0, 0);
    const clockOut = new Date(date); clockOut.setHours(18, 0, 0, 0);

    await prisma.employeeAttendance.create({
      data: {
        employeeId: employee.id,
        userId: admin.id,
        date,
        clockIn,
        clockOut,
        hoursWorked: 9,
        status: 'PRESENT',
      },
    });
  }

  // ═══ 10. Expenses (2) ═══
  await prisma.expense.create({
    data: {
      branchId: branch.id,
      userId: admin.id,
      category: 'RENT',
      amount: paise(25000),
      date: daysAgo(1),
      description: 'Monthly rent',
      createdAt: daysAgo(1),
    },
  });
  await prisma.expense.create({
    data: {
      branchId: branch.id,
      userId: admin.id,
      category: 'UTILITY_BILLS',
      amount: paise(4500),
      date: daysAgo(2),
      description: 'Electricity bill',
      createdAt: daysAgo(2),
    },
  });

  // ═══ 11. Notifications & Preferences ═══
  await prisma.notification.create({
    data: {
      userId: manager.id,
      title: 'Low Stock Alert',
      message: 'Test item is below minimum stock. Reorder soon.',
      type: 'WARNING',
      reference: 'inventory',
      isRead: false,
      createdAt: daysAgo(1),
    },
  });
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: 'Daily Summary',
      message: 'Test daily summary.',
      type: 'INFO',
      reference: 'dashboard',
      isRead: true,
      createdAt: daysAgo(3),
    },
  });

  for (const user of [admin, manager]) {
    await prisma.notificationPreference.create({ data: { userId: user.id } });
  }

  // ═══ 12. Audit Logs ═══
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      branchId: branch.id,
      action: 'CREATE',
      entity: 'Inventory',
      entityId: createdItems[0].id,
      newValue: JSON.stringify({ name: createdItems[0].name }),
      createdAt: daysAgo(15),
    },
  });
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      branchId: branch.id,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      newValue: JSON.stringify({ invoiceNo }),
      createdAt: saleDate,
    },
  });

  // ═══ 13. Branch Inventory Links ═══
  for (const item of createdItems) {
    await prisma.branchInventory.create({
      data: { branchId: branch.id, itemId: item.id, stock: stockMap.get(item.id) || 0 },
    });
  }

  // ═══ Summary ═══
  console.log('✅ Test seed completed!');
  console.log(`   Users:       2`);
  console.log(`   Products:    ${createdItems.length}`);
  console.log(`   Purchases:   1 (with 1 return)`);
  console.log(`   Sales:       1`);
  console.log(`   Employees:   1 (5 attendance records)`);
  console.log(`   Expenses:    2`);
  console.log('');
  console.log('🔑 Credentials:');
  console.log(`   ADMIN          admin@stockmate.com    Admin@123`);
  console.log(`   STORE_MANAGER  manager@stockmate.com  Manager@123`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Test seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
