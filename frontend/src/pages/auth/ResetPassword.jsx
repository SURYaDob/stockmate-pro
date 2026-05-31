import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const ResetPassword = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!token) {
      toast.error('Invalid or expired reset token');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password: formData.password });
      setSuccess(true);
      toast.success('Password reset successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-md animate-fade-in">
        <div className="card p-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/20 mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Invalid Link</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary">Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/10 mb-4">
            <Lock size={28} className="text-accent-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('auth.resetPassword')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enter your new password</p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-green-600 dark:text-green-400 font-medium">Password reset successfully!</p>
            <p className="text-xs text-slate-400 mt-2">Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className="input pl-11 pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))}
                className="input"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Resetting...</> : <><Lock size={18} /> Reset Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
