import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Plus, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, MoreVertical, Eye, FileText,
  AlertTriangle, X, SlidersHorizontal, FileDown, Loader2,
  RefreshCw, TrendingUp, Receipt,
  Wallet, Download, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const paymentStatusColors = {
  PAID: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  PARTIAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  PENDING: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  OVERDUE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-300' },
};

const paymentMethodLabels = {
  CASH: 'Cash', UPI: 'UPI', CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer', CREDIT: 'Credit',
};

const SalesList = () => {
  const { t } = useTranslation();

  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const [actionMenu, setActionMenu] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch daily summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await api.get('/sales/daily-summary');
      setSummary(res.data.data);
    } catch {
      // silent
    }
  }, []);

  // Fetch company profile for print layout
  const fetchCompanyProfile = useCallback(async () => {
    try {
      const res = await api.get('/settings/company');
      setCompanyProfile(res.data.data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCompanyProfile();
  }, [fetchCompanyProfile]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Fetch sales
  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', page);
      params.set('limit', limit);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await api.get(`/sales?${params.toString()}`);
      const data = res.data.data || [];
      setSales(data);
      setTotal(res.data.pagination?.total || data.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sales');
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, paymentStatus, startDate, endDate, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // Sort handler
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get(`/sales/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Download PDF
  const handleDownloadPdf = async (id) => {
    try {
      const res = await api.get(`/sales/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
    setActionMenu(null);
  };

  // Print Sales Register
  const [registerPrinting, setRegisterPrinting] = useState(false);

  const handlePrintRegister = async () => {
    setRegisterPrinting(true);
    try {
      // Fetch all filtered sales (unpaginated) for complete totals
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (paymentStatus) params.set('paymentStatus', paymentStatus);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get(`/sales/register?${params.toString()}`);
      const allSales = res.data.data || [];

      const cp = companyProfile;
      const shopName = cp?.companyName || 'StockMate Pro';
      const shopAddr = cp?.address || '';
      const shopPhone = cp?.phone || '';
      const shopGst = cp?.gstNumber || '';

      const dateRangeLabel = startDate || endDate
        ? `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Start'} — ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'End'}`
        : '';

      const statusFilterLabel = paymentStatus ? ` | Status: ${paymentStatus.charAt(0) + paymentStatus.slice(1).toLowerCase()}` : '';

      const rowsHtml = allSales.map((s, idx) => {
        return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><span class="mono">${s.invoiceNo}</span></td>
          <td>${formatDate(s.createdAt)}</td>
          <td>${s.customer?.name || 'Walk-in'}</td>
          <td class="text-center">${s.items?.length || 0}</td>
          <td>${(s.paymentMethod || 'CASH').replace(/_/g, ' ')}</td>
          <td class="text-center"><span class="badge badge-${s.paymentStatus.toLowerCase()}">${s.paymentStatus}</span></td>
          <td class="text-right mono">\u20B9${(s.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
      }).join('\n');

      const totalAmount = allSales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);
      const totalPaid = allSales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
      const totalBalance = allSales.reduce((sum, s) => sum + (s.balanceAmount || 0), 0);
      const totalItems = allSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);

      const printWindow = window.open('', '_blank', 'width=1000,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Register</title>
        <style>
          @page { margin: 15mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            line-height: 1.5;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom: 2px solid #1e293b;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 22px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          .header p {
            font-size: 12px;
            color: #475569;
          }
          .title-section {
            text-align: center;
            margin-bottom: 20px;
          }
          .title-section h2 {
            font-size: 18px;
            text-transform: uppercase;
            letter-spacing: 2px;
            color: #1e293b;
          }
          .title-section .meta {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .summary-card {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 14px;
          }
          .summary-card .label {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            color: #64748b;
            margin-bottom: 2px;
          }
          .summary-card .value {
            font-size: 18px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th {
            background: #f1f5f9;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            padding: 8px 6px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
          }
          td {
            padding: 6px;
            font-size: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .mono { font-family: 'Courier New', monospace; }
          .badge {
            display: inline-block;
            padding: 1px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          .badge-paid { background: #d1fae5; color: #059669; }
          .badge-partial { background: #fef3c7; color: #d97706; }
          .badge-pending { background: #f1f5f9; color: #64748b; }
          .badge-overdue { background: #fee2e2; color: #dc2626; }
          .badge-cancelled { background: #f1f5f9; color: #94a3b8; }
          .totals {
            display: flex;
            justify-content: flex-end;
            gap: 24px;
            padding: 12px 16px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 16px;
          }
          .totals .item {
            text-align: right;
          }
          .totals .item .label {
            font-size: 10px;
            text-transform: uppercase;
            color: #64748b;
          }
          .totals .item .value {
            font-size: 16px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
          }
          .footer {
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .count-note {
            font-size: 11px;
            color: #64748b;
            margin-bottom: 10px;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${shopName}</h1>
          ${shopAddr ? `<p>${shopAddr}</p>` : ''}
          ${shopPhone ? `<p>Tel: ${shopPhone}</p>` : ''}
          ${shopGst ? `<p>GST: ${shopGst}</p>` : ''}
        </div>

        <div class="title-section">
          <h2>Sales Register</h2>
          <div class="meta">
            Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            ${dateRangeLabel}${statusFilterLabel}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Invoices Listed</div>
            <div class="value">${allSales.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Amount</div>
            <div class="value" style="color: #059669;">\u20B9${(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Collected</div>
            <div class="value" style="color: #d97706;">\u20B9${(totalPaid / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="summary-card">
            <div class="label">Outstanding</div>
            <div class="value" style="color: #dc2626;">\u20B9${(totalBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="count-note">Showing ${allSales.length} invoice${allSales.length !== 1 ? 's' : ''}</div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 32px;">#</th>
              <th>Invoice</th>
              <th style="width: 100px;">Date</th>
              <th>Customer</th>
              <th class="text-center" style="width: 40px;">Items</th>
              <th style="width: 90px;">Payment</th>
              <th class="text-center" style="width: 80px;">Status</th>
              <th class="text-right" style="width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="background: #f8fafc; border-top: 2px solid #1e293b; font-weight: 700;">
              <td class="text-center" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; color: #475569;">Total</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="text-center">${totalItems}</td>
              <td></td>
              <td></td>
              <td class="text-right mono" style="color: #059669;">\u20B9${(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="item">
            <div class="label">Total Invoices</div>
            <div class="value">${allSales.length}</div>
          </div>
          <div class="item">
            <div class="label">Total Amount</div>
            <div class="value" style="color: #059669;">\u20B9${(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="item">
            <div class="label">Total Collected</div>
            <div class="value" style="color: #d97706;">\u20B9${(totalPaid / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="item">
            <div class="label">Outstanding</div>
            <div class="value" style="color: #dc2626;">\u20B9${(totalBalance / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div class="footer">
          <p>${cp?.footerText || 'StockMate Pro'} | This is a computer-generated report.</p>
        </div>

        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()" style="
            padding: 10px 28px;
            background: #1e293b;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            font-weight: 600;
          ">\uD83D\uDD28 Print / Save as PDF</button>
          <p style="margin-top: 6px; font-size: 11px; color: #94a3b8;">Press Ctrl+P or click the button above</p>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 800);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  } catch (err) {
    console.error('Failed to fetch register data:', err);
  } finally {
    setRegisterPrinting(false);
  }
  };

  // Close action menu
  useEffect(() => {
    const handleClick = () => setActionMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Sort icon
  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronUp size={14} className="opacity-0 group-hover:opacity-50" />;
    return sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  // Loading skeleton
  if (loading && sales.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <div className="skeleton h-8 w-40 mb-2" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="skeleton h-8 w-28" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="p-4">
            <div className="skeleton h-10 w-full mb-4 rounded-lg" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 p-3 border-b border-slate-100 dark:border-slate-700">
                <div className="skeleton h-4 w-40" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-28 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('nav.sales')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'invoice' : 'invoices'} {summary ? `\u2022 \u20B9${(summary.totalAmount / 100).toLocaleString('en-IN')} today` : ''}
          </p>
        </div>
        <Link to="/sales/new" className="btn-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">New Sale</span>
        </Link>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ShoppingCart size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Today Sales</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {summary?.totalSales || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Amount</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {formatPrice(summary?.totalAmount)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Wallet size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Collected</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatPrice(summary?.totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Receipt size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
                {formatPrice(summary?.totalPending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          {/* Quick status filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {[
              { key: '', label: 'All' },
              { key: 'PAID', label: 'Paid' },
              { key: 'PARTIAL', label: 'Partial' },
              { key: 'PENDING', label: 'Pending' },
              { key: 'OVERDUE', label: 'Overdue' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setPaymentStatus(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors min-h-[36px]
                  ${paymentStatus === opt.key
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search & controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by invoice no or customer..."
                className="input pl-10 pr-10"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-secondary btn-sm ${showFilters ? 'ring-2 ring-accent-500' : ''}`}
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Date</span>
                {(startDate || endDate) && <span className="w-2 h-2 rounded-full bg-accent-500" />}
              </button>
              <button
                onClick={handlePrintRegister}
                className="btn-secondary btn-sm"
                title="Print Sales Register"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Register</span>
              </button>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary btn-sm">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={() => { setPage(1); fetchSales(); fetchSummary(); }} className="btn-ghost p-2.5" title="Refresh">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Date range filter */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
              <div>
                <label className="label">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                  className="input min-w-[160px]"
                />
              </div>
              <div>
                <label className="label">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                  className="input min-w-[160px]"
                />
              </div>
              <button
                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                className="btn-ghost text-sm text-slate-500"
              >
                <X size={14} /> Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-6 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Failed to Load</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button onClick={fetchSales} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Data table */}
      {!error && (
        <div className="card overflow-hidden">
          {sales.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <ShoppingCart size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {search || paymentStatus || startDate
                  ? 'No invoices match your filters'
                  : 'No sales yet'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {search || paymentStatus || startDate
                  ? 'Try adjusting your search or filters'
                  : 'Create your first sale to start billing customers'}
              </p>
              {!search && !paymentStatus && !startDate && (
                <Link to="/sales/new" className="btn-primary">
                  <Plus size={18} /> Create First Invoice
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('invoiceNo')}>
                        <div className="flex items-center gap-1">
                          Invoice <SortIcon field="invoiceNo" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('customer.name')}>
                        <div className="flex items-center gap-1">
                          Customer <SortIcon field="customer.name" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('createdAt')}>
                        <div className="flex items-center gap-1">
                          Date <SortIcon field="createdAt" />
                        </div>
                      </th>
                      <th className="table-header text-right group cursor-pointer" onClick={() => handleSort('grandTotal')}>
                        <div className="flex items-center gap-1 justify-end">
                          Amount <SortIcon field="grandTotal" />
                        </div>
                      </th>
                      <th className="table-header text-center">Payment</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const statusColor = paymentStatusColors[sale.paymentStatus] || paymentStatusColors.PENDING;
                      return (
                        <tr
                          key={sale.id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="table-cell">
                            <Link
                              to={`/sales/${sale.id}`}
                              className="flex items-center gap-3 group/cell"
                            >
                              <div className="w-9 h-9 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                                <FileText size={16} className="text-accent-600 dark:text-accent-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors font-mono text-sm">
                                  {sale.invoiceNo}
                                </p>
                                <p className="text-xs text-slate-400">{sale.items?.length || 0} item{(sale.items?.length || 0) !== 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {sale.customer?.name || 'Walk-in Customer'}
                            </span>
                            {sale.customer?.phone && (
                              <p className="text-xs text-slate-400">{sale.customer.phone}</p>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(sale.createdAt)}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                              {formatPrice(sale.grandTotal)}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {sale.paymentMethod && (
                                <span className="text-xs text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                  {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor.bg} ${statusColor.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} />
                              {sale.paymentStatus}
                            </span>
                          </td>
                          <td className="table-cell text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/sales/${sale.id}`}
                                className="btn-ghost p-2"
                                title="View invoice"
                              >
                                <Eye size={16} />
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenu(actionMenu === sale.id ? null : sale.id);
                                }}
                                className="btn-ghost p-2"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {actionMenu === sale.id && (
                                <div className="absolute right-0 top-full mt-1 z-10 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in">
                                  <Link
                                    to={`/sales/${sale.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={() => setActionMenu(null)}
                                  >
                                    <Eye size={16} /> View Invoice
                                  </Link>
                                  <button
                                    onClick={() => handleDownloadPdf(sale.id)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                                  >
                                    <Download size={16} /> Download PDF
                                  </button>
                                  {sale.balanceAmount > 0 && (
                                    <Link
                                      to={`/sales/${sale.id}?action=payment`}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      onClick={() => setActionMenu(null)}
                                    >
                                      <Wallet size={16} /> Record Payment
                                    </Link>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {sales.map((sale) => {
                  const statusColor = paymentStatusColors[sale.paymentStatus] || paymentStatusColors.PENDING;
                  return (
                    <Link
                      key={sale.id}
                      to={`/sales/${sale.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                        <FileText size={18} className="text-accent-600 dark:text-accent-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-200 font-mono text-sm">{sale.invoiceNo}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${statusColor.bg} ${statusColor.text}`}>
                            <span className={`w-1 h-1 rounded-full ${statusColor.dot}`} />
                            {sale.paymentStatus}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{sale.customer?.name || 'Walk-in'}</span>
                          <span className="text-xs text-slate-300">\u2022</span>
                          <span className="text-xs text-slate-500">{formatDate(sale.createdAt)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono text-slate-800 dark:text-slate-200">{formatPrice(sale.grandTotal)}</p>
                        <p className="text-xs text-slate-400">
                          {paymentMethodLabels[sale.paymentMethod] || sale.paymentMethod}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                    <span className="hidden sm:inline"> \u00B7 {total} total invoices</span>
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="btn-ghost p-2 disabled:opacity-30"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const num = start + i;
                      if (num > totalPages) return null;
                      return (
                        <button
                          key={num}
                          onClick={() => setPage(num)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                            ${page === num
                              ? 'bg-accent-500 text-white'
                              : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="btn-ghost p-2 disabled:opacity-30"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading overlay */}
          {loading && sales.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesList;
