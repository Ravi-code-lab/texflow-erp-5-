
import React, { useMemo } from 'react';
import { ProductionJob } from '../types';
import { 
  BarChart4, TrendingUp, Search, Layers, Clock, Activity, 
  ArrowRight, CheckCircle2, MapPin, Check, 
  Scissors, PenTool, Sparkles, RefreshCcw
} from 'lucide-react';
// Fix: Added missing imports from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrackLotsProps {
  jobs: ProductionJob[];
  onUpdateJob?: (job: ProductionJob) => void;
}

const STAGES = [
  { id: 'CUTTING', label: 'Cutting', icon: Scissors, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
  { id: 'STITCHING', label: 'Stitching', icon: PenTool, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20' },
  { id: 'FINISHING', label: 'Finishing', icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20' },
  { id: 'READY', label: 'Ready', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20' }
];

const TrackLots: React.FC<TrackLotsProps> = ({ jobs, onUpdateJob }) => {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = { 'CUTTING': 0, 'STITCHING': 0, 'FINISHING': 0, 'READY': 0 };
    jobs.forEach(j => { if(counts[j.status] !== undefined) counts[j.status]++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const stats = useMemo(() => ({
    total: jobs.length,
    inProgress: jobs.filter(j => j.status !== 'READY').length,
    ready: jobs.filter(j => j.status === 'READY').length,
    avgProgress: jobs.length > 0 ? Math.round(jobs.reduce((acc, j) => acc + j.progress, 0) / jobs.length) : 0
  }), [jobs]);

  const handlePromote = (job: ProductionJob) => {
    if (!onUpdateJob) return;
    const currentIdx = STAGES.findIndex(s => s.id === job.status);
    if (currentIdx < STAGES.length - 1) {
      const nextStage = STAGES[currentIdx + 1];
      const newProgress = Math.min(100, ((currentIdx + 2) / STAGES.length) * 100);
      onUpdateJob({ 
        ...job, 
        status: nextStage.id, 
        progress: newProgress,
        updatedAt: new Date().toISOString() 
      });
    }
  };

  return (
    <div className="flex flex-col h-full -m-6 bg-[#f8fafc] dark:bg-slate-950">
      {/* Nexus Header */}
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-500 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
            <BarChart4 className="w-6 h-6"/>
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white leading-none">Jobslip Telemetry</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <Activity className="w-3 h-3 text-emerald-500 animate-pulse"/>
              Real-time Batch Convergence Hub
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl border dark:border-slate-700">
           <span className="text-[10px] font-black uppercase text-slate-500">{jobs.length} Active Shards</span>
        </div>
      </div>

      {/* Summary Matrix */}
      <div className="px-8 pt-8 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Layers className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Lots</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{stats.total}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl"><RefreshCcw className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">In-Prod</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{stats.inProgress}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><CheckCircle2 className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Ready Lots</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{stats.ready}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Activity className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Avg Progress</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{stats.avgProgress}%</h3></div>
          </div>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
         {/* Top Analytics Card */}
         <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:rotate-12 transition-transform duration-1000"><TrendingUp className="w-48 h-48 text-indigo-500"/></div>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-widest mb-10 flex items-center gap-2 relative z-10">
              <TrendingUp className="w-4 h-4 text-indigo-500"/> Movement Distribution Matrix
            </h3>
            <div className="h-64 relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                     <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontStyle: 'normal', fontWeight: 800, fill: '#94a3b8'}} />
                     <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                     <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                     <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* High Density Functional List */}
         <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
            <div className="px-8 py-5 border-b dark:border-slate-800 bg-[#fafafa] dark:bg-slate-950 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Chronological Batch Registry</h4>
               <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-inner">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input className="bg-transparent border-none outline-none text-[10px] font-bold w-48 uppercase" placeholder="Filter Lot Interface..." />
               </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                   <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-black uppercase tracking-widest border-b dark:border-slate-800">
                      <tr>
                        <th className="px-8 py-5">Lot Shard ID</th>
                        <th className="px-8 py-5">Entity Spec</th>
                        <th className="px-8 py-5 text-center">Protocol State</th>
                        <th className="px-8 py-5 text-right">Convergence</th>
                        <th className="px-8 py-5 text-right">Protocol Hub</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {jobs.length > 0 ? jobs.map(job => {
                        const stage = STAGES.find(s => s.id === job.status) || STAGES[0];
                        return (
                          <tr key={job.id} className="hover:bg-indigo-50/20 dark:hover:bg-slate-800/30 transition-all group h-16">
                             <td className="px-8 py-2">
                                <div className="flex items-center gap-3">
                                   <div className={`w-12 h-12 rounded-xl ${stage.bg} flex items-center justify-center border dark:border-slate-800 shadow-inner group-hover:border-indigo-300 transition-colors overflow-hidden`}>
                                      {job.imageUrl ? (
                                        <img src={job.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <stage.icon className={`w-5 h-5 ${stage.color}`} />
                                      )}
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="font-mono font-black text-indigo-600 uppercase tracking-tighter text-[10px]">#{job.id}</span>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{job.batchNo || 'NO BATCH'}</span>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-2">
                                <p className="font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none mb-1">{job.productName}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                   <MapPin className="w-3 h-3 text-indigo-400"/> {job.assignedMachine || 'UNASSIGNED UNIT'}
                                </p>
                             </td>
                             <td className="px-8 py-2 text-center">
                                <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase border tracking-widest ${stage.color} ${stage.bg} border-current/20`}>
                                   {job.status}
                                </span>
                             </td>
                             <td className="px-8 py-2 text-right">
                                <div className="flex flex-col items-end gap-1.5">
                                   <span className="font-black tabular-nums text-slate-500">{job.progress}%</span>
                                   <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                      <div className="h-full bg-indigo-500 transition-all duration-700" style={{width: `${job.progress}%`}}></div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-8 py-2 text-right">
                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                   {job.status !== 'READY' && (
                                     <button 
                                        onClick={() => handlePromote(job)}
                                        className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 active:scale-90 transition-all" 
                                        title="Promote to Next Protocol"
                                     >
                                        <ArrowRight className="w-4 h-4"/>
                                     </button>
                                   )}
                                   <button className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl hover:text-indigo-600 transition-all border dark:border-slate-700"><Check className="w-4 h-4"/></button>
                                </div>
                             </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                            <td colSpan={5} className="py-32 text-center">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                                        <MapPin className="w-10 h-10 text-slate-300 animate-bounce"/>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">No Active Lots Detected</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialize production jobs to begin real-time telemetry tracking.</p>
                                    </div>
                                </div>
                            </td>
                        </tr>
                      )}
                   </tbody>
                </table>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TrackLots;
