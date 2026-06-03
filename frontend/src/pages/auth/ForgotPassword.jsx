import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Password reset link sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="card p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-500/10 mb-4">
            <Mail size={28} className="text-accent-500" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('auth.forgotPassword')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {sent
              ? 'Check your email for the reset link'
              : 'Enter your email and we&apos;ll send you a reset link'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-11"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? <><Loader2 size={18} className="animate-spin" /> Sending...</> : <><Send size={18} /> Send Reset Link</>}
            </button>
          </form>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Send size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              Reset link sent to <strong>{email}</strong>
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              Didn&apos;t receive it? Check your spam folder or{' '}
              <button onClick={() => setSent(false)} className="underline font-medium">try again</button>
            </p>
          </div>
        )}

        <div className="text-center mt-6">
          <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
