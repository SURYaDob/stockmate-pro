import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Search, Plus, Minus, X, Save, Truck,
  Loader2, AlertTriangle, Check, Trash2, Package,
  Percent, DollarSign, Building2, Calendar
} from 'lucide-react';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '—';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const paymentMethodOptions = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / QR' },
  { value: 'CARD', label: 'Card' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT', label: 'Credit' },
];

const GstRateLabels = {
  RATE_0: '0%', RATE_5: '5%', RATE_12: '12%', RATE_18: '18%', RATE_28: '28%',
};

const NewPurchase = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const preSelectedSupplierId = searchParams.get('supplierId') || location.state?.supplierId || null;

  // Supplier state
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState(null);

  // Load pre-selected supplier
  useEffect(() => {
    if (!preSelectedSupplierId) return;
    setLoadingSupplier(true);
    setSupplierError(null);
    api.get(`/suppliers/${preSelectedSupplierId}`)
      .then(res => setSelectedSupplier(res.data.data))
      .catch(() => setSupplierError('Failed to load supplier'))
      .finally(() => setLoadingSupplier(false));
  }, [preSelectedSupplierId]);

  // Supplier search
  useEffect(() => {
    if (supplierSearch.length < 1) {
      setSuppliers([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/suppliers?search=${encodeURIComponent(supplierSearch)}&limit=10`);
        setSuppliers(res.data.data || []);
        setShowSupplierDropdown(true);
      } catch {
        setSuppliers([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  // Line items
  const [lineItems, setLineItems] = useState([]);

  // Payment details
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paidAmount, setPaidAmount] = useState('');
  const [discountType, setDiscountType] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Quick inventory search
  const [quickItemSearch, setQuickItemSearch] = useState('');
  const [quickItemResults, setQuickItemResults] = useState([]);
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  useEffect(() => {
    if (quickItemSearch.length < 2) {
      setQuickItemResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/inventory?search=${encodeURIComponent(quickItemSearch)}&limit=8&isActive=true`);
        setQuickItemResults(res.data.data || []);
        setShowQuickSearch(true);
      } catch {
        setQuickItemResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [quickItemSearch]);

  const addItemToPO = (item) => {
    const existing = lineItems.find((li) => li.itemId === item.id);
    if (existing) {
      setLineItems((prev) =>
        prev.map((li) =>
          li.itemId === item.id ? { ...li, quantity: li.quantity + 1 } : li
        )
      );
    } else {
      setLineItems((prev) => [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          sku: item.sku,
          unitType: item.unitType,
          unitPrice: item.purchasePrice || 0,
          quantity: 1,
          discount: 0,
          gstRate: item.gstRate || 'RATE_18',
          currentStock: item.currentStock,
        },
      ]);
    }
    setQuickItemSearch('');
    setShowQuickSearch(false);
  };

  const updateLineItem = (itemId, field, value) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.itemId === itemId ? { ...li, [field]: value } : li
      )
    );
  };

  const removeLineItem = (itemId) => {
    setLineItems((prev) => prev.filter((li) => li.itemId !== itemId));
  };

  // Calculate totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    lineItems.forEach((li) => {
      const unitPrice = li.unitPrice || 0;
      const lineTotal = unitPrice * li.quantity;
      const itemDiscount = li.discount || 0;
      const gstPercent = parseInt((li.gstRate || 'RATE_18').replace('RATE_', ''));
      const gstAmount = Math.round((lineTotal - itemDiscount) * gstPercent / 100);

      subtotal += lineTotal;
      totalDiscount += itemDiscount;
      totalGst += gstAmount;
    });

    // Overall discount
    let finalDiscount = 0;
    if (discountType === 'PERCENTAGE' && discountValue) {
      finalDiscount = Math.round(subtotal * parseFloat(discountValue) / 100);
    } else if (discountType === 'FLAT' && discountValue) {
      finalDiscount = Math.round(parseFloat(discountValue) * 100);
    }

    const grandTotal = subtotal - finalDiscount + totalGst;
    const paid = paidAmount ? Math.round(parseFloat(paidAmount) * 100) : 0;

    return {
      subtotal,
      itemDiscounts: totalDiscount,
      finalDiscount,
      gstTotal: totalGst,
      grandTotal,
      balanceAmount: grandTotal - paid,
      paid,
      itemCount: lineItems.length,
    };
  }, [lineItems, discountType, discountValue, paidAmount]);

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      setError('Please select a supplier');
      return;
    }
    if (lineItems.length === 0) {
      setError('Add at least one item to the purchase order');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        supplierId: selectedSupplier.id,
        expectedDate: expectedDate || undefined,
        items: lineItems.map((li) => ({
          itemId: li.itemId,
          quantity: li.quantity,
          unitPrice: li.unitPrice ? (li.unitPrice / 100) : undefined,
        })),
        paymentMethod,
        paidAmount: totals.paid,
        discountType: discountType || null,
        discountValue: discountValue ? parseFloat(discountValue) : null,
        notes: notes || undefined,
      };

      const res = await api.post('/purchases', payload);
      navigate(`/purchases/${res.data.data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  // Close dropdowns
  useEffect(() => {
    const close = () => {
      setShowSupplierDropdown(false);
      setShowQuickSearch(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/purchases" className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">New Purchase Order</h1>
          <p className="text-sm text-slate-400 mt-1">Create a new PO with items from a supplier</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 flex-1">{error}</p>
          <button onClick={() => setError(null)} className="btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pre-selected supplier loading error */}
      {preSelectedSupplierId && supplierError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-600 dark:text-amber-400 flex-1">{supplierError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main - Line items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Supplier selection */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Building2 size={18} className="text-slate-400" />
                Supplier
              </h2>
            </div>
            <div className="card-body">
              {loadingSupplier ? (
                <div className="flex items-center gap-2 p-3">
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                  <span className="text-sm text-slate-400">Loading supplier...</span>
                </div>
              ) : selectedSupplier ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{selectedSupplier.name}</p>
                    <p className="text-sm text-slate-400">
                      {selectedSupplier.phone}
                      {selectedSupplier.gstNumber ? ` · GST: ${selectedSupplier.gstNumber}` : ''}
                      {selectedSupplier.outstanding > 0 ? ` · Outstanding: ${formatPrice(selectedSupplier.outstanding)}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSupplier(null)}
                    className="btn-ghost p-2 text-slate-400 hover:text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={supplierSearch}
                        onChange={(e) => setSupplierSearch(e.target.value)}
                        onFocus={() => setShowSupplierDropdown(true)}
                        placeholder="Search supplier by name or phone..."
                        className="input pl-9 text-sm"
                      />
                    </div>
                    <Link to="/suppliers/new" className="btn-secondary btn-sm">
                      <Plus size={16} /> New
                    </Link>
                  </div>
                  {showSupplierDropdown && suppliers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto animate-scale-in">
                      {suppliers.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { setSelectedSupplier(s); setShowSupplierDropdown(false); setSupplierSearch(''); }}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
                            <Building2 size={14} className="text-accent-600 dark:text-accent-400" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 dark:text-slate-300">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.phone}{s.gstNumber ? ` · ${s.gstNumber}` : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expected delivery */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                Expected Delivery
              </h2>
            </div>
            <div className="card-body">
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="input min-w-[200px]"
              />
            </div>
          </div>

          {/* Add Items */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Package size={18} className="text-slate-400" />
                Items
                {lineItems.length > 0 && (
                  <span className="text-xs font-normal text-slate-400 ml-1">({lineItems.length})</span>
                )}
              </h2>
            </div>
            <div className="card-body space-y-4">
              {/* Quick add search */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={quickItemSearch}
                    onChange={(e) => setQuickItemSearch(e.target.value)}
                    onFocus={() => setShowQuickSearch(true)}
                    placeholder="Search and add products by name or SKU..."
                    className="input pl-9 pr-4"
                    autoFocus
                  />
                </div>
                {showQuickSearch && quickItemResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-64 overflow-y-auto animate-scale-in">
                    {quickItemResults.map((item) => {
                      const inCart = lineItems.find((li) => li.itemId === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addItemToPO(item)}
                          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-700 border-b border-slate-100 dark:border-slate-700 last:border-0"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                            <Package size={14} className="text-slate-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-700 dark:text-slate-300 truncate">{item.name}</p>
                            <p className="text-xs text-slate-400 font-mono">{item.sku} · Stock: {item.currentStock}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-mono text-sm text-slate-700 dark:text-slate-300">
                              {formatPrice(item.purchasePrice)}
                            </p>
                            {inCart && (
                              <p className="text-xs text-accent-500">Already added</p>
                            )}
                          </div>
                          <div className="p-1.5 rounded-lg bg-accent-100 dark:bg-accent-900/30 ml-2">
                            <Plus size={14} className="text-accent-600 dark:text-accent-400" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {showQuickSearch && quickItemSearch.length >= 2 && quickItemResults.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 p-4 text-center text-sm text-slate-400 animate-scale-in">
                    No products found for &quot;{quickItemSearch}&quot;
                  </div>
                )}
              </div>

              {/* Line items table */}
              {lineItems.length === 0 ? (
                <div className="text-center py-8">
                  <Truck size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm text-slate-400">No items added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Search and add products above</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Item</th>
                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Qty</th>
                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Price</th>

                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">GST</th>
                        <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider pb-2">Total</th>
                        <th className="pb-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((li) => {
                        const unitPrice = li.unitPrice || 0;
                        const lineTotal = unitPrice * li.quantity;
                        const gstPercent = parseInt((li.gstRate || 'RATE_18').replace('RATE_', ''));
                        const gstAmount = Math.round((lineTotal - (li.discount || 0)) * gstPercent / 100);
                        const total = lineTotal - (li.discount || 0) + gstAmount;

                        return (
                          <tr key={li.itemId} className="border-b border-slate-100 dark:border-slate-700">
                            <td className="py-2 pr-4">
                              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{li.name}</p>
                              <p className="text-xs text-slate-400 font-mono">{li.sku}</p>
                            </td>
                            <td className="py-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (li.quantity <= 1) return;
                                    updateLineItem(li.itemId, 'quantity', li.quantity - 1);
                                  }}
                                  className="btn-ghost p-1"
                                  disabled={li.quantity <= 1}
                                >
                                  <Minus size={14} />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={li.quantity}
                                  onChange={(e) => updateLineItem(li.itemId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                  className="w-14 text-center input-sm font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateLineItem(li.itemId, 'quantity', li.quantity + 1)}
                                  className="btn-ghost p-1"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={unitPrice > 0 ? (unitPrice / 100) : ''}
                                onChange={(e) => updateLineItem(li.itemId, 'unitPrice', e.target.value ? Math.round(parseFloat(e.target.value) * 100) : 0)}
                                className="w-24 text-right input-sm font-mono"
                                placeholder="0.00"
                              />
                            </td>

                            <td className="py-2 text-right">
                              <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {GstRateLabels[li.gstRate] || '18%'}
                              </span>
                            </td>
                            <td className="py-2 text-right font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {formatPrice(total)}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeLineItem(li.itemId)}
                                className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Notes</h2>
            </div>
            <div className="card-body">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this purchase order..."
                rows={2}
                className="input resize-none"
              />
            </div>
          </div>
        </div>

        {/* Sidebar - Payment & Summary */}
        <div className="space-y-4">
          {/* PO Summary */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">PO Summary</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Items ({totals.itemCount})</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatPrice(totals.subtotal)}</span>
              </div>
              {totals.itemDiscounts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Item Discounts</span>
                  <span className="font-mono text-red-500">-{formatPrice(totals.itemDiscounts)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">GST Total</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{formatPrice(totals.gstTotal)}</span>
              </div>
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">Overall Discount</span>
                  <span className={`font-mono ${totals.finalDiscount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                    {totals.finalDiscount > 0 ? `-${formatPrice(totals.finalDiscount)}` : '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === 'PERCENTAGE' ? '' : 'PERCENTAGE')}
                      className={`w-full text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors min-h-[32px]
                        ${discountType === 'PERCENTAGE'
                          ? 'bg-accent-50 border-accent-400 text-accent-700 dark:bg-accent-900/20 dark:border-accent-600 dark:text-accent-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <Percent size={12} className="inline mr-1" />%
                    </button>
                  </div>
                  <div className="flex-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === 'FLAT' ? '' : 'FLAT')}
                      className={`w-full text-xs px-2 py-1.5 rounded-lg border font-medium transition-colors min-h-[32px]
                        ${discountType === 'FLAT'
                          ? 'bg-accent-50 border-accent-400 text-accent-700 dark:bg-accent-900/20 dark:border-accent-600 dark:text-accent-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      <DollarSign size={12} className="inline mr-1" />Flat
                    </button>
                  </div>
                </div>
                {discountType && (
                  <div className="mt-2">
                    <input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === 'PERCENTAGE' ? 'Discount %' : 'Amount (₹)'}
                      className="input-sm text-sm w-full"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between">
                  <span className="text-base font-semibold text-slate-800 dark:text-slate-200">Grand Total</span>
                  <span className="text-xl font-bold font-mono text-accent-600 dark:text-accent-400">
                    {formatPrice(totals.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Payment</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {paymentMethodOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPaymentMethod(opt.value)}
                      className={`text-xs px-3 py-2 rounded-lg border font-medium transition-colors min-h-[36px]
                        ${paymentMethod === opt.value
                          ? 'bg-accent-50 border-accent-400 text-accent-700 dark:bg-accent-900/20 dark:border-accent-600 dark:text-accent-300'
                          : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Amount Paid</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0.00"
                    className="input pl-8 font-mono"
                  />
                </div>
              </div>

              {totals.balanceAmount > 0 && (
                <div className="flex justify-between text-sm p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <span className="text-amber-700 dark:text-amber-300 font-medium">Balance Due</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                    {formatPrice(totals.balanceAmount)}
                  </span>
                </div>
              )}

              {totals.grandTotal > 0 && totals.paid >= totals.grandTotal && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Check size={16} className="text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Fully Paid</span>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || lineItems.length === 0 || !selectedSupplier}
            className="btn-primary w-full py-3 text-base"
          >
            {saving ? (
              <><Loader2 size={20} className="animate-spin" /> Creating PO...</>
            ) : (
              <><Save size={20} /> Create Purchase Order</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPurchase;
