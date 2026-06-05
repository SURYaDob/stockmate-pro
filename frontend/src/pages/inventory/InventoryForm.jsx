import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Package, Loader2, AlertTriangle, Check, X,
  Barcode
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'PAINTING', 'HARDWARE', 'TOOLS', 'SANITARY', 'SAFETY_EQUIPMENT'];
const UNIT_TYPES = ['PCS', 'LITERS', 'KG', 'METERS', 'BOXES', 'ROLLS', 'PAIRS'];
const GST_RATES = ['RATE_0', 'RATE_5', 'RATE_12', 'RATE_18', 'RATE_28'];

const initialFormState = {
  name: '',
  barcode: '',
  category: 'HARDWARE',
  subCategory: '',
  brand: '',
  model: '',
  unitType: 'PCS',
  currentStock: 0,
  minStock: 5,
  maxStock: 100,
  purchasePrice: '',
  sellingPrice: '',
  gstRate: 'RATE_18',
  expiryDate: '',
  warrantyMonths: '',
  location: '',
  description: '',
  supplierIds: [],
};

const InventoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialFormState);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [errors, setErrors] = useState({});
  const [selectedSupplierIds, setSelectedSupplierIds] = useState([]);

  // Fetch suppliers for selection
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers?limit=200');
        setSuppliers(res.data.data || []);
      } catch (err) {
        // Non-critical - suppliers are optional
        console.warn('Failed to load suppliers:', err);
      }
    };
    fetchSuppliers();
  }, []);

  // Fetch item data for edit mode
  useEffect(() => {
    if (!isEdit) return;
    const fetchItem = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get(`/inventory/${id}`);
        const item = res.data.data;
        setForm({
          sku: item.sku || '',
          name: item.name || '',
          barcode: item.barcode || '',
          category: item.category || 'HARDWARE',
          subCategory: item.subCategory || '',
          brand: item.brand || '',
          model: item.model || '',
          unitType: item.unitType || 'PCS',
          currentStock: item.currentStock ?? 0,
          minStock: item.minStock ?? 5,
          maxStock: item.maxStock ?? 100,
          purchasePrice: item.purchasePrice ? (item.purchasePrice / 100).toString() : '',
          sellingPrice: item.sellingPrice ? (item.sellingPrice / 100).toString() : '',
          gstRate: item.gstRate || 'RATE_18',
          expiryDate: item.expiryDate ? item.expiryDate.split('T')[0] : '',
          warrantyMonths: item.warrantyMonths?.toString() || '',
          location: item.location || '',
          description: item.description || '',
          supplierIds: [],
        });
        setSelectedSupplierIds(item.suppliers?.map(s => s.supplier?.id || s.supplierId) || []);
      } catch (err) {
        setFetchError(err.response?.data?.message || 'Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [id, isEdit]);

  // Form validation
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Item name is required';
    if (!form.category) errs.category = 'Category is required';
    if (form.purchasePrice && isNaN(parseFloat(form.purchasePrice))) errs.purchasePrice = 'Invalid price';
    if (form.sellingPrice && isNaN(parseFloat(form.sellingPrice))) errs.sellingPrice = 'Invalid price';
    if (form.currentStock && (isNaN(parseInt(form.currentStock)) || parseInt(form.currentStock) < 0))
      errs.currentStock = 'Invalid stock value';
    if (form.minStock && (isNaN(parseInt(form.minStock)) || parseInt(form.minStock) < 0))
      errs.minStock = 'Invalid min stock';
    if (form.maxStock && (isNaN(parseInt(form.maxStock)) || parseInt(form.maxStock) < 0))
      errs.maxStock = 'Invalid max stock';
    if (form.warrantyMonths && (isNaN(parseInt(form.warrantyMonths)) || parseInt(form.warrantyMonths) < 0))
      errs.warrantyMonths = 'Invalid warranty period';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSaveError(null);

    try {
      const payload = {
        ...form,
        purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : 0,
        sellingPrice: form.sellingPrice ? parseFloat(form.sellingPrice) : 0,
        currentStock: form.currentStock ? parseInt(form.currentStock) : 0,
        minStock: form.minStock ? parseInt(form.minStock) : 5,
        maxStock: form.maxStock ? parseInt(form.maxStock) : 100,
        warrantyMonths: form.warrantyMonths ? parseInt(form.warrantyMonths) : null,
        supplierIds: selectedSupplierIds,
      };

      if (isEdit) {
        await api.put(`/inventory/${id}`, payload);
      } else {
        await api.post('/inventory', payload);
      }

      navigate(isEdit ? `/inventory/${id}` : '/inventory');
    } catch (err) {
      setSaveError(err.response?.data?.message || (isEdit ? 'Failed to update item' : 'Failed to create item'));
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  // Toggle supplier selection
  const toggleSupplier = (supplierId) => {
    setSelectedSupplierIds(prev =>
      prev.includes(supplierId)
        ? prev.filter(id => id !== supplierId)
        : [...prev, supplierId]
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i}>
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/inventory" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Item' : 'Add New Item'}
          </h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Item</h3>
            <p className="text-sm text-slate-500 mb-4">{fetchError}</p>
            <Link to="/inventory" className="btn-secondary">Back to Inventory</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={isEdit ? `/inventory/${id}` : '/inventory'} className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Item' : 'Add New Item'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isEdit ? `Editing ${form.name || 'item'}` : 'Create a new inventory item'}
          </p>
        </div>
      </div>

      {/* Save error */}
      {saveError && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <AlertTriangle size={18} className="flex-shrink-0" />
          <span>{saveError}</span>
          <button onClick={() => setSaveError(null)} className="ml-auto btn-ghost p-1">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Basic Information</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="label">Item Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Finolex 1/2 inch PVC Pipe"
                  className={`input ${errors.name ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* SKU (auto-generated, read-only display) */}
              <div>
                <label className="label">SKU (Auto-generated)</label>
                <input
                  type="text"
                  value={isEdit ? form.sku : `${form.category?.substring(0,3) || 'HRD'}-${form.brand?.substring(0,2) || 'XX'}-${form.name?.substring(0,3) || 'ITM'}-XXXX`}
                  disabled
                  className="input bg-slate-50 dark:bg-slate-700/50 text-slate-400"
                />
              </div>

              {/* Barcode */}
              <div>
                <label className="label">Barcode</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => handleChange('barcode', e.target.value)}
                    placeholder="Optional barcode number"
                    className="input pl-10"
                  />
                  <Barcode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Classification</h2>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Category */}
              <div>
                <label className="label">Category <span className="text-red-500">*</span></label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className={`select ${errors.category ? 'ring-2 ring-red-500' : ''}`}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{t(`categories.${cat}`)}</option>
                  ))}
                </select>
                {errors.category && <p className="text-xs text-red-500 mt-1">{errors.category}</p>}
              </div>

              {/* Sub Category */}
              <div>
                <label className="label">Sub Category</label>
                <input
                  type="text"
                  value={form.subCategory}
                  onChange={(e) => handleChange('subCategory', e.target.value)}
                  placeholder="e.g. PVC Pipes"
                  className="input"
                />
              </div>

              {/* Unit Type */}
              <div>
                <label className="label">Unit Type</label>
                <select
                  value={form.unitType}
                  onChange={(e) => handleChange('unitType', e.target.value)}
                  className="select"
                >
                  {UNIT_TYPES.map(ut => (
                    <option key={ut} value={ut}>{ut}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Brand */}
              <div>
                <label className="label">Brand</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => handleChange('brand', e.target.value)}
                  placeholder="e.g. Finolex, Havells, Asian"
                  className="input"
                />
              </div>

              {/* Model */}
              <div>
                <label className="label">Model</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  placeholder="Model number / variant"
                  className="input"
                />
              </div>

              {/* Location */}
              <div>
                <label className="label">Storage Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="e.g. Aisle 3, Rack B2"
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stock & Pricing */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Stock & Pricing</h2>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              {/* Current Stock */}
              <div>
                <label className="label">Current Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.currentStock}
                  onChange={(e) => handleChange('currentStock', e.target.value)}
                  className={`input ${errors.currentStock ? 'ring-2 ring-red-500' : ''}`}
                  disabled={isEdit}
                />
                <p className="text-xs text-slate-400 mt-1">
                  {isEdit ? 'Use stock adjustment to change' : 'Initial stock quantity'}
                </p>
                {errors.currentStock && <p className="text-xs text-red-500 mt-1">{errors.currentStock}</p>}
              </div>

              {/* Min Stock */}
              <div>
                <label className="label">Min Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={form.minStock}
                  onChange={(e) => handleChange('minStock', e.target.value)}
                  className={`input ${errors.minStock ? 'ring-2 ring-red-500' : ''}`}
                />
                <p className="text-xs text-slate-400 mt-1">Low stock alert threshold</p>
                {errors.minStock && <p className="text-xs text-red-500 mt-1">{errors.minStock}</p>}
              </div>

              {/* Max Stock */}
              <div>
                <label className="label">Max Stock Level</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxStock}
                  onChange={(e) => handleChange('maxStock', e.target.value)}
                  className={`input ${errors.maxStock ? 'ring-2 ring-red-500' : ''}`}
                />
                <p className="text-xs text-slate-400 mt-1">Overstock threshold</p>
                {errors.maxStock && <p className="text-xs text-red-500 mt-1">{errors.maxStock}</p>}
              </div>

              {/* Warranty */}
              <div>
                <label className="label">Warranty (months)</label>
                <input
                  type="number"
                  min="0"
                  value={form.warrantyMonths}
                  onChange={(e) => handleChange('warrantyMonths', e.target.value)}
                  placeholder="e.g. 12"
                  className={`input ${errors.warrantyMonths ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.warrantyMonths && <p className="text-xs text-red-500 mt-1">{errors.warrantyMonths}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Purchase Price */}
              <div>
                <label className="label">Purchase Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.purchasePrice}
                    onChange={(e) => handleChange('purchasePrice', e.target.value)}
                    placeholder="0.00"
                    className={`input pl-8 ${errors.purchasePrice ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.purchasePrice && <p className="text-xs text-red-500 mt-1">{errors.purchasePrice}</p>}
              </div>

              {/* Selling Price */}
              <div>
                <label className="label">Selling Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.sellingPrice}
                    onChange={(e) => handleChange('sellingPrice', e.target.value)}
                    placeholder="0.00"
                    className={`input pl-8 ${errors.sellingPrice ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.sellingPrice && <p className="text-xs text-red-500 mt-1">{errors.sellingPrice}</p>}
              </div>
            </div>

            {/* GST Rate */}
            <div>
              <label className="label">GST Rate</label>
              <div className="flex flex-wrap gap-2">
                {GST_RATES.map(rate => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => handleChange('gstRate', rate)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all min-h-[44px]
                      ${form.gstRate === rate
                        ? 'bg-accent-500 text-white border-accent-500 shadow-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-accent-400'}`}
                  >
                    {rate === 'RATE_0' ? '0%' : rate.replace('RATE_', '') + '%'}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="label">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => handleChange('expiryDate', e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Description</h2>
          </div>
          <div className="card-body">
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Product description, specifications, notes..."
              className="textarea min-h-[120px]"
              rows={4}
            />
          </div>
        </div>

        {/* Suppliers */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Suppliers</h2>
              <span className="badge-slate text-xs">{selectedSupplierIds.length} selected</span>
            </div>
          </div>
          <div className="card-body">
            {suppliers.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-2">No suppliers available</p>
                <Link to="/suppliers/new" className="text-sm text-accent-500 hover:text-accent-600">
                  Add suppliers first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {suppliers.map(supplier => {
                  const isSelected = selectedSupplierIds.includes(supplier.id);
                  return (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => toggleSupplier(supplier.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all min-h-[48px]
                        ${isSelected
                          ? 'bg-accent-50 border-accent-300 dark:bg-accent-900/20 dark:border-accent-600'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-accent-300 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                        ${isSelected
                          ? 'bg-accent-500 border-accent-500'
                          : 'border-slate-300 dark:border-slate-500'}`}>
                        {isSelected && <Check size={12} className="text-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {supplier.name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{supplier.phone}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Link
            to={isEdit ? `/inventory/${id}` : '/inventory'}
            className="btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary min-w-[140px]"
          >
            {saving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {isEdit ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                <Save size={18} />
                {isEdit ? 'Update Item' : 'Create Item'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
