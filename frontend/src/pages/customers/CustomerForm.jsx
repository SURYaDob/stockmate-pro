import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, UserCircle, Loader2, AlertTriangle, X,
  MapPin, Phone, Mail, Hash, Wallet
} from 'lucide-react';
import api from '../../utils/api';

const initialFormState = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gstNumber: '',
  creditLimit: '',
};

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(initialFormState);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [errors, setErrors] = useState({});

  // Fetch customer data for edit mode
  useEffect(() => {
    if (!isEdit) return;
    const fetchCustomer = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const res = await api.get(`/customers/${id}`);
        const customer = res.data.data;
        setForm({
          name: customer.name || '',
          phone: customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          city: customer.city || '',
          state: customer.state || '',
          pincode: customer.pincode || '',
          gstNumber: customer.gstNumber || '',
          creditLimit: customer.creditLimit ? (customer.creditLimit / 100).toString() : '',
        });
      } catch (err) {
        setFetchError(err.response?.data?.message || 'Failed to load customer');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id, isEdit]);

  // Form validation
  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Customer name is required';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^(\+91[-]?)?[6-9]\d{9}$/.test(form.phone)) {
      errs.phone = 'Invalid Indian phone number';
    }
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
        await api.put(`/customers/${id}`, payload);
      } else {
        await api.post('/customers', payload);
      }

      navigate(isEdit ? `/customers/${id}` : '/customers');
    } catch (err) {
      setSaveError(err.response?.data?.message || (isEdit ? 'Failed to update customer' : 'Failed to create customer'));
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
          <Link to="/customers" className="btn-ghost p-2">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
        </div>
        <div className="card border-red-200 dark:border-red-800">
          <div className="p-12 text-center">
            <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Failed to Load Customer</h3>
            <p className="text-sm text-slate-500 mb-4">{fetchError}</p>
            <Link to="/customers" className="btn-secondary">Back to Customers</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={isEdit ? `/customers/${id}` : '/customers'} className="btn-ghost p-2">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Edit Customer' : 'Add New Customer'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isEdit ? `Editing ${form.name || 'customer'}` : 'Create a new customer record'}
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
              <UserCircle size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Basic Information</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="label">Customer Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className={`input ${errors.name ? 'ring-2 ring-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

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

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="customer@example.com"
                    className={`input pl-10 ${errors.email ? 'ring-2 ring-red-500' : ''}`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

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
              <div className="md:col-span-2">
                <label className="label">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="House no., street, area..."
                  className="input"
                />
              </div>
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

        {/* Credit */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-slate-500" />
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Credit Settings</h2>
            </div>
          </div>
          <div className="card-body space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <p className="text-xs text-slate-400 mt-1">Maximum credit amount for this customer</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Link
            to={isEdit ? `/customers/${id}` : '/customers'}
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
                {isEdit ? 'Update Customer' : 'Create Customer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomerForm;
