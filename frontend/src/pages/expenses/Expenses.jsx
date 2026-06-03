import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Plus, X, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight,
  RefreshCw, Filter, Edit, Trash2, Save, Calendar,
  TrendingUp, FileText, Download, DollarSign, Tag
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const EXPENSE_CATEGORIES = [
  'RENT', 'ELECTRICITY', 'WATER', 'SALARY', 'TRANSPORT',
  'MAINTENANCE', 'OFFICE_SUPPLIES', 'MARKETING', 'TAXES',
  'INSURANCE', 'LICENSE', 'MISCELLANEOUS', 'OTHER'
];

const categoryLabels = {
  RENT: 'Rent', ELECTRICITY: 'Electricity', WATER: 'Water',
  SALARY: 'Salary', TRANSPORT: 'Transport', MAINTENANCE: 'Maintenance',
  OFFICE_SUPPLIES: 'Office Supplies', MARKETING: 'Marketing',
  TAXES: 'Taxes & Fees', INSURANCE: 'Insurance', LICENSE: 'License',
  MISCELLANEOUS: 'Miscellaneous', OTHER: 'Other'
};

const initialFormState = {
  category: 'OTHER',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  billImage: '',
  isRecurring: false,
};

const Expenses = () => {
  const { t } = useTranslation();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCategory: {} });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      params.set('page', page);
      params.set('limit', limit);

      const res = await api.get(`/expenses?${params.toString()}`);
      const data = res.data.data || {};
      const list = data.expenses || [];
      setExpenses(list);
      setSummary(data.summary || { total: 0, byCategory: {} });
      setTotal(res.data.pagination?.total || list.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [category, startDate, endDate, page, limit]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [category, startDate, endDate]);

  // Open modal for create/edit
  const openCreateModal = () => {
    setEditingId(null);
    setForm(initialFormState);
    setSaveError(null);
    setShowModal(true);
  };

  const openEditModal = async (expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category || 'OTHER',
      amount: (expense.amount / 100).toString(),
      description: expense.description || '',
      date: new Date(expense.date).toISOString().split('T')[0],
      billImage: expense.billImage || '',
      isRecurring: expense.isRecurring || false,
    });
    setSaveError(null);
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setSaveError('Amount is required and must be greater than 0');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
      };
      if (editingId) {
        await api.put(`/expenses/${editingId}`, payload);
      } else {
        await api.post('/expenses', payload);
      }
      setShowModal(false);
      fetchExpenses();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleExportPdf = async () => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await api.get(`/expenses/export/pdf?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete expense');
    }
  };

  // Top categories by amount
  const topCategories = Object.entries(summary.byCategory || {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('nav.expenses')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'expense' : 'expenses'} • {formatPrice(summary.total)} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportPdf} className="btn-secondary">
            <Download size={18} />
            <span className="hidden sm:inline">Export PDF</span>
          </button>
          <button onClick={openCreateModal} className="btn-primary">
            <Plus size={18} />
            <span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/30">
              <DollarSign size={20} className="text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Amount</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(summary.total)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Entries</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{total}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Tag size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Categories</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {Object.keys(summary.byCategory || {}).length}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <TrendingUp size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg. Per Entry</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {expenses.length > 0 ? formatPrice(summary.total / expenses.length) : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category breakdown */}
      {topCategories.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Top Categories</h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {topCategories.map(([cat, amt]) => {
                const pct = summary.total > 0 ? ((amt / summary.total) * 100).toFixed(0) : 0;
                const colors = ['bg-rose-500', 'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500'];
                const idx = topCategories.findIndex(([c]) => c === cat);
                return (
                  <div key={cat} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-700 dark:text-slate-300">{categoryLabels[cat] || cat}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200">
                            {formatPrice(amt)}
                          </span>
                          <span className="text-xs text-slate-400 w-10 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${colors[idx] || 'bg-slate-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn-ghost px-3 py-1.5 rounded-lg text-xs font-medium gap-1.5 ${
                startDate || endDate || category ? 'text-accent-500' : 'text-slate-500'
              }`}
            >
              <Filter size={14} /> Filters
            </button>
            <div className="flex-1" />
            <button
              onClick={() => { setPage(1); fetchExpenses(); }}
              className="btn-ghost p-2 text-slate-400"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 animate-slide-down">
              <div>
                <label className="label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input min-w-[160px]"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input min-w-[150px]"
                />
              </div>
              <div>
                <label className="label">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input min-w-[150px]"
                />
              </div>
              {(startDate || endDate || category) && (
                <button
                  onClick={() => { setCategory(''); setStartDate(''); setEndDate(''); }}
                  className="btn-ghost text-sm text-slate-500"
                >
                  <X size={14} /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-6 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Failed to Load</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button onClick={fetchExpenses} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Data table */}
      {!error && (
        <div className="card overflow-hidden">
          {expenses.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <Wallet size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {category || startDate || endDate
                  ? 'No expenses match your filters'
                  : 'No expenses recorded yet'}
              </h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {category || startDate || endDate
                  ? 'Try adjusting your filters'
                  : 'Record your first business expense to start tracking'}
              </p>
              {!category && !startDate && !endDate && (
                <button onClick={openCreateModal} className="btn-primary">
                  <Plus size={18} /> Add First Expense
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="table-header">Date</th>
                      <th className="table-header">Category</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">Added By</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-center">Recurring</th>
                      <th className="table-header text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => {
                      const catColor =
                        expense.category === 'RENT' || expense.category === 'ELECTRICITY' || expense.category === 'WATER'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                          : expense.category === 'SALARY'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          : expense.category === 'TRANSPORT'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                          : expense.category === 'MARKETING'
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';

                      return (
                        <tr key={expense.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="table-cell">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} className="text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                {formatDate(expense.date)}
                              </span>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${catColor}`}>
                              {categoryLabels[expense.category] || expense.category}
                            </span>
                          </td>
                          <td className="table-cell max-w-[200px]">
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate block">
                              {expense.description || '—'}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="text-xs text-slate-500">
                              {expense.user ? `${expense.user.firstName} ${expense.user.lastName}` : '—'}
                            </span>
                          </td>
                          <td className="table-cell text-right">
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                              {formatPrice(expense.amount)}
                            </span>
                          </td>
                          <td className="table-cell text-center">
                            {expense.isRecurring ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                                Recurring
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="table-cell text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(expense)}
                                className="btn-ghost p-2"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="btn-ghost p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {expenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            expense.category === 'RENT' || expense.category === 'ELECTRICITY' || expense.category === 'WATER'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                              : expense.category === 'SALARY'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}>
                            {categoryLabels[expense.category] || expense.category}
                          </span>
                          {expense.isRecurring && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Recurring</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                          {expense.description || 'No description'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400">{formatDate(expense.date)}</span>
                          {expense.user && (
                            <>
                              <span className="text-xs text-slate-300">•</span>
                              <span className="text-xs text-slate-400">
                                {expense.user.firstName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold font-mono text-sm text-slate-800 dark:text-slate-200">
                          {formatPrice(expense.amount)}
                        </p>
                        <div className="flex gap-1 mt-1 justify-end">
                          <button onClick={() => openEditModal(expense)} className="btn-ghost p-1">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => handleDelete(expense.id)} className="btn-ghost p-1 text-red-500">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-500">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-30">
                      <ChevronLeft size={18} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const num = start + i;
                      if (num > totalPages) return null;
                      return (
                        <button key={num} onClick={() => setPage(num)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                            page === num ? 'bg-accent-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'
                          }`}>
                          {num}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost p-2 disabled:opacity-30">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Loading overlay */}
          {loading && expenses.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                  <AlertTriangle size={16} />
                  {saveError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="label">Category</label>
                  <select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} className="input">
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{categoryLabels[cat]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Amount (₹) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="input text-lg font-bold"
                    placeholder="0.00"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                    className="input"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className="input min-h-[80px] resize-none"
                    placeholder="Describe the expense..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) => setForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-accent-500 focus:ring-accent-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Recurring Expense</p>
                      <p className="text-xs text-slate-400">This expense repeats on a regular basis</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving || !form.amount} className="btn-primary">
                  {saving ? (
                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                  ) : (
                    <><Save size={16} /> {editingId ? 'Update' : 'Save Expense'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
