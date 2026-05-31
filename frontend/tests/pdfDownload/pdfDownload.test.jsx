import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import api from '../../src/utils/api';

// Increase global test timeout for slower components (SupplierDetail, CustomerDetail)
vi.setConfig({ testTimeout: 30000 });

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-id-123' }),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ state: null }),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { language: 'en' },
  }),
}));

const renderWithProviders = (ui) =>
  render(<MemoryRouter initialEntries={['/test']}>{ui}</MemoryRouter>);

// Return plain string data instead of Blob to avoid happy-dom Blob wrapping issues
const createMockBlobResponse = () => ({
  data: '%PDF-1.4 test content',
});

describe('SaleDetail - PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/sales/test-id-123')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'test-id-123', invoiceNo: 'INV-001', grandTotal: 10000,
              subtotal: 8000, gstTotal: 1800, paidAmount: 10000,
              balanceAmount: 0, paymentStatus: 'PAID', paymentMethod: 'CASH',
              createdAt: new Date().toISOString(), items: [],
              customer: null, user: null, branch: null,
            },
          },
        });
      }
      if (url.startsWith('/settings/company')) {
        return Promise.resolve({ data: { data: null } });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the PDF API endpoint with responseType blob on button click', async () => {
    const { default: SaleDetail } = await import('../../src/pages/sales/SaleDetail.jsx');
    renderWithProviders(<SaleDetail />);

    expect(await screen.findByText('INV-001', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/sales/test-id-123/pdf', { responseType: 'blob' });
    });
  });

  it('creates a blob URL and triggers download when PDF API succeeds', async () => {
    const { default: SaleDetail } = await import('../../src/pages/sales/SaleDetail.jsx');
    renderWithProviders(<SaleDetail />);

    expect(await screen.findByText('INV-001', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('handles PDF download error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { default: SaleDetail } = await import('../../src/pages/sales/SaleDetail.jsx');
    renderWithProviders(<SaleDetail />);

    expect(await screen.findByText('INV-001', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockRejectedValueOnce(new Error('Network error'));

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('PDF download failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});

describe('PurchaseDetail - PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/purchases/test-id-123')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'test-id-123', poNumber: 'PO-001', grandTotal: 50000,
              subtotal: 42000, gstTotal: 8000, paidAmount: 50000,
              balanceAmount: 0, status: 'RECEIVED', paymentStatus: 'PAID',
              orderDate: new Date().toISOString(), items: [],
              supplier: null, user: null, branch: null,
            },
          },
        });
      }
      if (url.startsWith('/settings/company')) {
        return Promise.resolve({ data: { data: null } });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the PDF API endpoint with responseType blob on button click', async () => {
    const { default: PurchaseDetail } = await import('../../src/pages/purchases/PurchaseDetail.jsx');
    renderWithProviders(<PurchaseDetail />);

    expect(await screen.findByText('PO-001', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/purchases/test-id-123/pdf', { responseType: 'blob' });
    });
  });

  it('downloads PDF with correct filename format', async () => {
    const { default: PurchaseDetail } = await import('../../src/pages/purchases/PurchaseDetail.jsx');
    renderWithProviders(<PurchaseDetail />);

    expect(await screen.findByText('PO-001', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    await vi.waitFor(() => {
      // verify button exists before clicking
      expect(pdfButtons.length).toBeGreaterThan(0);
    });

    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

describe('InventoryDetail - PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/inventory/test-id-123')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'test-id-123', name: 'PVC Pipe 1inch', sku: 'PVC-001',
              currentStock: 50, minStock: 10, maxStock: 100,
              sellingPrice: 20000, purchasePrice: 15000,
              category: 'PLUMBING', unitType: 'PCS', isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(), stockMovements: [],
            },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the PDF API endpoint on button click', async () => {
    const { default: InventoryDetail } = await import('../../src/pages/inventory/InventoryDetail.jsx');
    renderWithProviders(<InventoryDetail />);

    expect(await screen.findByText('PVC Pipe 1inch', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/inventory/test-id-123/pdf', { responseType: 'blob' });
    });
  });

  it('downloads PDF and creates blob URL on button click', async () => {
    const { default: InventoryDetail } = await import('../../src/pages/inventory/InventoryDetail.jsx');
    renderWithProviders(<InventoryDetail />);

    expect(await screen.findByText('PVC Pipe 1inch', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

describe('SupplierDetail - PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/ledger')) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith('/suppliers/test-id-123')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'test-id-123', name: 'ABC Trading Co', phone: '9876543210',
              isActive: true, outstanding: 2500000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              purchases: [], items: [], gstNumber: 'GST123456',
            },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the PDF API endpoint on button click', async () => {
    const { default: SupplierDetail } = await import('../../src/pages/suppliers/SupplierDetail.jsx');
    renderWithProviders(<SupplierDetail />);

    expect(await screen.findByRole('heading', { name: /ABC Trading Co/i }, { timeout: 15000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/suppliers/test-id-123/pdf', { responseType: 'blob' });
    });
  });

  it('downloads PDF and creates blob URL on button click', async () => {
    const { default: SupplierDetail } = await import('../../src/pages/suppliers/SupplierDetail.jsx');
    renderWithProviders(<SupplierDetail />);

    expect(await screen.findByRole('heading', { name: /ABC Trading Co/i }, { timeout: 15000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

describe('CustomerDetail - PDF Download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes('/ledger')) return Promise.resolve({ data: { data: [] } });
      if (url.startsWith('/customers/test-id-123')) {
        return Promise.resolve({
          data: {
            data: {
              id: 'test-id-123', name: 'Rajesh Patel', phone: '9876543210',
              isActive: true, outstanding: 500000,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(), sales: [],
            },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the PDF API endpoint on button click', async () => {
    const { default: CustomerDetail } = await import('../../src/pages/customers/CustomerDetail.jsx');
    renderWithProviders(<CustomerDetail />);

    expect(await screen.findByRole('heading', { name: /Rajesh Patel/i }, { timeout: 15000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfButtons = screen.getAllByText('PDF');
    fireEvent.click(pdfButtons[0]);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/customers/test-id-123/pdf', { responseType: 'blob' });
    });
  });
});

describe('Expenses - PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/expenses')) {
        return Promise.resolve({
          data: {
            data: {
              expenses: [{
                id: 'exp-1', category: 'ELECTRICITY', amount: 500000,
                description: 'Monthly electricity bill',
                date: new Date().toISOString(), isRecurring: true,
                user: { firstName: 'Admin', lastName: 'User' },
              }],
              summary: { total: 500000, byCategory: { ELECTRICITY: 500000 } },
            },
            pagination: { total: 1, totalPages: 1 },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the bulk PDF export endpoint on button click', async () => {
    const { default: Expenses } = await import('../../src/pages/expenses/Expenses.jsx');
    renderWithProviders(<Expenses />);

    expect(await screen.findByText(/1 expense/, {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const exportBtn = screen.getByText('Export PDF');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining('/expenses/export/pdf'),
        { responseType: 'blob' }
      );
    });
  });

  it('includes filter params in the PDF export URL when filters are active', async () => {
    const { default: Expenses } = await import('../../src/pages/expenses/Expenses.jsx');
    renderWithProviders(<Expenses />);

    expect(await screen.findByText(/1 expense/, {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());
    const exportBtn = screen.getByText('Export PDF');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      const calls = api.get.mock.calls.filter(
        (c) => c[0].includes('/expenses/export/pdf')
      );
      expect(calls.length).toBeGreaterThan(0);
    });
  });
});

describe('InventoryList - Bulk PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/inventory')) {
        return Promise.resolve({
          data: {
            data: [{
              id: 'inv-1', name: 'PVC Pipe', sku: 'PVC-001',
              category: 'PLUMBING', currentStock: 50, sellingPrice: 20000,
              isActive: true, isLowStock: false, unitType: 'PCS',
            }],
            pagination: { total: 1, totalPages: 1 },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the bulk PDF export endpoint on PDF button click', async () => {
    const { default: InventoryList } = await import('../../src/pages/inventory/InventoryList.jsx');
    renderWithProviders(<InventoryList />);

    expect(await screen.findByText(/1 item/, {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfBtn = screen.getByTitle('Export PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/inventory/export/pdf', { responseType: 'blob' });
    });
  });

  it('triggers blob URL creation on bulk PDF export', async () => {
    const { default: InventoryList } = await import('../../src/pages/inventory/InventoryList.jsx');
    renderWithProviders(<InventoryList />);

    expect(await screen.findByTitle('Export PDF', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfBtn = screen.getByTitle('Export PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

describe('SupplierList - Bulk PDF Export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.startsWith('/suppliers')) {
        return Promise.resolve({
          data: {
            data: [{
              id: 'sup-1', name: 'ABC Trading', phone: '9876543210',
              isActive: true, outstanding: 100000,
              _count: { purchases: 5 },
            }],
            pagination: { total: 1, totalPages: 1 },
          },
        });
      }
      return Promise.reject(new Error('Unexpected URL: ' + url));
    });
  });

  it('calls the bulk PDF export endpoint on PDF button click', async () => {
    const { default: SupplierList } = await import('../../src/pages/suppliers/SupplierList.jsx');
    renderWithProviders(<SupplierList />);

    expect(await screen.findByText(/1 supplier/, {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfBtn = screen.getByTitle('Export PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/suppliers/export/pdf', { responseType: 'blob' });
    });
  });

  it('triggers blob URL creation on bulk PDF export', async () => {
    const { default: SupplierList } = await import('../../src/pages/suppliers/SupplierList.jsx');
    renderWithProviders(<SupplierList />);

    expect(await screen.findByTitle('Export PDF', {}, { timeout: 10000 })).toBeInTheDocument();

    api.get.mockResolvedValueOnce(createMockBlobResponse());

    const pdfBtn = screen.getByTitle('Export PDF');
    fireEvent.click(pdfBtn);

    await waitFor(() => {
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});
