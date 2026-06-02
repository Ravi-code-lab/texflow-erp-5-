
import React, { useMemo } from 'react';
import { Order } from '../types';
import { BarChart4, TrendingUp, IndianRupee, Users, Target, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SalesAnalyticsProps {
  orders: Order[];
  currency?: string;
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ orders, currency = '₹' }) => {
  const chartData = useMemo(() => {
    // Bug fix #3: replaced Math.random() with real aggregated order data
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayRevenue = orders
        .filter(o => {
          const od = new Date(o.orderDate || (o as any).createdAt || 0);
          return od.toDateString() === d.toDateString();
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      data.push({ date: dateStr, amount: dayRevenue });
    }
    return data;
  }, [orders]);

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-[#f8fafc] dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b p-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl"><BarChart4 className="w-8 h-8"/></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white">Sales BI Dashboard</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">Nexus Performance Matrix</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-10 flex items-center gap-3"><TrendingUp className="w-5 h-5 text-emerald-500"/> Revenue Growth Trajectory</h3>
               <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={chartData}>
                        <defs><linearGradient id="colorAna" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                        <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={5} fill="url(#colorAna)" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/5">
                <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><IndianRupee className="w-64 h-64 text-indigo-500"/></div>
                <div className="relative z-10">
                   <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Fiscal Magnitude Aggregate</p>
                   <h2 className="text-5xl font-black tabular-nums tracking-tighter mb-2">{currency}{(orders.reduce((s,o) => s+(o.totalAmount||0),0)/1000).toFixed(1)}K</h2>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">Based on {orders.length} actual orders</p>
                </div>
                <div className="relative z-10 pt-10 border-t border-white/5 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fulfilled Rate</span>
                      <span className="text-lg font-black text-emerald-400">{orders.length ? Math.round(orders.filter(o=>o.status==='FULFILLED'||o.status==='COMPLETED').length/orders.length*100) : 0}%</span>
                   </div>
                   <button className="w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Export Fiscal Report</button>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default SalesAnalytics;
