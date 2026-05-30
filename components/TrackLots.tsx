import React, { useState } from 'react';
import { ProductionJob } from '../types';
import { Layers, CheckCircle2, AlertCircle, Clock, Check, Scissors, RotateCcw, PenTool, Sparkles } from 'lucide-react';

interface TrackLotsProps {
  jobs: ProductionJob[];
  onUpdateJob: (job: ProductionJob) => void;
}

const STAGES = [
  { id: 'CUTTING', label: 'Cutting', icon: Scissors, color: 'blue' },
  { id: 'JOBWORK', label: 'Jobwork', icon: RotateCcw, color: 'purple' },
  { id: 'STITCHING', label: 'Stitching', icon: PenTool, color: 'indigo' },
  { id: 'FINISHING', label: 'Finishing', icon: Sparkles, color: 'pink' },
  { id: 'READY', label: 'Ready', icon: CheckCircle2, color: 'emerald' }
];

export default function TrackLots({ jobs, onUpdateJob }: TrackLotsProps) {
  const [filterStr, setFilterStr] = useState('');

  const filtered = jobs.filter(j => 
    j.productName.toLowerCase().includes(filterStr.toLowerCase()) ||
    String(j.id).toLowerCase().includes(filterStr.toLowerCase())
  );

  const handleAdvanceStage = (job: ProductionJob) => {
    const currentIndex = STAGES.findIndex(s => s.id === job.status);
    if (currentIndex !== -1 && currentIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentIndex + 1].id;
      onUpdateJob({
        ...job,
        status: nextStage,
        progress: Math.round(((currentIndex + 2) / STAGES.length) * 100)
      } as any);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Layers className="w-5 h-5 text-indigo-500" />
            Active Textile Lot Tracker
          </h3>
          <p className="text-xs text-slate-400">Monitor progressive fabric batches and move stages inside production loops.</p>
        </div>
        <input 
          type="text" 
          placeholder="Filter by lot / SKU..." 
          className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 w-full sm:w-56"
          value={filterStr}
          onChange={e => setFilterStr(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Layers className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No active tracking lots found.</p>
          <p className="text-xs text-slate-400">Generate Jobslips or submit Work Orders to create lots.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const currentStageIdx = STAGES.findIndex(s => s.id === job.status);
            return (
              <div key={job.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/25 dark:bg-slate-950/20 hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100/60 dark:border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-extrabold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                      {job.id}
                    </span>
                    <span className="font-bold text-slate-850 dark:text-slate-200 text-sm">{job.productName}</span>
                    <span className="text-xs text-slate-400 font-mono">({job.quantity} units scheduled)</span>
                  </div>
                  <div>
                    {currentStageIdx < STAGES.length - 1 ? (
                      <button
                        onClick={() => handleAdvanceStage(job)}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        Advance Lot Stage <Check className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Ready for Dispatch
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar and milestone markers */}
                <div className="pt-4">
                  <div className="flex justify-between text-[11px] text-slate-400 block mb-2">
                    <span>Manufacturing Line Milestone:</span>
                    <span className="font-bold font-mono text-slate-700 dark:text-slate-205">{job.progress || 0}% Completed</span>
                  </div>
                  <div className="relative">
                    {/* Background track line */}
                    <div className="absolute top-[15px] left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded z-0" />
                    
                    {/* Active progress color bar */}
                    <div 
                      className="absolute top-[15px] left-0 h-1 bg-indigo-505 bg-indigo-500 rounded z-0"
                      style={{ width: `${Math.max(0, (currentStageIdx / (STAGES.length - 1)) * 100)}%` }} 
                    />

                    <div className="flex justify-between relative z-10">
                      {STAGES.map((s, idx) => {
                        const isDone = idx <= currentStageIdx;
                        const isCurrent = idx === currentStageIdx;
                        const Icon = s.icon;
                        return (
                          <div key={s.id} className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                              isDone 
                                ? 'bg-indigo-600 border-2 border-indigo-600 text-white shadow-md' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-800'
                            } ${isCurrent ? 'ring-4 ring-indigo-500/20 scale-110' : ''}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[10px] mt-1.5 font-bold ${
                              isDone ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                            }`}>
                              {s.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
