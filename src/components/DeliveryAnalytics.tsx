import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { Truck, Package, CheckCircle2, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface DeliveryAnalyticsProps {
  orders?: Order[];
  currency?: string;
}

type Range = '7d' | '30d' | '90d' | 'all';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const DeliveryAnalytics: React.FC<DeliveryAnalyticsProps> = ({ orders = [], currency = '₹' }) => {
  const [range, setRange] = useState<Range>('30d');

  const filteredOrders = useMemo(() => {
    const all = orders.filter(o => !o.deleted);
    if (range === 'all') return all;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
    return all.filter(o => new Date(o.createdAt || o.updatedAt || '') >= cutoff);
  }, [orders, range]);

  const delivered = filteredOrders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED');
  const pending   = filteredOrders.filter(o => ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(o.status));
  const inTransit = filteredOrders.filter(o => o.status === 'DISPATCHED' || o.status === 'SHIPPED');
  const cancelled = filteredOrders.filter(o => o.status === 'CANCELLED');

  const fulfillmentRate = filteredOrders.length > 0
    ? Math.round((delivered.length / filteredOrders.length) * 100)
    : 0;

  // Weekly dispatch trend
  const weeklyData = useMemo(() => {
    const weeks: Record<string, { dispatched: number; delivered: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const key = `Wk ${d.getDate()}/${d.getMonth() + 1}`;
      weeks[key] = { dispatched: 0, delivered: 0 };
    }
    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt || o.updatedAt || '');
      const weeksAgo = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 3600 * 1000));
      if (weeksAgo >= 12) return;
      const key = Object.keys(weeks)[11 - weeksAgo];
      if (!key) return;
      weeks[key].dispatched++;
      if (o.status === 'DELIVERED' || o.status === 'COMPLETED') weeks[key].delivered++;
    });
    return Object.entries(weeks).map(([week, v]) => ({ week, ...v }));
  }, [filteredOrders]);

  // Status pie data
  const statusData = [
    { name: 'Delivered', value: delivered.length },
    { name: 'In Transit', value: inTransit.length },
    { name: 'Pending', value: pending.length },
    { name: 'Cancelled', value: cancelled.length },
  ].filter(d => d.value > 0);

  const RANGE_LABELS: Record<Range, string> = { '7d': 'Last 7 days', '30d': 'Last 30 days', '90d': 'Last 90 days', 'all': 'All time' };

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex flex-wrap justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-sky-500 rounded-2xl text-white shadow-lg"><Truck className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Delivery Analytics</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Live from your orders data</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          {(['7d', '30d', '90d', 'all'] as Range[]).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide transition-all ${range === r ? 'bg-sky-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {r === 'all' ? 'All' : r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Orders', value: filteredOrders.length, icon: Package, color: 'text-indigo-500' },
            { label: 'Delivered', value: delivered.length, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'In Transit', value: inTransit.length, icon: Truck, color: 'text-sky-500' },
            { label: 'Pending', value: pending.length, icon: Clock, color: 'text-amber-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* Fulfillment rate */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fulfillment Rate</p>
            <p className="text-4xl font-black text-emerald-600 tabular-nums">{fulfillmentRate}%</p>
            <p className="text-xs text-slate-400 mt-1">{delivered.length} delivered of {filteredOrders.length} total · {RANGE_LABELS[range]}</p>
          </div>
          <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width: `${fulfillmentRate}%`}} />
          </div>
          {cancelled.length > 0 && (
            <div className="flex items-center gap-1 text-rose-500 text-xs font-bold">
              <AlertTriangle className="w-4 h-4" /> {cancelled.length} cancelled
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly trend */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500"/> Weekly Dispatch vs Delivery
            </h3>
            {filteredOrders.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No orders in this period.</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                    <XAxis dataKey="week" tick={{fontSize:9, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize:9, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{borderRadius:'10px', border:'none', fontSize:11}} />
                    <Bar dataKey="dispatched" fill="#6366f1" name="Dispatched" radius={[4,4,0,0]} />
                    <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Status pie */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Order Status Mix</h3>
            {statusData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No data for this period.</div>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                      label={(props: any) => `${props.name ?? ""} ${((props.percent ?? 0)*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliveryAnalytics;
