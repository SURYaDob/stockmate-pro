import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, UserCircle, Edit, AlertTriangle, Loader2,
  User, Phone, Mail, MapPin, Hash,
  Calendar, Wallet, ShoppingCart,
  TrendingDown, TrendingUp,
  X, CreditCard, Download
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

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [recordingPayment, setRecordingPayment] = useState(false);

  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [recordingCredit, setRecordingCredit] = useState(false);

  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerRes, ledgerRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/customers/${id}/ledger`),
      ]);
      setCustomer(customerRes.data.data);
      setLedger(ledgerRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  // Record payment
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) return;
    setRecordingPayment(true);
    try {
      await api.post(`/customers/${id}/payment`, {
        amount: amt,
        description: paymentDesc || 'Payment received',
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentDesc('');
      fetchCustomer();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  // Create credit note
  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/customers/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `customer-${customer?.name?.replace(/\s+/g, '-') || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  const handleCreateCreditNote = async (e) => {
    e.preventDefault();
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) return;
    setRecordingCredit(true);
    try {
      await api.post(`/customers/${id}/credit-note`, {
        amount: amt,
        description: creditDesc || 'Credit note issued',
      });
      setShowCreditModal(false);
      setCreditAmount('');
      setCreditDesc('');
      fetchCustomer();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create credit note');
    } finally {
      setRecordingCredit(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="card p-4 space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Customer Not Found</h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Customer</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={fetchCustomer} className="btn-primary btn-sm">Try Again</button>
              <Link to="/customers" className="btn-secondary btn-sm">Back to Customers</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const sales = customer.sales || [];

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <UserCircle size={24} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{customer.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                customer.isActive
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${customer.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                {customer.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {customer.gstNumber && (
              <p className="text-sm text-slate-400 font-mono mt-0.5">GST: {customer.gstNumber}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/sales/new?customerId=${id}`} className="btn-primary btn-sm">
            <ShoppingCart size={16} /> New Sale
          </Link>
          <Link to={`/customers/${id}/edit`} className="btn-secondary btn-sm">
            <Edit size={16} /> Edit
          </Link>
          {customer.outstanding > 0 && (
            <button onClick={() => setShowPaymentModal(true)} className="btn-secondary btn-sm">
              <Wallet size={16} /> Record Payment
            </button>
          )}
          {customer.outstanding > 0 && (
            <button onClick={() => setShowCreditModal(true)} className="btn-secondary btn-sm">
              <CreditCard size={16} /> Credit Note
            </button>
          )}
          <button onClick={handleDownloadPdf} className="btn-secondary btn-sm">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Financial summary */}
          <div className="card">
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Outstanding</p>
                  <p className="text-xl font-bold font-mono text-amber-700 dark:text-amber-300">
                    {formatPrice(customer.outstanding)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Sales</p>
                  <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{sales.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Credit Limit</p>
                  <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">
                    {customer.creditLimit ? formatPrice(customer.creditLimit) : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <p className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{customer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Info Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Customer Information</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailRow icon={User} label="Name" value={customer.name} />
                {customer.gstNumber && <DetailRow icon={Hash} label="GST Number" value={customer.gstNumber} mono />}
                <DetailRow icon={Phone} label="Phone" value={customer.phone} mono />
                {customer.email && <DetailRow icon={Mail} label="Email" value={customer.email} />}
                {customer.address && <DetailRow icon={MapPin} label="Address" value={[
                  customer.address,
                  customer.city,
                  customer.state,
                  customer.pincode,
                ].filter(Boolean).join(', ')} />}
                {customer.creditLimit && <DetailRow icon={Wallet} label="Credit Limit" value={formatPrice(customer.creditLimit)} />}
                <DetailRow icon={Calendar} label="Member Since" value={formatDateShort(customer.createdAt)} />
              </div>
            </div>
          </div>

          {/* Recent Sales */}
          {sales.length > 0 && (
            <div className="card">
              <div className="card-header flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Recent Sales ({sales.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                      <th className="table-header">Invoice</th>
                      <th className="table-header">Date</th>
                      <th className="table-header text-right">Amount</th>
                      <th className="table-header text-center">Status</th>
                      <th className="table-header text-center">Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 10).map((s) => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="table-cell">
                          <Link to={`/sales/${s.id}`} className="font-mono text-sm font-medium text-accent-600 dark:text-accent-400 hover:underline">
                            {s.invoiceNo}
                          </Link>
                        </td>
                        <td className="table-cell">
                          <span className="text-sm text-slate-600 dark:text-slate-400">
                            {formatDateShort(s.createdAt)}
                          </span>
                        </td>
                        <td className="table-cell text-right">
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {formatPrice(s.grandTotal)}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            s.isReturn ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {s.isReturn ? 'Return' : 'Sale'}
                          </span>
                        </td>
                        <td className="table-cell text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            s.paymentStatus === 'PAID' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                            s.paymentStatus === 'PARTIAL' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                            s.paymentStatus === 'PENDING' ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' :
                            'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          }`}>
                            {s.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No sales state */}
          {sales.length === 0 && (
            <div className="card">
              <div className="p-8 text-center">
                <ShoppingCart size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <h3 className="text-base font-semibold text-slate-500 dark:text-slate-400 mb-1">No Sales Yet</h3>
                <p className="text-sm text-slate-400">
                  Sales for this customer will appear here once recorded
                </p>
              </div>
            </div>
          )}

          {/* Ledger Timeline */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Ledger History
                {ledger.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">({ledger.length})</span>
                )}
              </h2>
            </div>
            <div className="card-body">
              {ledger.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  No ledger entries yet
                </div>
              ) : (
                <div className="space-y-0">
                  {ledger.map((entry, idx) => {
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-start gap-4 py-3 ${
                          idx < ledger.length - 1
                            ? 'border-b border-slate-100 dark:border-slate-700'
                            : ''
                        }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          entry.amount < 0
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {entry.amount < 0
                            ? <TrendingDown size={16} className="text-emerald-600 dark:text-emerald-400" />
                            : <TrendingUp size={16} className="text-red-600 dark:text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              entry.amount < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {entry.amount < 0 ? '-' : '+'}{formatPrice(Math.abs(entry.amount))}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 font-medium uppercase">
                              {entry.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-400">{formatDate(entry.date)}</span>
                            <span className="text-xs text-slate-400">
                              Balance: {formatPrice(entry.balance)}
                            </span>
                          </div>
                          {entry.description && (
                            <p className="text-xs text-slate-500 mt-0.5">{entry.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Quick Actions</h2>
            </div>
            <div className="card-body space-y-2">
              <Link
                to={`/sales/new?customerId=${id}`}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <ShoppingCart size={16} className="text-violet-600 dark:text-violet-400" />
                </div>
                New Sale Invoice
              </Link>
              <Link
                to={`/customers/${id}/edit`}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Edit size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Edit Customer
              </Link>
              {customer.outstanding > 0 && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <Wallet size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  Record Payment
                </button>
              )}
              {customer.outstanding > 0 && (
                <button
                  onClick={() => setShowCreditModal(true)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                    <CreditCard size={16} className="text-orange-600 dark:text-orange-400" />
                  </div>
                  Issue Credit Note
                </button>
              )}
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Download size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Download PDF
              </button>
            </div>
          </div>

          {/* Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Summary</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Sales</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{sales.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${customer.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {customer.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Outstanding</span>
                <span className={`font-medium font-mono ${customer.outstanding > 0 ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}`}>
                  {formatPrice(customer.outstanding)}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Updated</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                    {formatDate(customer.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-5">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Outstanding Balance</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {formatPrice(customer.outstanding)}
                </span>
              </div>

              <div>
                <label className="label">Payment Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={customer.outstanding / 100}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input text-lg font-bold"
                  placeholder="0.00"
                  autoFocus
                />
                <p className="text-xs text-slate-400 mt-1">
                  Max: {formatPrice(customer.outstanding)}
                </p>
              </div>

              <div className="flex gap-2">
                {[0.25, 0.5, 0.75, 1].map(fraction => {
                  const amt = ((customer.outstanding / 100) * fraction).toFixed(2);
                  return (
                    <button
                      key={fraction}
                      type="button"
                      onClick={() => setPaymentAmount(amt)}
                      className="flex-1 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      {fraction === 1 ? 'Full' : `${fraction * 100}%`}
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="input"
                  placeholder="e.g. Payment for Invoice #123"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className="btn-primary"
                >
                  {recordingPayment ? (
                    <><Loader2 size={18} className="animate-spin" /> Recording...</>
                  ) : (
                    <><Wallet size={16} /> Record Payment</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credit Note Modal */}
      {showCreditModal && (
        <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Issue Credit Note</h2>
              <button onClick={() => setShowCreditModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCreditNote} className="p-5 space-y-5">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Outstanding Balance</span>
                <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                  {formatPrice(customer.outstanding)}
                </span>
              </div>

              <div>
                <label className="label">Credit Note Amount (₹)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={customer.outstanding / 100}
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  className="input text-lg font-bold"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Description (optional)</label>
                <input
                  type="text"
                  value={creditDesc}
                  onChange={(e) => setCreditDesc(e.target.value)}
                  className="input"
                  placeholder="e.g. Adjustment for returned items"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreditModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingCredit || !creditAmount || parseFloat(creditAmount) <= 0}
                  className="btn-primary"
                >
                  {recordingCredit ? (
                    <><Loader2 size={18} className="animate-spin" /> Creating...</>
                  ) : (
                    <><CreditCard size={16} /> Issue Credit Note</>
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

// Detail row subcomponent
const DetailRow = ({ icon: Icon, label, value, mono }) => (
  <div className="flex items-start gap-3">
    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 flex-shrink-0 mt-0.5">
      <Icon size={14} className="text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-sm text-slate-700 dark:text-slate-300 mt-0.5 ${mono ? 'font-mono' : ''} truncate`}>
        {value}
      </p>
    </div>
  </div>
);

export default CustomerDetail;
