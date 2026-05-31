import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Package, Plus, Upload, Search, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, MoreVertical, Edit, Copy, Archive,
  AlertTriangle, X, SlidersHorizontal, FileDown, FileUp, Loader2,
  RefreshCw, Eye, PackageCheck, TrendingDown, BarChart3,
  Printer
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'PAINTING', 'HARDWARE', 'TOOLS', 'SANITARY', 'SAFETY_EQUIPMENT'];
const UNIT_TYPES = ['PCS', 'LITERS', 'KG', 'METERS', 'BOXES', 'ROLLS', 'PAIRS'];

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const categoryColors = {
  PLUMBING: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', dot: 'bg-cyan-500' },
  ELECTRICAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  PAINTING: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' },
  HARDWARE: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' },
  TOOLS: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  SANITARY: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  SAFETY_EQUIPMENT: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
};

const InventoryList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef(null);

  // Data state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive | lowStock | deadStock

  // Pagination & sort
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [totalPages, setTotalPages] = useState(0);

  // Handle incoming state from Bell/low-stock navigation
  useEffect(() => {
    // Check for sessionStorage flag (set by toast link)
    const sessionFlag = sessionStorage.getItem('filterLowStock');
    if (sessionFlag === 'true') {
      sessionStorage.removeItem('filterLowStock');
      setActiveFilter('lowStock');
      setPage(1);
      return;
    }
    // Check for React Router state (set by Bell icon NavLink)
    if (location.state?.filterLowStock) {
      setActiveFilter('lowStock');
      setPage(1);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Action menu state
  const [actionMenu, setActionMenu] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch items
  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (category) params.set('category', category);
      if (brand) params.set('brand', brand);
      if (activeFilter === 'active') params.set('isActive', 'true');
      else if (activeFilter === 'inactive') params.set('isActive', 'false');
      if (sortBy) params.set('sortBy', sortBy);
      if (sortOrder) params.set('sortOrder', sortOrder);
      params.set('page', page);
      params.set('limit', limit);

      let endpoint = `/inventory?${params.toString()}`;
      if (activeFilter === 'lowStock') endpoint = '/inventory/low-stock';
      else if (activeFilter === 'deadStock') endpoint = '/inventory/dead-stock';

      const res = await api.get(endpoint);
      const data = res.data.data || [];
      setItems(data);
      setTotal(res.data.pagination?.total || data.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inventory');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, category, brand, activeFilter, sortBy, sortOrder, page, limit]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

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
      const res = await api.get('/inventory/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Import
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/inventory/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportModal(false);
      fetchItems();
      alert(res.data.message || 'Import completed');
    } catch (err) {
      alert(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Delete item
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this item?')) return;
    setDeleting(id);
    try {
      await api.delete(`/inventory/${id}`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive item');
    } finally {
      setDeleting(null);
      setActionMenu(null);
    }
  };

  // Duplicate item
  const handleDuplicate = async (id) => {
    try {
      await api.post(`/inventory/${id}/duplicate`);
      fetchItems();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to duplicate item');
    }
    setActionMenu(null);
  };

  // Close action menu on outside click
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

  // Stats summary
  const activeItems = items.filter(i => i.isActive !== false);
  const lowStockCount = items.filter(i => i.isLowStock).length;
  const totalValue = activeItems.reduce((sum, i) => sum + (i.currentStock || 0) * (i.sellingPrice || 0), 0);

  // Render loading skeleton
  if (loading && items.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <div className="skeleton h-8 w-40 mb-2" />
            <div className="skeleton h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <div className="skeleton h-10 w-24 rounded-lg" />
            <div className="skeleton h-10 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card p-4">
              <div className="skeleton h-4 w-20 mb-2" />
              <div className="skeleton h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="card">
          <div className="p-4">
            <div className="skeleton h-10 w-full mb-4 rounded-lg" />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-4 p-3 border-b border-slate-100 dark:border-slate-700">
                <div className="skeleton h-4 w-32" />
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-4 w-24 ml-auto" />
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
            {t('inventory.title')}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'item' : 'items'} • {lowStockCount} low stock
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/inventory/new" className="btn-primary">
            <Plus size={18} />
            <span className="hidden sm:inline">{t('inventory.addItem')}</span>
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <PackageCheck size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Items</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <BarChart3 size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Inventory Value</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {formatPrice(totalValue)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock</p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{lowStockCount}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <TrendingDown size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dead Stock</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {items.filter(i => i.isDeadStock).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="card">
        <div className="p-4">
          {/* Quick filter tabs */}
          <div className="flex flex-wrap gap-1 mb-4">
            {[
              { key: 'all', label: 'All Items' },
              { key: 'active', label: 'Active' },
              { key: 'inactive', label: 'Inactive' },
              { key: 'lowStock', label: 'Low Stock' },
              { key: 'deadStock', label: 'Dead Stock' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setActiveFilter(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors min-h-[36px]
                  ${activeFilter === opt.key
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search & filter controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, SKU, barcode, or brand..."
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
                <span className="hidden sm:inline">Filters</span>
                {(category || brand) && <span className="w-2 h-2 rounded-full bg-accent-500" />}
              </button>
              <button onClick={handleExport} disabled={exporting} className="btn-secondary btn-sm">
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                <span className="hidden sm:inline">{t('inventory.export')}</span>
              </button>
              <button onClick={() => setImportModal(true)} className="btn-secondary btn-sm">
                <FileUp size={16} />
                <span className="hidden sm:inline">{t('inventory.import')}</span>
              </button>
              <button
                onClick={async () => {
                  setExportingPdf(true);
                  try {
                    const res = await api.get('/inventory/export/pdf', { responseType: 'blob' });
                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `inventory-list-${Date.now()}.pdf`;
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
              <button onClick={() => { setPage(1); fetchItems(); }} className="btn-ghost p-2.5" title="Refresh">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
              <div className="w-full sm:w-auto">
                <label className="label">{t('inventory.category')}</label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                  className="select min-w-[180px]"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
              </div>
              <div className="w-full sm:w-auto">
                <label className="label">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => { setBrand(e.target.value); setPage(1); }}
                  placeholder="Filter by brand..."
                  className="input min-w-[180px]"
                />
              </div>
              <div className="w-full sm:w-auto flex items-end">
                <button
                  onClick={() => { setCategory(''); setBrand(''); setPage(1); }}
                  className="btn-ghost text-sm text-slate-500"
                >
                  <X size={14} /> Clear Filters
                </button>
              </div>
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
            <button onClick={fetchItems} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Data table */}
      {!error && (
        <div className="card overflow-hidden">
          {items.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <Package size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {search || category || brand
                  ? 'No items match your filters'
                  : 'No inventory items yet'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {search || category || brand
                  ? 'Try adjusting your search or filters'
                  : 'Add your first product to start managing inventory'}
              </p>
              {!search && !category && !brand && (
                <Link to="/inventory/new" className="btn-primary">
                  <Plus size={18} /> Add First Item
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Table (desktop) */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-1">
                          Item <SortIcon field="name" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('category')}>
                        <div className="flex items-center gap-1">
                          {t('inventory.category')} <SortIcon field="category" />
                        </div>
                      </th>
                      <th className="table-header group cursor-pointer" onClick={() => handleSort('currentStock')}>
                        <div className="flex items-center gap-1 justify-end">
                          Stock <SortIcon field="currentStock" />
                        </div>
                      </th>
                      <th className="table-header text-right group cursor-pointer" onClick={() => handleSort('sellingPrice')}>
                        <div className="flex items-center gap-1 justify-end">
                          Price <SortIcon field="sellingPrice" />
                        </div>
                      </th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const catColor = categoryColors[item.category] || categoryColors.HARDWARE;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="table-cell">
                            <Link
                              to={`/inventory/${item.id}`}
                              className="flex items-center gap-3 group/cell"
                            >
                              <div className={`w-9 h-9 rounded-lg ${catColor.bg} flex items-center justify-center flex-shrink-0`}>
                                <Package size={16} className={catColor.text} />
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors">
                                  {item.name}
                                </p>
                                <p className="text-xs text-slate-400 font-mono">{item.sku}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="table-cell">
                            <span className={`badge ${catColor.bg} ${catColor.text}`}>
                              {t(`categories.${item.category}`)}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.isLowStock ? (
                                <AlertTriangle size={14} className="text-amber-500" />
                              ) : null}
                              <span className={`font-mono font-medium ${
                                item.isLowStock ? 'text-amber-600 dark:text-amber-400' :
                                item.currentStock <= 0 ? 'text-red-500' : ''
                              }`}>
                                {item.currentStock}
                              </span>
                              <span className="text-xs text-slate-400">{item.unitType?.toLowerCase()}</span>
                            </div>
                          </td>
                          <td className="table-cell text-right font-mono">
                            {formatPrice(item.sellingPrice)}
                          </td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                              }`} />
                              {!item.isActive && (
                                <span className="badge-slate text-xs">Inactive</span>
                              )}
                              {item.isLowStock && item.isActive && (
                                <span className="badge-warning text-xs">Low</span>
                              )}
                              {item.isDeadStock && item.isActive && (
                                <span className="badge-info text-xs">Dead</span>
                              )}
                            </div>
                          </td>
                          <td className="table-cell text-right relative">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                to={`/inventory/${item.id}`}
                                className="btn-ghost p-2"
                                title="View details"
                              >
                                <Eye size={16} />
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActionMenu(actionMenu === item.id ? null : item.id);
                                }}
                                className="btn-ghost p-2"
                              >
                                <MoreVertical size={16} />
                              </button>
                              {actionMenu === item.id && (
                                <div className="absolute right-0 top-full mt-1 z-10 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in">
                                  <Link
                                    to={`/inventory/${item.id}`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={() => setActionMenu(null)}
                                  >
                                    <Eye size={16} /> View Details
                                  </Link>
                                  <Link
                                    to={`/inventory/${item.id}/edit`}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    onClick={() => setActionMenu(null)}
                                  >
                                    <Edit size={16} /> Edit
                                  </Link>
                                  <button
                                    onClick={() => handleDuplicate(item.id)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 w-full text-left"
                                  >
                                    <Copy size={16} /> Duplicate
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id)}
                                    disabled={deleting === item.id}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left"
                                  >
                                    <Archive size={16} /> Archive
                                  </button>
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
                {items.map((item) => {
                  const catColor = categoryColors[item.category] || categoryColors.HARDWARE;
                  return (
                    <Link
                      key={item.id}
                      to={`/inventory/${item.id}`}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-lg ${catColor.bg} flex items-center justify-center flex-shrink-0`}>
                        <Package size={18} className={catColor.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`badge ${catColor.bg} ${catColor.text} text-[10px] px-1.5 py-0.5`}>
                            {t(`categories.${item.category}`)}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">{item.sku}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-semibold ${
                          item.isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {item.currentStock}
                        </p>
                        <p className="text-xs text-slate-400">{formatPrice(item.sellingPrice)}</p>
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
                    <span className="hidden sm:inline"> · {total} total items</span>
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
          {loading && items.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <div className="modal-overlay" onClick={() => setImportModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">{t('inventory.import')}</h2>
              <button onClick={() => setImportModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">
                Upload an Excel file (.xlsx) to bulk import items. Download the template first for the correct format.
              </p>
              <div className="flex gap-3">
                <a
                  href="/api/inventory/template"
                  className="btn-secondary btn-sm"
                  onClick={() => setImportModal(false)}
                >
                  <FileDown size={16} /> Download Template
                </a>
              </div>
              <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer hover:border-accent-400 transition-colors">
                <Upload size={32} className="text-slate-400 mb-3" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {importing ? 'Importing...' : 'Click to upload Excel file'}
                </span>
                <span className="text-xs text-slate-400 mt-1">.xlsx files only</span>
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={handleImport}
                  disabled={importing}
                  className="hidden"
                />
              </label>
              {importing && (
                <div className="flex items-center gap-2 text-sm text-accent-600">
                  <Loader2 size={16} className="animate-spin" />
                  Importing items...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryList;
