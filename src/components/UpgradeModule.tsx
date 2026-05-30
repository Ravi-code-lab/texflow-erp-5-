import React, { useState, useEffect } from 'react';
import { ArrowUpCircle, RefreshCw, CheckCircle2, AlertTriangle, Terminal, Database, Server, Clock, GitCommit, Play, FileText, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PatchLog {
  id: string;
  version: string;
  description: string;
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
  date: string;
  logs: string[];
}

const UPGRADE_PATCHES: PatchLog[] = [
  {
    id: 'patch_6.0.4',
    version: 'v6.0.4',
    description: 'Migration to new schema architecture and indexing enhancements',
    status: 'SUCCESS',
    date: '2026-05-28 10:00 AM',
    logs: ['[OK] Backup created successfully.', '[OK] Schema migrated.', '[OK] Re-indexed database.']
  },
  {
    id: 'patch_6.1.0',
    version: 'v6.1.0',
    description: 'Introduces advanced Print Formats and Automations',
    status: 'PENDING',
    date: 'Waiting for Execution',
    logs: []
  }
];

const UpgradeModule: React.FC = () => {
  const [patches, setPatches] = useState<PatchLog[]>(UPGRADE_PATCHES);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [activeLog, setActiveLog] = useState<PatchLog | null>(null);

  const pendingPatches = patches.filter(p => p.status === 'PENDING');
  const completedPatches = patches.filter(p => p.status === 'SUCCESS' || p.status === 'FAILED');

  const handleUpgrade = () => {
    if (pendingPatches.length === 0) return;
    setIsUpgrading(true);
    setProgress(0);
    
    // Simulate upgrade sequence
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setPatches(prevPatches => prevPatches.map(p => 
            p.status === 'PENDING' ? { 
              ...p, 
              status: 'SUCCESS', 
              date: new Date().toLocaleString(),
              logs: ['[INFO] Downloading package...', '[INFO] Extracting artifacts...', '[OK] Applying DB Migrations...', '[OK] Compiling assets...', '[OK] Restarting Services...']
            } : p
          ));
          setIsUpgrading(false);
          return 100;
        }
        return prev + Math.floor(Math.random() * 20) + 5;
      });
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
              <ArrowUpCircle className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">System Ops</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">System Updates</h1>
          <p className="text-sm text-slate-500 mt-1">Manage platform upgrades, database migrations, and instance patches.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${pendingPatches.length > 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'}`}>
                  {pendingPatches.length > 0 ? <AlertTriangle className="w-5 h-5"/> : <CheckCircle2 className="w-5 h-5"/>}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {pendingPatches.length > 0 ? 'Updates Available' : 'System is Up to Date'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {pendingPatches.length > 0 ? `${pendingPatches.length} pending patches require execution.` : 'You are running the latest stable release.'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading || pendingPatches.length === 0}
                className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg shadow-sm hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {isUpgrading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin"/> Executing...</>
                ) : (
                  <><Play className="w-4 h-4"/> Upgrade Now</>
                )}
              </button>
            </div>
            
             {isUpgrading && (
               <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                 <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                   <span>Applying Upgrade Workflow</span>
                   <span>{Math.min(progress, 100)}%</span>
                 </div>
                 <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${Math.min(progress, 100)}%` }} 
                     className="h-full bg-blue-600"
                   />
                 </div>
                 <p className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-2">
                    <Terminal className="w-3 h-3 animate-pulse"/>
                    Running bench update --patch...
                 </p>
               </div>
             )}

            <div className="p-0">
               {patches.map((patch, idx) => (
                 <div key={patch.id} className={`p-4 sm:p-5 flex items-start gap-4 transition-colors ${idx !== patches.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}>
                     <div className="shrink-0 pt-1">
                        {patch.status === 'SUCCESS' && <CheckCircle2 className="w-5 h-5 text-emerald-500"/>}
                        {patch.status === 'PENDING' && <Clock className="w-5 h-5 text-amber-500"/>}
                        {patch.status === 'FAILED' && <AlertTriangle className="w-5 h-5 text-rose-500"/>}
                     </div>
                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-sm font-black text-slate-900 dark:text-white">{patch.version}</span>
                           <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                               patch.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30' :
                               patch.status === 'PENDING' ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' :
                               'bg-rose-50 text-rose-600 dark:bg-rose-900/30'
                           }`}>
                             {patch.status}
                           </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{patch.description}</p>
                        <p className="text-xs text-slate-400 mt-2 font-mono">{patch.date}</p>
                     </div>
                     <div>
                         <button 
                           onClick={() => setActiveLog(activeLog?.id === patch.id ? null : patch)}
                           className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"
                         >
                            <FileText className="w-3 h-3"/> Logs
                         </button>
                     </div>
                 </div>
               ))}
            </div>
          </div>

          <AnimatePresence>
            {activeLog && activeLog.logs.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800"
              >
                <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
                   <div className="flex items-center gap-2 text-slate-400">
                     <Terminal className="w-4 h-4"/>
                     <span className="text-xs font-mono">Execution Trace: {activeLog.version}</span>
                   </div>
                   <button onClick={() => setActiveLog(null)} className="text-slate-500 hover:text-white"><ChevronRight className="w-4 h-4"/></button>
                </div>
                <div className="p-4 font-mono text-xs space-y-1.5 overflow-x-auto">
                    {activeLog.logs.map((log, i) => (
                      <div key={i} className={`${log.includes('[OK]') ? 'text-emerald-400' : log.includes('ERROR') ? 'text-rose-400' : 'text-slate-300'}`}>
                         <span className="text-slate-600 mr-2">{new Date().toLocaleTimeString()}</span>
                         {log}
                      </div>
                    ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white mb-4">Instance Properties</h3>
             <div className="space-y-4">
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400">Environment</p>
                 <div className="flex items-center gap-2 mt-1">
                   <Server className="w-4 h-4 text-slate-800 dark:text-slate-200"/>
                   <p className="text-sm font-medium text-slate-900 dark:text-white">Production (Node 18)</p>
                 </div>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400">Database</p>
                 <div className="flex items-center gap-2 mt-1">
                   <Database className="w-4 h-4 text-slate-800 dark:text-slate-200"/>
                   <p className="text-sm font-medium text-slate-900 dark:text-white">PostgreSQL 15 (LocalDB Auth)</p>
                 </div>
               </div>
               <div>
                 <p className="text-[10px] uppercase font-bold text-slate-400">Current Branch</p>
                 <div className="flex items-center gap-2 mt-1">
                   <GitCommit className="w-4 h-4 text-slate-800 dark:text-slate-200"/>
                   <p className="text-sm font-medium text-slate-900 dark:text-white">version-6-stable</p>
                 </div>
               </div>
             </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl p-5">
             <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100">Automated Backups</h3>
             <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
               The system automatically initiates an offline backup sequence before applying any migrations or patches. Ensure uninterrupted power during this phase.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModule;
