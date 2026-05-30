import React, { useState, useMemo } from 'react';
import { Timesheet, TimesheetEntry, TeamMember, Project, Task } from '../types';
import { 
  Search, Plus, FileText, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Clock
} from 'lucide-react';

interface TimesheetProps {
  timesheets: Timesheet[];
  team: TeamMember[];
  projects: Project[];
  tasks: Task[];
  onAdd: (ts: Timesheet) => void;
  onUpdate: (ts: Timesheet) => void;
  onDelete: (id: string) => void;
}

const TimesheetComp: React.FC<TimesheetProps> = ({ 
  timesheets, team, projects, tasks, onAdd, onUpdate, onDelete
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<Timesheet>>({
    status: 'DRAFT', entries: [],
    totalHours: 0, totalBillableHours: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const [newItem, setNewItem] = useState<TimesheetEntry>({ 
    projectId: '', taskId: '', date: new Date().toISOString().split('T')[0], 
    hours: 1, description: '', billable: true 
  });

  const filtered = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (timesheets || []).filter(o => 
      (o.id || '').toLowerCase().includes(searchLower) ||
      (o.employeeId || '').toLowerCase().includes(searchLower)
    );
  }, [timesheets, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    let totHours = 0;
    let totBillable = 0;
    (formData.entries || []).forEach(entry => {
       totHours += entry.hours;
       if(entry.billable) totBillable += entry.hours;
    });

    const oData = {
      ...formData,
      totalHours: totHours,
      totalBillableHours: totBillable,
      id: formData.id || `TS-${Date.now().toString().slice(-4)}`,
    } as Timesheet;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: Timesheet) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'DRAFT', entries: [],
         totalHours: 0, totalBillableHours: 0,
         startDate: new Date().toISOString().split('T')[0],
         endDate: new Date().toISOString().split('T')[0],
       });
    }
    setViewMode('FORM');
  };

  const handleAddEntry = () => {
    if(newItem.date && newItem.hours > 0) {
      const proj = projects.find(p => p.id === newItem.projectId);
      const tsk = tasks.find(t => t.id === newItem.taskId);
      
      setFormData({
        ...formData,
        entries: [...(formData.entries || []), { 
            ...newItem, 
            projectName: proj?.name || newItem.projectId, 
            taskTitle: tsk?.title || newItem.taskId 
        }]
      });
      setNewItem({ ...newItem, description: '', hours: 1 });
    }
  };

  const removeEntry = (idx: number) => {
    const updated = [...(formData.entries || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, entries: updated });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Approved</span>
    if (status === 'SUBMITTED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Submitted</span>
    if (status === 'REJECTED') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Rejected</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Timesheets</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> New Timesheet
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Timesheets..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filtered.length > 0 ? `1 of ${filtered.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10"></div>
                     <div className="w-32">Sheet ID</div>
                     <div className="w-48">Employee</div>
                     <div className="w-32">Period</div>
                     <div className="w-32">Status</div>
                     <div className="w-24 text-right">Tot Hrs</div>
                     <div className="flex-1 text-right pr-4">Billable Hrs</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filtered.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <Clock className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No timesheets found.</p>
                        </div>
                     )}
                     {filtered.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10"></div>
                           <div className="w-32 font-medium text-[#1c2126]">{o.id}</div>
                           <div className="w-48 truncate text-[#1c2126]">{team.find(t=>t.id===o.employeeId)?.name || o.employeeId}</div>
                           <div className="w-32 text-[#525c66]">{o.startDate}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="w-24 text-right font-medium text-[#1c2126]">{o.totalHours}</div>
                           <div className="flex-1 text-[#525c66] text-right pr-4">{o.totalBillableHours}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Timesheet'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[950px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Sheet Info</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Employee <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <select required value={formData.employeeId || ''} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="">Select Employee...</option>
                                       {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex gap-4">
                                   <div className="space-y-1.5 flex flex-col flex-1">
                                       <label className="text-xs text-[#525c66]">Start Date</label>
                                       <input type="date" required value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                   </div>
                                   <div className="space-y-1.5 flex flex-col flex-1">
                                       <label className="text-xs text-[#525c66]">End Date</label>
                                       <input type="date" required value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                   </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="DRAFT">Draft</option>
                                       <option value="SUBMITTED">Submitted</option>
                                       <option value="APPROVED">Approved</option>
                                       <option value="REJECTED">Rejected</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Time Entries</h4>
                         <div className="flex gap-2 mb-4 items-center">
                            <input type="date" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-32 focus:outline-none focus:border-[#2490ef]" value={newItem.date} onChange={e => setNewItem({...newItem, date: e.target.value})} />
                            
                            <select className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" value={newItem.projectId || ''} onChange={e => setNewItem({...newItem, projectId: e.target.value})}>
                               <option value="">Project (Optional)</option>
                               {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            <select className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" value={newItem.taskId || ''} onChange={e => setNewItem({...newItem, taskId: e.target.value})}>
                               <option value="">Task (Optional)</option>
                               {tasks.filter(t => !newItem.projectId || t.projectId === newItem.projectId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>

                            <input type="text" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" placeholder="Description..." value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}/>
                            
                            <input type="number" step="0.5" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-20 focus:outline-none focus:border-[#2490ef]" placeholder="Hrs" value={newItem.hours || ''} onChange={e => setNewItem({...newItem, hours: Number(e.target.value)})} />
                            
                            <label className="flex items-center gap-1 text-xs text-[#525c66] ml-2 cursor-pointer">
                               <input type="checkbox" checked={newItem.billable} onChange={e => setNewItem({...newItem, billable: e.target.checked})} className="rounded border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef]"/>
                               Billable
                            </label>

                            <button type="button" onClick={handleAddEntry} className="h-[30px] px-3 ml-2 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">Add</button>
                         </div>
                         
                         {formData.entries && formData.entries.length > 0 && (
                             <table className="w-full mt-4 text-left border-collapse">
                                <thead>
                                   <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Date</th>
                                      <th className="py-2 px-3 font-medium">Project</th>
                                      <th className="py-2 px-3 font-medium">Task</th>
                                      <th className="py-2 px-3 font-medium">Description</th>
                                      <th className="py-2 px-3 font-medium text-center">Billable</th>
                                      <th className="py-2 px-3 font-medium text-right">Hours</th>
                                      <th className="py-2 pr-2 font-medium w-8"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {formData.entries.map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#d1d8dd]/50 tabular-nums">
                                         <td className="py-2 pl-3 text-[#525c66]">{item.date}</td>
                                         <td className="py-2 px-3 font-medium text-[#1c2126]">{item.projectName || '—'}</td>
                                         <td className="py-2 px-3 text-[#525c66]">{item.taskTitle || '—'}</td>
                                         <td className="py-2 px-3 text-[#1c2126] truncate max-w-[200px]">{item.description}</td>
                                         <td className="py-2 px-3 text-center text-[#525c66]">{item.billable ? 'Yes' : 'No'}</td>
                                         <td className="py-2 px-3 text-right font-medium">{item.hours}</td>
                                         <td className="py-2 pr-2 text-right">
                                            <button type="button" onClick={() => removeEntry(idx)} className="text-[#ef4444] hover:text-[#dc2626]"><Trash2 className="w-3.5 h-3.5"/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                         )}
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default TimesheetComp;
