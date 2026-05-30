
import React from 'react';
import { Truck, TrendingUp, MapPin, Globe, Activity } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const DeliveryAnalytics: React.FC = () => {
  const data = [{ name: 'Mon', val: 40 }, { name: 'Tue', val: 30 }, { name: 'Wed', val: 65 }, { name: 'Thu', val: 45 }, { name: 'Fri', val: 90 }];

  return (
    <div className="flex flex-col h-full -m-6 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b p-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-sky-500 rounded-3xl text-white shadow-xl"><Globe className="w-8 h-8"/></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white">Delivery BI Dashboard</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">Network Transit Matrix</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-10 flex items-center gap-3"><Activity className="w-5 h-5 text-sky-500"/> Dispatch Velocity</h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" hide />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="val" stroke="#0ea5e9" strokeWidth={5} fill="#e0f2fe" />
                     </AreaChart>
                  </ResponsiveContainer>
               </div>
            </div>
            
            <div className="bg-slate-950 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between relative overflow-hidden border border-white/5">
                <div className="absolute bottom-0 right-0 p-8 opacity-5"><Truck className="w-48 h-48"/></div>
                <div className="relative z-10">
                   <p className="text-sky-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Fleet Performance</p>
                   <h2 className="text-4xl font-black tabular-nums tracking-tighter mb-2">92.4%</h2>
                   <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2">On-Time Transit Protocol Compliance</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default DeliveryAnalytics;
