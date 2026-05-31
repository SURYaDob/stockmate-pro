import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Package, Edit, Copy, Archive, AlertTriangle, Loader2,
  Clock, User, TrendingUp, TrendingDown, Truck, Plus, Minus, X,
  DollarSign, Calendar, MapPin, Shield, Hash, Tag, Box, BadgeCheck, Barcode, Download
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

const categoryColors = {
  PLUMBING: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', gradient: 'from-cyan-500/10 to-cyan-600/5' },
  ELECTRICAL: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', gradient: 'from-amber-500/10 to-amber-600/5' },
  PAINTING: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-700 dark:text-rose-300', gradient: 'from-rose-500/10 to-rose-600/5' },
  HARDWARE: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-300', gradient: 'from-slate-500/10 to-slate-600/5' },
  TOOLS: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', gradient: 'from-emerald-500/10 to-emerald-600/5' },
  SANITARY: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', gradient: 'from-blue-500/10 to-blue-600/5' },
  SAFETY_EQUIPMENT: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', gradient: 'from-orange-500/10 to-orange-600/5' },
};

const GstRateLabels = {
  RATE_0: '0%', RATE_5: '5%', RATE_12: '12%', RATE_18: '18%', RATE_28: '28%',
};

const InventoryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustData, setAdjustData] = useState({ type: 'IN', quantity: 1, reason: '' });
  const [adjusting, setAdjusting] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);

  const fetchItem = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/inventory/${id}`);
      setItem(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load item');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
  }, [id]);

  // Archive item
  const handleArchive = async () => {
    try {
      await api.post(`/inventory/${id}/archive`);
      navigate('/inventory');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to archive item');
    }
    setConfirmArchive(false);
  };

  // Duplicate item
  const handleDuplicate = async () => {
    try {
      const res = await api.post(`/inventory/${id}/duplicate`);
      navigate(`/inventory/${res.data.data.id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to duplicate item');
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    try {
      const res = await api.get(`/inventory/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `item-${item?.sku || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download failed:', err);
    }
  };

  // Adjust stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustData.quantity || adjustData.quantity <= 0) return;
    if (adjustData.type === 'OUT' && adjustData.quantity > (item?.currentStock || 0)) {
      alert('Cannot remove more than current stock');
      return;
    }
    setAdjusting(true);
    try {
      await api.post(`/inventory/${id}/adjust-stock`, adjustData);
      setAdjustModal(false);
      setAdjustData({ type: 'IN', quantity: 1, reason: '' });
      fetchItem();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-56 mb-2" />
            <div className="skeleton h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card p-6 space-y-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-24" />
                  <div className="skeleton h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6 space-y-4">
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/inventory" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Item Not Found</h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Item</h3>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={fetchItem} className="btn-primary btn-sm">Try Again</button>
              <Link to="/inventory" className="btn-secondary btn-sm">Back to Inventory</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const catColor = categoryColors[item.category] || categoryColors.HARDWARE;
  const isLowStock = item.currentStock <= item.minStock;
  const isDeadStock = item.lastMovement && (new Date() - new Date(item.lastMovement)) > 90 * 24 * 60 * 60 * 1000;
  const margin = item.sellingPrice - item.purchasePrice;
  const marginPercent = item.purchasePrice > 0 ? ((margin / item.purchasePrice) * 100).toFixed(1) : 0;
  const stockMovements = item.stockMovements || [];
  const displayedMovements = showAllMovements ? stockMovements : stockMovements.slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/inventory" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <div className={`w-12 h-12 rounded-xl ${catColor.bg} flex items-center justify-center`}>
            <Package size={24} className={catColor.text} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{item.name}</h1>
              {!item.isActive && <span className="badge-slate">Inactive</span>}
              {isLowStock && item.isActive && <span className="badge-warning">Low Stock</span>}
              {isDeadStock && item.isActive && <span className="badge-info">Dead Stock</span>}
            </div>
            <p className="text-sm text-slate-400 font-mono mt-0.5">{item.sku}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/inventory/${id}/edit`} className="btn-secondary btn-sm">
            <Edit size={16} /> Edit
          </Link>
          <button onClick={handleDuplicate} className="btn-secondary btn-sm">
            <Copy size={16} /> Duplicate
          </button>
          {item.isActive && (
            <button onClick={() => setConfirmArchive(true)} className="btn-secondary btn-sm text-red-600">
              <Archive size={16} /> Archive
            </button>
          )}
          <button onClick={handleDownloadPdf} className="btn-secondary btn-sm">
            <Download size={16} /> PDF
          </button>
          <button onClick={() => setAdjustModal(true)} className="btn-primary btn-sm">
            <Plus size={16} /> Adjust Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock & Price Card */}
          <div className="card">
            <div className="p-6">
              {/* Stock level bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Stock Level</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold font-mono ${
                      isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'
                    }`}>
                      {item.currentStock}
                    </span>
                    <span className="text-xs text-slate-400">{item.unitType?.toLowerCase()}</span>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLowStock
                        ? 'bg-amber-500'
                        : item.currentStock > item.maxStock
                          ? 'bg-blue-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (item.currentStock / item.maxStock) * 100)}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-1.5">
                  <span>Min: {item.minStock}</span>
                  <span>Max: {item.maxStock}</span>
                </div>
              </div>

              {/* Price grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Purchase Price</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(item.purchasePrice)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Selling Price</p>
                  <p className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
                    {formatPrice(item.sellingPrice)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Margin</p>
                  <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {formatPrice(margin)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Margin %</p>
                  <p className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-300">
                    {marginPercent}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Item Details</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <DetailRow icon={Tag} label="Category" value={t(`categories.${item.category}`)} />
                <DetailRow icon={Hash} label="SKU" value={item.sku} mono />
                {item.barcode && <DetailRow icon={Barcode} label="Barcode" value={item.barcode} mono />}
                {item.subCategory && <DetailRow icon={Box} label="Sub Category" value={item.subCategory} />}
                {item.brand && <DetailRow icon={BadgeCheck} label="Brand" value={item.brand} />}
                {item.model && <DetailRow icon={Tag} label="Model" value={item.model} />}
                <DetailRow icon={Box} label="Unit Type" value={item.unitType} />
                {item.gstRate && <DetailRow icon={DollarSign} label="GST Rate" value={GstRateLabels[item.gstRate] || item.gstRate} />}
                {item.expiryDate && <DetailRow icon={Calendar} label="Expiry Date" value={formatDateShort(item.expiryDate)} />}
                {item.warrantyMonths && <DetailRow icon={Shield} label="Warranty" value={`${item.warrantyMonths} months`} />}
                {item.location && <DetailRow icon={MapPin} label="Location" value={item.location} />}
                <DetailRow icon={Calendar} label="Created" value={formatDate(item.createdAt)} />
                <DetailRow icon={Calendar} label="Last Updated" value={formatDate(item.updatedAt)} />
                {item.lastMovement && <DetailRow icon={Clock} label="Last Movement" value={formatDate(item.lastMovement)} />}
                {item.createdBy && <DetailRow icon={User} label="Created By" value={`${item.createdBy.firstName} ${item.createdBy.lastName}`} />}
              </div>
              {item.description && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{item.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Stock Movements */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Stock Movements
                {stockMovements.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-slate-400">({stockMovements.length})</span>
                )}
              </h2>
              {stockMovements.length > 10 && (
                <button
                  onClick={() => setShowAllMovements(!showAllMovements)}
                  className="text-xs text-accent-500 hover:text-accent-600 font-medium"
                >
                  {showAllMovements ? 'Show Less' : `View All (${stockMovements.length})`}
                </button>
              )}
            </div>
            <div className="card-body">
              {stockMovements.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-400">
                  No stock movements recorded yet
                </div>
              ) : (
                <div className="space-y-0">
                  {displayedMovements.map((movement, idx) => {
                    const isIn = movement.type === 'IN' || !movement.type;
                    return (
                      <div
                        key={movement.id}
                        className={`flex items-start gap-4 py-3 ${
                          idx < displayedMovements.length - 1
                            ? 'border-b border-slate-100 dark:border-slate-700'
                            : ''
                        }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${
                          isIn
                            ? 'bg-emerald-100 dark:bg-emerald-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {isIn
                            ? <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
                            : <TrendingDown size={16} className="text-red-600 dark:text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${
                              isIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isIn ? '+' : '-'}{movement.quantity}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                              {movement.reason || (isIn ? 'Stock added' : 'Stock removed')}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-slate-400">
                              {formatDate(movement.createdAt)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {movement.oldStock} → {movement.newStock}
                            </span>
                            {movement.createdBy && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <User size={12} />
                                {movement.createdBy.firstName}
                              </span>
                            )}
                          </div>
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
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Quick Actions</h2>
            </div>
            <div className="card-body space-y-2">
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Download size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Download PDF
              </button>
              <button
                onClick={() => setAdjustModal(true)}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-accent-100 dark:bg-accent-900/30">
                  <Plus size={16} className="text-accent-600 dark:text-accent-400" />
                </div>
                Adjust Stock
              </button>
              <Link
                to={`/inventory/${id}/edit`}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Edit size={16} className="text-blue-600 dark:text-blue-400" />
                </div>
                Edit Item
              </Link>
              <button
                onClick={handleDuplicate}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Copy size={16} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                Duplicate Item
              </button>
              {item.isActive && (
                <button
                  onClick={() => setConfirmArchive(true)}
                  className="flex items-center gap-3 w-full p-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <Archive size={16} className="text-red-600 dark:text-red-400" />
                  </div>
                  Archive Item
                </button>
              )}
            </div>
          </div>

          {/* Suppliers */}
          {item.suppliers && item.suppliers.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                  Suppliers ({item.suppliers.length})
                </h2>
              </div>
              <div className="card-body space-y-2">
                {item.suppliers.map(({ supplier, isPreferred, lastPrice }) => (
                  <div key={supplier.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Truck size={14} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/suppliers/${supplier.id}`}
                        className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-accent-500 truncate block"
                      >
                        {supplier.name}
                      </Link>
                      {lastPrice && (
                        <p className="text-xs text-slate-400">Last price: {formatPrice(lastPrice)}</p>
                      )}
                    </div>
                    {isPreferred && (
                      <BadgeCheck size={16} className="text-accent-500 flex-shrink-0" title="Preferred supplier" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Meta</h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Stock Movements</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{stockMovements.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Status</span>
                <span className={`font-medium ${item.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total Value</span>
                <span className="font-medium font-mono text-slate-700 dark:text-slate-300">
                  {formatPrice(item.currentStock * item.sellingPrice)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Adjust Stock Modal */}
      {adjustModal && (
        <div className="modal-overlay" onClick={() => setAdjustModal(false)}>
          <div className="modal-content max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold">Adjust Stock</h2>
              <button onClick={() => setAdjustModal(false)} className="btn-ghost p-2">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-6 space-y-5">
              {item && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Stock</p>
                  <p className="text-2xl font-bold font-mono text-slate-800 dark:text-slate-100">{item.currentStock}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustData(prev => ({ ...prev, type: 'IN' }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all min-h-[44px]
                    ${adjustData.type === 'IN'
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-600 dark:text-emerald-300'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                >
                  <Plus size={18} /> Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustData(prev => ({ ...prev, type: 'OUT' }))}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all min-h-[44px]
                    ${adjustData.type === 'OUT'
                      ? 'bg-red-50 border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-300'
                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'}`}
                >
                  <Minus size={18} /> Remove Stock
                </button>
              </div>

              <div>
                <label className="label">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={adjustData.quantity}
                  onChange={(e) => setAdjustData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Reason</label>
                <input
                  type="text"
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Damaged, Return, Restock..."
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setAdjustModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={adjusting} className="btn-primary">
                  {adjusting ? (
                    <><Loader2 size={18} className="animate-spin" /> Adjusting...</>
                  ) : (
                    'Confirm Adjustment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive confirmation */}
      {confirmArchive && (
        <div className="modal-overlay" onClick={() => setConfirmArchive(false)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                <Archive size={24} className="text-red-500" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Archive Item?</h2>
              <p className="text-sm text-slate-500 mb-6">
                Are you sure you want to archive "{item.name}"? This will hide it from active inventory but preserve all data.
              </p>
              <div className="flex justify-center gap-3">
                <button onClick={() => setConfirmArchive(false)} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleArchive} className="btn-danger">
                  <Archive size={16} /> Archive
                </button>
              </div>
            </div>
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

export default InventoryDetail;
