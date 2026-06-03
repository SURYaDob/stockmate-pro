import React, { useState, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Package, ShoppingCart, Truck,
  AlertTriangle, DollarSign, Loader2, Filter,
  ChevronLeft, ChevronRight, Wallet,
  IndianRupee, Clock, Shield, RefreshCw
} from 'lucide-react';
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import api from '../../utils/api';

const formatPrice = (paise) => {
  if (paise == null) return '₹0';
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];

const reportTypes = [
  { id: 'sales', label: 'Sales Report', icon: ShoppingCart, color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
  { id: 'purchases', label: 'Purchase Report', icon: Truck, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'profit-loss', label: 'Profit & Loss', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'inventory-valuation', label: 'Inventory Valuation', icon: Package, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  { id: 'gst', label: 'GST Report', icon: IndianRupee, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
  { id: 'low-stock', label: 'Low Stock Items', icon: AlertTriangle, color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
  { id: 'dead-stock', label: 'Dead Stock', icon: Clock, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: 'audit-log', label: 'Audit Log', icon: Shield, color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300' },
];

const Reports = () => {
  const [activeReport, setActiveReport] = useState('sales');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination for audit log
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (activeReport === 'audit-log') {
        params.set('page', page);
        params.set('limit', 50);
      }

      const res = await api.get(`/reports/${activeReport}?${params.toString()}`);
      setData(res.data.data);
      if (res.data.pagination) {
        setTotalPages(res.data.pagination.totalPages || 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, startDate, endDate, page]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">Generate business reports and analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary btn-sm ${startDate || endDate ? 'ring-2 ring-accent-500' : ''}`}
          >
            <Filter size={16} /> {startDate || endDate ? 'Filtered' : 'Filters'}
          </button>
          <button onClick={() => { setPage(1); fetchReport(); }} className="btn-secondary btn-sm" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Date Filters */}
      {showFilters && (
        <div className="card">
          <div className="p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="label">From</label>
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="input min-w-[160px]" />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="input min-w-[160px]" />
              </div>
              {(startDate || endDate) && (
                <button onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }} className="btn-ghost text-sm text-slate-500">
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report type selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          return (
            <button
              key={rt.id}
              onClick={() => { setActiveReport(rt.id); setPage(1); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition-all
                ${activeReport === rt.id
                  ? 'ring-2 ring-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
            >
              <div className={`p-1.5 rounded-lg ${rt.color}`}>
                <Icon size={16} />
              </div>
              <span className="text-center leading-tight">{rt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button onClick={fetchReport} className="ml-auto btn-ghost text-sm font-medium text-red-500">Retry</button>
        </div>
      )}

      {/* Report Content */}
      <div className="min-h-[300px]">
        {loading ? (
          <div className="card p-8 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin text-accent-500" />
          </div>
        ) : activeReport === 'sales' ? (
          <SalesReport data={data} formatPrice={formatPrice} formatDate={formatDate} />
        ) : activeReport === 'purchases' ? (
          <PurchaseReport data={data} formatPrice={formatPrice} formatDate={formatDate} />
        ) : activeReport === 'profit-loss' ? (
          <ProfitLossReport data={data} formatPrice={formatPrice} />
        ) : activeReport === 'inventory-valuation' ? (
          <InventoryValuationReport data={data} formatPrice={formatPrice} />
        ) : activeReport === 'gst' ? (
          <GstReport data={data} formatPrice={formatPrice} formatDate={formatDate} />
        ) : activeReport === 'low-stock' ? (
          <LowStockReport data={data} formatPrice={formatPrice} />
        ) : activeReport === 'dead-stock' ? (
          <DeadStockReport data={data} formatPrice={formatPrice} />
        ) : activeReport === 'audit-log' ? (
          <AuditLogReport data={data} formatDate={formatDate} page={page} setPage={setPage} totalPages={totalPages} />
        ) : null}
      </div>
    </div>
  );
};

/* ── Individual Report Components ── */

const SummaryCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-4">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  </div>
);

const SalesReport = ({ data, formatPrice, formatDate }) => {
  if (!data) return <EmptyReport message="Select date range and click Refresh to load sales report" />;
  const { sales = [], summary = {} } = data;

  const paymentData = [
    { name: 'Cash', value: summary.paymentBreakdown?.cash || 0 },
    { name: 'UPI', value: summary.paymentBreakdown?.upi || 0 },
    { name: 'Card', value: summary.paymentBreakdown?.card || 0 },
    { name: 'Credit', value: summary.paymentBreakdown?.credit || 0 },
  ].filter(i => i.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={ShoppingCart} label="Total Sales" value={summary.totalSales || 0} color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30" />
        <SummaryCard icon={DollarSign} label="Revenue" value={formatPrice(summary.totalRevenue)} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30" />
        <SummaryCard icon={TrendingUp} label="Avg. Order" value={formatPrice(summary.averageOrderValue)} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30" />
        <SummaryCard icon={IndianRupee} label="Total GST" value={formatPrice(summary.totalGst)} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30" />
      </div>

      {/* Payment Pie */}
      {paymentData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Payment Method Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={paymentData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" nameKey="name" paddingAngle={2}>
                {paymentData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Sales Table */}
      <div className="card overflow-hidden">
        <div className="card-header"><h3 className="text-base font-semibold">Sales List ({sales.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="table-header">Invoice</th>
                <th className="table-header">Date</th>
                <th className="table-header">Customer</th>
                <th className="table-header">Items</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header">Payment</th>
                <th className="table-header">By</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 50).map((s) => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="table-cell font-mono text-sm font-medium">{s.invoiceNo}</td>
                  <td className="table-cell text-sm text-slate-600">{formatDate(s.createdAt)}</td>
                  <td className="table-cell text-sm">{s.customer?.name || 'Walk-in'}</td>
                  <td className="table-cell text-sm">{s.items?.length || 0}</td>
                  <td className="table-cell text-right font-mono font-semibold">{formatPrice(s.grandTotal)}</td>
                  <td className="table-cell">
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      s.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                      s.paymentStatus === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>{s.paymentStatus}</span>
                  </td>
                  <td className="table-cell text-xs text-slate-500">{s.user ? `${s.user.firstName} ${s.user.lastName}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const PurchaseReport = ({ data, formatPrice, formatDate }) => {
  if (!data) return <EmptyReport message="Select date range and click Refresh to load purchase report" />;
  const { purchases = [], summary = {} } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Truck} label="Total Orders" value={summary.totalOrders || 0} color="bg-blue-100 text-blue-600" />
        <SummaryCard icon={DollarSign} label="Total Amount" value={formatPrice(summary.totalAmount)} color="bg-emerald-100 text-emerald-600" />
        <SummaryCard icon={Wallet} label="Paid" value={formatPrice(summary.totalPaid)} color="bg-violet-100 text-violet-600" />
        <SummaryCard icon={AlertTriangle} label="Pending" value={formatPrice(summary.totalPending)} color="bg-amber-100 text-amber-600" />
      </div>
      <div className="card overflow-hidden">
        <div className="card-header"><h3 className="text-base font-semibold">Purchase Orders ({purchases.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="table-header">PO#</th>
                <th className="table-header">Date</th>
                <th className="table-header">Supplier</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header text-right">Paid</th>
                <th className="table-header text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {purchases.slice(0, 50).map((p) => (
                <tr key={p.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="table-cell font-mono text-sm font-medium">{p.poNumber}</td>
                  <td className="table-cell text-sm text-slate-600">{formatDate(p.createdAt)}</td>
                  <td className="table-cell text-sm">{p.supplier?.name || '—'}</td>
                  <td className="table-cell text-right font-mono font-semibold">{formatPrice(p.grandTotal)}</td>
                  <td className="table-cell text-right font-mono text-emerald-600">{formatPrice(p.paidAmount)}</td>
                  <td className="table-cell text-right font-mono text-amber-600">{formatPrice(p.balanceAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ProfitLossReport = ({ data, formatPrice }) => {
  if (!data) return <EmptyReport message="Select date range and click Refresh to load P&L report" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={ShoppingCart} label="Revenue" value={formatPrice(data.revenue)} color="bg-emerald-100 text-emerald-600" />
        <SummaryCard icon={Package} label="COGS" value={formatPrice(data.cogs)} color="bg-orange-100 text-orange-600" />
        <SummaryCard icon={TrendingUp} label={`Gross Profit (${data.grossMargin}%)`} value={formatPrice(data.grossProfit)} color="bg-indigo-100 text-indigo-600" />
        <SummaryCard icon={DollarSign} label={`Net Profit (${data.netMargin}%)`} value={formatPrice(data.netProfit)} color="bg-blue-100 text-blue-600" />
      </div>
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">Detailed Breakdown</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Revenue (Sales)</span>
            <span className="font-mono font-semibold text-emerald-600">{formatPrice(data.revenue)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Cost of Goods Sold (COGS)</span>
            <span className="font-mono font-semibold text-orange-500">- {formatPrice(data.cogs)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gross Profit</span>
            <span className="font-mono font-bold text-indigo-600">{formatPrice(data.grossProfit)} <span className="text-xs font-normal text-slate-400">({data.grossMargin}%)</span></span>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
              <span className="text-sm text-slate-600 dark:text-slate-400">Operating Expenses</span>
              <span className="font-mono font-semibold text-red-500">- {formatPrice(data.totalExpenses)}</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">Net Profit / Loss</span>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300">{formatPrice(data.netProfit)}</span>
              <p className="text-xs text-emerald-500">Margin: {data.netMargin}%</p>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">Total Sales</span>
            <span className="font-mono font-semibold">{data.totalSales}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50">
            <span className="text-sm text-slate-600 dark:text-slate-400">GST Collected</span>
            <span className="font-mono font-semibold text-amber-600">{formatPrice(data.gstCollected)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InventoryValuationReport = ({ data, formatPrice }) => {
  if (!data) return <EmptyReport message="Click Refresh to load inventory valuation" />;
  const { items = [], summary = {} } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Package} label="Total Items" value={summary.totalItems || 0} color="bg-blue-100 text-blue-600" />
        <SummaryCard icon={DollarSign} label="Total Cost" value={formatPrice(summary.totalCost)} color="bg-amber-100 text-amber-600" />
        <SummaryCard icon={TrendingUp} label="Total Value (MRP)" value={formatPrice(summary.totalValue)} color="bg-emerald-100 text-emerald-600" />
        <SummaryCard icon={Wallet} label="Potential Profit" value={formatPrice(summary.totalProfit)} color="bg-violet-100 text-violet-600" />
      </div>

      <div className="card overflow-hidden">
        <div className="card-header"><h3 className="text-base font-semibold">Inventory Items ({items.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="table-header">Item</th>
                <th className="table-header">SKU</th>
                <th className="table-header">Category</th>
                <th className="table-header text-right">Stock</th>
                <th className="table-header text-right">Cost Price</th>
                <th className="table-header text-right">Selling Price</th>
                <th className="table-header text-right">Total Cost</th>
                <th className="table-header text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 100).map((item) => (
                <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="table-cell font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                  <td className="table-cell font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                  <td className="table-cell text-sm text-slate-600">{item.category}</td>
                  <td className="table-cell text-right font-mono">{item.currentStock}</td>
                  <td className="table-cell text-right font-mono">{formatPrice(item.purchasePrice)}</td>
                  <td className="table-cell text-right font-mono">{formatPrice(item.sellingPrice)}</td>
                  <td className="table-cell text-right font-mono text-slate-500">{formatPrice(item.totalCost)}</td>
                  <td className="table-cell text-right font-mono font-semibold">{formatPrice(item.totalValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const GstReport = ({ data, formatPrice, formatDate }) => {
  if (!data) return <EmptyReport message="Select date range and click Refresh to load GST report" />;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">GST Summary</h3>
        {data.gstSummary && Object.keys(data.gstSummary).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="table-header">GST Rate</th>
                  <th className="table-header text-right">Taxable Value</th>
                  <th className="table-header text-right">CGST</th>
                  <th className="table-header text-right">SGST</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.gstSummary).map(([rate, values]) => (
                  <tr key={rate} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="table-cell font-semibold">{rate}%</td>
                    <td className="table-cell text-right font-mono">{formatPrice(values.taxableValue)}</td>
                    <td className="table-cell text-right font-mono">{formatPrice(values.cgst)}</td>
                    <td className="table-cell text-right font-mono">{formatPrice(values.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">No GST data available</p>
        )}
      </div>

      {data.b2bInvoices?.length > 0 && (
        <div className="card overflow-hidden">
          <div className="card-header"><h3 className="text-base font-semibold">B2B Invoices ({data.b2bInvoices.length})</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <th className="table-header">Invoice</th>
                  <th className="table-header">Date</th>
                  <th className="table-header">Customer</th>
                  <th className="table-header">GSTIN</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {data.b2bInvoices.map((inv, idx) => (
                  <tr key={idx} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="table-cell font-mono text-sm">{inv.invoiceNo}</td>
                    <td className="table-cell text-sm text-slate-600">{formatDate(inv.date)}</td>
                    <td className="table-cell text-sm">{inv.customerName}</td>
                    <td className="table-cell font-mono text-xs">{inv.customerGst}</td>
                    <td className="table-cell text-right font-mono">{formatPrice(inv.total)}</td>
                    <td className="table-cell text-right font-mono text-amber-600">{formatPrice(inv.gst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const LowStockReport = ({ data }) => {
  if (!data) return <EmptyReport message="Click Refresh to load low stock report" />;
  if (!Array.isArray(data) || data.length === 0) return <EmptyReport message="No low stock items found" icon={AlertTriangle} />;

  return (
    <div className="card overflow-hidden">
      <div className="card-header"><h3 className="text-base font-semibold">{data.length} Item{data.length > 1 ? 's' : ''} Below Threshold</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="table-header">Item</th>
              <th className="table-header">SKU</th>
              <th className="table-header">Category</th>
              <th className="table-header text-right">Current Stock</th>
              <th className="table-header text-right">Min Stock</th>
              <th className="table-header">Supplier</th>
              <th className="table-header text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="table-cell font-medium text-slate-800 dark:text-slate-200">{item.name}</td>
                <td className="table-cell font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                <td className="table-cell text-sm">{item.category}</td>
                <td className="table-cell text-right">
                  <span className="font-mono font-semibold text-red-600">{item.currentStock}</span>
                </td>
                <td className="table-cell text-right font-mono text-slate-500">{item.minStock}</td>
                <td className="table-cell text-sm">{item.suppliers?.[0]?.supplier?.name || '—'}</td>
                <td className="table-cell text-right">
                  <a href={`/inventory/${item.id}`} className="text-xs text-accent-500 hover:underline">View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DeadStockReport = ({ data, formatPrice }) => {
  if (!data) return <EmptyReport message="Click Refresh to load dead stock report" />;
  if (!Array.isArray(data) || data.length === 0) return <EmptyReport message="No dead stock items found" icon={Clock} />;

  return (
    <div className="card overflow-hidden">
      <div className="card-header"><h3 className="text-base font-semibold">{data.length} Dead Stock Item{data.length > 1 ? 's' : ''}</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="table-header">Item</th>
              <th className="table-header">SKU</th>
              <th className="table-header">Stock</th>
              <th className="table-header text-right">Days Without Movement</th>
              <th className="table-header text-right">Value Locked</th>
              <th className="table-header text-right">Last Movement</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700">
                <td className="table-cell font-medium">{item.name}</td>
                <td className="table-cell font-mono text-xs text-slate-500">{item.sku || '—'}</td>
                <td className="table-cell font-mono">{item.currentStock}</td>
                <td className="table-cell text-right font-mono text-red-600">{item.daysSinceLastMovement}d</td>
                <td className="table-cell text-right font-mono text-amber-600">{formatPrice(item.valueLocked)}</td>
                <td className="table-cell text-right text-xs text-slate-500">{item.lastMovement ? formatDate(item.lastMovement) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditLogReport = ({ data, formatDate, page, setPage, totalPages }) => {
  if (!data) return <EmptyReport message="Click Refresh to load audit log" />;
  const logs = Array.isArray(data) ? data : [];

  return (
    <div className="card overflow-hidden">
      <div className="card-header"><h3 className="text-base font-semibold">Audit Log ({logs.length} entries)</h3></div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="table-header">Date/Time</th>
              <th className="table-header">User</th>
              <th className="table-header">Action</th>
              <th className="table-header">Entity</th>
              <th className="table-header">Entity ID</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                <td className="table-cell text-sm text-slate-600">{formatDate(log.createdAt)}</td>
                <td className="table-cell text-sm">{log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}</td>
                <td className="table-cell">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                    log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                    log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                    log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{log.action}</span>
                </td>
                <td className="table-cell text-sm text-slate-600">{log.entity}</td>
                <td className="table-cell font-mono text-xs text-slate-500">{log.entityId?.slice(0, 8) || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost p-2 disabled:opacity-30"><ChevronLeft size={18} /></button>
            <span className="text-sm text-slate-500 mx-2">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost p-2 disabled:opacity-30"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

const EmptyReport = ({ message, icon: Icon = BarChart3 }) => (
  <div className="card p-12">
    <div className="text-center">
      <Icon size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-400">{message}</p>
    </div>
  </div>
);

export default Reports;
