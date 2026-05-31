import React, { useState, useEffect } from 'react';
import { Building2, Save, Loader2, Check, AlertTriangle, Upload, X, Image } from 'lucide-react';
import api from '../../utils/api';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('po-template');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [form, setForm] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    logoUrl: '',
    footerText: 'Thank you for your business!',
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCompanyProfile();
  }, []);

  const fetchCompanyProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/settings/company');
      const data = res.data.data;
      if (data) {
        setForm({
          companyName: data.companyName || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          gstNumber: data.gstNumber || '',
          logoUrl: data.logoUrl || '',
          footerText: data.footerText || 'Thank you for your business!',
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load company profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);

    setLogoFile(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logoUrl: '' }));
  };

  const uploadLogo = async () => {
    if (!logoFile) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data.data.url;
      setForm((prev) => ({ ...prev, logoUrl: url }));
      return url;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      let logoUrl = form.logoUrl;

      // Upload logo if a new file was selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) logoUrl = uploadedUrl;
      }

      await api.put('/settings/company', {
        ...form,
        logoUrl,
      });

      setLogoFile(null);
      setSuccess('Company profile updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save company profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'po-template', label: 'PO Template', icon: Building2 },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
            <p className="text-sm text-slate-400 mt-1">Manage your account and preferences</p>
          </div>
        </div>
        <div className="card p-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-slate-300" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Settings</h1>
          <p className="text-sm text-slate-400 mt-1">Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* PO Template Settings */}
      {activeTab === 'po-template' && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Building2 size={20} className="text-accent-500" />
              Purchase Order Template
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Configure how your company information appears on printed POs and PDF attachments
            </p>
          </div>

          <form onSubmit={handleSubmit} className="card-body space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-600 dark:text-emerald-400">
                <Check size={16} />
                {success}
              </div>
            )}

            {/* Logo upload */}
            <div>
              <label className="label">Company Logo</label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/50 hover:bg-slate-900/70 text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <Image size={28} className="text-slate-300 dark:text-slate-600" />
                  )}
                </div>
                <div>
                  <label className="btn-secondary btn-sm cursor-pointer">
                    <Upload size={14} />
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Recommended: 200x200px, PNG or JPEG (max 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Company Name */}
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
                placeholder="e.g. My Business Pvt. Ltd."
                className="input"
                required
              />
            </div>

            {/* Address */}
            <div>
              <label className="label">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Street, city, state, pincode..."
                rows={3}
                className="input resize-none"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@business.com"
                  className="input"
                />
              </div>
            </div>

            {/* GST Number */}
            <div>
              <label className="label">GST Number</label>
              <input
                type="text"
                value={form.gstNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, gstNumber: e.target.value }))}
                placeholder="27AAAAA0000A1Z5"
                className="input font-mono uppercase"
                maxLength={15}
              />
              <p className="text-xs text-slate-400 mt-1">
                Displayed on printed POs and PDF attachments
              </p>
            </div>

            {/* Footer Text */}
            <div>
              <label className="label">Footer Text</label>
              <input
                type="text"
                value={form.footerText}
                onChange={(e) => setForm((prev) => ({ ...prev, footerText: e.target.value }))}
                placeholder="Thank you for your business!"
                className="input"
              />
              <p className="text-xs text-slate-400 mt-1">
                Shown at the bottom of printed POs and PDF attachments
              </p>
            </div>

            {/* Preview hint */}
            <div className="p-4 rounded-lg bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-accent-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-accent-700 dark:text-accent-300">Print Preview</p>
                  <p className="text-xs text-accent-500 mt-1">
                    This information will appear on the Print PO layout and PDF attachments.
                    Changes take effect immediately for new print jobs.
                  </p>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="submit"
                disabled={saving || uploading}
                className="btn-primary"
              >
                {saving || uploading ? (
                  <><Loader2 size={18} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={18} /> Save Changes</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
