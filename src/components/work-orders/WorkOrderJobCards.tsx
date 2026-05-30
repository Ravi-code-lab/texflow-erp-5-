import React, { useState } from 'react';
import { 
  Play, Pause, Hammer, Clock, Users, Check, AlertCircle, Sparkles, Activity
} from 'lucide-react';

interface WorkOrderJobCardsProps {
  operations: any[];
  activeTimerOpIndex: number | null;
  timerSeconds: number;
  onStartTimer: (idx: number) => void;
  onStopTimer: () => void;
  karigars: any[];
  karigarAssignments: Record<number, string>;
  onAssignKarigar: (idx: number, id: string) => void;
  currency: string;
  qty: number;
  onSignOffOperation: (idx: number) => void;
  signedOffOps: Record<number, boolean>;
}

export const WorkOrderJobCards: React.FC<WorkOrderJobCardsProps> = ({
  operations = [],
  activeTimerOpIndex,
  timerSeconds,
  onStartTimer,
  onStopTimer,
  karigars = [],
  karigarAssignments = {},
  onAssignKarigar,
  currency,
  qty,
  onSignOffOperation,
  signedOffOps = {}
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [operationChecks, setOperationChecks] = useState<Record<string, boolean>>({
    'cutting-0': true, 'cutting-1': false, 'embro-0': true, 'stitch-0': false
  });

  const toggleCheck = (id: string) => {
    setOperationChecks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs">
        <div className="flex border-b border-slate-100 pb-3 justify-between items-center mb-5">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Hammer className="w-4 h-4 text-indigo-600" />
              Routing Operations & Job Cards (Workstations)
            </h4>
            <p className="text-[10.5px] text-slate-400 mt-1 uppercase tracking-widest font-bold">
              Complete each workstation job card to advance the manufacturing stream
            </p>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-250 font-bold font-mono">
            Active Job Cards: {operations.length}
          </span>
        </div>

        {/* OPERATIONS CARDS ACCORDION */}
        <div className="space-y-3">
          {operations.map((op, i) => {
            const isExpanded = expandedIndex === i;
            const isRunning = activeTimerOpIndex === i;
            const isSignedOff = signedOffOps[i];
            const assignedId = karigarAssignments[i];
            const karigar = karigars.find(k => k.id === assignedId);

            // Compute rates
            const cyTime = parseInt(op.time) || 12;
            const hourRate = op.rate || 140;
            const targetTotalOpCost = qty * (hourRate / 60) * cyTime;

            return (
              <div 
                key={i} 
                className={`border rounded-lg transition-all overflow-hidden ${
                  isSignedOff 
                    ? 'border-emerald-200 bg-emerald-50/10' 
                    : isRunning
                    ? 'border-indigo-400 shadow-sm ring-1 ring-indigo-300'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                
                {/* Header Row */}
                <div 
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className={`px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    isSignedOff ? 'bg-emerald-50/20' : isRunning ? 'bg-indigo-50/10' : 'bg-slate-50/40 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-200/60 flex items-center justify-center font-bold text-[#1c2126] text-xs font-mono">
                      {i + 1}
                    </span>
                    <div>
                      <h5 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                        {op.name}
                        {isSignedOff && (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 leading-none">
                            <Check className="w-2.5 h-2.5" /> Sign-off Complete
                          </span>
                        )}
                        {isRunning && (
                          <span className="bg-rose-100 text-rose-800 text-[9px] px-1.5 py-0.2 rounded-full font-bold flex items-center gap-0.5 animate-pulse leading-none">
                            <Activity className="w-2.5 h-2.5 animate-spin-slow" /> Timer Working
                          </span>
                        )}
                      </h5>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Workstation: <strong>{op.workstation}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions / Cost badges summary */}
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase leading-none">Cycle Spec</p>
                      <p className="text-slate-700 font-black font-mono mt-0.5">{op.time}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase leading-none">Standard Budget</p>
                      <p className="text-indigo-700 font-black font-mono mt-0.5">{currency}{targetTotalOpCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</p>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-400 uppercase leading-none">Linked Operator</p>
                      <p className="text-zinc-650 font-black mt-0.5">
                        {karigar ? karigar.name : <span className="text-slate-400 italic font-medium">Unassigned</span>}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Expanded edit drawer body */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
                    
                    {/* Panel 1: Operator assignment & Skill indicators */}
                    <div className="space-y-3.5">
                      <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                        1. Karigar Allocation
                      </h6>
                      <div className="space-y-1.5 flex flex-col">
                        <label className="text-slate-400 text-[10px] uppercase font-bold">Assign Worker</label>
                        <select
                          disabled={isSignedOff}
                          value={assignedId || ''}
                          onChange={e => onAssignKarigar(i, e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 font-bold focus:outline-none"
                        >
                          <option value="">-- Assign to Queue Pool --</option>
                          {karigars.map(k => (
                            <option key={k.id} value={k.id}>{k.name} ({k.skill || 'Assembly Tailer'})</option>
                          ))}
                        </select>
                      </div>

                      {karigar ? (
                        <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-[11px] leading-relaxed text-slate-600">
                          <p className="font-bold text-slate-800 uppercase text-[9.5px]">Operator File Card:</p>
                          <p className="font-semibold mt-0.5">Skill Level: <span className="text-indigo-700 font-bold">{karigar.skill || 'Master Tailor'}</span></p>
                          <p className="font-semibold text-[10px] mt-0.5 text-slate-400">Current Ledger Bal: {currency}{(karigar.balance || 0).toLocaleString()}</p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic">No custom operator assigned. Standard workshop supervisor wages apply.</p>
                      )}
                    </div>

                    {/* Panel 2: Checklist & QC gates */}
                    <div className="space-y-3">
                      <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                        2. Quality Checkpoints
                      </h6>
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 p-1.5 border border-slate-150/60 rounded hover:bg-slate-50 cursor-pointer text-slate-700">
                          <input 
                            type="checkbox" 
                            disabled={isSignedOff}
                            checked={!!operationChecks[`${op.name.toLowerCase().slice(0,4)}-0`]} 
                            onChange={() => toggleCheck(`${op.name.toLowerCase().slice(0,4)}-0`)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="font-medium text-[10.5px]">Machine Calibrated & Threads Checked</span>
                        </label>
                        <label className="flex items-center gap-2 p-1.5 border border-slate-150/60 rounded hover:bg-slate-50 cursor-pointer text-slate-700">
                          <input 
                            type="checkbox" 
                            disabled={isSignedOff}
                            checked={!!operationChecks[`${op.name.toLowerCase().slice(0,4)}-1`]} 
                            onChange={() => toggleCheck(`${op.name.toLowerCase().slice(0,4)}-1`)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                          />
                          <span className="font-medium text-[10.5px]">Measurement Template Verified</span>
                        </label>
                      </div>
                    </div>

                    {/* Panel 3: Stopwatch execution or sign-off */}
                    <div className="space-y-3 flex flex-col justify-between">
                      <div className="space-y-2">
                        <h6 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b pb-1">
                          3. Real-time Stopwatch
                        </h6>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[10px] uppercase font-bold">Elapsed timer</span>
                          <span className="font-mono text-indigo-605 font-bold text-sm">
                            {isRunning ? (
                              <span className="bg-indigo-50 border border-indigo-200 border-dashed rounded px-2.5 py-0.5 text-indigo-700 tracking-tight">
                                {Math.floor(timerSeconds/60).toString().padStart(2, '0')}:{ (timerSeconds%60).toString().padStart(2, '0') }
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">00:00</span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-col gap-2">
                        {!isSignedOff ? (
                          <div className="flex gap-1.5">
                            {isRunning ? (
                              <button
                                type="button"
                                onClick={onStopTimer}
                                className="flex-1 py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-sm text-[10px] uppercase.tracking-wider"
                              >
                                Stop & Log Work
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={activeTimerOpIndex !== null}
                                onClick={() => onStartTimer(i)}
                                className="flex-1 py-1 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:bg-slate-200 disabled:cursor-not-allowed rounded shadow-sm text-[10px] uppercase.tracking-wider flex items-center justify-center gap-1"
                              >
                                <Play className="w-2.5 h-2.5" /> Start Timer
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onSignOffOperation(i);
                                if (isRunning) onStopTimer();
                              }}
                              className="px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] uppercase.tracking-wider flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" /> Sign-Off
                            </button>
                          </div>
                        ) : (
                          <div className="bg-emerald-50 text-emerald-800 border-2 border-dashed border-emerald-250 p-2.5 rounded flex items-center gap-2 justify-center font-bold uppercase tracking-wider text-[10px]">
                            <Sparkles className="w-4 h-4 text-emerald-500" />
                            Workstation Sign-Off Active
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
