import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Building2, Loader2, AlertTriangle, X,
  MapPin, Banknote, DollarSign, Phone, Mail, User,
  Hash, Shield, CreditCard
} from 'lucide-react';
import api from '../../utils/api';

const initialFormState = {
  name: '',
  gstNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  bankName: '',
  bankAccount: '',
  bankIfsc: '',
  paymentTerms: '',
  creditLimit: '',
};

const SupplierForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch supplier data for edit mode
  useEffect(() => {
    if (!isEdit) return;
    const fetchSupplier = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get(`/suppliers/${id}`);
        const supplier = res.data.data;
        setForm({
          name: supplier.name || '',
          gstNumber: supplier.gstNumber || '',
          contactPerson: supplier.contactPerson || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          city: supplier.city || '',
          state: supplier.state || '',
          pincode: supplier.pincode || '',
          bankName: supplier.bankName || '',
          bankAccount: supplier.bankAccount || '',
          bankIfsc: supplier.bankIfsc || '',
          paymentTerms: supplier.paymentTerms || '',
          creditLimit: supplier.creditLimit ? (supplier.creditLimit / 100).toString() : '',
        });
      } catch (err) {
        setFetchError(err.response?.data?.message || 'Failed to load supplier');
      } finally {
        setLoading(false);
      }
    };
    fetchSupplier();
  }, [id, isEdit]);

  // Form validation
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Supplier name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    if (form.gstNumber && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(form.gstNumber.toUpperCase())) {
      errs.gstNumber = 'Invalid GST number format (e.g. 22AAAAA0000A1Z5)';
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Invalid email format';
    }
    if (form.creditLimit && (isNaN(parseFloat(form.creditLimit)) || parseFloat(form.creditLimit) < 0)) {
      errs.creditLimit = 'Invalid credit limit';
    }
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
        creditLimit: form.creditLimit ? parseFloat(form.creditLimit) : null,
      };

      if (isEdit) {
        await api.put(`/suppliers/${id}`, payload);
      } else {
        await api.post('/suppliers', payload);
      }

      navigate(isEdit ? `/suppliers/${id}` : '/suppliers');
    } catch (err) {
      setSaveError(err.response?.data?.message || (isEdit ? 'Failed to update supplier' : 'Failed to create supplier'));
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

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="skeleton h-10 w-10 rounded-lg" />
          <div>
            <div className="skeleton h-8 w-48 mb-2" />
            <div className="skeleton h-4 w-32" />
          </div>
        </div>
        <div className="card p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Link to="/suppliers" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Supplier</h3>
            <p className="text-sm text-slate-500 mb-4">{fetchError}</p>
            <Link to="/suppliers" className="btn-secondary">Back to Suppliers</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={isEdit ? `/suppliers/${id}` : '/suppliers'} className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isEdit ? `Editing ${form.name || 'supplier'}` : 'Create a new supplier record'}
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Basic Information</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="label">Supplier Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. ABC Electricals"
                  className={`input ${errors.name ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* GST Number */}
              <div>
                <label className="label">GST Number</label>
                <div className="relative">
                  <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(e) => handleChange('gstNumber', e.target.value.toUpperCase())}
                    placeholder="22AAAAA0000A1Z5"
                    className={`input pl-10 font-mono ${errors.gstNumber ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.gstNumber && <p className="text-xs text-red-500 mt-1">{errors.gstNumber}</p>}
                <p className="text-xs text-slate-400 mt-1">15-character GSTIN format</p>
              </div>

              {/* Contact Person */}
              <div>
                <label className="label">Contact Person</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.contactPerson}
                    onChange={(e) => handleChange('contactPerson', e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="input pl-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="label">Phone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="+91 9876543210"
                    className={`input pl-10 ${errors.phone ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="supplier@example.com"
                    className={`input pl-10 ${errors.email ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <MapPin size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Address</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Street Address */}
              <div className="md:col-span-2">
                <label className="label">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Shop no., street, area..."
                  className="input"
                />
              </div>

              {/* City */}
              <div>
                <label className="label">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="input"
                />
              </div>

              {/* State */}
              <div>
                <label className="label">State</label>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="e.g. Maharashtra"
                  className="input"
                />
              </div>

              {/* Pincode */}
              <div>
                <label className="label">Pincode</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="400001"
                  className="input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Banknote size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Bank Details</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Bank Name */}
              <div>
                <label className="label">Bank Name</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="input"
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="label">Account Number</label>
                <div className="relative">
                  <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.bankAccount}
                    onChange={(e) => handleChange('bankAccount', e.target.value)}
                    placeholder="XXXXXXXXXX1234"
                    className="input pl-10 font-mono"
                  />
                </div>
              </div>

              {/* IFSC Code */}
              <div>
                <label className="label">IFSC Code</label>
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.bankIfsc}
                    onChange={(e) => handleChange('bankIfsc', e.target.value.toUpperCase())}
                    placeholder="SBIN0001234"
                    className="input pl-10 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Payment Terms</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Payment Terms */}
              <div>
                <label className="label">Payment Terms</label>
                <input
                  type="text"
                  value={form.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', e.target.value)}
                  placeholder="e.g. Net 30"
                  className="input"
                />
                <p className="text-xs text-slate-400 mt-1">e.g. Net 30, 50% Advance, Due on Receipt</p>
              </div>

              {/* Credit Limit */}
              <div>
                <label className="label">Credit Limit (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.creditLimit}
                    onChange={(e) => handleChange('creditLimit', e.target.value)}
                    placeholder="0.00"
                    className={`input pl-8 ${errors.creditLimit ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.creditLimit && <p className="text-xs text-red-500 mt-1">{errors.creditLimit}</p>}
                <p className="text-xs text-slate-400 mt-1">Maximum credit amount for this supplier</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Link
            to={isEdit ? `/suppliers/${id}` : '/suppliers'}
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
                {isEdit ? 'Update Supplier' : 'Create Supplier'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SupplierForm;