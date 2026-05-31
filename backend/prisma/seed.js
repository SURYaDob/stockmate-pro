const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// ============ HELPERS ============

const paise = (rupees) => Math.round(rupees * 100);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - randomInt(1, daysAgo));
  d.setHours(randomInt(9, 18), randomInt(0, 59), 0, 0);
  return d;
};
const pastDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(0, 0, 0, 0);
  return d;
};
const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

// ============ SEED DATA ============

const CATEGORY_SETTINGS = [
  { name: 'Electrical Supplies', slug: 'electrical', icon: 'Zap', theme: 'slate', accent: 'amber' },
  { name: 'Paint & Coating', slug: 'painting', icon: 'Palette', theme: 'slate', accent: 'amber' },
  { name: 'Plumbing & Sanitary', slug: 'plumbing', icon: 'Droplet', theme: 'slate', accent: 'amber' },
  { name: 'Hardware & Tools', slug: 'hardware', icon: 'Wrench', theme: 'slate', accent: 'amber' },
  { name: 'Safety Equipment', slug: 'safety', icon: 'Shield', theme: 'slate', accent: 'amber' },
  { name: 'Sanitaryware', slug: 'sanitary', icon: 'Bath', theme: 'slate', accent: 'amber' },
  { name: 'Construction Material', slug: 'construction', icon: 'HardHat', theme: 'slate', accent: 'amber' },
];

const USERS = [
  { firstName: 'Admin', lastName: 'User', email: 'admin@stockmate.com', phone: '+919876543210', role: 'ADMIN', password: 'Admin@123' },
  { firstName: 'Rajesh', lastName: 'Kumar', email: 'manager@stockmate.com', phone: '+919876543211', role: 'STORE_MANAGER', password: 'Manager@123' },
  { firstName: 'Sunil', lastName: 'Verma', email: 'staff@stockmate.com', phone: '+919876543212', role: 'STAFF', password: 'Staff@123' },
  { firstName: 'Priya', lastName: 'Sharma', email: 'accountant@stockmate.com', phone: '+919876543213', role: 'ACCOUNTANT', password: 'Accountant@123' },
];

