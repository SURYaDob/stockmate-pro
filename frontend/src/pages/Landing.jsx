import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Palette, Droplet, Wrench, ArrowRight, Warehouse } from 'lucide-react';

const categories = [
  {
    id: 'electrical',
    title: 'Electrical Supplies',
    description: 'Wires, cables, switchgear, lighting, circuit breakers, and all electrical components',
    icon: Zap,
    gradient: 'from-amber-500/20 via-amber-400/10 to-transparent',
    hoverStyle: 'group-hover:border-amber-400 group-hover:shadow-amber-500/20',
    iconHover: 'group-hover:bg-amber-100 group-hover:text-amber-600 dark:group-hover:bg-amber-900/30 dark:group-hover:text-amber-400',
    stats: '2,500+ products',
  },
  {
    id: 'painting',
    title: 'Paint & Coating',
    description: 'Emulsions, enamels, primers, thinners, brushes, rollers, and painting accessories',
    icon: Palette,
    gradient: 'from-rose-500/20 via-rose-400/10 to-transparent',
    hoverStyle: 'group-hover:border-rose-400 group-hover:shadow-rose-500/20',
    iconHover: 'group-hover:bg-rose-100 group-hover:text-rose-600 dark:group-hover:bg-rose-900/30 dark:group-hover:text-rose-400',
    stats: '1,800+ products',
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Sanitary',
    description: 'Pipes, fittings, valves, sanitaryware, bathroom fittings, and plumbing tools',
    icon: Droplet,
    gradient: 'from-cyan-500/20 via-cyan-400/10 to-transparent',
    hoverStyle: 'group-hover:border-cyan-400 group-hover:shadow-cyan-500/20',
    iconHover: 'group-hover:bg-cyan-100 group-hover:text-cyan-600 dark:group-hover:bg-cyan-900/30 dark:group-hover:text-cyan-400',
    stats: '3,200+ products',
  },
  {
    id: 'hardware',
    title: 'Hardware & Tools',
    description: 'Steel sections, fasteners, power tools, hand tools, safety equipment, and construction materials',
    icon: Wrench,
    gradient: 'from-slate-500/20 via-slate-400/10 to-transparent',
    hoverStyle: 'group-hover:border-accent-400 group-hover:shadow-accent-500/20',
    iconHover: 'group-hover:bg-accent-100 group-hover:text-accent-600 dark:group-hover:bg-accent-900/30 dark:group-hover:text-accent-400',
    stats: '4,000+ products',
  },
];

const CategoryTile = ({ category, index, onSelect }) => {
  const Icon = category.icon;

  return (
    <button
      onClick={() => onSelect(category.id)}
      className={`
        group relative overflow-hidden rounded-2xl border-2 border-slate-200 dark:border-slate-700
        bg-white dark:bg-slate-800 p-8 text-left
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:-translate-y-1
        ${category.hoverStyle}
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500
        animate-slide-up
      `}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${category.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      {/* Decorative pattern dots */}
      <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] dark:opacity-[0.05]">
        <svg width="100%" height="100%" viewBox="0 0 100 100">
          <pattern id={`dots-${category.id}`} x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          </pattern>
          <rect width="100" height="100" fill={`url(#dots-${category.id})`} />
        </svg>
      </div>

      <div className="relative z-10">
        {/* Icon */}
        <div className={`
          inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6
          bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300
          group-hover:scale-110 group-hover:rotate-3 transition-all duration-300
          ${category.iconHover}
        `}>
          <Icon size={32} strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          {category.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
          {category.description}
        </p>

        {/* Stats & CTA */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {category.stats}
          </span>
          <span className={`
            inline-flex items-center gap-1.5 text-sm font-semibold
            text-slate-400 group-hover:text-accent-500 transition-colors
          `}>
            Select
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  );
};

const Landing = () => {
  const navigate = useNavigate();
  const { setCategory, logout } = useAuthStore();

  const handleCategorySelect = (categoryId) => {
    setCategory(categoryId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-primary-900 dark:via-slate-900 dark:to-primary-900">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, currentColor 1px, transparent 0)`,
            backgroundSize: '50px 50px',
          }} />
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-slate-400/10 blur-3xl" />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
          {/* Logout button */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 lg:top-8 lg:right-8">
            <button
              onClick={() => { logout(); navigate('/auth'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              Sign Out
            </button>
          </div>
          {/* Brand */}
          <div className="text-center mb-12 lg:mb-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-500/10 mb-6">
              <Warehouse size={32} className="text-accent-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
              StockMate{' '}
              <span className="text-accent-500">Pro</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Complete inventory management for hardware, construction, and maintenance businesses.
              Manage stock, sales, purchases, and billing — all in one place.
            </p>
          </div>

          {/* Category Selection */}
          <div className="mb-8">
            <div className="text-center mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">
                Select Your Business Category
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Choose your primary business type to set up your dashboard
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {categories.map((cat, index) => (
                <CategoryTile
                  key={cat.id}
                  category={cat}
                  index={index}
                  onSelect={handleCategorySelect}
                />
              ))}
            </div>
          </div>

          {/* CTA Button */}
          <div className="text-center mt-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-accent-500 text-white font-semibold text-base shadow-lg shadow-accent-500/20 hover:shadow-xl hover:shadow-accent-500/30 hover:bg-accent-600 transition-all duration-200 active:scale-[0.97]"
            >
              <Warehouse size={20} />
              Go to Dashboard
              <ArrowRight size={20} />
            </button>
          </div>

          {/* Feature Pills */}
          <div className="text-center mt-10">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {['GST Billing', 'Low Stock Alerts', 'Multi-branch', 'Excel Import', 'Offline Mode', 'Desktop App'].map((feature) => (
                <span
                  key={feature}
                  className="px-4 py-2 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} StockMate Pro. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Privacy Policy</a>
              <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Terms of Service</a>
              <a href="#" className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
