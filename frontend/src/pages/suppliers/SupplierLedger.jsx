import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Building2, AlertTriangle, Loader2,
  TrendingUp, X,
  ChevronLeft, ChevronRight, SlidersHorizontal,
  Wallet, FileText, RefreshCw, Receipt, RotateCcw
} from 'lucide-react';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const typeConfig = {
  PURCHASE: { icon: Building2, bg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', label: 'Purchase' },
  PAYMENT: { icon: Wallet, bg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600 dark:text-emerald-400', label: 'Payment' },
  DEBIT_NOTE: { icon: RotateCcw, bg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400', label: 'Debit Note' },
  CREDIT_NOTE: { icon: Receipt, bg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600 dark:text-violet-400', label: 'Credit Note' },
};

const SupplierLedger = () => {
  const { id } = useParams();

  const [supplier, setSupplier] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (typeFilter) params.set('type', typeFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const [supplierRes, ledgerRes] = await Promise.all([
        api.get(`/suppliers/${id}`),
        api.get(`/suppliers/${id}/ledger?${params.toString()}`),
      ]);
      setSupplier(supplierRes.data.data);
      setLedger(ledgerRes.data.data || []);
      setTotal(ledgerRes.data.pagination?.total || ledgerRes.data.data?.length || 0);
      setTotalPages(ledgerRes.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  }, [id, page, typeFilter, startDate, endDate, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Compute stats from the supplier data
  const stats = ledger.reduce(
    (acc, entry) => {
      if (entry.type === 'PURCHASE') acc.totalPurchases += entry.amount;
      else if (entry.type === 'PAYMENT') acc.totalPayments += Math.abs(entry.amount || 0);
      else if (entry.type === 'DEBIT_NOTE') acc.totalReturns += Math.abs(entry.amount || 0);
      return acc;
    },
    { totalPurchases: 0, totalPayments: 0, totalReturns: 0 }
  );

  // Loading
  if (loading && ledger.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="skeleton h-8 w-28" />
            </div>
          ))}
        </div>
        <div className="card p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="flex gap-4">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48" />
                <div className="skeleton h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error
  if (error && !supplier) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/suppliers" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Ledger Not Found</h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Ledger</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={fetchData} className="btn-primary btn-sm">Try Again</button>
              <Link to="/suppliers" className="btn-secondary btn-sm">Back to Suppliers</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBalance = ledger.length > 0 ? ledger[0].balance : 0;
  const filterActive = typeFilter || startDate || endDate;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={`/suppliers/${id}`} className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <Building2 size={24} className="text-accent-600 dark:text-accent-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {supplier?.name || 'Supplier Ledger'}
              </h1>
              {supplier?.gstNumber && (
                <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                  {supplier.gstNumber}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-sm text-slate-400">{total} entries</span>
              <span className="text-sm text-slate-300">·</span>
              <span className={`text-sm font-medium ${currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
                Balance: {formatPrice(currentBalance)}
              </span>
              {supplier?.outstanding > 0 && (
                <>
                  <span className="text-sm text-slate-300">·</span>
                  <span className="text-sm text-amber-500">Outstanding: {formatPrice(supplier.outstanding)}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/suppliers/${id}`} className="btn-secondary btn-sm">
            <Building2 size={16} /> Supplier Profile
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-700">
              <FileText size={20} className="text-slate-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Entries</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <TrendingUp size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Total Purchases</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(stats.totalPurchases)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <Wallet size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Total Payments</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(stats.totalPayments)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <RotateCcw size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wider">Total Returns</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(stats.totalReturns)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          {/* Type filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {[
              { key: '', label: 'All' },
              ...Object.entries(typeConfig).map(([key, config]) => ({
                key,
                label: config.label,
              })),
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => { setTypeFilter(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors min-h-[36px]
                  ${typeFilter === opt.key
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {opt.label}
              </button>
            ))}
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn-ghost p-2 rounded-lg ${startDate || endDate ? 'text-accent-500' : 'text-slate-400'}`}
                title="Date filter"
              >
                <SlidersHorizontal size={16} />
              </button>
              <button onClick={() => { setPage(1); fetchData(); }} className="btn-ghost p-2 text-slate-400" title="Refresh">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Date range */}
          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 mt-2 pt-4 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
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
              {(startDate || endDate) && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                  className="btn-ghost text-sm text-slate-500"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && supplier && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button onClick={fetchData} className="btn-ghost text-sm text-red-500">Retry</button>
        </div>
      )}

      {/* Ledger entries */}
      <div className="card overflow-hidden relative">
        {ledger.length === 0 ? (
          <div className="empty-state p-12">
            <FileText size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
              {filterActive ? 'No entries match your filters' : 'No ledger entries yet'}
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              {filterActive
                ? 'Try adjusting your filters or date range'
                : 'Ledger entries are created automatically when purchases, payments, or returns are recorded'}
            </p>
            {filterActive && (
              <button
                onClick={() => { setTypeFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
                className="btn-secondary btn-sm"
              >
                <X size={16} /> Clear Filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop timeline */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="table-header">Date & Time</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Description</th>
                    <th className="table-header text-right">Amount</th>
                    <th className="table-header text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, idx) => {
                    const config = typeConfig[entry.type] || typeConfig.PURCHASE;
                    const Icon = config.icon;
                    const isNegative = entry.amount < 0;

                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          idx === 0 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''
                        }`}
                      >
                        <td className="table-cell">
                          <div className="flex items-center gap-3">
                            <div className={`p-1.5 rounded-lg ${config.bg}`}>
                              <Icon size={16} className={config.iconColor} />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {formatDate(entry.date)}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{entry.id.slice(0, 8)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${config.bg} ${config.iconColor}`}>
                            <Icon size={12} />
                            {config.label}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {entry.description || '—'}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className={`font-mono text-sm font-semibold ${
                            isNegative ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isNegative ? '-' : '+'}{formatPrice(Math.abs(entry.amount))}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className={`font-mono text-sm font-semibold ${
                            entry.balance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'
                          }`}>
                            {formatPrice(entry.balance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile timeline cards */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
              {ledger.map((entry, idx) => {
                const config = typeConfig[entry.type] || typeConfig.PURCHASE;
                const Icon = config.icon;
                const isNegative = entry.amount < 0;

                return (
                  <div key={entry.id} className={`p-4 ${idx === 0 ? 'bg-slate-50/50 dark:bg-slate-800/30' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                        <Icon size={16} className={config.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${config.bg} ${config.iconColor}`}>
                            {config.label}
                          </span>
                          <span className={`font-mono text-sm font-bold ${
                            isNegative ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {isNegative ? '-' : '+'}{formatPrice(Math.abs(entry.amount))}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[11px] text-slate-400">{formatDate(entry.date)}</span>
                          <span className="text-slate-300">·</span>
                          <span className={`text-[11px] font-medium ${
                            entry.balance > 0 ? 'text-amber-600' : 'text-slate-400'
                          }`}>
                            Balance: {formatPrice(entry.balance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                  <span className="hidden sm:inline"> · {total} entries</span>
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
        {loading && ledger.length > 0 && (
          <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-accent-500" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierLedger;
