import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Plus, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, MoreVertical, Eye,
  AlertTriangle, X, SlidersHorizontal, FileDown, Loader2,
  RefreshCw, ClipboardList, CheckCircle2, Clock,
  Wallet, PackageCheck, Printer
} from 'lucide-react';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `\u20B9${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusColors = {
  DRAFT: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  ORDERED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  PARTIAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  RECEIVED: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
};

const paymentStatusColors = {
  PAID: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  PARTIAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  PENDING: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' },
  OVERDUE: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', dot: 'bg-red-500' },
  CANCELLED: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-400 dark:text-slate-500', dot: 'bg-slate-300' },
};

const PurchasesList = () => {
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
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

  // Fetch purchases
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status) params.set('status', status);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('page', page);
      params.set('limit', limit);

      const res = await api.get(`/purchases?${params.toString()}`);
      const data = res.data.data || [];
      setPurchases(data);
      setTotal(res.data.pagination?.total || data.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load purchases');
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, status, startDate, endDate, page, limit, sortBy, sortOrder]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

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
      const res = await api.get(`/purchases/export?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `purchases-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Print Purchase Register
  const handlePrintRegister = () => {
    const cp = companyProfile;
    const shopName = cp?.companyName || 'StockMate Pro';
    const shopAddr = cp?.address || '';
    const shopPhone = cp?.phone || '';
    const shopGst = cp?.gstNumber || '';

    const dateRangeLabel = startDate || endDate
      ? `Period: ${startDate ? new Date(startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Start'} \u2014 ${endDate ? new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'End'}`
      : '';
    const statusFilterLabel = status ? ` | Status: ${status.charAt(0) + status.slice(1).toLowerCase()}` : '';

    const rowsHtml = purchases.map((p, idx) => {
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><span class="mono">${p.poNumber}</span></td>
          <td>${formatDate(p.orderDate)}</td>
          <td>${p.supplier?.name || '\u2014'}</td>
          <td class="text-center">${p.items?.length || 0}</td>
          <td class="text-center"><span class="badge badge-${p.status.toLowerCase()}">${p.status}</span></td>
          <td class="text-center"><span class="badge badge-${p.paymentStatus?.toLowerCase() || 'pending'}">${p.paymentStatus || 'PENDING'}</span></td>
          <td class="text-right mono">\u20B9${(p.grandTotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        </tr>`;
    }).join('\n');

    const totalAmount = purchases.reduce((sum, p) => sum + (p.grandTotal || 0), 0);
    const totalPaid = purchases.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const totalBalance = purchases.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);
    const totalOrderedCount = purchases.filter(p => p.status === 'ORDERED').length;
    const totalReceivedCount = purchases.filter(p => p.status === 'RECEIVED').length;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Register</title>
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
          .badge-draft { background: #f1f5f9; color: #64748b; }
          .badge-ordered { background: #dbeafe; color: #2563eb; }
          .badge-partial { background: #fef3c7; color: #d97706; }
          .badge-received { background: #d1fae5; color: #059669; }
          .badge-cancelled { background: #f1f5f9; color: #94a3b8; }
          .badge-paid { background: #d1fae5; color: #059669; }
          .badge-pending { background: #f1f5f9; color: #64748b; }
          .badge-overdue { background: #fee2e2; color: #dc2626; }
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
          <h2>Purchase Register</h2>
          <div class="meta">
            Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            ${dateRangeLabel}${statusFilterLabel}
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="label">Total POs Listed</div>
            <div class="value">${purchases.length}</div>
          </div>
          <div class="summary-card">
            <div class="label">Ordered</div>
            <div class="value" style="color: #2563eb;">${totalOrderedCount}</div>
          </div>
          <div class="summary-card">
            <div class="label">Received</div>
            <div class="value" style="color: #059669;">${totalReceivedCount}</div>
          </div>
          <div class="summary-card">
            <div class="label">Total Amount</div>
            <div class="value" style="color: #d97706;">\u20B9${(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 32px;">#</th>
              <th>PO Number</th>
              <th style="width: 100px;">Date</th>
              <th>Supplier</th>
              <th class="text-center" style="width: 40px;">Items</th>
              <th class="text-center" style="width: 80px;">Status</th>
              <th class="text-center" style="width: 80px;">Payment</th>
              <th class="text-right" style="width: 100px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="item">
            <div class="label">Total POs</div>
            <div class="value">${purchases.length}</div>
          </div>
          <div class="item">
            <div class="label">Total Amount</div>
            <div class="value" style="color: #059669;">\u20B9${(totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="item">
            <div class="label">Total Paid</div>
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

  // Stats
  const totalOrdered = purchases.filter(p => p.status === 'ORDERED').length;
  const totalReceived = purchases.filter(p => p.status === 'RECEIVED').length;
  const outstandingTotal = purchases.reduce((sum, p) => sum + (p.balanceAmount || 0), 0);

  // Loading skeleton
  if (loading && purchases.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="page-header">
          <div>
            <div className="skeleton h-8 w-40 mb-2" />
            <div className="skeleton h-4 w-56" />
          </div>
          <div className="skeleton h-10 w-36 rounded-lg" />
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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Purchase Orders</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'PO' : 'POs'} · {totalOrdered} ordered, {totalReceived} received
          </p>
        </div>
        <Link to="/purchases/new" className="btn-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">New Purchase</span>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <ClipboardList size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total POs</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ordered</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{totalOrdered}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Received</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalReceived}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <Wallet size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formatPrice(outstandingTotal)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {[
              { key: '', label: 'All' },
              { key: 'DRAFT', label: 'Draft' },
              { key: 'ORDERED', label: 'Ordered' },
              { key: 'PARTIAL', label: 'Partial' },
              { key: 'RECEIVED', label: 'Received' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setStatus(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors min-h-[36px]
                  ${status === opt.key
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
                placeholder="Search by PO number or supplier..."
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
                title="Print Purchase Register"
              >
                <Printer size={16} />
                <span className="hidden sm:inline">Register</span>
              </button>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary btn-sm">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                <span className="hidden sm:inline">Export</span>
              </button>
              <button onClick={() => { setPage(1); fetchPurchases(); }} className="btn-ghost p-2.5" title="Refresh">
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
          <div className="p-4 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Failed to Load</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button onClick={fetchPurchases} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Data table */}
      {!error && (
        <div className="card overflow-hidden">
          {purchases.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <Truck size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {search || status || startDate
                  ? 'No purchase orders match your filters'
                  : 'No purchase orders yet'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {search || status || startDate
                  ? 'Try adjusting your search or filters'
                  : 'Create your first purchase order to start tracking supplier orders'}
              </p>
              {!search && !status && !startDate && (
                <Link to="/purchases/new" className="btn-primary">
                  <Plus size={18} /> Create First PO
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
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('poNumber')}>
                        <div className="flex items-center gap-1">
                          PO Number <SortIcon field="poNumber" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('supplier.name')}>
                        <div className="flex items-center gap-1">
                          Supplier <SortIcon field="supplier.name" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('orderDate')}>
                        <div className="flex items-center gap-1">
                          Date <SortIcon field="orderDate" />
                        </div>
                      </th>
                      <th className="table-header text-right group cursor-pointer" onClick={() => handleSort('grandTotal')}>
                        <div className="flex items-center gap-1 justify-end">
                          Amount <SortIcon field="grandTotal" />
                        </div>
                      </th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Payment</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => {
                      const stColor = statusColors[purchase.status] || statusColors.DRAFT;
                      const pmColor = paymentStatusColors[purchase.paymentStatus] || paymentStatusColors.PENDING;
                      return (
                        <tr
                          key={purchase.id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="table-cell">
                            <Link
                              to={`/purchases/${purchase.id}`}
                              className="flex items-center gap-3 group/cell"
                            >
                              <div className="w-9 h-9 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                                <ClipboardList size={16} className="text-accent-600 dark:text-accent-400" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors font-mono text-sm">
                                  {purchase.poNumber}
                                </p>
                                <p className="text-xs text-slate-400">{purchase.items?.length || 0} item{(purchase.items?.length || 0) !== 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {purchase.supplier?.name || '—'}
                            </span>
                            {purchase.supplier?.phone && (
                              <p className="text-xs text-slate-400">{purchase.supplier.phone}</p>
                            )}
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(purchase.orderDate)}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                              {formatPrice(purchase.grandTotal)}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stColor.bg} ${stColor.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${stColor.dot}`} />
                              {purchase.status}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${pmColor.bg} ${pmColor.text}`}>
                              <span className={`w-1 h-1 rounded-full ${pmColor.dot}`} />
                              {purchase.paymentStatus}
                            </span>
                          </td>
                          <td className="table-cell text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/purchases/${purchase.id}`}
                                className="btn-ghost p-2"
                                title="View PO"
                              >
                                <Eye size={16} />
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenu(actionMenu === purchase.id ? null : purchase.id);
                                }}
                                className="btn-ghost p-2"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {actionMenu === purchase.id && (
                                <div className="absolute right-0 top-full mt-1 z-10 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in">
                                  <Link
                                    to={`/purchases/${purchase.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={() => setActionMenu(null)}
                                  >
                                    <Eye size={16} /> View Details
                                  </Link>
                                  {purchase.status !== 'RECEIVED' && purchase.status !== 'CANCELLED' && (
                                    <Link
                                      to={`/purchases/${purchase.id}?action=receive`}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                      onClick={() => setActionMenu(null)}
                                    >
                                      <PackageCheck size={16} /> Receive Stock
                                    </Link>
                                  )}
                                  {purchase.balanceAmount > 0 && (
                                    <Link
                                      to={`/purchases/${purchase.id}?action=payment`}
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
                {purchases.map((purchase) => {
                  const stColor = statusColors[purchase.status] || statusColors.DRAFT;
                  return (
                    <Link
                      key={purchase.id}
                      to={`/purchases/${purchase.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={18} className="text-accent-600 dark:text-accent-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-200 font-mono text-sm">{purchase.poNumber}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${stColor.bg} ${stColor.text}`}>
                            <span className={`w-1 h-1 rounded-full ${stColor.dot}`} />
                            {purchase.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">{purchase.supplier?.name || '—'}</span>
                          <span className="text-xs text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{formatDate(purchase.orderDate)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono text-slate-800 dark:text-slate-200">{formatPrice(purchase.grandTotal)}</p>
                        {purchase.balanceAmount > 0 && (
                          <p className="text-xs text-amber-500 font-medium">
                            Due: {formatPrice(purchase.balanceAmount)}
                          </p>
                        )}
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
                    <span className="hidden sm:inline"> · {total} total POs</span>
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
          {loading && purchases.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PurchasesList;
