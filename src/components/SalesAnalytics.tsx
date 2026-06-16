import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { BarChart4, TrendingUp, IndianRupee, Users, Package, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface SalesAnalyticsProps {
  orders: Order[];
  currency?: string;
}

type Range = '7d' | '30d' | '90d' | 'all';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ orders, currency = '₹' }) => {
  const [range, setRange] = useState<Range>('30d');

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'CANCELLED' && !o.deleted), [orders]);

  const filteredOrders = useMemo(() => {
    if (range === 'all') return activeOrders;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return activeOrders.filter(o => new Date(o.createdAt || o.updatedAt || '') >= cutoff);
  }, [activeOrders, range]);

  // Daily revenue chart from real orders
  const chartData = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const buckets: Record<string, number> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      buckets[key] = 0;
    }
    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt || o.updatedAt || '');
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (key in buckets) buckets[key] += (o.totalAmount || 0);
    });
    return Object.entries(buckets).map(([date, amount]) => ({ date, amount: Math.round(amount) }));
  }, [filteredOrders, range]);

  // Status breakdown pie
  const statusData = useMemo(() => {
    const m: Record<string, number> = {};
    filteredOrders.forEach(o => { m[o.status] = (m[o.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // Top products
  const topProducts = useMemo(() => {
    const m: Record<string, { qty: number; revenue: number }> = {};
    filteredOrders.forEach(o => {
      (o.items || []).forEach((item: any) => {
        const k = item.productName || item.name || 'Unknown';
        if (!m[k]) m[k] = { qty: 0, revenue: 0 };
        m[k].qty += item.quantity || 0;
        m[k].revenue += (item.quantity || 0) * (item.unitPrice || item.price || 0);
      });
    });
    return Object.entries(m)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);
  }, [filteredOrders]);

  // KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalOrders = filteredOrders.length;
  const uniqueCustomers = new Set(filteredOrders.map(o => (o as any).customerId || o.customerName)).size;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingOrders = filteredOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status)).length;

  // Period-over-period comparison
  const prevOrders = useMemo(() => {
    if (range === 'all') return [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const now = new Date(); now.setDate(now.getDate() - days);
    const prev = new Date(now); prev.setDate(prev.getDate() - days);
    return activeOrders.filter(o => {
      const d = new Date(o.createdAt || o.updatedAt || '');
      return d >= prev && d < now;
    });
  }, [activeOrders, range]);

  const prevRevenue = prevOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const revChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : null;

  const fmt = (n: number) =>
    n >= 1e7 ? `${currency}${(n / 1e7).toFixed(1)}Cr`
    : n >= 1e5 ? `${currency}${(n / 1e5).toFixed(1)}L`
    : `${currency}${Math.round(n).toLocaleString('en-IN')}`;

  const RANGE_LABELS: Record<Range, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', 'all': 'All time' };

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-[#f8fafc] dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><BarChart4 className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Sales Analytics</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Live from your orders data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${range === r ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Revenue', value: fmt(totalRevenue), sub: revChange !== null ? `${revChange >= 0 ? '+' : ''}${revChange.toFixed(1)}% vs prev period` : RANGE_LABELS[range], up: revChange === null || revChange >= 0, icon: IndianRupee },
            { label: 'Orders', value: String(totalOrders), sub: `${pendingOrders} pending`, up: true, icon: Package },
            { label: 'Customers', value: String(uniqueCustomers), sub: 'unique buyers', up: true, icon: Users },
            { label: 'Avg Order Value', value: fmt(avgOrderValue), sub: 'per order', up: true, icon: TrendingUp },
          ].map(({ label, value, sub, up, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <Icon className="w-4 h-4 text-slate-300" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
              <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {revChange !== null && label === 'Revenue' ? (up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>) : null}
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue trend */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500"/> Revenue Trend — {RANGE_LABELS[range]}
          </h3>
          {chartData.every(d => d.amount === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No orders in this period. Add orders to see revenue trend.
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} interval="preserveStartEnd" />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} tickFormatter={v => v >= 1e5 ? `${(v/1e5).toFixed(0)}L` : String(v)} />
                  <Tooltip
                    formatter={(v: any) => [fmt(v), 'Revenue']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorReal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order status breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Order Status Breakdown</h3>
            {statusData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No data</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(props: any) => `${props.name ?? ""} ${((props.percent ?? 0)*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Top products */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Top Products by Revenue</h3>
            {topProducts.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No product data. Ensure orders have line items.</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize:9, fill:'#94a3b8'}} tickFormatter={v => v >= 1e5 ? `${(v/1e5).toFixed(0)}L` : String(v)} />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:10, fill:'#64748b'}} width={80} />
                    <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} contentStyle={{borderRadius:'10px', border:'none', fontSize:11}} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
