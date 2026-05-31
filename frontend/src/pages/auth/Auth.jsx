import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  Warehouse, Mail, Lock, Eye, EyeOff, Loader2,
  UserPlus, ShieldCheck, Phone, User, ArrowRight,
  CheckCircle2, Zap, Palette, Droplet, Wrench
} from 'lucide-react';
import toast from 'react-hot-toast';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'register' ? 'register' : 'login';
  const { login, register, sendOtp, verifyOtp, isAuthenticated, loading } = useAuthStore();

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginForm, setLoginForm] = useState({ email: '', password: '', otp: '' });
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [loginErrors, setLoginErrors] = useState({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Register form
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', email: '', phone: '+91', password: '', confirmPassword: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // OTP timer
  useEffect(() => {
    if (otpTimer > 0) {
      const interval = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer]);

  // Switch tab resets OTP mode
  const switchTab = (tab) => {
    setActiveTab(tab);
    setIsOtpMode(false);
    setOtpSent(false);
    setLoginErrors({});
    setRegErrors({});
  };

  // ─── Login Validation ─────────────────────────────────
  const validateLogin = () => {
    const errs = {};
    if (!loginForm.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) errs.email = 'Invalid email address';
    if (!isOtpMode && !loginForm.password) errs.password = 'Password is required';
    else if (!isOtpMode && loginForm.password.length < 6) errs.password = 'Minimum 6 characters';
    if (isOtpMode && !loginForm.otp) errs.otp = 'OTP is required';
    else if (isOtpMode && loginForm.otp.length !== 6) errs.otp = 'OTP must be 6 digits';
    setLoginErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Register Validation ──────────────────────────────
  const validateRegister = () => {
    const errs = {};
    if (!regForm.firstName.trim()) errs.firstName = 'First name is required';
    if (!regForm.lastName.trim()) errs.lastName = 'Last name is required';
    if (!regForm.email) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regForm.email)) errs.email = 'Invalid email';
    if (!regForm.phone || regForm.phone === '+91') errs.phone = 'Phone is required';
    else if (regForm.phone.length !== 13) errs.phone = 'Enter 10 digits after +91';
    if (!regForm.password) errs.password = 'Password is required';
    else if (regForm.password.length < 6) errs.password = 'Minimum 6 characters';
    if (regForm.password !== regForm.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ─── Handlers ─────────────────────────────────────────
  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
    if (loginErrors[name]) setLoginErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleRegChange = (e) => {
    const { name, value } = e.target;
    setRegForm((prev) => ({ ...prev, [name]: value }));
    if (regErrors[name]) setRegErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSendOtp = async () => {
    if (!loginForm.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email)) {
      setLoginErrors({ email: 'Enter a valid email first' });
      return;
    }
    try {
      await sendOtp(loginForm.email);
      setOtpSent(true);
      setOtpTimer(60);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setLoginSubmitting(true);
    try {
      let result;
      if (isOtpMode) {
        result = await verifyOtp(loginForm.email, loginForm.otp);
      } else {
        result = await login(loginForm.email, loginForm.password);
      }
      if (result.success) {
        toast.success('Welcome to StockMate Pro!');
        navigate('/', { replace: true });
      } else {
        toast.error(result.message || 'Login failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoginSubmitting(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateRegister()) return;
    setRegSubmitting(true);
    try {
      const result = await register({
        firstName: regForm.firstName,
        lastName: regForm.lastName,
        email: regForm.email,
        phone: regForm.phone,
        password: regForm.password,
      });
      if (result.success) {
        toast.success('Account created! Welcome to StockMate Pro.');
        navigate('/', { replace: true });
      } else {
        toast.error(result.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong');
    } finally {
      setRegSubmitting(false);
    }
  };

  const fillDemo = (email, password) => {
    setLoginForm({ email, password, otp: '' });
    setLoginErrors({});
    setActiveTab('login');
    setIsOtpMode(false);
  };

  return (
    <div className="w-full max-w-md animate-fade-in">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-accent-600 to-accent-700 px-8 py-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 mb-4 backdrop-blur-sm">
            <Warehouse size={32} className="text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">StockMate Pro</h1>
          <p className="text-sm text-accent-200 mt-1">
            Inventory & Sales Management
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => switchTab('login')}
            className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
              activeTab === 'login'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Lock size={16} className="inline mr-1.5" />
            Sign In
            {activeTab === 'login' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => switchTab('register')}
            className={`flex-1 py-4 text-sm font-semibold transition-all relative ${
              activeTab === 'register'
                ? 'text-accent-600 dark:text-accent-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus size={16} className="inline mr-1.5" />
            Create Account
            {activeTab === 'register' && (
              <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-accent-500 rounded-full" />
            )}
          </button>
        </div>

        <div className="p-6 sm:p-8">
          {/* ─────────────── SIGN IN TAB ─────────────── */}
          {activeTab === 'login' && (
            <>
              {/* Auth Mode Toggle */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setIsOtpMode(false); setLoginErrors({}); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                    !isOtpMode
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <Lock size={16} className="inline mr-1.5" />
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => { setIsOtpMode(true); setLoginErrors({}); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[40px] ${
                    isOtpMode
                      ? 'bg-accent-500 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <ShieldCheck size={16} className="inline mr-1.5" />
                  OTP Login
                </button>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email */}
                <div>
                  <label htmlFor="login-email" className="label">Email Address</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      className={`input pl-11 ${loginErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={loginSubmitting}
                    />
                  </div>
                  {loginErrors.email && <p className="mt-1.5 text-xs text-red-500">{loginErrors.email}</p>}
                </div>

                {/* Password (non-OTP) */}
                {!isOtpMode && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="login-password" className="label mb-0">Password</label>
                      <Link to="/forgot-password" className="text-xs font-medium text-accent-500 hover:text-accent-600 transition-colors">
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        className={`input pl-11 pr-11 ${loginErrors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loginSubmitting}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="mt-1.5 text-xs text-red-500">{loginErrors.password}</p>}
                  </div>
                )}

                {/* OTP */}
                {isOtpMode && (
                  <div>
                    <label htmlFor="login-otp" className="label">One-Time Password</label>
                    <div className="relative">
                      <ShieldCheck size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={1.5} />
                      <input
                        id="login-otp"
                        name="otp"
                        type="text"
                        value={loginForm.otp}
                        onChange={handleLoginChange}
                        maxLength={6}
                        className={`input pl-11 text-center text-lg tracking-[0.5em] font-mono ${loginErrors.otp ? 'border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="••••••"
                        autoComplete="one-time-code"
                        disabled={loginSubmitting || !otpSent}
                      />
                    </div>
                    {loginErrors.otp && <p className="mt-1.5 text-xs text-red-500">{loginErrors.otp}</p>}
                    <div className="mt-3">
                      {!otpSent ? (
                        <button type="button" onClick={handleSendOtp}
                          className="btn btn-sm bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20 w-full"
                          disabled={loading}
                        >
                          {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                          Send OTP
                        </button>
                      ) : (
                        <button type="button" onClick={handleSendOtp}
                          className="btn btn-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 w-full"
                          disabled={otpTimer > 0}
                        >
                          {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loginSubmitting}>
                  {loginSubmitting ? (
                    <><Loader2 size={18} className="animate-spin" /> Signing in...</>
                  ) : (
                    <><Lock size={18} /> {isOtpMode ? 'Verify OTP & Sign In' : 'Sign In'}</>
                  )}
                </button>
              </form>

              {/* Demo Credentials */}
              <div className="mt-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">
                  Demo Credentials
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Admin', email: 'admin@stockmate.com', pass: 'Admin@123', role: 'admin' },
                    { label: 'Manager', email: 'manager@stockmate.com', pass: 'Manager@123', role: 'manager' },
                    { label: 'Staff', email: 'staff@stockmate.com', pass: 'Staff@123', role: 'staff' },
                  ].map((demo) => (
                    <button
                      key={demo.role}
                      type="button"
                      onClick={() => fillDemo(demo.email, demo.pass)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{demo.label}</span>
                        <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5">{demo.email}</p>
                      </div>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-accent-500" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ─────────────── REGISTER TAB ─────────────── */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">First Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      name="firstName" value={regForm.firstName} onChange={handleRegChange}
                      className={`input pl-9 ${regErrors.firstName ? 'border-red-500' : ''}`}
                      placeholder="John"
                    />
                  </div>
                  {regErrors.firstName && <p className="mt-1 text-xs text-red-500">{regErrors.firstName}</p>}
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    name="lastName" value={regForm.lastName} onChange={handleRegChange}
                    className={`input ${regErrors.lastName ? 'border-red-500' : ''}`}
                    placeholder="Doe"
                  />
                  {regErrors.lastName && <p className="mt-1 text-xs text-red-500">{regErrors.lastName}</p>}
                </div>
              </div>

              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="email" type="email" value={regForm.email} onChange={handleRegChange}
                    className={`input pl-11 ${regErrors.email ? 'border-red-500' : ''}`}
                    placeholder="you@example.com"
                  />
                </div>
                {regErrors.email && <p className="mt-1 text-xs text-red-500">{regErrors.email}</p>}
              </div>

              <div>
                <label className="label">Phone Number</label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                  <div className="absolute left-[2.6rem] top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 dark:text-slate-400 pointer-events-none select-none border-r border-slate-300 dark:border-slate-600 pr-2.5">
                    +91
                  </div>
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    value={regForm.phone.replace('+91', '')}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setRegForm((prev) => ({ ...prev, phone: '+91' + digits }));
                      if (regErrors.phone) setRegErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    className={`input pl-[5.2rem] ${regErrors.phone ? 'border-red-500' : ''}`}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
                {regErrors.phone && <p className="mt-1 text-xs text-red-500">{regErrors.phone}</p>}
                {!regErrors.phone && regForm.phone && regForm.phone.length === 13 && (
                  <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {regForm.phone}
                  </p>
                )}
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="password" type={showRegPassword ? 'text' : 'password'}
                    value={regForm.password} onChange={handleRegChange}
                    className={`input pl-11 pr-11 ${regErrors.password ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {regErrors.password && <p className="mt-1 text-xs text-red-500">{regErrors.password}</p>}
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="confirmPassword" type="password"
                    value={regForm.confirmPassword} onChange={handleRegChange}
                    className={`input pl-11 ${regErrors.confirmPassword ? 'border-red-500' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {regErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{regErrors.confirmPassword}</p>}
              </div>

              <button type="submit" className="btn-primary w-full mt-2" disabled={regSubmitting}>
                {regSubmitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Creating account...</>
                ) : (
                  <><UserPlus size={18} /> Create Account</>
                )}
              </button>

              <p className="text-center text-xs text-slate-400 mt-4">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-accent-500 hover:underline">Terms</a> and{' '}
                <a href="#" className="text-accent-500 hover:underline">Privacy Policy</a>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Category badges */}
      <div className="text-center mt-6">
        <p className="text-xs text-slate-400 mb-3">Manage all your business categories</p>
        <div className="flex items-center justify-center gap-3">
          {[
            { icon: Zap, label: 'Electrical', color: 'text-amber-500' },
            { icon: Palette, label: 'Paint', color: 'text-rose-500' },
            { icon: Droplet, label: 'Plumbing', color: 'text-cyan-500' },
            { icon: Wrench, label: 'Hardware', color: 'text-accent-500' },
          ].map((cat) => (
            <div key={cat.label} className="flex items-center gap-1.5 text-xs text-slate-400">
              <cat.icon size={14} className={cat.color} />
              {cat.label}
            </div>
          ))}
        </div>
      </div>

      {/* Back to Landing */}
      <div className="text-center mt-4">
        <Link to="/" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          ← Back to home
        </Link>
      </div>
    </div>
  );
};

export default Auth;
