import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Plus, Search,
  ChevronLeft, ChevronRight, MoreVertical, Eye,
  AlertTriangle, X, Loader2,
  RefreshCw, Building2,
  Edit, CreditCard, Wallet,
  BadgeCheck, Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};



const SupplierList = () => {
  const { t } = useTranslation();

  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isActive, setIsActive] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const [actionMenu, setActionMenu] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (isActive) params.set('isActive', isActive);
      params.set('page', page);
      params.set('limit', limit);

      const res = await api.get(`/suppliers?${params.toString()}`);
      const data = res.data.data || [];
      setSuppliers(data);
      setTotal(res.data.pagination?.total || data.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load suppliers');
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isActive, page, limit]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);



  // Close action menu on outside click
  useEffect(() => {
    const handleClick = () => setActionMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Stats
  const activeCount = suppliers.filter(s => s.isActive !== false).length;
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.outstanding || 0), 0);

  // Loading skeleton
  if (loading && suppliers.length === 0) {
    return (
      <div className="space-y-4 animate-fade-in">
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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {t('nav.suppliers')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'supplier' : 'suppliers'} • ₹{(totalOutstanding / 100).toLocaleString('en-IN')} outstanding
          </p>
        </div>
        <Link to="/suppliers/new" className="btn-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Supplier</span>
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Building2 size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <BadgeCheck size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Wallet size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatPrice(totalOutstanding)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <CreditCard size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg Balance</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {suppliers.length > 0 ? formatPrice(totalOutstanding / suppliers.length) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          {/* Quick filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {[
              { key: '', label: 'All' },
              { key: 'true', label: 'Active' },
              { key: 'false', label: 'Inactive' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setIsActive(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors min-h-[36px]
                  ${isActive === opt.key
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
                placeholder="Search by name, phone, or contact person..."
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
                onClick={async () => {
                  setExportingPdf(true);
                  try {
                    const res = await api.get('/suppliers/export/pdf', { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `supplier-list-${Date.now()}.pdf`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('PDF export failed:', err);
                  } finally {
                    setExportingPdf(false);
                  }
                }}
                disabled={exportingPdf}
                className="btn-secondary btn-sm"
                title="Export PDF"
              >
                {exportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                <span className="hidden sm:inline">PDF</span>
              </button>
              <button
                onClick={() => { setPage(1); fetchSuppliers(); }}
                className="btn-ghost p-2.5"
                title="Refresh"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-4 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Failed to Load</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button onClick={fetchSuppliers} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Data table */}
      {!error && (
        <div className="card overflow-hidden">
          {suppliers.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <Users size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {search || isActive
                  ? 'No suppliers match your filters'
                  : 'No suppliers yet'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {search || isActive
                  ? 'Try adjusting your search or filters'
                  : 'Add your first supplier to start managing vendors'}
              </p>
              {!search && !isActive && (
                <Link to="/suppliers/new" className="btn-primary">
                  <Plus size={18} /> Add First Supplier
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
                      <th className="table-header">Supplier</th>
                      <th className="table-header">Contact</th>
                      <th className="table-header">Phone</th>
                      <th className="table-header text-right">Outstanding</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Purchases</th>
                      <th className="table-header text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <td className="table-cell">
                          <Link
                            to={`/suppliers/${supplier.id}`}
                            className="flex items-center gap-3 group/cell"
                          >
                            <div className="w-9 h-9 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                              <Building2 size={16} className="text-accent-600 dark:text-accent-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors">
                                {supplier.name}
                              </p>
                              {supplier.gstNumber && (
                                <p className="text-xs text-slate-400 font-mono">{supplier.gstNumber}</p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="table-cell">
                          {supplier.contactPerson ? (
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {supplier.contactPerson}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                          {supplier.email && (
                            <p className="text-xs text-slate-400">{supplier.email}</p>
                          )}
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">
                            {supplier.phone}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className={`font-semibold font-mono ${
                            supplier.outstanding > 0
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {formatPrice(supplier.outstanding)}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            supplier.isActive
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              supplier.isActive ? 'bg-emerald-500' : 'bg-slate-400'
                            }`} />
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {supplier._count?.purchases || 0}
                          </span>
                        </td>
                        <td className="table-cell text-right relative">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/suppliers/${supplier.id}`}
                              className="btn-ghost p-2"
                              title="View details"
                            >
                              <Eye size={16} />
                            </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActionMenu(actionMenu === supplier.id ? null : supplier.id);
                  }}
                  className="btn-ghost p-2"
                >
                  <MoreVertical size={16} />
                </button>
                {actionMenu === supplier.id && (
                  <div className="absolute right-0 top-full mt-1 z-10 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in">
                    <Link
                      to={`/suppliers/${supplier.id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => setActionMenu(null)}
                    >
                      <Eye size={16} /> View Details
                    </Link>
                    <Link
                      to={`/suppliers/${supplier.id}/edit`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      onClick={() => setActionMenu(null)}
                    >
                      <Edit size={16} /> Edit
                    </Link>
                  </div>
                )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card list */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {suppliers.map((supplier) => (
                  <Link
                    key={supplier.id}
                    to={`/suppliers/${supplier.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-accent-600 dark:text-accent-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{supplier.name}</p>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          supplier.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{supplier.phone}</span>
                        {supplier.contactPerson && (
                          <>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="text-xs text-slate-500">{supplier.contactPerson}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold font-mono text-sm ${
                        supplier.outstanding > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {formatPrice(supplier.outstanding)}
                      </p>
                      <p className="text-xs text-slate-400">
                        {supplier._count?.purchases || 0} purchases
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages}
                    <span className="hidden sm:inline"> · {total} total suppliers</span>
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
          {loading && suppliers.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}


    </div>
  );
};

export default SupplierList;