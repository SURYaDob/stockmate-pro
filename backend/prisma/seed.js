const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
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
// Generate date-based PO/invoice numbers
const formatPONumber = (idx, date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `PO-${y}${m}-${String(idx).padStart(4, '0')}`;
};
const formatInvoiceNo = (idx, date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `INV-${y}${m}-${String(idx).padStart(4, '0')}`;
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

// ── Users ──
const USERS = [
  { firstName: 'Admin', lastName: 'User', email: 'admin@stockmate.com', phone: '+919876543210', role: 'ADMIN', password: 'Admin@123' },
  { firstName: 'Rajesh', lastName: 'Kumar', email: 'manager@stockmate.com', phone: '+919876543211', role: 'STORE_MANAGER', password: 'Manager@123' },
  { firstName: 'Sunil', lastName: 'Verma', email: 'staff@stockmate.com', phone: '+919876543212', role: 'STAFF', password: 'Staff@123' },
  { firstName: 'Priya', lastName: 'Sharma', email: 'accountant@stockmate.com', phone: '+919876543213', role: 'ACCOUNTANT', password: 'Accountant@123' },
];

// ── Suppliers ──
const SUPPLIERS = [
  { name: 'Reliance Electricals Pvt Ltd', gstNumber: '27AABCU1234D1Z5', contactPerson: 'Amit Shah', phone: '+919822145678', email: 'amit@relianceelectricals.com', address: '42, MIDC Industrial Area', city: 'Mumbai', state: 'Maharashtra', pincode: '400093', bankName: 'HDFC Bank', bankAccount: '12345678901234', bankIfsc: 'HDFC0001234', paymentTerms: 'Net 30', creditLimit: paise(500000) },
  { name: 'Bihar Pipe & Fittings Co', gstNumber: '10BPCF5678E1ZP', contactPerson: 'Suresh Yadav', phone: '+918092345671', email: 'suresh@biharpipe.com', address: '15, Industrial Estate', city: 'Patna', state: 'Bihar', pincode: '800001', bankName: 'SBI', bankAccount: '98765432109876', bankIfsc: 'SBIN0001234', paymentTerms: 'Net 45', creditLimit: paise(300000) },
  { name: 'Asian Paints Distributors', gstNumber: '29AAFFA1234G1Z4', contactPerson: 'Vikram Mehta', phone: '+919761234567', email: 'vikram@asianpaints.in', address: '88, Auction Centre', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001', bankName: 'ICICI Bank', bankAccount: '45678901234567', bankIfsc: 'ICIC0005678', paymentTerms: 'Net 30', creditLimit: paise(400000) },
  { name: 'Tata Steel & Hardware', gstNumber: '19AAACT3456H1Z2', contactPerson: 'Rohit Desai', phone: '+918045678902', email: 'rohit@tatasteel.com', address: '55, Industrial Zone', city: 'Jamshedpur', state: 'Jharkhand', pincode: '831001', bankName: 'Axis Bank', bankAccount: '23456789012345', bankIfsc: 'UTIB0007890', paymentTerms: 'Net 60', creditLimit: paise(600000) },
  { name: 'Sanitary World Pvt Ltd', gstNumber: '07AABCS5678K1Z3', contactPerson: 'Deepak Gupta', phone: '+919358901234', email: 'deepak@sanitaryworld.com', address: '22, Lajpat Nagar', city: 'Delhi', state: 'Delhi', pincode: '110024', bankName: 'Kotak Mahindra', bankAccount: '34567890123456', bankIfsc: 'KKBK0001234', paymentTerms: 'Net 30', creditLimit: paise(350000) },
];

// ── Customers ──
const CUSTOMERS = [
  { name: 'Sharma Construction Co', phone: '+919829874561', email: 'info@sharmaconstruction.com', address: '12, MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', gstNumber: '27AAECS1234F1Z5', creditLimit: paise(200000) },
  { name: 'Vijay Hardware Store', phone: '+919915674320', email: 'vijay.hardware@gmail.com', address: '78, Station Road', city: 'Pune', state: 'Maharashtra', pincode: '411001', creditLimit: paise(100000) },
  { name: 'Ramesh Kumar (Walk-in)', phone: '+919987654300', address: '45, Nehru Nagar', city: 'Mumbai', state: 'Maharashtra', pincode: '400051' },
  { name: 'Green Earth Developers', phone: '+919900112233', email: 'info@greenearth.com', address: '234, BKC', city: 'Mumbai', state: 'Maharashtra', pincode: '400051', gstNumber: '27AAGFG5678H1Z9', creditLimit: paise(350000) },
  { name: 'Patel Electricals', phone: '+918877665544', email: 'patel.elec@yahoo.com', address: '56, Sadar Bazaar', city: 'Delhi', state: 'Delhi', pincode: '110006', creditLimit: paise(75000) },
];

// ── Products (55 items across 7 categories) ──
const PRODUCTS = [
  // ═══ ELECTRICAL (9 items) ═══
  { name: 'PVC Insulated Copper Wire 1.5 sqmm (90m Roll)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Finolex', model: 'FR PVC 1.5', unitType: 'ROLLS', purchasePrice: 1850, sellingPrice: 2499, gstRate: 'RATE_18', currentStock: 48, minStock: 10, maxStock: 100 },
  { name: 'PVC Insulated Copper Wire 2.5 sqmm (90m Roll)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Finolex', model: 'FR PVC 2.5', unitType: 'ROLLS', purchasePrice: 3200, sellingPrice: 4299, gstRate: 'RATE_18', currentStock: 32, minStock: 10, maxStock: 80 },
  { name: 'MCB 6 Amp Single Pole', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Havells', model: 'DHM6', unitType: 'PCS', purchasePrice: 85, sellingPrice: 145, gstRate: 'RATE_18', currentStock: 185, minStock: 50, maxStock: 500 },
  { name: 'MCB 16 Amp Single Pole', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Havells', model: 'DHM16', unitType: 'PCS', purchasePrice: 95, sellingPrice: 165, gstRate: 'RATE_18', currentStock: 135, minStock: 50, maxStock: 400 },
  { name: 'LED Bulb 9W Warm White', category: 'ELECTRICAL', subCategory: 'Lighting', brand: 'Philips', model: 'Essential 9W', unitType: 'PCS', purchasePrice: 65, sellingPrice: 110, gstRate: 'RATE_12', currentStock: 280, minStock: 100, maxStock: 600 },
  { name: 'LED Batten 20W Cool Day', category: 'ELECTRICAL', subCategory: 'Lighting', brand: 'Havells', model: 'Adonis 20W', unitType: 'PCS', purchasePrice: 220, sellingPrice: 375, gstRate: 'RATE_12', currentStock: 68, minStock: 20, maxStock: 200 },
  { name: 'Modular Switch 1 Way', category: 'ELECTRICAL', subCategory: 'Switchgear', brand: 'Anchor', model: 'Roma 1W', unitType: 'PCS', purchasePrice: 28, sellingPrice: 55, gstRate: 'RATE_18', currentStock: 480, minStock: 100, maxStock: 1000 },
  { name: 'Copper Flexible Wire 1.0 sqmm (Red, 90m)', category: 'ELECTRICAL', subCategory: 'Wires', brand: 'Polycab', model: 'FR-LSH 1.0', unitType: 'ROLLS', purchasePrice: 1050, sellingPrice: 1499, gstRate: 'RATE_18', currentStock: 22, minStock: 10, maxStock: 60 },
  { name: 'Exhaust Fan 150mm (6 inch)', category: 'ELECTRICAL', subCategory: 'Fans', brand: 'Havells', model: 'Ventilair 150', unitType: 'PCS', purchasePrice: 780, sellingPrice: 1299, gstRate: 'RATE_18', currentStock: 12, minStock: 5, maxStock: 30 },

  // ═══ PLUMBING (9 items) ═══
  { name: 'PVC Pipe 1 inch (3m Length)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Supreme', model: 'Astral 1"', unitType: 'PCS', purchasePrice: 180, sellingPrice: 295, gstRate: 'RATE_18', currentStock: 115, minStock: 30, maxStock: 300 },
  { name: 'PVC Pipe 1/2 inch (3m Length)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Supreme', model: 'Astral 1/2"', unitType: 'PCS', purchasePrice: 110, sellingPrice: 195, gstRate: 'RATE_18', currentStock: 195, minStock: 50, maxStock: 400 },
  { name: 'Ball Valve 1 inch Brass', category: 'PLUMBING', subCategory: 'Valves', brand: 'Jaquar', model: 'Brass BV 1"', unitType: 'PCS', purchasePrice: 320, sellingPrice: 525, gstRate: 'RATE_18', currentStock: 56, minStock: 20, maxStock: 150 },
  { name: 'Ball Valve 1/2 inch Brass', category: 'PLUMBING', subCategory: 'Valves', brand: 'Jaquar', model: 'Brass BV 1/2"', unitType: 'PCS', purchasePrice: 210, sellingPrice: 365, gstRate: 'RATE_18', currentStock: 85, minStock: 20, maxStock: 200 },
  { name: 'CPVC Pipe 1 inch (3m)', category: 'PLUMBING', subCategory: 'Pipes', brand: 'Astral', model: 'CPVC 1"', unitType: 'PCS', purchasePrice: 250, sellingPrice: 420, gstRate: 'RATE_18', currentStock: 72, minStock: 20, maxStock: 150 },
  { name: 'Water Tank Connector 1 inch', category: 'PLUMBING', subCategory: 'Fittings', brand: 'Cello', model: 'WS-101', unitType: 'PCS', purchasePrice: 45, sellingPrice: 85, gstRate: 'RATE_18', currentStock: 135, minStock: 30, maxStock: 300 },
  { name: 'PVC Solvent Cement 50ml', category: 'PLUMBING', subCategory: 'Chemicals', brand: 'Weld-On', model: 'P-68', unitType: 'PCS', purchasePrice: 55, sellingPrice: 110, gstRate: 'RATE_18', currentStock: 175, minStock: 50, maxStock: 400 },
  { name: 'Teflon Tape Roll (12mm x 10m)', category: 'PLUMBING', subCategory: 'Sealants', brand: 'UniSeal', model: 'TF-12', unitType: 'ROLLS', purchasePrice: 18, sellingPrice: 35, gstRate: 'RATE_12', currentStock: 380, minStock: 100, maxStock: 800 },
  { name: 'Flexible Connector 1/2" (30cm SS)', category: 'PLUMBING', subCategory: 'Fittings', brand: 'Jaquar', model: 'FC-30', unitType: 'PCS', purchasePrice: 65, sellingPrice: 125, gstRate: 'RATE_18', currentStock: 90, minStock: 20, maxStock: 200 },

  // ═══ PAINTING (8 items) ═══
  { name: 'Asian Paints Royale Shyne 1L', category: 'PAINTING', subCategory: 'Interior Emulsion', brand: 'Asian Paints', model: 'Royale Shyne', unitType: 'LITERS', purchasePrice: 280, sellingPrice: 465, gstRate: 'RATE_18', currentStock: 32, minStock: 10, maxStock: 80 },
  { name: 'Asian Paints Royale Shyne 4L', category: 'PAINTING', subCategory: 'Interior Emulsion', brand: 'Asian Paints', model: 'Royale Shyne', unitType: 'LITERS', purchasePrice: 980, sellingPrice: 1599, gstRate: 'RATE_18', currentStock: 18, minStock: 5, maxStock: 40 },
  { name: 'Berger Express Paint 1L (Metal)', category: 'PAINTING', subCategory: 'Enamel', brand: 'Berger', model: 'Express 1L', unitType: 'LITERS', purchasePrice: 165, sellingPrice: 285, gstRate: 'RATE_18', currentStock: 48, minStock: 15, maxStock: 100 },
  { name: 'Nerolac Primer 1L', category: 'PAINTING', subCategory: 'Primer', brand: 'Nerolac', model: 'Premium Primer', unitType: 'LITERS', purchasePrice: 195, sellingPrice: 330, gstRate: 'RATE_18', currentStock: 22, minStock: 10, maxStock: 60 },
  { name: 'Paint Brush 4 inch', category: 'PAINTING', subCategory: 'Tools', brand: 'Asian Paints', model: 'Pro 4"', unitType: 'PCS', purchasePrice: 55, sellingPrice: 105, gstRate: 'RATE_12', currentStock: 95, minStock: 30, maxStock: 200 },
  { name: 'Wall Putty 10kg', category: 'PAINTING', subCategory: 'Surface Prep', brand: 'Birla', model: 'White Wall Putty', unitType: 'KG', purchasePrice: 145, sellingPrice: 260, gstRate: 'RATE_18', currentStock: 38, minStock: 10, maxStock: 80 },
  { name: 'Sandpaper Sheet (Grit 120)', category: 'PAINTING', subCategory: 'Tools', brand: '3M', model: 'Grit 120', unitType: 'PCS', purchasePrice: 8, sellingPrice: 15, gstRate: 'RATE_12', currentStock: 580, minStock: 200, maxStock: 1000 },
  { name: 'Asian Paints Tractor Shine 20L (Discontinued)', category: 'PAINTING', subCategory: 'Exterior Emulsion', brand: 'Asian Paints', model: 'Tractor Shine', unitType: 'LITERS', purchasePrice: 2100, sellingPrice: 3499, gstRate: 'RATE_18', currentStock: 4, minStock: 2, maxStock: 10 },

  // ═══ HARDWARE (8 items) ═══
  { name: 'MS Angle 40x40x6mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'Tata Steel', model: 'MS Angle 40', unitType: 'PCS', purchasePrice: 480, sellingPrice: 755, gstRate: 'RATE_18', currentStock: 28, minStock: 10, maxStock: 60 },
  { name: 'GI Pipe 1 inch (3m)', category: 'HARDWARE', subCategory: 'Pipes', brand: 'JSW Steel', model: 'GI 1"', unitType: 'PCS', purchasePrice: 620, sellingPrice: 995, gstRate: 'RATE_18', currentStock: 22, minStock: 10, maxStock: 50 },
  { name: 'Nails 4 inch (1kg pack)', category: 'HARDWARE', subCategory: 'Fasteners', brand: 'Elephant', model: '4" Wire Nails', unitType: 'KG', purchasePrice: 65, sellingPrice: 120, gstRate: 'RATE_18', currentStock: 75, minStock: 20, maxStock: 200 },
  { name: 'MS Flat Bar 25x5mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'Tata Steel', model: 'MS Flat 25', unitType: 'PCS', purchasePrice: 320, sellingPrice: 525, gstRate: 'RATE_18', currentStock: 32, minStock: 10, maxStock: 70 },
  { name: 'Welding Electrode 3.15mm (1kg)', category: 'HARDWARE', subCategory: 'Welding', brand: 'Ador', model: 'Supercito 3.15', unitType: 'KG', purchasePrice: 85, sellingPrice: 155, gstRate: 'RATE_18', currentStock: 58, minStock: 15, maxStock: 150 },
  { name: 'MS Square Pipe 25x25mm (6m)', category: 'HARDWARE', subCategory: 'Steel Sections', brand: 'APL Apollo', model: 'MS Square 25', unitType: 'PCS', purchasePrice: 390, sellingPrice: 625, gstRate: 'RATE_18', currentStock: 18, minStock: 8, maxStock: 50 },
  { name: 'GI Wire 1mm (1kg roll)', category: 'HARDWARE', subCategory: 'Wires', brand: 'Tata Wiron', model: 'GI 1mm', unitType: 'ROLLS', purchasePrice: 72, sellingPrice: 135, gstRate: 'RATE_18', currentStock: 52, minStock: 15, maxStock: 120 },
  { name: 'Chain Link 8mm x 1m', category: 'HARDWARE', subCategory: 'Chains', brand: 'Elephant', model: 'CL-8', unitType: 'PCS', purchasePrice: 150, sellingPrice: 275, gstRate: 'RATE_18', currentStock: 18, minStock: 5, maxStock: 30 },

  // ═══ TOOLS (8 items) ═══
  { name: 'PVC Pipe Cutter (Ratchet Type)', category: 'TOOLS', subCategory: 'Cutting Tools', brand: 'Knipex', model: 'PC-42', unitType: 'PCS', purchasePrice: 380, sellingPrice: 625, gstRate: 'RATE_18', currentStock: 12, minStock: 5, maxStock: 40 },
  { name: 'Adjustable Spanner 8 inch', category: 'TOOLS', subCategory: 'Wrenches', brand: 'Taparia', model: 'AS-8"', unitType: 'PCS', purchasePrice: 145, sellingPrice: 265, gstRate: 'RATE_18', currentStock: 38, minStock: 10, maxStock: 100 },
  { name: 'Screwdriver Set (6 pcs)', category: 'TOOLS', subCategory: 'Screwdrivers', brand: 'Stanley', model: 'SD-6PK', unitType: 'BOXES', purchasePrice: 210, sellingPrice: 375, gstRate: 'RATE_18', currentStock: 22, minStock: 10, maxStock: 60 },
  { name: 'Claw Hammer 500g', category: 'TOOLS', subCategory: 'Hammers', brand: 'Taparia', model: 'CH-500', unitType: 'PCS', purchasePrice: 165, sellingPrice: 295, gstRate: 'RATE_18', currentStock: 28, minStock: 10, maxStock: 80 },
  { name: 'Measuring Tape 5m', category: 'TOOLS', subCategory: 'Measuring', brand: 'Fiberbond', model: 'FT-5M', unitType: 'PCS', purchasePrice: 85, sellingPrice: 165, gstRate: 'RATE_18', currentStock: 52, minStock: 20, maxStock: 120 },
  { name: 'Hacksaw Frame 12 inch', category: 'TOOLS', subCategory: 'Cutting Tools', brand: 'Stanley', model: 'HS-12"', unitType: 'PCS', purchasePrice: 175, sellingPrice: 310, gstRate: 'RATE_18', currentStock: 18, minStock: 8, maxStock: 60 },
  { name: 'Spirit Level 24 inch', category: 'TOOLS', subCategory: 'Measuring', brand: 'Stanley', model: 'SL-24"', unitType: 'PCS', purchasePrice: 195, sellingPrice: 345, gstRate: 'RATE_18', currentStock: 15, minStock: 5, maxStock: 40 },
  { name: 'Power Drill 13mm (600W)', category: 'TOOLS', subCategory: 'Power Tools', brand: 'Bosch', model: 'GSB 600', unitType: 'PCS', purchasePrice: 1850, sellingPrice: 2999, gstRate: 'RATE_18', currentStock: 6, minStock: 3, maxStock: 15 },

  // ═══ SANITARY (7 items) ═══
  { name: 'Wall Mounted WC (EWC) White', category: 'SANITARY', subCategory: 'Toilets', brand: 'Cera', model: 'Europa EWC', unitType: 'PCS', purchasePrice: 1850, sellingPrice: 2999, gstRate: 'RATE_18', currentStock: 8, minStock: 3, maxStock: 25 },
  { name: 'Wash Basin Oval 45cm', category: 'SANITARY', subCategory: 'Basins', brand: 'Parryware', model: 'Oval WS-45', unitType: 'PCS', purchasePrice: 1200, sellingPrice: 1995, gstRate: 'RATE_18', currentStock: 7, minStock: 3, maxStock: 20 },
  { name: 'Kitchen Sink Single Bowl 600mm', category: 'SANITARY', subCategory: 'Sinks', brand: 'Nirali', model: 'SS-600', unitType: 'PCS', purchasePrice: 2250, sellingPrice: 3599, gstRate: 'RATE_18', currentStock: 5, minStock: 2, maxStock: 15 },
  { name: 'Pillar Tap Chrome 1/2"', category: 'SANITARY', subCategory: 'Taps', brand: 'Jaquar', model: 'Essence PT-01', unitType: 'PCS', purchasePrice: 380, sellingPrice: 650, gstRate: 'RATE_18', currentStock: 32, minStock: 10, maxStock: 80 },
  { name: 'Angle Valve 1/2" Chrome', category: 'SANITARY', subCategory: 'Valves', brand: 'Jaquar', model: 'AV-01', unitType: 'PCS', purchasePrice: 120, sellingPrice: 220, gstRate: 'RATE_18', currentStock: 55, minStock: 20, maxStock: 150 },
  { name: 'Towah Body Shower Kit', category: 'SANITARY', subCategory: 'Showers', brand: 'Jaquar', model: 'Towah SH-01', unitType: 'PCS', purchasePrice: 650, sellingPrice: 1099, gstRate: 'RATE_18', currentStock: 14, minStock: 5, maxStock: 40 },
  { name: 'Bathroom Mirror 60x45cm', category: 'SANITARY', subCategory: 'Accessories', brand: 'AIS Glass', model: 'BM-6045', unitType: 'PCS', purchasePrice: 850, sellingPrice: 1399, gstRate: 'RATE_18', currentStock: 10, minStock: 4, maxStock: 30 },

  // ═══ SAFETY EQUIPMENT (6 items) ═══
  { name: 'Safety Helmet (White, IS Marked)', category: 'SAFETY_EQUIPMENT', subCategory: 'Head Protection', brand: '3M', model: 'SH-100W', unitType: 'PCS', purchasePrice: 120, sellingPrice: 245, gstRate: 'RATE_12', currentStock: 48, minStock: 15, maxStock: 120 },
  { name: 'Safety Goggles (Clear)', category: 'SAFETY_EQUIPMENT', subCategory: 'Eye Protection', brand: '3M', model: 'SG-200', unitType: 'PCS', purchasePrice: 65, sellingPrice: 145, gstRate: 'RATE_12', currentStock: 78, minStock: 20, maxStock: 200 },
  { name: 'Leather Hand Gloves (Pair)', category: 'SAFETY_EQUIPMENT', subCategory: 'Hand Protection', brand: 'Venom', model: 'LG-500', unitType: 'PAIRS', purchasePrice: 55, sellingPrice: 110, gstRate: 'RATE_12', currentStock: 95, minStock: 30, maxStock: 250 },
  { name: 'N95 Dust Mask (Box of 10)', category: 'SAFETY_EQUIPMENT', subCategory: 'Respiratory', brand: '3M', model: 'N95-10PK', unitType: 'BOXES', purchasePrice: 180, sellingPrice: 325, gstRate: 'RATE_12', currentStock: 38, minStock: 10, maxStock: 100 },
  { name: 'Safety Vest (Orange) Reflective', category: 'SAFETY_EQUIPMENT', subCategory: 'High Visibility', brand: 'SafeGuard', model: 'SV-OR', unitType: 'PCS', purchasePrice: 85, sellingPrice: 175, gstRate: 'RATE_12', currentStock: 33, minStock: 10, maxStock: 80 },
  { name: 'Safety Shoes Steel Toe (Size 8)', category: 'SAFETY_EQUIPMENT', subCategory: 'Footwear', brand: 'Bata', model: 'SS-428', unitType: 'PAIRS', purchasePrice: 520, sellingPrice: 895, gstRate: 'RATE_12', currentStock: 18, minStock: 5, maxStock: 50 },
];

// ── Employees ──
const EMPLOYEES = [
  { name: 'Mohan Singh', phone: '+918765432101', role: 'Salesman', salary: paise(15000) },
  { name: 'Sita Devi', phone: '+918765432102', role: 'Cashier', salary: paise(12000) },
  { name: 'Ravi Kumar', phone: '+918765432103', role: 'Store Helper', salary: paise(10000) },
  { name: 'Anita Sharma', phone: '+918765432104', role: 'Salesman', salary: paise(14000) },
];

// ── Expense categories ──
const EXPENSE_CATEGORIES = {
  RENT: { label: 'Rent', typical: 25000, freq: 1 },        // once
  UTILITY_BILLS: { label: 'Utilities', typical: 5000, freq: 2 },  // twice in period
  SALARY: { label: 'Salaries', typical: 51000, freq: 1 },
  TRANSPORTATION: { label: 'Transport', typical: 2000, freq: 3 },
  MAINTENANCE: { label: 'Maintenance', typical: 1500, freq: 2 },
  PETTY_CASH: { label: 'Petty Cash', typical: 800, freq: 3 },
  MARKETING: { label: 'Marketing', typical: 3000, freq: 1 },
  OTHER: { label: 'Other', typical: 1000, freq: 2 },
};

// ============ SKU GENERATOR ============

function generateSKU(product, index) {
  const catCode = product.category.substring(0, 3);
  const brandCode = product.brand ? product.brand.substring(0, 2).toUpperCase() : 'XX';
  const nameCode = product.name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase();
  return `${catCode}-${brandCode}-${nameCode}-${String(index + 1).padStart(3, '0')}`;
}

// ============ MAIN SEED FUNCTION ============

async function main() {
  console.log('🌱 Seeding StockMate Pro database...\n');

  // ── Clean existing data in reverse dependency order ──
  console.log('🧹 Clearing existing data...');
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
  console.log('   Done.\n');

  // ═══════════════════════════════════════════════════
  //  1. Create Users
  // ═══════════════════════════════════════════════════
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
        createdAt: daysAgo(90),
      },
    });
    createdUsers[u.role] = user;
    console.log(`   ${u.firstName} ${u.lastName} (${u.role}) — ${u.email}`);
  }

  // ═══════════════════════════════════════════════════
  //  2. Create Branch
  // ═══════════════════════════════════════════════════
  console.log('\n🏢 Creating branch...');
  const branch = await prisma.branch.create({
    data: {
      name: 'StockMate Pro — Main Store',
      code: 'SMP-001',
      address: 'Plot No. 17, Sector 12, Industrial Area, Nerul',
      phone: '+918080001111',
      email: 'store@stockmate.com',
      gstNumber: '27AAECS1234K1Z2',
      createdAt: daysAgo(90),
    },
  });
  console.log(`   ${branch.name} (${branch.code})`);

  // Assign all users to branch
  for (const [, user] of Object.entries(createdUsers)) {
    await prisma.userBranch.create({
      data: {
        userId: user.id,
        branchId: branch.id,
        isDefault: ['ADMIN', 'STORE_MANAGER'].includes(user.role),
      },
    });
  }

  // ═══════════════════════════════════════════════════
  //  3. Create Company Profile
  // ═══════════════════════════════════════════════════
  console.log('\n🏪 Creating company profile...');
  await prisma.companyProfile.create({
    data: {
      companyName: 'StockMate Pro',
      address: 'Plot No. 17, Sector 12, Industrial Area, Nerul, Navi Mumbai - 400706',
      phone: '+918080001111',
      email: 'store@stockmate.com',
      gstNumber: '27AAECS1234K1Z2',
      footerText: 'Thank you for your business! Visit again.',
    },
  });
  console.log(`   Company profile created`);

  // ═══════════════════════════════════════════════════
  //  4. Create Category Settings
  // ═══════════════════════════════════════════════════
  console.log('\n📁 Creating category settings...');
  for (const cat of CATEGORY_SETTINGS) {
    await prisma.categorySetting.create({ data: cat });
  }
  console.log(`   ${CATEGORY_SETTINGS.length} categories created`);

  // ═══════════════════════════════════════════════════
  //  5. Create Suppliers
  // ═══════════════════════════════════════════════════
  console.log('\n🚚 Creating suppliers...');
  const createdSuppliers = [];
  for (const s of SUPPLIERS) {
    const supplier = await prisma.supplier.create({
      data: { ...s, createdAt: daysAgo(80) },
    });
    createdSuppliers.push(supplier);
    console.log(`   ${supplier.name}`);
  }

  // ═══════════════════════════════════════════════════
  //  6. Create Customers
  // ═══════════════════════════════════════════════════
  console.log('\n👥 Creating customers...');
  const createdCustomers = [];
  for (const c of CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: { ...c, createdAt: daysAgo(70) },
    });
    createdCustomers.push(customer);
    console.log(`   ${customer.name}`);
  }

  // ═══════════════════════════════════════════════════
  //  7. Create Inventory Items
  // ═══════════════════════════════════════════════════
  console.log('\n📦 Creating inventory items...');
  const createdItems = [];
  const itemSuppliersData = [];
  // Track live stock to ensure branch-inventory and final summary are accurate
  const stockMap = new Map(); // itemId -> currentStock

  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const sku = generateSKU(p, i);
    const cameInDate = daysAgo(randomInt(40, 80));

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
        description: `${p.brand} ${p.model || ''} — ${p.subCategory || ''}. ${p.unitType}`,
        isActive: true,
        lastMovement: cameInDate,
        createdById: createdUsers.ADMIN.id,
        createdAt: cameInDate,
      },
    });

    stockMap.set(item.id, p.currentStock);

    // Initial stock-in movement
    if (p.currentStock > 0) {
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          branchId: branch.id,
          type: 'IN',
          quantity: p.currentStock,
          reason: 'Initial stock setup',
          oldStock: 0,
          newStock: p.currentStock,
          createdById: createdUsers.ADMIN.id,
          createdAt: cameInDate,
        },
      });
    }

    // Assign 1-2 random suppliers per item
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
    if ((i + 1) % 12 === 0) console.log(`   ${i + 1} items created...`);
  }
  console.log(`   ${createdItems.length} total items created`);

  // Link item-supplier relationships
  console.log('\n🔗 Linking item-supplier relationships...');
  for (const isData of itemSuppliersData) {
    await prisma.itemSupplier.create({ data: isData });
  }
  console.log(`   ${itemSuppliersData.length} supplier-item links created`);

  // ═══════════════════════════════════════════════════
  //  8. Create Purchase Orders (6 POs with various states)
  // ═══════════════════════════════════════════════════
  console.log('\n📋 Creating purchase orders...');
  const createdPurchases = [];
  const adminUser = createdUsers.ADMIN;
  const managerUser = createdUsers.STORE_MANAGER;

  const purchaseData = [
    // Fully received & paid PO
    { supplierIdx: 0, user: managerUser, status: 'RECEIVED', days: 55, paid: true, discountType: null, discountValue: null, items: [
      { itemIdx: 0, qty: 25, price: 1850 },  // Finolex 1.5mm wire
      { itemIdx: 1, qty: 18, price: 3200 },  // Finolex 2.5mm wire
      { itemIdx: 2, qty: 120, price: 85 },   // Havells 6A MCB
      { itemIdx: 8, qty: 15, price: 780 },   // Havells Exhaust Fan
    ]},
    // Fully received & paid (with 5% discount)
    { supplierIdx: 1, user: managerUser, status: 'RECEIVED', days: 42, paid: true, discountType: 'PERCENTAGE', discountValue: 5, items: [
      { itemIdx: 9, qty: 60, price: 180 },   // Supreme PVC 1"
      { itemIdx: 11, qty: 35, price: 210 },  // Jaquar Ball Valve 1/2"
      { itemIdx: 14, qty: 50, price: 45 },   // Cello Tank Connector
      { itemIdx: 17, qty: 100, price: 18 },  // Teflon Tape
    ]},
    // Fully received & paid PO
    { supplierIdx: 2, user: managerUser, status: 'RECEIVED', days: 30, paid: true, discountType: null, discountValue: null, items: [
      { itemIdx: 18, qty: 25, price: 280 },  // Asian Royale 1L
      { itemIdx: 19, qty: 12, price: 980 },  // Asian Royale 4L
      { itemIdx: 22, qty: 20, price: 195 },  // Nerolac Primer
      { itemIdx: 25, qty: 60, price: 8 },    // Sandpaper sheets
    ]},
    // Partially received, partially paid (₹500 flat discount)
    { supplierIdx: 3, user: managerUser, status: 'PARTIAL', days: 18, paid: false, discountType: 'FLAT', discountValue: 500, items: [
      { itemIdx: 26, qty: 20, price: 480 },  // MS Angle
      { itemIdx: 27, qty: 15, price: 620 },  // GI Pipe
      { itemIdx: 30, qty: 15, price: 390 },  // MS Square Pipe
    ]},
    // Ordered, not yet received, payment pending
    { supplierIdx: 4, user: adminUser, status: 'ORDERED', days: 6, paid: false, discountType: null, discountValue: null, items: [
      { itemIdx: 38, qty: 6, price: 1850 },  // Cera EWC
      { itemIdx: 39, qty: 5, price: 1200 },  // Parryware Basin
      { itemIdx: 43, qty: 25, price: 120 },  // Angle Valve
    ]},
    // Created today, draft status
    { supplierIdx: 0, user: adminUser, status: 'DRAFT', days: 0, paid: false, discountType: null, discountValue: null, items: [
      { itemIdx: 4, qty: 200, price: 65 },   // LED Bulbs
      { itemIdx: 7, qty: 30, price: 1050 },  // Polycab Wire
    ]},
  ];

  let poIndex = 0;
  for (const pd of purchaseData) {
    poIndex++;
    const poDate = daysAgo(pd.days);
    const poNumber = formatPONumber(poIndex, poDate);

    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    const poItems = [];

    for (const pi of pd.items) {
      const item = createdItems[pi.itemIdx];
      const gstPercent = parseInt(item.gstRate.replace('RATE_', ''));
      const lineTotal = pi.price * pi.qty;
      const gstAmount = Math.round(lineTotal * gstPercent / 100);
      const totalPrice = lineTotal + gstAmount;
      subtotal += lineTotal;
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
        lineTotal,
      });
    }

    // Apply discount
    if (pd.discountType && pd.discountValue) {
      if (pd.discountType === 'PERCENTAGE') {
        discountTotal = Math.round(subtotal * pd.discountValue / 100);
      } else if (pd.discountType === 'FLAT') {
        discountTotal = Math.round(pd.discountValue * 100);
      }
    }

    const grandTotal = subtotal + gstTotal - discountTotal;
    const isFullyPaid = pd.status === 'RECEIVED' && pd.paid;
    const paidAmount = isFullyPaid ? grandTotal : pd.status === 'PARTIAL' ? Math.floor(grandTotal * 0.3) : 0;
    const balanceAmount = grandTotal - paidAmount;

    const purchase = await prisma.purchase.create({
      data: {
        poNumber,
        supplierId: createdSuppliers[pd.supplierIdx].id,
        branchId: branch.id,
        userId: pd.user.id,
        orderDate: poDate,
        expectedDate: pd.days > 0 ? new Date(poDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        status: pd.status,
        subtotal,
        discountTotal,
        gstTotal,
        grandTotal,
        paidAmount,
        balanceAmount,
        paymentStatus: isFullyPaid ? 'PAID' : pd.status === 'PARTIAL' ? 'PARTIAL' : 'PENDING',
        paymentMethod: isFullyPaid ? 'BANK_TRANSFER' : pd.status === 'PARTIAL' ? 'CASH' : null,
        discountType: pd.discountType,
        discountValue: pd.discountValue || null,
        notes: `Purchase order #${poNumber} — ${pd.items.length} items from ${createdSuppliers[pd.supplierIdx].name}`,
        supplierInvoice: pd.status === 'RECEIVED' ? `SI-${poDate.getFullYear()}-${String(poIndex).padStart(4, '0')}` : null,
        supplierInvDate: pd.status === 'RECEIVED' ? poDate : null,
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
    }      // Stock movements for received items
    if (pd.status === 'RECEIVED' || pd.status === 'PARTIAL') {
      for (const pi of poItems) {
        if (pi.receivedQty > 0) {
          const oldStock = stockMap.get(pi.itemId) || 0;
          const newStock = oldStock + pi.receivedQty;
          stockMap.set(pi.itemId, newStock);

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
              oldStock,
              newStock,
              createdById: pd.user.id,
              createdAt: poDate,
            },
          });
        }
      }

      // Supplier ledger — purchase entry
      await prisma.supplierLedger.create({
        data: {
          supplierId: createdSuppliers[pd.supplierIdx].id,
          date: poDate,
          type: 'PURCHASE',
          amount: grandTotal,
          balance: balanceAmount,
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
            balance: balanceAmount,
            description: `Payment for ${poNumber}`,
            referenceId: purchase.id,
          },
        });
      }

      // Update supplier outstanding
      await prisma.supplier.update({
        where: { id: createdSuppliers[pd.supplierIdx].id },
        data: { outstanding: { increment: balanceAmount } },
      });
    }

    createdPurchases.push(purchase);
    console.log(`   ${poNumber} — ₹${(grandTotal / 100).toFixed(2)} (${pd.status}${paidAmount > 0 ? `, Paid ₹${(paidAmount / 100).toFixed(2)}` : ''}${discountTotal > 0 ? `, Discount ₹${(discountTotal / 100).toFixed(2)}` : ''})`);
  }

  // ═══════════════════════════════════════════════════
  //  9. Create Purchase Returns (return-to-supplier scenarios)
  // ═══════════════════════════════════════════════════
  console.log('\n↩️ Creating purchase returns...');
  const createdReturns = [];

  const returnScenarios = [
    // Return 1: Defective MCBs & exhaust fans from Reliance Electricals (PO-202606-0001, fully received)
    {
      purchaseIdx: 0,
      reason: 'Defective MCBs tripping under load and exhaust fans with excessive motor noise — manufacturer batch issue',
      items: [
        { itemIdx: 2, desc: 'Havells 6A MCB', qty: 5 },
        { itemIdx: 8, desc: 'Havells Exhaust Fan 150mm', qty: 2 },
      ],
      days: 50,
    },
    // Return 2: Over-order correction from Asian Paints (PO-202606-0003, fully received)
    {
      purchaseIdx: 2,
      reason: 'Over-ordered — excess stock returned with supplier approval',
      items: [
        { itemIdx: 19, desc: 'Asian Royale 4L', qty: 2 },
      ],
      days: 25,
    },
    // Return 3: Damaged pipes from Bihar Pipe & Fittings (PO-202606-0002, fully received)
    {
      purchaseIdx: 1,
      reason: 'PVC pipes damaged during transit — hairline cracks in 3 pipes',
      items: [
        { itemIdx: 9, desc: 'Supreme PVC Pipe 1\"', qty: 4 },
      ],
      days: 38,
    },
  ];

  for (const rs of returnScenarios) {
    const purchase = createdPurchases[rs.purchaseIdx];
    const pd = purchaseData[rs.purchaseIdx];
    const returnDate = daysAgo(rs.days);
    const supplierId = createdSuppliers[pd.supplierIdx].id;

    let totalReturn = 0;
    const returnMovements = [];

    for (const ri of rs.items) {
      const item = createdItems[ri.itemIdx];
      // Find the purchase item to get unitPrice
      const purchaseItemData = pd.items.find(pi => pi.itemIdx === ri.itemIdx);
      const unitPrice = purchaseItemData ? purchaseItemData.price : item.purchasePrice;
      const refund = unitPrice * ri.qty;
      totalReturn += refund;

      // Decrement inventory stock
      const oldStock = stockMap.get(item.id) || 0;
      const newStock = oldStock - ri.qty;
      stockMap.set(item.id, newStock);

      await prisma.inventory.update({
        where: { id: item.id },
        data: {
          currentStock: { decrement: ri.qty },
          lastMovement: returnDate,
        },
      });

      // Stock movement
      await prisma.stockMovement.create({
        data: {
          itemId: item.id,
          branchId: branch.id,
          type: 'RETURN',
          quantity: ri.qty,
          reason: `Return to supplier — ${rs.reason}`,
          reference: purchase.poNumber,
          oldStock,
          newStock,
          createdById: managerUser.id,
          createdAt: returnDate,
        },
      });

      // Decrement receivedQty on the purchase item
      const purchaseItemRecord = await prisma.purchaseItem.findFirst({
        where: { purchaseId: purchase.id, itemId: item.id },
      });
      if (purchaseItemRecord) {
        await prisma.purchaseItem.update({
          where: { id: purchaseItemRecord.id },
          data: { receivedQty: { decrement: ri.qty } },
        });
      }

      returnMovements.push({
        name: ri.desc,
        qty: ri.qty,
        unitPrice,
        refund,
      });
    }

    // Create debit note in supplier ledger
    const lastLedger = await prisma.supplierLedger.findFirst({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.supplierLedger.create({
      data: {
        supplierId,
        date: returnDate,
        type: 'DEBIT_NOTE',
        amount: -totalReturn,
        balance: (lastLedger?.balance || 0) - totalReturn,
        description: `Return to supplier — ${purchase.poNumber} (${rs.reason})`,
        referenceId: purchase.id,
      },
    });

    // Update supplier outstanding
    await prisma.supplier.update({
      where: { id: supplierId },
      data: { outstanding: { decrement: totalReturn } },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: managerUser.id,
        action: 'CREATE',
        entity: 'Purchase',
        entityId: purchase.id,
        newValue: JSON.stringify({
          action: 'return-to-supplier',
          poNumber: purchase.poNumber,
          reason: rs.reason,
          totalReturn: totalReturn,
          items: returnMovements.map(m => `${m.qty}x ${m.name} (₹${(m.refund / 100).toFixed(2)})`),
        }),
        createdAt: returnDate,
      },
    });

    // Notification
    await prisma.notification.create({
      data: {
        userId: adminUser.id,
        title: 'Return Processed',
        message: `Return of ${returnMovements.length} item(s) worth ₹${(totalReturn / 100).toFixed(2)} processed against ${purchase.poNumber}. ${rs.reason}`,
        type: 'INFO',
        reference: 'purchases',
        isRead: rs.days > 30,
        createdAt: returnDate,
      },
    });

    createdReturns.push({ purchaseId: purchase.id, totalReturn, returnDate });
    console.log(`   Return #${createdReturns.length}: ${purchase.poNumber} — ${returnMovements.length} items (₹${(totalReturn / 100).toFixed(2)} refund) — ${rs.reason}`);
  }

  // ═══════════════════════════════════════════════════
  //  10. Create Sales (18 invoices with various scenarios)
  // ═══════════════════════════════════════════════════
  console.log('\n🧾 Creating sales...');
  const createdSales = [];
  const staffUser = createdUsers.STAFF;

  // Track stock adjustments from sales separately
  // We'll use the product's initial currentStock and decrement as we go

  const salesData = [
    // Sale 1: Cash sale to construction company
    { customerIdx: 0, user: staffUser, days: 48, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 0, qty: 2, price: 2499 },    // Finolex 1.5mm wire
      { itemIdx: 4, qty: 15, price: 110 },    // LED Bulbs
      { itemIdx: 3, qty: 8, price: 165 },     // Havells 16A MCB
      { itemIdx: 8, qty: 2, price: 1299 },    // Exhaust Fan
    ]},
    // Sale 2: UPI sale to hardware store
    { customerIdx: 1, user: staffUser, days: 42, method: 'UPI', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 9, qty: 6, price: 295 },     // PVC Pipe 1"
      { itemIdx: 11, qty: 3, price: 525 },    // Ball Valve 1"
      { itemIdx: 14, qty: 10, price: 85 },    // Tank Connector
      { itemIdx: 16, qty: 5, price: 110 },    // Solvent Cement
    ]},
    // Sale 3: Walk-in cash sale
    { customerIdx: null, user: staffUser, days: 36, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 18, qty: 3, price: 465 },    // Asian Royale 1L
      { itemIdx: 23, qty: 4, price: 105 },    // Paint Brush
      { itemIdx: 24, qty: 2, price: 260 },    // Wall Putty
    ]},
    // Sale 4: Credit sale to construction company (pending payment)
    { customerIdx: 0, user: staffUser, days: 32, method: 'CREDIT', status: 'PENDING', discountType: null, discountValue: null, items: [
      { itemIdx: 26, qty: 5, price: 755 },    // MS Angle
      { itemIdx: 28, qty: 10, price: 120 },   // Nails
      { itemIdx: 30, qty: 3, price: 625 },    // MS Square Pipe
    ]},
    // Sale 5: Walk-in UPI sale — power tool
    { customerIdx: null, user: staffUser, days: 28, method: 'UPI', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 36, qty: 1, price: 625 },    // Pipe Cutter
      { itemIdx: 37, qty: 2, price: 265 },    // Spanner
      { itemIdx: 40, qty: 1, price: 295 },    // Hammer
    ]},
    // Sale 6: Cash to hardware store — electrical items
    { customerIdx: 1, user: staffUser, days: 22, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 5, qty: 5, price: 375 },     // LED Batten
      { itemIdx: 7, qty: 3, price: 1499 },    // Polycab Wire
      { itemIdx: 3, qty: 15, price: 165 },    // MCB 16A
    ]},
    // Sale 7: Walk-in UPI — sanitary items
    { customerIdx: null, user: managerUser, days: 16, method: 'UPI', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 42, qty: 2, price: 650 },    // Pillar Tap
      { itemIdx: 43, qty: 5, price: 220 },    // Angle Valve
      { itemIdx: 44, qty: 1, price: 1099 },   // Shower Kit
    ]},
    // Sale 8: Credit to construction company (partial payment)
    { customerIdx: 0, user: staffUser, days: 12, method: 'CREDIT', status: 'PARTIAL', discountType: null, discountValue: null, items: [
      { itemIdx: 46, qty: 6, price: 245 },    // Safety Helmet
      { itemIdx: 47, qty: 12, price: 145 },   // Safety Goggles
      { itemIdx: 50, qty: 3, price: 175 },    // Safety Vest
    ]},
    // Sale 9: Card payment — tools
    { customerIdx: null, user: staffUser, days: 8, method: 'CARD', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 34, qty: 1, price: 310 },    // Hacksaw
      { itemIdx: 35, qty: 2, price: 345 },    // Spirit Level
      { itemIdx: 38, qty: 1, price: 2999 },   // Power Drill
    ]},
    // Sale 10: Cash — plumbing supplies
    { customerIdx: null, user: staffUser, days: 5, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 14, qty: 15, price: 85 },    // Tank Connector
      { itemIdx: 15, qty: 25, price: 35 },    // Teflon Tape
      { itemIdx: 16, qty: 10, price: 110 },   // Solvent Cement
    ]},
    // Sale 11: UPI to Patel Electricals — wires & switches
    { customerIdx: 4, user: staffUser, days: 4, method: 'UPI', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 7, qty: 2, price: 1499 },    // Polycab Wire
      { itemIdx: 6, qty: 25, price: 55 },     // Modular Switch
      { itemIdx: 2, qty: 30, price: 145 },    // MCB 6A
    ]},
    // Sale 12: Credit to Green Earth Developers (new customer)
    { customerIdx: 3, user: staffUser, days: 3, method: 'CREDIT', status: 'PENDING', discountType: null, discountValue: null, items: [
      { itemIdx: 38, qty: 2, price: 2999 },   // Power Drill
      { itemIdx: 29, qty: 5, price: 525 },    // MS Flat Bar
      { itemIdx: 26, qty: 4, price: 755 },    // MS Angle
    ]},
    // Sale 13: Cash sale to walk-in — paint & brushes
    { customerIdx: null, user: staffUser, days: 2, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 19, qty: 2, price: 1599 },   // Asian Royale 4L
      { itemIdx: 23, qty: 3, price: 105 },    // Paint Brushes
      { itemIdx: 24, qty: 1, price: 260 },    // Wall Putty
    ]},
    // Sale 14: UPI to Vijay Hardware — safety gear
    { customerIdx: 1, user: staffUser, days: 1, method: 'UPI', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 48, qty: 5, price: 145 },    // Goggles
      { itemIdx: 49, qty: 10, price: 110 },   // Gloves
      { itemIdx: 50, qty: 2, price: 325 },    // N95 Masks
    ]},
    // Sale 15: Cash — plumbing pipes
    { customerIdx: null, user: managerUser, days: 0, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 10, qty: 10, price: 195 },   // PVC 1/2"
      { itemIdx: 13, qty: 3, price: 420 },    // CPVC Pipe
    ]},
    // Sale 16: Walk-in — low-value basket
    { customerIdx: null, user: staffUser, days: 0, method: 'CASH', status: 'PAID', discountType: null, discountValue: null, items: [
      { itemIdx: 15, qty: 5, price: 35 },     // Teflon Tape
      { itemIdx: 25, qty: 10, price: 15 },    // Sandpaper
      { itemIdx: 49, qty: 3, price: 110 },    // Gloves
    ]},
  ];

  for (let si = 0; si < salesData.length; si++) {
    const sd = salesData[si];
    const saleDate = daysAgo(sd.days);
    const invoiceNo = formatInvoiceNo(si + 1, saleDate);

    let subtotal = 0;
    let discountTotal = 0;
    let gstTotal = 0;
    let grandTotal = 0;
    const saleItems = [];

    for (const siItem of sd.items) {
      const item = createdItems[siItem.itemIdx];
      const gstPercent = parseInt(item.gstRate.replace('RATE_', ''));
      const itemSubtotal = siItem.price * siItem.qty;
      const itemDiscount = 0;
      const itemGst = Math.round(itemSubtotal * gstPercent / 100);
      const totalPrice = itemSubtotal - itemDiscount + itemGst;

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
        item: item,
      });
    }

    grandTotal = subtotal + gstTotal - discountTotal;
    const paidAmount = sd.status === 'PAID' ? grandTotal : sd.status === 'PARTIAL' ? Math.floor(grandTotal * 0.5) : 0;
    const balanceAmount = grandTotal - paidAmount;

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
        paymentStatus: sd.status,
        notes: `Sale of ${saleItems.length} items to ${sd.customerIdx !== null ? CUSTOMERS[sd.customerIdx].name : 'Walk-in Customer'}`,
        createdAt: saleDate,
      },
    });

    // Create sale items and update stock
    for (const sii of saleItems) {
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          itemId: sii.itemId,
          quantity: sii.quantity,
          unitPrice: sii.unitPrice,
          discount: sii.discount,
          gstAmount: sii.gstAmount,
          totalPrice: sii.totalPrice,
          gstRate: sii.gstRate,
        },
      });

      // Decrement inventory
      const oldStock = stockMap.get(sii.itemId) || 0;
      const newStock = oldStock - sii.quantity;
      stockMap.set(sii.itemId, newStock);

      await prisma.inventory.update({
        where: { id: sii.itemId },
        data: {
          currentStock: { decrement: sii.quantity },
          lastMovement: saleDate,
        },
      });

      await prisma.stockMovement.create({
        data: {
          itemId: sii.itemId,
          branchId: branch.id,
          type: 'OUT',
          quantity: sii.quantity,
          reason: `Sale — ${invoiceNo}`,
          reference: invoiceNo,
          oldStock,
          newStock,
          createdById: sd.user.id,
          createdAt: saleDate,
        },
      });
    }

    // Customer ledger & outstanding for credit/partial sales
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
      await prisma.customer.update({
        where: { id: createdCustomers[sd.customerIdx].id },
        data: { outstanding: { increment: balanceAmount } },
      });
    }

    createdSales.push(sale);
    console.log(`   ${invoiceNo} — ₹${(grandTotal / 100).toFixed(2)} (${sd.method}, ${sd.status}${paidAmount > 0 ? `, Paid ₹${(paidAmount / 100).toFixed(2)}` : ''})`);
  }

  // ═══════════════════════════════════════════════════
  //  10. Create Employees
  // ═══════════════════════════════════════════════════
  console.log('\n👷 Creating employees...');
  const createdEmployees = [];
  for (const emp of EMPLOYEES) {
    const employee = await prisma.employee.create({
      data: {
        ...emp,
        branchId: branch.id,
        createdAt: daysAgo(80),
      },
    });
    createdEmployees.push(employee);
    console.log(`   ${employee.name} (${employee.role}, ₹${(employee.salary / 100).toFixed(0)}/mo)`);
  }

  // ═══════════════════════════════════════════════════
  //  11. Attendance records (last 30 days)
  // ═══════════════════════════════════════════════════
  console.log('\n📅 Creating attendance records...');
  const ATTENDANCE_DAYS = 25;
  let attendanceCount = 0;
  for (const emp of createdEmployees) {
    for (let d = 1; d <= ATTENDANCE_DAYS; d++) {
      if (d % 7 === 0) continue; // skip Sundays
      const date = pastDate(d);
      const clockIn = new Date(date);
      clockIn.setHours(randomInt(8, 10), randomInt(0, 30), 0, 0);
      const clockOut = new Date(date);
      clockOut.setHours(randomInt(17, 19), randomInt(0, 30), 0, 0);
      const hoursWorked = Math.round(((clockOut - clockIn) / (1000 * 60 * 60)) * 10) / 10;

      await prisma.employeeAttendance.create({
        data: {
          employeeId: emp.id,
          userId: adminUser.id,
          date,
          clockIn,
          clockOut,
          hoursWorked,
          status: 'PRESENT',
        },
      });
      attendanceCount++;
    }
  }
  console.log(`   ${attendanceCount} attendance records created (${createdEmployees.length} employees × ~${ATTENDANCE_DAYS - 3} days)`);

  // ═══════════════════════════════════════════════════
  //  12. Expenses — realistic monthly distribution
  // ═══════════════════════════════════════════════════
  console.log('\n💰 Creating expenses...');
  const createdExpenses = [];
  let expenseIndex = 0;

  for (const [catKey, catConfig] of Object.entries(EXPENSE_CATEGORIES)) {
    for (let f = 0; f < catConfig.freq; f++) {
      expenseIndex++;
      const expenseDate = pastDate(randomInt(1, 25));
      // Vary the amount around the typical value
      const variance = randomInt(-20, 20);
      const amount = Math.round(catConfig.typical * (1 + variance / 100));

      const exp = await prisma.expense.create({
        data: {
          branchId: branch.id,
          userId: adminUser.id,
          category: catKey,
          amount: paise(amount),
          date: expenseDate,
          description: `${catConfig.label} — ₹${amount} (${expenseDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })})`,
          createdAt: expenseDate,
        },
      });
      createdExpenses.push(exp);
    }
  }
  console.log(`   ${createdExpenses.length} expenses created (₹${(createdExpenses.reduce((s, e) => s + e.amount, 0) / 100).toFixed(0)} total)`);

  // ═══════════════════════════════════════════════════
  //  13. Notifications
  // ═══════════════════════════════════════════════════
  console.log('\n🔔 Creating notifications...');
  const notifications = [
    { userId: managerUser.id, title: 'Low Stock Alert', message: 'Hacksaw Frame (2 units) and Chain Link (3 units) are below minimum stock. Reorder soon.', type: 'WARNING', reference: 'inventory', days: 1 },
    { userId: managerUser.id, title: 'Purchase Order Due', message: 'PO-202606-0005 payment of ₹18,350 due in 3 days from Sanitary World.', type: 'INFO', reference: 'purchases', days: 2 },
    { userId: adminUser.id, title: 'Customer Payment Overdue', message: 'Sharma Construction Co has outstanding of ₹14,230 overdue by 12 days. Send reminder.', type: 'WARNING', reference: 'customers', days: 3 },
    { userId: adminUser.id, title: 'Daily Summary', message: "Today's sales: ₹12,450 across 3 invoices. Highest seller: Power Drill (2 units).", type: 'INFO', reference: 'dashboard', days: 0 },
    { userId: adminUser.id, title: 'Stock Received', message: 'Order PO-202606-0003 from Asian Paints Distributors fully received — 117 items added to inventory.', type: 'SUCCESS', reference: 'purchases', days: 5 },
    { userId: staffUser.id, title: 'Shift Reminder', message: 'Your clock-in today was at 9:15 AM. Please ensure timely attendance.', type: 'INFO', reference: null, days: 1 },
    { userId: adminUser.id, title: 'Expense Report Available', message: 'Monthly expense summary for May 2026 is ready: ₹1,02,500 total expenses.', type: 'INFO', reference: 'reports', days: 2 },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        userId: notif.userId,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        reference: notif.reference || null,
        isRead: notif.days > 3, // older notifications are read
        createdAt: daysAgo(notif.days),
      },
    });
  }
  console.log(`   ${notifications.length} notifications created`);

  // ═══════════════════════════════════════════════════
  //  15. Notification Preferences
  // ═══════════════════════════════════════════════════
  for (const [, user] of Object.entries(createdUsers)) {
    await prisma.notificationPreference.create({
      data: { userId: user.id },
    });
  }
  console.log('\n🔔 Notification preferences created for all users');

  // ═══════════════════════════════════════════════════
  //  15. Ledger entries for remaining POs (non-received/partially received)
  // ═══════════════════════════════════════════════════
  console.log('\n📒 Creating supplier ledger entries for all purchases...');
  for (let pi = 0; pi < createdPurchases.length; pi++) {
    const purchase = createdPurchases[pi];
    const pd = purchaseData[pi];

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
      await prisma.supplier.update({
        where: { id: createdSuppliers[pd.supplierIdx].id },
        data: { outstanding: { increment: purchase.balanceAmount } },
      });
    }
  }
  console.log(`   Ledger entries synced for all ${createdPurchases.length} purchases`);

  // ═══════════════════════════════════════════════════
  //  16. Audit Logs
  // ═══════════════════════════════════════════════════
  console.log('\n📝 Creating audit logs...');
  const auditEntries = [
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[0].id, newValue: JSON.stringify({ name: createdItems[0].name }), days: 55 },
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[5].id, newValue: JSON.stringify({ name: createdItems[5].name }), days: 55 },
    { action: 'CREATE', entity: 'Inventory', entityId: createdItems[15].id, newValue: JSON.stringify({ name: createdItems[15].name }), days: 55 },
    { action: 'CREATE', entity: 'Supplier', entityId: createdSuppliers[0].id, newValue: JSON.stringify({ name: createdSuppliers[0].name }), days: 60 },
    { action: 'CREATE', entity: 'Customer', entityId: createdCustomers[0].id, newValue: JSON.stringify({ name: createdCustomers[0].name }), days: 55 },
    { action: 'CREATE', entity: 'Sale', entityId: createdSales[0].id, newValue: JSON.stringify({ invoiceNo: createdSales[0].invoiceNo }), days: 48 },
    { action: 'CREATE', entity: 'Purchase', entityId: createdPurchases[0].id, newValue: JSON.stringify({ poNumber: createdPurchases[0].poNumber }), days: 55 },
    { action: 'CREATE', entity: 'User', entityId: adminUser.id, newValue: JSON.stringify({ email: adminUser.email }), days: 60 },
    { action: 'UPDATE', entity: 'Inventory', entityId: createdItems[31].id, newValue: JSON.stringify({ currentStock: 2, action: 'stock-out' }), days: 5 },
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
        createdAt: daysAgo(audit.days),
      },
    });
  }
  console.log(`   ${auditEntries.length} audit logs created`);

  // ═══════════════════════════════════════════════════
  //  17. Branch Inventory Links
  // ═══════════════════════════════════════════════════
  console.log('\n🔗 Creating branch-inventory links...');
  const batchSize = 10;
  for (let i = 0; i < createdItems.length; i += batchSize) {
    const batch = createdItems.slice(i, i + batchSize);
    await prisma.branchInventory.createMany({
      data: batch.map((item) => ({
        branchId: branch.id,
        itemId: item.id,
        stock: stockMap.get(item.id) || 0, // Use live stock tracking
      })),
    });
  }
  console.log(`   ${createdItems.length} inventory items linked to branch`);

  // ═══════════════════════════════════════════════════
  //  SUMMARY
  // ═══════════════════════════════════════════════════
  console.log('\n' + '='.repeat(56));
  console.log('✅ Seed completed successfully!');
  console.log('='.repeat(56));
  console.log('\n📊 Summary:');
  console.log(`   Users:         ${USERS.length}`);
  console.log(`   Branches:      1`);
  console.log(`   Company:       StockMate Pro`);
  console.log(`   Categories:    ${CATEGORY_SETTINGS.length}`);
  console.log(`   Suppliers:     ${createdSuppliers.length}`);
  console.log(`   Customers:     ${createdCustomers.length}`);
  console.log(`   Products:      ${createdItems.length}`);
  console.log(`   Purchases:     ${createdPurchases.length} (incl. 1 with discount, 1 draft)`);
  console.log(`   Returns:       ${createdReturns.length} (₹${(createdReturns.reduce((s, r) => s + r.totalReturn, 0) / 100).toFixed(0)} total refunded)`);
  console.log(`   Sales:         ${createdSales.length}`);
  console.log(`   Employees:     ${createdEmployees.length}`);
  console.log(`   Expenses:      ${createdExpenses.length}`);
  console.log(`   Notifications: ${notifications.length}`);
  console.log(`   Audit Logs:    ${auditEntries.length}`);
  console.log('');
  console.log(`🔑 Login Credentials:`);
  for (const u of USERS) {
    console.log(`   ${u.role.padEnd(15)} ${u.email.padEnd(32)} ${u.password}`);
  }

  // Highlight low stock items — query actual DB values
  const lowStockItems = await prisma.inventory.findMany({
    where: { isActive: true },
    select: { name: true, sku: true, currentStock: true, minStock: true, unitType: true },
  });
  const belowThreshold = lowStockItems.filter(i => i.currentStock <= i.minStock);
  if (belowThreshold.length > 0) {
    console.log(`\n⚠️  Low Stock Items (${belowThreshold.length}):`);
    for (const item of belowThreshold) {
      console.log(`   ${item.name} — ${item.currentStock} ${item.unitType} (min: ${item.minStock})`);
    }
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
