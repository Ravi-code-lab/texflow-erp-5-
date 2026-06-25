import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import {
  BarChart4, TrendingUp, IndianRupee, Users, Package, ArrowUpRight, ArrowDownRight,
  Calendar, Scissors, Palette, Layers, Tag
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface SalesAnalyticsProps {
  orders: Order[];
  currency?: string;
}

type Range = '7d' | '30d' | '90d' | 'all';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

// ── Apparel types mirrored from SalesOrder (keep in sync) ──────────────────
interface MatrixRow {
  id: string; colour: string; colourCode: string; fabric: string; gsm: string;
  sizes: Record<string, number>; unitPrice: number; discount: number;
}
interface ApparelOrderItem {
  id: string; styleNo: string; styleName: string; category: string;
  sizeSet: string; season: string; collection: string; hsn: string; unit: string;
  rows: MatrixRow[];
}

const rowQty = (row: MatrixRow) => Object.values(row.sizes).reduce((a, b) => a + b, 0);
const rowNet = (row: MatrixRow) => { const q = rowQty(row); const g = q * row.unitPrice; return g - (g * (row.discount || 0)) / 100; };
const styleQty = (it: ApparelOrderItem) => it.rows.reduce((s, r) => s + rowQty(r), 0);
const styleNet = (it: ApparelOrderItem) => it.rows.reduce((s, r) => s + rowNet(r), 0);

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ orders, currency = '₹' }) => {
  const [range, setRange] = useState<Range>('30d');

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'CANCELLED' && !o.deleted), [orders]);

  const filteredOrders = useMemo(() => {
    if (range === 'all') return activeOrders;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return activeOrders.filter(o => new Date(o.createdAt || o.updatedAt || '') >= cutoff);
  }, [activeOrders, range]);

  // Daily revenue chart
  const chartData = useMemo(() => {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 180;
    const buckets: Record<string, { amount: number; pcs: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      buckets[key] = { amount: 0, pcs: 0 };
    }
    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt || o.updatedAt || '');
      const key = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (key in buckets) {
        buckets[key].amount += o.totalAmount || 0;
        const ai: ApparelOrderItem[] = o.apparelItems || [];
        buckets[key].pcs += ai.reduce((s, it) => s + styleQty(it), 0);
      }
    });
    return Object.entries(buckets).map(([date, v]) => ({ date, amount: Math.round(v.amount), pcs: v.pcs }));
  }, [filteredOrders, range]);

  // Status breakdown
  const statusData = useMemo(() => {
    const m: Record<string, number> = {};
    filteredOrders.forEach(o => { m[o.status] = (m[o.status] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [filteredOrders]);

  // ── Apparel-specific analytics ───────────────────────────────────────────
  
  // Category breakdown (by pcs)
  const categoryData = useMemo(() => {
    const m: Record<string, { pcs: number; amount: number }> = {};
    filteredOrders.forEach(o => {
      const ai: ApparelOrderItem[] = o.apparelItems || [];
      ai.forEach(it => {
        const cat = it.category || 'Unknown';
        if (!m[cat]) m[cat] = { pcs: 0, amount: 0 };
        m[cat].pcs += styleQty(it);
        m[cat].amount += styleNet(it);
      });
    });
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.pcs - a.pcs).slice(0, 8);
  }, [filteredOrders]);

  // Season breakdown
  const seasonData = useMemo(() => {
    const m: Record<string, { pcs: number; amount: number }> = {};
    filteredOrders.forEach(o => {
      const season = (o as any).season || 'Untagged';
      const ai: ApparelOrderItem[] = o.apparelItems || [];
      const pcs = ai.reduce((s, it) => s + styleQty(it), 0);
      const amt = ai.reduce((s, it) => s + styleNet(it), 0);
      if (!m[season]) m[season] = { pcs: 0, amount: 0 };
      m[season].pcs += pcs; m[season].amount += amt;
    });
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount);
  }, [filteredOrders]);

  // Colour popularity across all orders
  const colourData = useMemo(() => {
    const m: Record<string, { pcs: number; hex: string }> = {};
    filteredOrders.forEach(o => {
      const ai: ApparelOrderItem[] = o.apparelItems || [];
      ai.forEach(it => {
        it.rows.forEach(row => {
          if (!row.colour) return;
          const key = row.colour;
          if (!m[key]) m[key] = { pcs: 0, hex: row.colourCode || '#ccc' };
          m[key].pcs += rowQty(row);
        });
      });
    });
    return Object.entries(m).map(([name, v]) => ({ name, pcs: v.pcs, hex: v.hex })).sort((a, b) => b.pcs - a.pcs).slice(0, 10);
  }, [filteredOrders]);

  // Size distribution (aggregate across all orders)
  const sizeData = useMemo(() => {
    const m: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const ai: ApparelOrderItem[] = o.apparelItems || [];
      ai.forEach(it => it.rows.forEach(row => {
        Object.entries(row.sizes).forEach(([sz, qty]) => {
          m[sz] = (m[sz] || 0) + qty;
        });
      }));
    });
    const order = ['XS','S','M','L','XL','XXL','XXXL','Free Size','28','30','32','34','36','38','40','42','44'];
    return Object.entries(m)
      .sort((a, b) => { const oa = order.indexOf(a[0]); const ob = order.indexOf(b[0]); return (oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob); })
      .map(([size, qty]) => ({ size, qty }));
  }, [filteredOrders]);

  // Top customers by pcs
  const topCustomers = useMemo(() => {
    const m: Record<string, { pcs: number; amount: number }> = {};
    filteredOrders.forEach(o => {
      const k = o.customerName || 'Unknown';
      if (!m[k]) m[k] = { pcs: 0, amount: 0 };
      const ai: ApparelOrderItem[] = o.apparelItems || [];
      m[k].pcs += ai.reduce((s, it) => s + styleQty(it), 0);
      m[k].amount += o.totalAmount || 0;
    });
    return Object.entries(m).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [filteredOrders]);

  // KPIs
  const totalRevenue = filteredOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const totalOrders = filteredOrders.length;
  const totalPcs = filteredOrders.reduce((s, o) => {
    const ai: ApparelOrderItem[] = o.apparelItems || [];
    return s + ai.reduce((ss, it) => ss + styleQty(it), 0);
  }, 0);
  const avgRealisation = totalPcs > 0 ? totalRevenue / totalPcs : 0;
  const uniqueCustomers = new Set(filteredOrders.map(o => o.customerName)).size;

  // Period comparison
  const prevOrders = useMemo(() => {
    if (range === 'all') return [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const now = new Date(); now.setDate(now.getDate() - days);
    const prev = new Date(now); prev.setDate(prev.getDate() - days);
    return activeOrders.filter(o => { const d = new Date(o.createdAt || o.updatedAt || ''); return d >= prev && d < now; });
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
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Apparel Manufacturing — Live Data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400"/>
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
            { label: 'Total Revenue', value: fmt(totalRevenue), sub: revChange !== null ? `${revChange >= 0 ? '+' : ''}${revChange.toFixed(1)}% vs prev` : RANGE_LABELS[range], up: revChange === null || revChange >= 0, icon: IndianRupee },
            { label: 'Total Orders', value: String(totalOrders), sub: `${uniqueCustomers} customers`, up: true, icon: Package },
            { label: 'Total Pieces', value: totalPcs > 0 ? totalPcs.toLocaleString('en-IN') : '—', sub: 'across all styles', up: true, icon: Layers },
            { label: 'Avg. Realisation / Pc', value: avgRealisation > 0 ? fmt(avgRealisation) : '—', sub: 'per piece ordered', up: true, icon: TrendingUp },
          ].map(({ label, value, sub, up, icon: Icon }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <Icon className="w-4 h-4 text-slate-300"/>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">{value}</p>
              <p className={`text-[11px] font-bold mt-1 flex items-center gap-1 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
                {revChange !== null && label === 'Total Revenue' ? (up ? <ArrowUpRight className="w-3 h-3"/> : <ArrowDownRight className="w-3 h-3"/>) : null}
                {sub}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue Trend */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500"/> Revenue & Pieces Trend — {RANGE_LABELS[range]}
          </h3>
          {chartData.every(d => d.amount === 0) ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No orders in this period.</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1}/>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} interval="preserveStartEnd"/>
                  <YAxis yAxisId="amt" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => v >= 1e5 ? `${(v/1e5).toFixed(0)}L` : String(v)}/>
                  <YAxis yAxisId="pcs" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={v => `${v}p`}/>
                  <Tooltip formatter={(v: any, name: string) => name === 'amount' ? [fmt(v), 'Revenue'] : [`${v} pcs`, 'Pieces']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}/>
                  <Area yAxisId="amt" type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} fill="url(#colorAmt)"/>
                  <Area yAxisId="pcs" type="monotone" dataKey="pcs" stroke="#10b981" strokeWidth={2} fill="none" strokeDasharray="4 2"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category & Season */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category by Pcs */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Scissors className="w-4 h-4 text-indigo-400"/>Category Mix (by Pieces)</h3>
            {categoryData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No style data. Create sales orders with apparel styles.</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }}/>
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={90}/>
                    <Tooltip formatter={(v: any, name: string) => name === 'pcs' ? [`${v} pcs`, 'Pieces'] : [fmt(v), 'Revenue']}
                      contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }}/>
                    <Bar dataKey="pcs" fill="#6366f1" radius={[0, 4, 4, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Season Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Tag className="w-4 h-4 text-emerald-400"/>Revenue by Season</h3>
            {seasonData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No season data. Tag orders with a season.</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={seasonData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={75}
                      label={(props: any) => `${props.name ?? ''} ${((props.percent ?? 0)*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {seasonData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [fmt(v), 'Revenue']} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Size Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-amber-400"/>Size Distribution (Total Pieces)</h3>
          {sizeData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No size data yet.</div>
          ) : (
            <>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sizeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1}/>
                    <XAxis dataKey="size" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}/>
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }}/>
                    <Tooltip formatter={(v: any) => [`${v} pcs`, 'Quantity']} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }}/>
                    <Bar dataKey="qty" fill="#f59e0b" radius={[4, 4, 0, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Size ratio chips */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                {(() => {
                  const total = sizeData.reduce((s, d) => s + d.qty, 0);
                  return sizeData.map(d => (
                    <span key={d.size} className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] font-bold text-amber-700">
                      {d.size}: {d.qty.toLocaleString()} <span className="text-amber-400">({total > 0 ? ((d.qty/total)*100).toFixed(0) : 0}%)</span>
                    </span>
                  ));
                })()}
              </div>
            </>
          )}
        </div>

        {/* Colour Popularity & Top Customers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Colour Popularity */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Palette className="w-4 h-4 text-pink-400"/>Top Colours by Pieces</h3>
            {colourData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No colour data yet.</div>
            ) : (
              <div className="space-y-2.5 mt-2">
                {colourData.map((c, i) => {
                  const maxPcs = colourData[0]?.pcs || 1;
                  return (
                    <div key={c.name} className="flex items-center gap-3 text-[12px]">
                      <span className="w-3 h-3 rounded-full flex-shrink-0 border border-slate-200" style={{ backgroundColor: c.hex }}/>
                      <span className="w-28 truncate text-slate-600 font-medium">{c.name}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${(c.pcs / maxPcs) * 100}%`, backgroundColor: c.hex || '#6366f1' }}/>
                      </div>
                      <span className="w-16 text-right tabular-nums text-slate-500">{c.pcs.toLocaleString()} pcs</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Customers */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-sky-400"/>Top Customers by Revenue</h3>
            {topCustomers.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No customer data.</div>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topCustomers} layout="vertical">
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={v => v >= 1e5 ? `${(v/1e5).toFixed(0)}L` : String(v)}/>
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} width={90}/>
                    <Tooltip formatter={(v: any, name: string) => name === 'amount' ? [fmt(v), 'Revenue'] : [`${v} pcs`, 'Pieces']}
                      contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }}/>
                    <Bar dataKey="amount" fill="#0ea5e9" radius={[0, 4, 4, 0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Order Status Breakdown</h3>
          {statusData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}/>
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }}/>
                  <Tooltip contentStyle={{ borderRadius: '10px', border: 'none', fontSize: 11 }}/>
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default SalesAnalytics;
