
import React, { useState } from 'react';
import { Printer, Play, CheckSquare, ChevronRight } from 'lucide-react';
import { ProductionJob, Machine, Karigar } from '../types';

interface JobCardProps {
  jobs: ProductionJob[];
  workstations: Machine[];
  karigars: Karigar[];
  onUpdateJob: (job: ProductionJob) => void;
}

const GenerateJobSlip: React.FC<JobCardProps> = ({ jobs, workstations, karigars, onUpdateJob }) => {
  const [selectedJobId, setSelectedJobId] = useState('');
  const [operation, setOperation] = useState('');
  const [workstationId, setWorkstationId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [completedQty, setCompletedQty] = useState(0);
  
  const [isTracing, setIsTracing] = useState(false);
  const [logs, setLogs] = useState<{startTime: string; endTime?: string}[]>([]);

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const handleStart = () => {
    setIsTracing(true);
    setLogs([...logs, { startTime: new Date().toLocaleTimeString() }]);
  };

  const handleComplete = () => {
    if (selectedJob) {
      onUpdateJob({
         ...selectedJob,
         progress: Math.min(100, Math.round(((completedQty || 0) / selectedJob.quantity) * 100))
      });
      setIsTracing(false);
      const newLogs = [...logs];
      if (newLogs.length > 0 && !newLogs[newLogs.length-1].endTime) {
         newLogs[newLogs.length-1].endTime = new Date().toLocaleTimeString();
         setLogs(newLogs);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Job Card</span>
               <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">Operation Tracking</span>
            </div>
            <div className="flex items-center gap-2">
               <button className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                  <Printer className="w-4 h-4" />
                  Print Card
               </button>
            </div>
         </div>
      </div>

      <div className="flex-1 p-5 overflow-auto">
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 space-y-6">
                <h3 className="font-semibold text-sm mb-4 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Job Card Details</h3>
                
                <div className="space-y-4">
                   <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Work Order</label>
                           <div className="relative">
                               <select 
                                 value={selectedJobId} 
                                 onChange={e => setSelectedJobId(e.target.value)}
                                 className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                               >
                                  <option value="">Select Work Order...</option>
                                  {jobs.map(j => <option key={j.id} value={j.id}>{j.id} - {j.productName}</option>)}
                               </select>
                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                           </div>
                       </div>
                       <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Operation</label>
                           <div className="relative">
                               <select 
                                 value={operation} 
                                 onChange={e => setOperation(e.target.value)}
                                 className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                               >
                                  <option value="">Select Operation...</option>
                                  <option value="Cutting">Cutting</option>
                                  <option value="Stitching">Stitching</option>
                                  <option value="Embroidery">Embroidery</option>
                                  <option value="Washing">Washing</option>
                                  <option value="Finishing">Finishing / Checking</option>
                                  <option value="Packaging">Packing</option>
                               </select>
                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                           </div>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Workstation</label>
                           <div className="relative">
                               <select 
                                 value={workstationId} 
                                 onChange={e => setWorkstationId(e.target.value)}
                                 className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                               >
                                  <option value="">Select Workstation...</option>
                                  {workstations.filter(w => !operation || w.type === operation).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                               </select>
                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                           </div>
                       </div>
                       <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Assign To</label>
                           <div className="relative">
                               <select 
                                 value={assignedTo} 
                                 onChange={e => setAssignedTo(e.target.value)}
                                 className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                               >
                                  <option value="">Select Employee/Karigar...</option>
                                  {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                               </select>
                               <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                           </div>
                       </div>
                   </div>

                   <div className="pt-4 border-t border-[#d1d8dd] grid grid-cols-2 gap-6">
                        <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Target Qty</label>
                           <input type="number" readOnly value={selectedJob?.quantity || 0} className="w-full px-2.5 py-[5px] bg-[#f4f5f6] border border-[#d1d8dd] rounded focus:outline-none transition-all text-[#1c2126] tabular-nums" />
                       </div>
                       <div className="space-y-1.5 flex flex-col">
                           <label className="text-xs text-[#525c66]">Completed Qty</label>
                           <input type="number" value={completedQty} onChange={e => setCompletedQty(Number(e.target.value))} className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums" />
                       </div>
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                   {!isTracing ? (
                      <button onClick={handleStart} disabled={!selectedJobId || !operation} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded text-[13px] font-medium shadow-sm transition-all flex items-center justify-center gap-2"><Play className="w-4 h-4"/> Start Job</button>
                   ) : (
                      <button onClick={handleComplete} className="flex-1 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] text-[#1c2126] py-2 rounded text-[13px] font-medium shadow-sm transition-all flex items-center justify-center gap-2"><CheckSquare className="w-4 h-4"/> Stop / Complete</button>
                   )}
                </div>
             </div>

             <div className="bg-[#f0f4f8] border border-[#d1d8dd] rounded shadow-sm p-6 overflow-hidden flex flex-col">
                <h3 className="font-semibold text-sm mb-4 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Time Logs (Timesheets)</h3>
                
                {logs.length > 0 ? (
                  <div className="flex flex-col gap-3 overflow-auto">
                    {logs.map((log, i) => (
                      <div key={i} className="bg-white p-3 border border-[#d1d8dd] rounded flex justify-between text-[13px] items-center">
                         <div className="flex gap-4">
                           <div className="font-medium text-[#1c2126]">Session {i+1}</div>
                           <div className="text-[#525c66] flex gap-2">
                             <span>Start: {log.startTime}</span>
                             {log.endTime && <span>→ End: {log.endTime}</span>}
                           </div>
                         </div>
                         <div className="text-green-600 font-medium">
                            {log.endTime ? "Completed" : "In Progress..."}
                         </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-[#d1d8dd] bg-white rounded text-[#8d99a6]">
                      <ClockIcon className="w-10 h-10 mb-2" />
                      <p className="text-[13px] font-medium">No time logs yet</p>
                      <p className="text-[11px]">Click "Start Job" to begin tracking time.</p>
                  </div>
                )}
             </div>
         </div>
      </div>
    </div>
  );
};

const ClockIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);

export default GenerateJobSlip;
