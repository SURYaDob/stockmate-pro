import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck, Plus, Search, X, Loader2, AlertTriangle,
  ChevronLeft, ChevronRight, MoreVertical, Eye,
  RefreshCw, Edit, Save, Calendar, Clock,
  User, Phone, Mail, Shield, DollarSign,
  CheckCircle, XCircle, LogIn, LogOut,
  BadgeCheck, Briefcase, TrendingUp, Users
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
    hour: '2-digit', minute: '2-digit',
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const initialFormState = {
  name: '',
  phone: '',
  email: '',
  role: 'Helper',
  salary: '',
};

const EMPLOYEE_ROLES = ['Manager', 'Supervisor', 'Salesperson', 'Helper', 'Accountant', 'Security', 'Other'];

const Employees = () => {
  const { t } = useTranslation();

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isActive, setIsActive] = useState('');

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  // Detail modal
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  // Form modal
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Attendance month picker
  const now = new Date();
  const [attMonth, setAttMonth] = useState(now.getMonth() + 1);
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (isActive) params.set('isActive', isActive);
      params.set('page', page);
      params.set('limit', limit);

      const res = await api.get(`/employees?${params.toString()}`);
      const data = res.data.data || [];
      setEmployees(data);
      setTotal(res.data.pagination?.total || data.length);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, isActive, page, limit]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Fetch attendance summary
  const fetchAttendanceSummary = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/employees/attendance/summary?month=${attMonth}&year=${attYear}`);
      setAttendanceSummary(res.data.data || []);
    } catch (err) {
      // silent fail
    } finally {
      setLoadingAttendance(false);
    }
  }, [attMonth, attYear]);

  useEffect(() => {
    fetchAttendanceSummary();
  }, [fetchAttendanceSummary]);

  // Open detail
  const openDetail = async (emp) => {
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setSelectedEmployee(res.data.data);
      setShowDetail(true);
    } catch (err) {
      alert('Failed to load employee details');
    }
  };

  // Open form
  const openCreateForm = () => {
    setEditingId(null);
    setForm(initialFormState);
    setSaveError(null);
    setShowForm(true);
  };

  const openEditForm = (emp) => {
    setEditingId(emp.id);
    setForm({
      name: emp.name || '',
      phone: emp.phone || '',
      email: emp.email || '',
      role: emp.role || 'Helper',
      salary: emp.salary ? (emp.salary / 100).toString() : '',
    });
    setSaveError(null);
    setShowForm(true);
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setSaveError('Name and phone are required');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        ...form,
        salary: form.salary ? parseFloat(form.salary) : null,
      };
      if (editingId) {
        await api.put(`/employees/${editingId}`, payload);
      } else {
        await api.post('/employees', payload);
      }
      setShowForm(false);
      fetchEmployees();
      fetchAttendanceSummary();
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  // Clock In/Out
  const handleClockIn = async (id) => {
    try {
      await api.post(`/employees/${id}/clock-in`);
      fetchAttendanceSummary();
      if (selectedEmployee?.id === id) {
        const res = await api.get(`/employees/${id}`);
        setSelectedEmployee(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock in');
    }
  };

  const handleClockOut = async (id) => {
    try {
      await api.post(`/employees/${id}/clock-out`);
      fetchAttendanceSummary();
      if (selectedEmployee?.id === id) {
        const res = await api.get(`/employees/${id}`);
        setSelectedEmployee(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clock out');
    }
  };

  // Toggle active
  const handleToggleActive = async (emp) => {
    if (!window.confirm(`Are you sure you want to ${emp.isActive ? 'deactivate' : 'activate'} ${emp.name}?`)) return;
    try {
      await api.put(`/employees/${emp.id}`, { isActive: !emp.isActive });
      fetchEmployees();
      if (selectedEmployee?.id === emp.id) {
        setSelectedEmployee(prev => ({ ...prev, isActive: !emp.isActive }));
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Stats
  const activeCount = employees.filter(e => e.isActive !== false).length;
  const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('nav.employees')}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {total} {total === 1 ? 'employee' : 'employees'} • {activeCount} active
          </p>
        </div>
        <button onClick={openCreateForm} className="btn-primary">
          <Plus size={18} />
          <span className="hidden sm:inline">Add Employee</span>
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
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
            <div className="p-2.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Briefcase size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Roles</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {new Set(employees.map(e => e.role)).size}
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
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Salary</p>
              <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(totalSalary)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="card">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Attendance Summary</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const d = new Date(attYear, attMonth - 2, 1);
                setAttMonth(d.getMonth() + 1);
                setAttYear(d.getFullYear());
              }}
              className="btn-ghost p-1 text-slate-400"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400 min-w-[80px] text-center">
              {new Date(attYear, attMonth - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => {
                const d = new Date(attYear, attMonth, 1);
                setAttMonth(d.getMonth() + 1);
                setAttYear(d.getFullYear());
              }}
              className="btn-ghost p-1 text-slate-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loadingAttendance ? (
            <div className="p-8 text-center">
              <Loader2 size={20} className="animate-spin text-accent-500 mx-auto" />
            </div>
          ) : attendanceSummary.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No attendance data for this month</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Role</th>
                  <th className="table-header text-center">Present</th>
                  <th className="table-header text-center">Absent</th>
                  <th className="table-header text-center">Half Day</th>
                  <th className="table-header text-right">Total Hours</th>
                  <th className="table-header text-right">Avg/Day</th>
                </tr>
              </thead>
              <tbody>
                {attendanceSummary.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="table-cell font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                    <td className="table-cell text-sm text-slate-500">{item.role}</td>
                    <td className="table-cell text-center">
                      <span className="text-sm font-semibold text-emerald-600">{item.presentDays}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-sm text-red-500">{item.absentDays}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-sm text-amber-500">{item.halfDays}</span>
                    </td>
                    <td className="table-cell text-right font-mono text-sm">{item.totalHours}h</td>
                    <td className="table-cell text-right font-mono text-sm text-slate-500">{item.averageHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap gap-1">
            {[
              { key: '', label: 'All' },
              { key: 'true', label: 'Active' },
              { key: 'false', label: 'Inactive' },
            ].map(opt => (
              <button key={opt.key} onClick={() => { setIsActive(opt.key); setPage(1); }}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  isActive === opt.key
                    ? 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-300'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or phone..." className="input pl-10 pr-10" />
              {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={16} /></button>}
            </div>
            <button onClick={() => { setPage(1); fetchEmployees(); }} className="btn-ghost p-2.5" title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && !loading && (
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-6 text-center">
            <AlertTriangle size={40} className="mx-auto mb-3 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1">Failed to Load</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <button onClick={fetchEmployees} className="btn-primary btn-sm">Try Again</button>
          </div>
        </div>
      )}

      {/* Employee list */}
      {!error && (
        <div className="card overflow-hidden">
          {employees.length === 0 && !loading ? (
            <div className="empty-state p-12">
              <UserCheck size={56} className="text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
                {search || isActive ? 'No employees match your filters' : 'No employees yet'}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {search || isActive ? 'Try adjusting your filters' : 'Add your first employee to start tracking'}
              </p>
              {!search && !isActive && (
                <button onClick={openCreateForm} className="btn-primary"><Plus size={18} /> Add First Employee</button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="overflow-x-auto hidden md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="table-header">Employee</th>
                      <th className="table-header">Role</th>
                      <th className="table-header">Phone</th>
                      <th className="table-header text-right">Salary</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="table-cell">
                          <button onClick={() => openDetail(emp)} className="flex items-center gap-3 group/cell text-left">
                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User size={16} className="text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-slate-200 group-hover/cell:text-accent-500 transition-colors">{emp.name}</p>
                              {emp.email && <p className="text-xs text-slate-400">{emp.email}</p>}
                            </div>
                          </button>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400">{emp.role || '—'}</span>
                        </td>
                        <td className="table-cell font-mono text-sm text-slate-600 dark:text-slate-400">{emp.phone}</td>
                        <td className="table-cell text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {emp.salary ? formatPrice(emp.salary) : '—'}
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            emp.isActive
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {emp.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openDetail(emp)} className="btn-ghost p-2" title="View details"><Eye size={16} /></button>
                            <button onClick={() => openEditForm(emp)} className="btn-ghost p-2" title="Edit"><Edit size={16} /></button>
                            {emp.isActive && (
                              <button onClick={() => handleClockIn(emp.id)} className="btn-ghost p-2 text-emerald-500" title="Clock In">
                                <LogIn size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
                {employees.map((emp) => (
                  <div key={emp.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <User size={18} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{emp.name}</p>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </div>
                        <p className="text-xs text-slate-500">{emp.role} • {emp.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold font-mono text-sm">{emp.salary ? formatPrice(emp.salary) : '—'}</p>
                        <div className="flex gap-1 mt-1 justify-end">
                          <button onClick={() => openDetail(emp)} className="btn-ghost p-1"><Eye size={14} /></button>
                          <button onClick={() => openEditForm(emp)} className="btn-ghost p-1"><Edit size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <p className="text-sm text-slate-500">Page {page} of {totalPages} · {total} total</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={18} /></button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const num = start + i;
                      if (num > totalPages) return null;
                      return (
                        <button key={num} onClick={() => setPage(num)}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${page === num ? 'bg-accent-500 text-white' : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                          {num}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost p-2 disabled:opacity-30"><ChevronRight size={18} /></button>
                  </div>
                </div>
              )}
            </>
          )}
          {loading && employees.length > 0 && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 flex items-center justify-center rounded-xl">
              <Loader2 size={24} className="animate-spin text-accent-500" />
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedEmployee && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <User size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedEmployee.name}</h2>
                  <p className="text-sm text-slate-400">{selectedEmployee.role}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} className="btn-ghost p-2"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-sm font-semibold font-mono">{selectedEmployee.phone}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                  <p className="text-sm font-semibold">{selectedEmployee.email || '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Salary</p>
                  <p className="text-sm font-semibold font-mono">{selectedEmployee.salary ? formatPrice(selectedEmployee.salary) : '—'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</p>
                  <p className={`text-sm font-semibold ${selectedEmployee.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {selectedEmployee.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>

              {/* Recent attendance */}
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Recent Attendance</h3>
                {selectedEmployee.attendance?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEmployee.attendance.slice(0, 10).map((a) => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">{formatDateShort(a.date)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {a.clockIn && <span className="text-xs text-emerald-600">{new Date(a.clockIn).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                          {a.clockOut && <span className="text-xs text-red-500">{new Date(a.clockOut).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                          {a.hoursWorked && <span className="text-xs font-mono text-slate-400">{a.hoursWorked.toFixed(1)}h</span>}
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                            a.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' :
                            a.status === 'HALF_DAY' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-4">No attendance records yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => { setShowDetail(false); handleClockIn(selectedEmployee.id); }}
                  className="btn-secondary btn-sm" disabled={!selectedEmployee.isActive}>
                  <LogIn size={16} /> Clock In
                </button>
                <button onClick={() => { setShowDetail(false); handleClockOut(selectedEmployee.id); }}
                  className="btn-secondary btn-sm" disabled={!selectedEmployee.isActive}>
                  <LogOut size={16} /> Clock Out
                </button>
                <button onClick={() => { setShowDetail(false); openEditForm(selectedEmployee); }}
                  className="btn-secondary btn-sm">
                  <Edit size={16} /> Edit
                </button>
                <button onClick={() => { setShowDetail(false); handleToggleActive(selectedEmployee); }}
                  className={`btn-secondary btn-sm ${!selectedEmployee.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                  {selectedEmployee.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit Employee' : 'Add Employee'}</h2>
              <button onClick={() => setShowForm(false)} className="btn-ghost p-2"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {saveError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">
                  <AlertTriangle size={16} /> {saveError}
                </div>
              )}
              <div>
                <label className="label">Name <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input" placeholder="e.g. Rahul Verma" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone <span className="text-red-500">*</span></label>
                  <input type="text" value={form.phone} onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
                    className="input" placeholder="9876543210" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <select value={form.role} onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))} className="input">
                    {EMPLOYEE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                    className="input" placeholder="rahul@example.com" />
                </div>
                <div>
                  <label className="label">Monthly Salary (₹)</label>
                  <input type="number" min="0" step="1000" value={form.salary}
                    onChange={(e) => setForm(prev => ({ ...prev, salary: e.target.value }))}
                    className="input" placeholder="15000" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={16} /> {editingId ? 'Update' : 'Add Employee'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
