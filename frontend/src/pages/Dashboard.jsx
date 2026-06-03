import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, Package, ShoppingCart, AlertTriangle, TrendingUp, DollarSign,
  Users, Truck, RefreshCw, Wallet, BadgeCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '₹0';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const StatCard = ({ icon: Icon, label, value, sub, color, loading: isLoading }) => (
  <div className="card p-5 animate-fade-in">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
    </div>
    {isLoading ? (
      <div className="space-y-2">
        <div className="skeleton h-3 w-20" />
        <div className="skeleton h-7 w-28" />
      </div>
    ) : (
      <>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </>
    )}
  </div>
);

const Dashboard = () => {
  const { t } = useTranslation();

  const [summary, setSummary] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [categoryStock, setCategoryStock] = useState([]);
  const [topSelling, setTopSelling] = useState([]);
  const [profitTrend, setProfitTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, monthlyRes, catRes, topRes, profitRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/monthly-sales'),
        api.get('/dashboard/category-stock'),
        api.get('/dashboard/top-selling'),
        api.get('/dashboard/profit-trend'),
      ]);
      setSummary(sumRes.data.data);
      setMonthlySales(monthlyRes.data.data || []);
      setCategoryStock(catRes.data.data || []);
      setTopSelling(topRes.data.data || []);
      setProfitTrend(profitRes.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Custom tooltip
  const ChartTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3">
          <p className="text-xs text-slate-500 mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {entry.name === 'Amount' || entry.name === 'Revenue' || entry.name === 'Profit' || entry.name === 'Cost'
                ? formatPrice(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const isLoading = loading && !summary;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t('dashboard.title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Overview of your business performance</p>
        </div>
        <button onClick={fetchData} className="btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={fetchData} className="ml-auto btn-ghost text-sm font-medium text-red-500">Retry</button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Inventory Value" value={formatPrice(summary?.totalInventoryValue)} sub={`${summary?.totalItems || 0} items`} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" loading={isLoading} />
        <StatCard icon={ShoppingCart} label="Today's Sales" value={formatPrice(summary?.todaySalesAmount)} sub={`${summary?.todaySalesCount || 0} invoices • ${formatPrice(summary?.todaySalesPaid)} collected`} color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" loading={isLoading} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={summary?.lowStockCount || 0} sub="Items below threshold" color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" loading={isLoading} />
        <StatCard icon={Wallet} label="Pending Receivables" value={formatPrice(summary?.pendingReceivables)} sub="From credit sales" color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" loading={isLoading} />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-3 flex items-center gap-3">
          <Users size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Customers</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{isLoading ? <span className="skeleton h-5 w-12 inline-block" /> : summary?.totalCustomers || 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <Truck size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Suppliers</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{isLoading ? <span className="skeleton h-5 w-12 inline-block" /> : summary?.totalSuppliers || 0}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <BadgeCheck size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Payables</p>
            <p className="text-lg font-bold text-amber-600">{isLoading ? <span className="skeleton h-5 w-16 inline-block" /> : formatPrice(summary?.pendingPayables)}</p>
          </div>
        </div>
        <div className="card p-3 flex items-center gap-3">
          <DollarSign size={18} className="text-slate-400" />
          <div>
            <p className="text-xs text-slate-400">Total Items</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{isLoading ? <span className="skeleton h-5 w-12 inline-block" /> : summary?.totalItems || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Monthly Sales (6 months)</h3>
            <BarChart3 size={18} className="text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-64 skeleton rounded-xl" />
          ) : monthlySales.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlySales} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" name="Amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Profit Trend Chart */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Profit Trend</h3>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-64 skeleton rounded-xl" />
          ) : profitTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">No profit data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={profitTrend} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" tickFormatter={(v) => `₹${(v / 100).toFixed(0)}`} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Stock Distribution */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Stock by Category</h3>
            <Package size={18} className="text-slate-400" />
          </div>
          {isLoading ? (
            <div className="h-64 skeleton rounded-xl" />
          ) : categoryStock.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">No inventory data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={categoryStock} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                  dataKey="value" nameKey="name" paddingAngle={2}>
                  {categoryStock.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Selling Items */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Top Selling Items (30 days)</h3>
            <TrendingUp size={18} className="text-slate-400" />
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-10 w-full rounded-lg" />)}
            </div>
          ) : topSelling.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-slate-400">No sales data yet</div>
          ) : (
            <div className="space-y-2">
              {topSelling.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                    idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300 dark:bg-slate-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{item.name}</p>
                    {item.sku && <p className="text-xs text-slate-400 font-mono">{item.sku}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{item.totalSold}</p>
                    <p className="text-xs text-slate-400">sold</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
