
import React from 'react';
import { BarChart4, Target, Activity, Zap, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const JobslipAnalytics: React.FC = () => {
  const data = [
    { name: 'Cutting', val: 120 },
    { name: 'Jobwork', val: 95 },
    { name: 'Stitching', val: 80 },
    { name: 'Ready', val: 140 }
  ];

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="bg-white dark:bg-slate-900 border-b p-8 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-indigo-600 rounded-3xl text-white shadow-xl"><Target className="w-8 h-8"/></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white">Shop Floor BI</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 flex items-center gap-2">Efficiency & Yield Matrix</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-sm border border-slate-200 dark:border-slate-800">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-10 flex items-center gap-3"><Activity className="w-5 h-5 text-indigo-500"/> Process Throughput</h3>
               <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800}} />
                        <Tooltip />
                        <Bar dataKey="val" fill="#6366f1" radius={[8, 8, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>

            <div className="bg-indigo-600 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-between">
                <div>
                   <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.5em] mb-4">Daily Yield Node</p>
                   <h2 className="text-5xl font-black tracking-tighter">1,450 <span className="text-lg opacity-60">PCS</span></h2>
                </div>
                <div className="pt-8 border-t border-white/10 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-400 fill-current"/>
                      <span className="text-[10px] font-black uppercase tracking-widest">Efficiency index: 94%</span>
                   </div>
                   <button className="text-[10px] font-black uppercase border border-white/20 px-4 py-2 rounded-xl hover:bg-white/10 transition-all">View DPR Details</button>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default JobslipAnalytics;