const SUPPLIERS = [
  { name: 'Reliance Electricals Pvt Ltd', gstNumber: '27AABCU1234D1Z5', contactPerson: 'Amit Shah', phone: '+919822145678', email: 'amit@relianceelectricals.com', address: '42, MIDC Industrial Area', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', bankName: 'HDFC Bank', bankAccount: '12345678901234', bankIfsc: 'HDFC0001234', paymentTerms: 'Net 30', creditLimit: paise(500000) },
  { name: 'Bihar Pipe & Fittings Co', gstNumber: '10BPCF5678E1ZP', contactPerson: 'Suresh Yadav', phone: '+918092345671', email: 'suresh@biharpipe.com', address: '15, Industrial Estate', city: 'Patna', state: 'Bihar', pincode: '800001', bankName: 'SBI', bankAccount: '98765432109876', bankIfsc: 'SBIN0001234', paymentTerms: 'Net 45', creditLimit: paise(300000) },
  { name: 'Asian Paints Distributors', gstNumber: '29AAFFA1234G1Z4', contactPerson: 'Vikram Mehta', phone: '+919761234567', email: 'vikram@asianpaints.in', address: '88, Auction Centre', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', bankName: 'ICICI Bank', bankAccount: '45678901234567', bankIfsc: 'ICIC0005678', paymentTerms: 'Net 30', creditLimit: paise(400000) },
  { name: 'Tata Steel & Hardware', gstNumber: '19AAACT3456H1Z2', contactPerson: 'Rohit Desai', phone: '+918045678902', email: 'rohit@tatasteel.com', address: '55, Industrial Zone', city: 'Jamshedpur', state: 'Jharkhand', pincode: '831001', bankName: 'Axis Bank', bankAccount: '23456789012345', bankIfsc: 'UTIB0007890', paymentTerms: 'Net 60', creditLimit: paise(600000) },
  { name: 'Sanitary World Pvt Ltd', gstNumber: '07AABCS5678K1Z3', contactPerson: 'Deepak Gupta', phone: '+919358901234', email: 'deepak@sanitaryworld.com', address: '22, Lajpat Nagar', city: 'Delhi', state: 'Delhi', pincode: '110024', bankName: 'Kotak Mahindra', bankAccount: '34567890123456', bankIfsc: 'KKBK0001234', paymentTerms: 'Net 30', creditLimit: paise(350000) },
];

const CUSTOMERS = [
  { name: 'Sharma Construction Co', phone: '+919829874561', email: 'info@sharmaconstruction.com', address: '12, MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstNumber: '27AAECS1234F1Z5', creditLimit: paise(200000) },
  { name: 'Vijay Hardware Store', phone: '+919915674320', email: 'vijay.hardware@gmail.com', address: '78, Station Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', creditLimit: paise(100000) },
  { name: 'Ramesh Kumar (Walk-in)', phone: '+919987654300', address: '45, Nehru Nagar', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' },
];

// 50 Products with realistic names for each category
const PRODUCTS = [
  // ELECTRICAL (8 products)
  { name: 'PVC Insulated Copper Wire 1.5 sqmm (90m Roll)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Finolex', model: 'FR PVC 1.5', unitType: 'ROLLS', purchasePrice: 1850, sellingPrice: 2499, gstRate: 'RATE_18', currentStock: 45, minStock: 10, maxStock: 100 },
  { name: 'PVC Insulated Copper Wire 2.5 sqmm (90m Roll)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Finolex', model: 'FR PVC 2.5', unitType: 'ROLLS', purchasePrice: 3200, sellingPrice: 4299, gstRate: 'RATE_18', currentStock: 30, minStock: 10, maxStock: 80 },
  { name: 'MCB 6 Amp Single Pole', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Havells', model: 'DHM6', unitType: 'PCS', purchasePrice: 85, sellingPrice: 145, gstRate: 'RATE_18', currentStock: 200, minStock: 50, maxStock: 500 },
  { name: 'MCB 16 Amp Single Pole', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Havells', model: 'DHM16', unitType: 'PCS', purchasePrice: 95, sellingPrice: 165, gstRate: 'RATE_18', currentStock: 150, minStock: 50, maxStock: 400 },
  { name: 'LED Bulb 9W Warm White', category: 'ELECTRICAL', subCategory: 'Lighting', brand: 'Philips', model: 'Essential 9W', unitType: 'PCS', purchasePrice: 65, sellingPrice: 110, gstRate: 'RATE_12', currentStock: 300, minStock: 100, maxStock: 600 },
  { name: 'LED Batten 20W Cool Day', category: 'ELECTRICAL', subCategory: 'Lighting', brand: 'Havells', model: 'Adonis 20W', unitType: 'PCS', purchasePrice: 220, sellingPrice: 375, gstRate: 'RATE_12', currentStock: 80, minStock: 20, maxStock: 200 },
  { name: 'Modular Switch 1 Way', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Anchor', model: 'Roma 1W', unitType: 'PCS', purchasePrice: 28, sellingPrice: 55, gstRate: 'RATE_18', currentStock: 500, minStock: 100, maxStock: 1000 },
  { name: 'Copper Flexible Wire 1.0 sqmm (Red, 90m)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Polycab', model: 'FR-LSH 1.0', unitType: 'ROLLS', purchasePrice: 1050, sellingPrice: 1499, gstRate: 'RATE_18', currentStock: 25, minStock: 10, maxStock: 60 },

  // PLUMBING (8 products)
  { name: 'PVC Pipe 1 inch (3m Length)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Supreme', model: 'Astral 1"', unitType: 'PCS', purchasePrice: 180, sellingPrice: 295, gstRate: 'RATE_18', currentStock: 120, minStock: 30, maxStock: 300 },
  { name: 'PVC Pipe 1/2 inch (3m Length)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Supreme', model: 'Astral 1/2"', unitType: 'PCS', purchasePrice: 110, sellingPrice: 195, gstRate: 'RATE_18', currentStock: 200, minStock: 50, maxStock: 400 },
  { name: 'Ball Valve 1 inch Brass', category: 'PLUMBING', subCategory: 'Valves', brand: 'Jaquar', model: 'Brass BV 1"', unitType: 'PCS', purchasePrice: 320, sellingPrice: 525, gstRate: 'RATE_18', currentStock: 60, minStock: 20, maxStock: 150 },
  { name: 'Ball Valve 1/2 inch Brass', category: 'PLUMBING', subCategory: 'Valves', brand: 'Jaquar', model: 'Brass BV 1/2"', unitType: 'PCS', purchasePrice: 210, sellingPrice: 365, gstRate: 'RATE_18', currentStock: 90, minStock: 20, maxStock: 200 },
  { name: 'CPVC Pipe 1 inch (3m)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Astral', model: 'CPVC 1"', unitType: 'PCS', purchasePrice: 250, sellingPrice: 420, gstRate: 'RATE_18', currentStock: 75, minStock: 20, maxStock: 150 },
  { name: 'Water Tank Connector 1 inch', category: 'PLUMBING', subCategory: 'Fittings', brand: 'Cello', model: 'WS-101', unitType: 'PCS', purchasePrice: 45, sellingPrice: 85, gstRate: 'RATE_18', currentStock: 150, minStock: 30, maxStock: 300 },
  { name: 'PVC Solvent Cement 50ml', category: 'PLUMBING', subCategory: 'Chemicals', brand: 'Weld-On', model: 'P-68', unitType: 'PCS', purchasePrice: 55, sellingPrice: 110, gstRate: 'RATE_18', currentStock: 180, minStock: 50, maxStock: 400 },
  { name: 'Teflon Tape Roll (12mm x 10m)', category: 'PLUMBING', subCategory: 'Sealants', brand: 'UniSeal', model: 'TF-12', unitType: 'ROLLS', purchasePrice: 18, sellingPrice: 35, gstRate: 'RATE_12', currentStock: 400, minStock: 100, maxStock: 800 },

  // PAINTING (7 products)
  { name: 'Asian Paints Royale Shyne 1L', category: 'PAINTING', subCategory: 'Interior Emulsion', brand: 'Asian Paints', model: 'Royale Shyne', unitType: 'LITERS', purchasePrice: 280, sellingPrice: 465, gstRate: 'RATE_18', currentStock: 35, minStock: 10, maxStock: 80 },
  { name: 'Asian Paints Royale Shyne 4L', category: 'PAINTING', subCategory: 'Interior Emulsion', brand: 'Asian Paints', model: 'Royale Shyne', unitType: 'LITERS', purchasePrice: 980, sellingPrice: 1599, gstRate: 'RATE_18', currentStock: 20, minStock: 5, maxStock: 40 },
  { name: 'Berger Express Paint 1L (Metal)', category: 'PAINTING', subCategory: 'Enamel', brand: 'Berger', model: 'Express 1L', unitType: 'LITERS', purchasePrice: 165, sellingPrice: 285, gstRate: 'RATE_18', currentStock: 50, minStock: 15, maxStock: 100 },
  { name: 'Nerolac Primer 1L', category: 'PAINTING', subCategory: 'Primer', brand: 'Nerolac', model: 'Premium Primer', unitType: 'LITERS', purchasePrice: 195, sellingPrice: 330, gstRate: 'RATE_18', currentStock: 25, minStock: 10, maxStock: 60 },
  { name: 'Paint Brush 4 inch', category: 'PAINTING', subCategory: 'Tools', brand: 'Asian Paints', model: 'Pro 4"', unitType: 'PCS', purchasePrice: 55, sellingPrice: 105, gstRate: 'RATE_12', currentStock: 100, minStock: 30, maxStock: 200 },
  { name: 'Wall Putty 10kg', category: 'PAINTING', subCategory: 'Surface Prep', brand: 'Birla', model: 'White Wall Putty', unitType: 'KG', purchasePrice: 145, sellingPrice: 260, gstRate: 'RATE_18', currentStock: 40, minStock: 10, maxStock: 80 },
  { name: 'Sandpaper Sheet (Grit 120)', category: 'PAINTING', subCategory: 'Tools', brand: '3M', model: 'Grit 120', unitType: 'PCS', purchasePrice: 8, sellingPrice: 15, gstRate: 'RATE_12', currentStock: 600, minStock: 200, maxStock: 1000 },

  // HARDWARE (7 products)
  { name: 'MS Angle 40x40x6mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'Tata Steel', model: 'MS Angle 40', unitType: 'PCS', purchasePrice: 480, sellingPrice: 755, gstRate: 'RATE_18', currentStock: 30, minStock: 10, maxStock: 60 },
  { name: 'GI Pipe 1 inch (3m)', category: 'HARDWARE', subCategory: 'Pipes', brand: 'JSW Steel', model: 'GI 1"', unitType: 'PCS', purchasePrice: 620, sellingPrice: 995, gstRate: 'RATE_18', currentStock: 25, minStock: 10, maxStock: 50 },
  { name: 'Nails 4 inch (1kg pack)', category: 'HARDWARE', subCategory: 'Fasteners', brand: 'Elephant', model: '4" Wire Nails', unitType: 'KG', purchasePrice: 65, sellingPrice: 120, gstRate: 'RATE_18', currentStock: 80, minStock: 20, maxStock: 200 },
  { name: 'MS Flat Bar 25x5mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'Tata Steel', model: 'MS Flat 25', unitType: 'PCS', purchasePrice: 320, sellingPrice: 525, gstRate: 'RATE_18', currentStock: 35, minStock: 10, maxStock: 70 },
  { name: 'Welding Electrode 3.15mm (1kg)', category: 'HARDWARE', subCategory: 'Welding', brand: 'Ador', model: 'Supercito 3.15', unitType: 'KG', purchasePrice: 85, sellingPrice: 155, gstRate: 'RATE_18', currentStock: 60, minStock: 15, maxStock: 150 },
  { name: 'MS Square Pipe 25x25mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'APL Apollo', model: 'MS Square 25', unitType: 'PCS', purchasePrice: 390, sellingPrice: 625, gstRate: 'RATE_18', currentStock: 20, minStock: 8, maxStock: 50 },
  { name: 'GI Wire 1mm (1kg roll)', category: 'HARDWARE', subCategory: 'Wires', brand: 'Tata Wiron', model: 'GI 1mm', unitType: 'ROLLS', purchasePrice: 72, sellingPrice: 135, gstRate: 'RATE_18', currentStock: 55, minStock: 15, maxStock: 120 },

  // TOOLS (7 products)
  { name: 'PVC Pipe Cutter (Ratchet Type)', category: 'TOOLS', subCategory: 'Cutting Tools', brand: 'Knipex', model: 'PC-42', unitType: 'PCS', purchasePrice: 380, sellingPrice: 625, gstRate: 'RATE_18', currentStock: 15, minStock: 5, maxStock: 40 },
  { name: 'Adjustable Spanner 8 inch', category: 'TOOLS', subCategory: 'Wrenches', brand: 'Taparia', model: 'AS-8"', unitType: 'PCS', purchasePrice: 145, sellingPrice: 265, gstRate: 'RATE_18', currentStock: 40, minStock: 10, maxStock: 100 },
  { name: 'Screwdriver Set (6 pcs)', category: 'TOOLS', subCategory: 'Screwdrivers', brand: 'Stanley', model: 'SD-6PK', unitType: 'BOXES', purchasePrice: 210, sellingPrice: 375, gstRate: 'RATE_18', currentStock: 25, minStock: 10, maxStock: 60 },
  { name: 'Claw Hammer 500g', category: 'TOOLS', subCategory: 'Hammers', brand: 'Taparia', model: 'CH-500', unitType: 'PCS', purchasePrice: 165, sellingPrice: 295, gstRate: 'RATE_18', currentStock: 30, minStock: 10, maxStock: 80 },
  { name: 'Measuring Tape 5m', category: 'TOOLS', subCategory: 'Measuring', brand: 'Fiberbond', model: 'FT-5M', unitType: 'PCS', purchasePrice: 85, sellingPrice: 165, gstRate: 'RATE_18', currentStock: 55, minStock: 20, maxStock: 120 },
  { name: 'Hacksaw Frame 12 inch', category: 'TOOLS', subCategory: 'Cutting Tools', brand: 'Stanley', model: 'HS-12"', unitType: 'PCS', purchasePrice: 175, sellingPrice: 310, gstRate: 'RATE_18', currentStock: 22, minStock: 8, maxStock: 60 },
  { name: 'Spirit Level 24 inch', category: 'TOOLS', subCategory: 'Measuring', brand: 'Stanley', model: 'SL-24"', unitType: 'PCS', purchasePrice: 195, sellingPrice: 345, gstRate: 'RATE_18', currentStock: 18, minStock: 5, maxStock: 40 },

  // SANITARY (7 products)
  { name: 'Wall Mounted WC (EWC) White', category: 'SANITARY', subCategory: 'Toilets', brand: 'Cera', model: 'Europa EWC', unitType: 'PCS', purchasePrice: 1850, sellingPrice: 2999, gstRate: 'RATE_18', currentStock: 10, minStock: 3, maxStock: 25 },
  { name: 'Wash Basin Oval 45cm', category: 'SANITARY', subCategory: 'Basins', brand: 'Parryware', model: 'Oval WS-45', unitType: 'PCS', purchasePrice: 1200, sellingPrice: 1995, gstRate: 'RATE_18', currentStock: 8, minStock: 3, maxStock: 20 },
  { name: 'Kitchen Sink Single Bowl 600mm', category: 'SANITARY', subCategory: 'Sinks', brand: 'Nirali', model: 'SS-600', unitType: 'PCS', purchasePrice: 2250, sellingPrice: 3599, gstRate: 'RATE_18', currentStock: 6, minStock: 2, maxStock: 15 },
  { name: 'Pillar Tap Chrome 1/2"', category: 'SANITARY', subCategory: 'Taps', brand: 'Jaquar', model: 'Essence PT-01', unitType: 'PCS', purchasePrice: 380, sellingPrice: 650, gstRate: 'RATE_18', currentStock: 35, minStock: 10, maxStock: 80 },
  { name: 'Angle Valve 1/2" Chrome', category: 'SANITARY', subCategory: 'Valves', brand: 'Jaquar', model: 'AV-01', unitType: 'PCS', purchasePrice: 120, sellingPrice: 220, gstRate: 'RATE_18', currentStock: 60, minStock: 20, maxStock: 150 },
  { name: 'Towah Body Shower Kit', category: 'SANITARY', subCategory: 'Showers', brand: 'Jaquar', model: 'Towah SH-01', unitType: 'PCS', purchasePrice: 650, sellingPrice: 1099, gstRate: 'RATE_18', currentStock: 15, minStock: 5, maxStock: 40 },
  { name: 'Bathroom Mirror 60x45cm', category: 'SANITARY', subCategory: 'Accessories', brand: 'AIS Glass', model: 'BM-6045', unitType: 'PCS', purchasePrice: 850, sellingPrice: 1399, gstRate: 'RATE_18', currentStock: 12, minStock: 4, maxStock: 30 },

  // SAFETY EQUIPMENT (6 products)
  { name: 'Safety Helmet (White, IS Marked)', category: 'SAFETY_EQUIPMENT', subCategory: 'Head Protection', brand: '3M', model: 'SH-100W', unitType: 'PCS', purchasePrice: 120, sellingPrice: 245, gstRate: 'RATE_12', currentStock: 50, minStock: 15, maxStock: 120 },
  { name: 'Safety Goggles (Clear)', category: 'SAFETY_EQUIPMENT', subCategory: 'Eye Protection', brand: '3M', model: 'SG-200', unitType: 'PCS', purchasePrice: 65, sellingPrice: 145, gstRate: 'RATE_12', currentStock: 80, minStock: 20, maxStock: 200 },
  { name: 'Leather Hand Gloves (Pair)', category: 'SAFETY_EQUIPMENT', subCategory: 'Hand Protection', brand: 'Venom', model: 'LG-500', unitType: 'PAIRS', purchasePrice: 55, sellingPrice: 110, gstRate: 'RATE_12', currentStock: 100, minStock: 30, maxStock: 250 },
  { name: 'N95 Dust Mask (Box of 10)', category: 'SAFETY_EQUIPMENT', subCategory: 'Respiratory', brand: '3M', model: 'N95-10PK', unitType: 'BOXES', purchasePrice: 180, sellingPrice: 325, gstRate: 'RATE_12', currentStock: 40, minStock: 10, maxStock: 100 },
  { name: 'Safety Vest (Orange) Reflective', category: 'SAFETY_EQUIPMENT', subCategory: 'High Visibility', brand: 'SafeGuard', model: 'SV-OR', unitType: 'PCS', purchasePrice: 85, sellingPrice: 175, gstRate: 'RATE_12', currentStock: 35, minStock: 10, maxStock: 80 },
  { name: 'Safety Shoes Steel Toe (Size 8)', category: 'SAFETY_EQUIPMENT', subCategory: 'Footwear', brand: 'Bata', model: 'SS-428', unitType: 'PAIRS', purchasePrice: 520, sellingPrice: 895, gstRate: 'RATE_12', currentStock: 20, minStock: 5, maxStock: 50 },
];

// Employee data
const EMPLOYEES = [
  { name: 'Mohan Singh', phone: '+918765432101', role: 'Salesman', salary: paise(15000) },
  { name: 'Sita Devi', phone: '+918765432102', role: 'Cashier', salary: paise(12000) },
  { name: 'Ravi Kumar', phone: '+918765432103', role: 'Store Helper', salary: paise(10000) },
  { name: 'Anita Sharma', phone: '+918765432104', role: 'Salesman', salary: paise(14000) },
];

// ============ MAIN SEED FUNCTION ============

async function main() {
  console.log('🌱 Seeding StockMate Pro database...\n');

  // Clean existing data in reverse dependency order
  console.log('🧹 Clearing existing data...');
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
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
  console.log('   Done.\n');

  // 1. Create Users
  console.log('👤 Creating users...');
  const createdUsers = {};
  for (const u of USERS) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.create({
      data: {
        email: u.email,
        phone: u.phone,
        password: hashedPassword,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: true,
        createdAt: daysAgo(60),
      },
    });
    createdUsers[u.role] = user;
    console.log(`   ${u.firstName} ${u.lastName} (${u.role}) — ${u.email}`);
  }

  // 2. Create Branch
  console.log('\n🏢 Creating branch...');
  const branch = await prisma.branch.create({
    data: {
      name: 'StockMate Pro — Main Store',
      code: 'SMP-001',
      address: 'Plot No. 17, Sector 12, Industrial Area',
      phone: '+918080001111',
      email: 'store@stockmate.com',
      gstNumber: '27AAECS1234K1Z2',
      createdAt: daysAgo(60),
    },
  });
  console.log(`   ${branch.name} (${branch.code})`);

  // Assign all users to branch
  for (const [, user] of Object.entries(createdUsers)) {
    await prisma.userBranch.create({
      data: {
        userId: user.id,
        branchId: branch.id,
        isDefault: user.role === 'ADMIN' || user.role === 'STORE_MANAGER',
      },
    });
  }

  // 3. Create Category Settings
  console.log('\n📁 Creating category settings...');
  for (const cat of CATEGORY_SETTINGS) {
    await prisma.categorySetting.create({ data: cat });
  }
  console.log(`   ${CATEGORY_SETTINGS.length} categories created`);

  // 4. Create Suppliers
  console.log('\n🚚 Creating suppliers...');
  const createdSuppliers = [];
  for (const s of SUPPLIERS) {
    const supplier = await prisma.supplier.create({
      data: { ...s, createdAt: daysAgo(55) },
    });
    createdSuppliers.push(supplier);
    console.log(`   ${supplier.name}`);
  }

  // 5. Create Customers
  console.log('\n👥 Creating customers...');
  const createdCustomers = [];
  for (const c of CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: { ...c, createdAt: daysAgo(45) },
    });
    createdCustomers.push(customer);
    console.log(`   ${customer.name}`);
  }

  // 6. Create Inventory Items
  console.log('\n📦 Creating inventory items...');
  const createdItems = [];
  const itemSuppliersData = [];

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const lastMovement = p.currentStock > 0 ? randomDate(60) : null;
    const sku = `${p.category.substring(0, 3)}-${p.brand.substring(0, 2).toUpperCase()}-${p.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;

    const item = await prisma.inventory.create({
      data: {
        name: p.name,
        sku,
        category: p.category,
        subCategory: p.subCategory || null,
        brand: p.brand || null,
        model: p.model || null,
        unitType: p.unitType,
        currentStock: p.currentStock,
        minStock: p.minStock,
        maxStock: p.maxStock,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        gstRate: p.gstRate,
        location: `Rack ${Math.ceil((i + 1) / 8)}-Shelf ${((i % 8) + 1)}`,
        description: `${p.brand} ${p.model} — ${p.subCategory || ''}`,
        isActive: true,
        lastMovement: lastMovement || undefined,
        createdById: createdUsers.ADMIN.id,
        createdAt: daysAgo(55),
      },
    });

    // Initial stock movement
    if (p.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          branchId: branch.id,
          type: 'IN',
          quantity: p.currentStock,
          reason: 'Initial stock',
          oldStock: 0,
          newStock: p.currentStock,
          createdById: createdUsers.ADMIN.id,
          createdAt: daysAgo(55),
        },
      });
    }

    // Assign 1-2 suppliers per item
    const numSuppliers = Math.min(randomInt(1, 2), createdSuppliers.length);
    const assignedSuppliers = [];
    for (let s = 0; s < numSuppliers; s++) {
      const sp = createdSuppliers[randomInt(0, createdSuppliers.length - 1)];
      if (!assignedSuppliers.includes(sp.id)) {
        assignedSuppliers.push(sp.id);
        itemSuppliersData.push({
          itemId: item.id,
          supplierId: sp.id,
          isPreferred: s === 0,
          lastPrice: p.purchasePrice,
        });
      }
    }

    createdItems.push(item);
    if ((i + 1) % 10 === 0) console.log(`   ${i + 1} items created...`);
  }
  console.log(`   ${createdItems.length} total items created`);

  // Link item-supplier relationships
  console.log('\n🔗 Linking item-supplier relationships...');
  for (const isData of itemSuppliersData) {
    await prisma.itemSupplier.create({ data: isData });
  }
  console.log(`   ${itemSuppliersData.length} links created`);

  // 7. Create Purchase Orders (5 POs)
  console.log('\n📋 Creating purchase orders...');
  const createdPurchases = [];
  const poItemsData = [];

  const adminUser = createdUsers.ADMIN;
  const managerUser = createdUsers.STORE_MANAGER;

  const purchaseData = [
    { supplierIdx: 0, user: managerUser, status: 'RECEIVED', days: 50, items: [
      { itemIdx: 0, qty: 20, price: 1850 },   // Finolex 1.5mm wire
      { itemIdx: 1, qty: 15, price: 3200 },   // Finolex 2.5mm wire
      { itemIdx: 2, qty: 100, price: 85 },     // Havells 6A MCB
      { itemIdx: 5, qty: 50, price: 220 },     // Havells LED Batten
    ]},
    { supplierIdx: 1, user: managerUser, status: 'RECEIVED', days: 40, items: [
      { itemIdx: 8, qty: 50, price: 180 },     // Supreme PVC 1"
      { itemIdx: 11, qty: 30, price: 210 },    // Jaquar Ball Valve 1/2"
      { itemIdx: 14, qty: 40, price: 45 },     // Cello Tank Connector
    ]},
    { supplierIdx: 2, user: managerUser, status: 'RECEIVED', days: 30, items: [
      { itemIdx: 16, qty: 20, price: 280 },    // Asian Royale 1L
      { itemIdx: 17, qty: 10, price: 980 },    // Asian Royale 4L
      { itemIdx: 19, qty: 15, price: 195 },    // Nerolac Primer
    ]},
    { supplierIdx: 3, user: managerUser, status: 'PARTIAL', days: 15, items: [
      { itemIdx: 22, qty: 15, price: 480 },    // MS Angle
      { itemIdx: 23, qty: 10, price: 620 },    // GI Pipe
      { itemIdx: 27, qty: 10, price: 390 },    // MS Square Pipe
    ]},
    { supplierIdx: 4, user: adminUser, status: 'ORDERED', days: 5, items: [
      { itemIdx: 35, qty: 5, price: 1850 },    // Cera EWC
      { itemIdx: 36, qty: 4, price: 1200 },    // Parryware Basin
      { itemIdx: 40, qty: 20, price: 120 },    // Jaquar Angle Valve
    ]},
  ];

  for (let poIdx = 0; poIdx < purchaseData.length; poIdx++) {
    const pd = purchaseData[poIdx];
    const poDate = daysAgo(pd.days);
    const poNumber = `PO-${String(poIdx + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let gstTotal = 0;
    const poItems = [];

    for (const pi of pd.items) {
      const item = createdItems[pi.itemIdx];
      const gstPercent = parseInt(item.gstRate.replace('RATE_', ''));
      const gstAmount = Math.round(pi.price * pi.qty * gstPercent / 100);
      const totalPrice = pi.price * pi.qty + gstAmount;
      subtotal += pi.price * pi.qty;
      gstTotal += gstAmount;

      poItems.push({
        itemId: item.id,
        quantity: pi.qty,
        receivedQty: pd.status === 'RECEIVED' ? pi.qty : pd.status === 'PARTIAL' ? Math.floor(pi.qty * 0.6) : 0,
        unitPrice: pi.price,
        discount: 0,
        gstAmount,
        totalPrice,
        gstRate: item.gstRate,
        item: item,
      });
    }

    const grandTotal = subtotal + gstTotal;
    const isPaid = pd.status === 'RECEIVED';
    const paidAmount = isPaid ? grandTotal : pd.status === 'PARTIAL' ? Math.floor(grandTotal * 0.3) : 0;

    const purchase = await prisma.purchase.create({
      data: {
        poNumber,
        supplierId: createdSuppliers[pd.supplierIdx].id,
        branchId: branch.id,
        userId: pd.user.id,
        orderDate: poDate,
        expectedDate: new Date(poDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: pd.status,
        subtotal,
        discountTotal: 0,
        gstTotal,
        grandTotal,
        paidAmount,
        balanceAmount: grandTotal - paidAmount,
        paymentStatus: isPaid ? 'PAID' : pd.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
        notes: `Purchase order for ${pd.items.length} items`,
        createdAt: poDate,
      },
    });

    // Create purchase items
    for (const pi of poItems) {
      await prisma.purchaseItem.create({
        data: {
          purchaseId: purchase.id,
          itemId: pi.itemId,
          quantity: pi.quantity,
          receivedQty: pi.receivedQty,
          unitPrice: pi.unitPrice,
          discount: pi.discount,
          gstAmount: pi.gstAmount,
          totalPrice: pi.totalPrice,
          gstRate: pi.gstRate,
        },
      });
    }

    // For received POs, update stock and create movements
    if (pd.status === 'RECEIVED') {
      for (const pi of poItems) {
        await prisma.inventory.update({
          where: { id: pi.itemId },
          data: {
            currentStock: { increment: pi.receivedQty },
            lastMovement: poDate,
          },
        });
        await prisma.stockMovement.create({
          data: {
            itemId: pi.itemId,
            branchId: branch.id,
            type: 'IN',
            quantity: pi.receivedQty,
            reason: `Purchase Receive — ${poNumber}`,
            reference: poNumber,
            oldStock: pi.item.currentStock,
            newStock: pi.item.currentStock + pi.receivedQty,
            createdById: pd.user.id,
            createdAt: poDate,
          },
        });
      }

      // Supplier ledger entry
      await prisma.supplierLedger.create({
        data: {
          supplierId: createdSuppliers[pd.supplierIdx].id,
          date: poDate,
          type: 'PURCHASE',
          amount: grandTotal,
          balance: grandTotal - paidAmount,
          description: `Purchase ${poNumber}`,
          referenceId: purchase.id,
        },
      });
      if (paidAmount > 0) {
        await prisma.supplierLedger.create({
          data: {
            supplierId: createdSuppliers[pd.supplierIdx].id,
            date: poDate,
            type: 'PAYMENT',
            amount: -paidAmount,
            balance: grandTotal - paidAmount,
            description: `Payment for ${poNumber}`,
            referenceId: purchase.id,
          },
        });
      }
    }

    createdPurchases.push(purchase);
    console.log(`   ${poNumber} — ${pd.status} (₹${(grandTotal / 100).toFixed(2)})`);
  }

  // 8. Create Sales (10 sales)
  console.log('\n🧾 Creating sales...');
  const createdSales = [];
  const staffUser = createdUsers.STAFF;

  // Build list of items with positive stock for selling
  const saleableItems = createdItems.filter((i) => {
    const product = PRODUCTS[createdItems.indexOf(i)];
    return product && product.currentStock >= 3;
  });

  const salesData = [
    { customerIdx: 0, user: staffUser, days: 45, items: [{ itemIdx: 0, qty: 2, price: 2499 }, { itemIdx: 4, qty: 10, price: 110 }, { itemIdx: 3, qty: 5, price: 165 }], method: 'CASH', status: 'PAID' },
    { customerIdx: 1, user: staffUser, days: 40, items: [{ itemIdx: 8, qty: 5, price: 295 }, { itemIdx: 10, qty: 2, price: 525 }, { itemIdx: 13, qty: 3, price: 85 }], method: 'UPI', status: 'PAID' },
    { customerIdx: 2, user: staffUser, days: 35, items: [{ itemIdx: 16, qty: 2, price: 465 }, { itemIdx: 20, qty: 3, price: 105 }, { itemIdx: 21, qty: 1, price: 260 }], method: 'CASH', status: 'PAID' },
    { customerIdx: 0, user: staffUser, days: 30, items: [{ itemIdx: 22, qty: 3, price: 755 }, { itemIdx: 24, qty: 5, price: 120 }], method: 'CREDIT', status: 'PENDING' },
    { customerIdx: null, user: staffUser, days: 28, items: [{ itemIdx: 28, qty: 1, price: 625 }, { itemIdx: 29, qty: 2, price: 265 }, { itemIdx: 32, qty: 1, price: 295 }], method: 'UPI', status: 'PAID' },
    { customerIdx: 1, user: staffUser, days: 20, items: [{ itemIdx: 5, qty: 4, price: 375 }, { itemIdx: 7, qty: 2, price: 1499 }, { itemIdx: 3, qty: 10, price: 165 }], method: 'CASH', status: 'PAID' },
    { customerIdx: null, user: managerUser, days: 15, items: [{ itemIdx: 38, qty: 1, price: 650 }, { itemIdx: 39, qty: 3, price: 220 }, { itemIdx: 41, qty: 1, price: 1099 }], method: 'UPI', status: 'PAID' },
    { customerIdx: 0, user: staffUser, days: 10, items: [{ itemIdx: 42, qty: 5, price: 245 }, { itemIdx: 43, qty: 10, price: 145 }, { itemIdx: 46, qty: 2, price: 175 }], method: 'CREDIT', status: 'PARTIAL' },
    { customerIdx: null, user: staffUser, days: 6, items: [{ itemIdx: 31, qty: 1, price: 310 }, { itemIdx: 33, qty: 2, price: 345 }], method: 'CARD', status: 'PAID' },
    { customerIdx: 2, user: staffUser, days: 3, items: [{ itemIdx: 14, qty: 10, price: 85 }, { itemIdx: 15, qty: 20, price: 35 }, { itemIdx: 11, qty: 2, price: 365 }], method: 'CASH', status: 'PAID' },
  ];

  for (let si = 0; si < salesData.length; si++) {
    const sd = salesData[si];
    const saleDate = daysAgo(sd.days);
    const invoiceNo = `INV-${String(si + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let grandTotal = 0;
    const saleItems = [];

    for (const siItem of sd.items) {
      const item = createdItems[siItem.itemIdx];
      const product = PRODUCTS[createdItems.indexOf(item)];
      const gstPercent = parseInt(item.gstRate.replace('RATE_', ''));
      const itemSubtotal = siItem.price * siItem.qty;
      const itemDiscount = 0;
      const itemGst = Math.round(itemSubtotal * gstPercent / 100);
      const totalPrice = itemSubtotal + itemGst - itemDiscount;

      subtotal += itemSubtotal;
      discountTotal += itemDiscount;
      gstTotal += itemGst;

      saleItems.push({
        itemId: item.id,
        quantity: siItem.qty,
        unitPrice: siItem.price,
        discount: itemDiscount,
        gstAmount: itemGst,
        totalPrice,
        gstRate: item.gstRate,
        itemCurrentStock: product.currentStock,
      });

      // Decrement stock
      product.currentStock -= siItem.qty;
    }

    grandTotal = subtotal + gstTotal - discountTotal;
    const paidAmount = sd.status === 'PAID' ? grandTotal : sd.status === 'PARTIAL' ? Math.floor(grandTotal * 0.5) : 0;
    const balanceAmount = grandTotal - paidAmount;
    const paymentStatus = sd.status;

    const sale = await prisma.sale.create({
      data: {
        invoiceNo,
        customerId: sd.customerIdx !== null ? createdCustomers[sd.customerIdx].id : null,
        branchId: branch.id,
        userId: sd.user.id,
        subtotal,
        discountTotal,
        gstTotal,
        grandTotal,
        paidAmount,
        balanceAmount,
        paymentMethod: sd.method,
        paymentStatus,
        notes: saleItems.map((s) => `Item: qty ${s.quantity}`).join('; '),
        createdAt: saleDate,
      },
    });

    // Create sale items and update stock
    for (let sii = 0; sii < saleItems.length; sii++) {
      const siItem = saleItems[sii];
      const itemData = sd.items[sii];

      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          itemId: siItem.itemId,
          quantity: siItem.quantity,
          unitPrice: siItem.unitPrice,
          discount: siItem.discount,
          gstAmount: siItem.gstAmount,
          totalPrice: siItem.totalPrice,
          gstRate: siItem.gstRate,
        },
      });

      // Update inventory stock
      await prisma.inventory.update({
        where: { id: siItem.itemId },
        data: {
          currentStock: { decrement: siItem.quantity },
          lastMovement: saleDate,
        },
      });

      // Stock movement
      await prisma.stockMovement.create({
        data: {
          itemId: siItem.itemId,
          branchId: branch.id,
          type: 'OUT',
          quantity: siItem.quantity,
          reason: `Sale — ${invoiceNo}`,
          reference: invoiceNo,
          oldStock: siItem.itemCurrentStock,
          newStock: siItem.itemCurrentStock - siItem.quantity,
          createdById: sd.user.id,
          createdAt: saleDate,
        },
      });
    }

    // Customer ledger entry
    if (sd.customerIdx !== null) {
      await prisma.customerLedger.create({
        data: {
          customerId: createdCustomers[sd.customerIdx].id,
          date: saleDate,
          type: 'SALE',
          amount: grandTotal,
          balance: balanceAmount,
          description: `Sale ${invoiceNo}`,
          referenceId: sale.id,
        },
      });
      if (paidAmount > 0) {
        await prisma.customerLedger.create({
          data: {
            customerId: createdCustomers[sd.customerIdx].id,
            date: saleDate,
            type: 'PAYMENT',
            amount: -paidAmount,
            balance: balanceAmount,
            description: `Payment for ${invoiceNo}`,
            referenceId: sale.id,
          },
        });
      }

      // Update customer outstanding
      await prisma.customer.update({
        where: { id: createdCustomers[sd.customerIdx].id },
        data: { outstanding: { increment: balanceAmount } },
      });
    }

    createdSales.push(sale);
    console.log(`   ${invoiceNo} — ₹${(grandTotal / 100).toFixed(2)} (${paymentStatus})`);
  }

  // 9. Create Employees
  console.log('\n👷 Creating employees...');
  const createdEmployees = [];
  for (const emp of EMPLOYEES) {
    const employee = await prisma.employee.create({
      data: {
        ...emp,
        branchId: branch.id,
        createdAt: daysAgo(55),
      },
    });
    createdEmployees.push(employee);
    console.log(`   ${employee.name} (${employee.role})`);
  }

  // 10. Attendance records (last 30 days)
  console.log('\n📅 Creating attendance records...');
  for (const emp of createdEmployees) {
    for (let d = 1; d <= 25; d++) {
      // Work only on weekdays (skip every ~7th day)
      if (d % 7 === 0) continue;
      const date = pastDate(d);
      const clockIn = new Date(date);
      clockIn.setHours(randomInt(8, 10), randomInt(0, 30), 0, 0);
      const clockOut = new Date(date);
      clockOut.setHours(randomInt(17, 19), randomInt(0, 30), 0, 0);
      const hoursWorked = (clockOut - clockIn) / (1000 * 60 * 60);

      await prisma.employeeAttendance.create({
        data: {
          employeeId: emp.id,
          userId: adminUser.id,
          date,
          clockIn,
          clockOut,
          hoursWorked: Math.round(hoursWorked * 10) / 10,
          status: 'PRESENT',
        },
      });
    }
  }
  console.log(`   Attendance records created for 4 employees × ~22 days`);

  // 11. Expenses
  console.log('\n💰 Creating expenses...');
  const expenseData = [
    { category: 'RENT', amount: paise(25000), date: pastDate(1), description: 'Monthly rent — Industrial Area Store' },
    { category: 'UTILITY_BILLS', amount: paise(3500), date: pastDate(5), description: 'Electricity bill — March 2026' },
    { category: 'UTILITY_BILLS', amount: paise(1200), date: pastDate(5), description: 'Water bill — March 2026' },
    { category: 'SALARY', amount: paise(15000), date: pastDate(2), description: 'Salary — Mohan Singh (March)' },
    { category: 'SALARY', amount: paise(12000), date: pastDate(2), description: 'Salary — Sita Devi (March)' },
    { category: 'SALARY', amount: paise(10000), date: pastDate(2), description: 'Salary — Ravi Kumar (March)' },
    { category: 'SALARY', amount: paise(14000), date: pastDate(2), description: 'Salary — Anita Sharma (March)' },
    { category: 'TRANSPORTATION', amount: paise(1800), date: pastDate(10), description: 'Delivery vehicle fuel' },
    { category: 'MAINTENANCE', amount: paise(2500), date: pastDate(12), description: 'Shelf repairs and painting' },
    { category: 'PETTY_CASH', amount: paise(500), date: pastDate(3), description: 'Office supplies (stationery)' },
    { category: 'MARKETING', amount: paise(3000), date: pastDate(7), description: 'Local newspaper ad' },
    { category: 'OTHER', amount: paise(1500), date: pastDate(4), description: 'Tea/coffee supplies' },
  ];

  for (const exp of expenseData) {
    await prisma.expense.create({
      data: {
        branchId: branch.id,
        userId: adminUser.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.description,
        date: exp.date,
      },
    });
  }
  console.log(`   ${expenseData.length} expenses created`);

  // 12. Notifications
  console.log('\n🔔 Creating notifications...');
  const notifications = [
    { userId: managerUser.id, title: 'Low Stock Alert', message: '5 products are below minimum stock level. Check inventory for details.', type: 'WARNING', reference: 'inventory' },
    { userId: managerUser.id, title: 'Purchase Order Due', message: 'PO-0004 payment of ₹5,000 due in 2 days.', type: 'INFO', reference: 'purchases' },
    { userId: adminUser.id, title: 'Customer Payment Overdue', message: 'Sharma Construction Co has outstanding of ₹12,000 overdue by 15 days.', type: 'WARNING', reference: 'customers' },
    { userId: adminUser.id, title: 'Daily Summary', message: 'Today\'s sales: ₹8,450 from 3 invoices.', type: 'INFO', reference: 'dashboard' },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: { ...notif, createdAt: daysAgo(randomInt(0, 3)) },
    });
  }
  console.log(`   ${notifications.length} notifications created`);

  // 13. Notification Preferences
  await prisma.notificationPreference.create({
    data: { userId: adminUser.id },
  });
  await prisma.notificationPreference.create({
    data: { userId: managerUser.id },
  });
  await prisma.notificationPreference.create({
    data: { userId: staffUser.id },
  });

  // 14. Supplier Ledger entries for non-received POs
  console.log('\n📒 Creating supplier ledger entries...');
  for (let pi = 0; pi < createdPurchases.length; pi++) {
    const purchase = createdPurchases[pi];
    const pd = purchaseData[pi];
    
    // Create entry for POs without existing ledger entries (PARTIAL & ORDERED)
    if (pd.status !== 'RECEIVED') {
      await prisma.supplierLedger.create({
        data: {
          supplierId: createdSuppliers[pd.supplierIdx].id,
          date: purchase.orderDate,
          type: 'PURCHASE',
          amount: purchase.grandTotal,
          balance: purchase.balanceAmount,
          description: `Purchase ${purchase.poNumber}`,
          referenceId: purchase.id,
        },
      });
      if (purchase.paidAmount > 0) {
        await prisma.supplierLedger.create({
          data: {
            supplierId: createdSuppliers[pd.supplierIdx].id,
            date: purchase.orderDate,
            type: 'PAYMENT',
            amount: -purchase.paidAmount,
            balance: purchase.balanceAmount,
            description: `Payment for ${purchase.poNumber}`,
            referenceId: purchase.id,
          },
        });
      }

      // Update supplier outstanding
      await prisma.supplier.update({
        where: { id: createdSuppliers[pd.supplierIdx].id },
        data: { outstanding: { increment: purchase.balanceAmount } },
      });
    }
  }
  console.log(`   Ledger entries created for all purchases`);

  // 15. Audit Logs
  console.log('\n📝 Creating audit logs...');
  const auditEntries = [
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[0].id, newValue: { name: createdItems[0].name } },
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[5].id, newValue: { name: createdItems[5].name } },
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[10].id, newValue: { name: createdItems[10].name } },
    { action: 'CREATE', entity: 'Supplier', entityId: createdSuppliers[0].id, newValue: { name: createdSuppliers[0].name } },
    { action: 'CREATE', entity: 'Customer', entityId: createdCustomers[0].id, newValue: { name: createdCustomers[0].name } },
    { action: 'CREATE', entity: 'Sale', entityId: createdSales[0].id, newValue: { invoiceNo: createdSales[0].invoiceNo } },
    { action: 'CREATE', entity: 'Purchase', entityId: createdPurchases[0].id, newValue: { poNumber: createdPurchases[0].poNumber } },
    { action: 'CREATE', entity: 'User', userId: adminUser.id, newValue: { email: adminUser.email } },
  ];

  for (const audit of auditEntries) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        branchId: branch.id,
        action: audit.action,
        entity: audit.entity,
        entityId: audit.entityId,
        newValue: audit.newValue,
        createdAt: daysAgo(randomInt(10, 55)),
      },
    });
  }
  console.log(`   ${auditEntries.length} audit logs created`);

  // 16. Branch Inventory links
  console.log('\n🔗 Creating branch-inventory links...');
  const batchSize = 10;
  for (let i = 0; i < createdItems.length; i += batchSize) {
    const batch = createdItems.slice(i, i + batchSize);
    await prisma.branchInventory.createMany({
      data: batch.map((item) => ({
        branchId: branch.id,
        itemId: item.id,
        stock: PRODUCTS[createdItems.indexOf(item)]?.currentStock || 0,
      })),
    });
  }
  console.log(`   ${createdItems.length} branch-inventory links created`);

  // ============ SUMMARY ============
  console.log('\n' + '='.repeat(50));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Users:         ${USERS.length}`);
  console.log(`   Branches:      1`);
  console.log(`   Categories:    ${CATEGORY_SETTINGS.length}`);
  console.log(`   Suppliers:     ${createdSuppliers.length}`);
  console.log(`   Customers:     ${createdCustomers.length}`);
  console.log(`   Products:      ${createdItems.length}`);
  console.log(`   Purchases:     ${createdPurchases.length}`);
  console.log(`   Sales:         ${createdSales.length}`);
  console.log(`   Employees:     ${createdEmployees.length}`);
  console.log(`   Expenses:      ${expenseData.length}`);
  console.log(`\n🔑 Login Credentials:`);
  for (const u of USERS) {
    console.log(`   ${u.role}: ${u.email} / ${u.password}`);
  }
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
