// ── Environment ──
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '0'; // random port to avoid conflicts

// ── Mock bcrypt (avoid actual hashing in tests) ──
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockImplementation((password, hash) => {
    // If the hash contains the password, return true (for valid credentials)
    // Otherwise return false (for wrong passwords)
    // The mock hash "$2a$12$mockhashedpassword" maps to password "Admin@123"
    if (hash === '$2a$12$mockhashedpassword' && password === 'Admin@123') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),
  hash: jest.fn().mockResolvedValue('$2a$12$mockedhashedresult'),
}));

// ── Mock jsonwebtoken ──
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn().mockReturnValue({
    userId: 'mock-user-id',
    role: 'ADMIN',
  }),
  sign: jest.fn().mockReturnValue('mock-token'),
}));

// ── Mock Prisma ──
const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue({
      id: 'mock-user-id',
      firstName: 'Test',
      lastName: 'Admin',
      email: 'admin@test.com',
      role: 'ADMIN',
      isActive: true,
      branches: [{
        isDefault: true,
        branchId: 'mock-branch-id',
        branch: {
          id: 'mock-branch-id',
          name: 'Main Branch',
          address: '123 Test St',
          phone: '9876543210',
          gstNumber: '27AAAPL1234C1Z1',
        },
      }],
    }),
    findMany: jest.fn().mockResolvedValue([]),
  },
  sale: { findUnique: jest.fn().mockResolvedValue(null) },
  purchase: { findUnique: jest.fn().mockResolvedValue(null) },
  inventory: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
  },
  supplier: {
    findUnique: jest.fn().mockResolvedValue(null),
    findMany: jest.fn().mockResolvedValue([]),
  },
  customer: { findUnique: jest.fn().mockResolvedValue(null) },
  expense: { findUnique: jest.fn().mockResolvedValue(null) },
  companyProfile: { findFirst: jest.fn().mockResolvedValue(null) },
  notification: {
    create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
  },
  notificationPreference: {
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
  },
  $disconnect: jest.fn(),
};

jest.mock('../src/utils/prisma', () => ({
  prisma: mockPrisma,
}));

// ── Mock PDF utilities ──
jest.mock('../src/utils/pdf', () => ({
  generatePOPDF: jest.fn().mockResolvedValue(Buffer.from('mock-purchase-pdf')),
  generateInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('mock-invoice-pdf')),
  generateItemPDF: jest.fn().mockResolvedValue(Buffer.from('mock-item-pdf')),
  generateSupplierPDF: jest.fn().mockResolvedValue(Buffer.from('mock-supplier-pdf')),
  generateCustomerPDF: jest.fn().mockResolvedValue(Buffer.from('mock-customer-pdf')),
  generateExpensePDF: jest.fn().mockResolvedValue(Buffer.from('mock-expense-pdf')),
  generateInventoryListPDF: jest.fn().mockResolvedValue(Buffer.from('mock-inventory-list-pdf')),
  generateSupplierListPDF: jest.fn().mockResolvedValue(Buffer.from('mock-supplier-list-pdf')),
}));

// ── Mock PDFKit (used directly in sale controller) ──
const mockPdfDoc = {
  pipe: jest.fn().mockImplementation(function(res) {
    setTimeout(() => {
      if (typeof res.end === 'function') res.end();
    }, 50);
    return this;
  }),
  end: jest.fn(),
  on: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  fontSize: jest.fn().mockReturnThis(),
  font: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  moveDown: jest.fn().mockReturnThis(),
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  fillColor: jest.fn().mockReturnThis(),
  roundedRect: jest.fn().mockReturnThis(),
  image: jest.fn().mockReturnThis(),
  rect: jest.fn().mockReturnThis(),
  circle: jest.fn().mockReturnThis(),
  page: { width: 595.28, height: 841.89 },
};

jest.mock('pdfkit', () => {
  return jest.fn(() => mockPdfDoc);
});

// ── Mock push notification service ──
jest.mock('../src/services/pushNotification.service', () => ({
  sendToUser: jest.fn().mockResolvedValue(undefined),
}));

// ── Mock mail service ──
jest.mock('../src/utils/mail', () => ({
  sendEmail: jest.fn().mockResolvedValue({ success: true }),
}));

// Export for use in test files
module.exports = { mockPrisma, mockPdfDoc };
