import React, { useState, useMemo } from 'react';
import { LeaveRequest, TeamMember } from '../types';
import { 
  Search, Plus, BookOpen, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, X, Check
} from 'lucide-react';

interface LeaveApplicationProps {
  leaves: LeaveRequest[];
  team: TeamMember[];
  onAddLeave: (leave: LeaveRequest) => void;
  onUpdateLeave: (leave: LeaveRequest) => void;
  onDeleteLeave: (id: string) => void;
}

const LeaveApplication: React.FC<LeaveApplicationProps> = ({ 
  leaves, team, onAddLeave, onUpdateLeave, onDeleteLeave
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  
  const [formData, setFormData] = useState<Partial<LeaveRequest>>({
    status: 'PENDING',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const filteredLeaves = useMemo(() => {
    return leaves.filter(l => {
      const emp = team.find(t => t.id === l.employeeId);
      const name = emp ? emp.name.toLowerCase() : '';
      const match = name.includes(filter.toLowerCase());
      return statusFilter === 'ALL' ? match : (match && l.status === statusFilter);
    });
  }, [leaves, team, filter, statusFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    const data = {
      ...formData,
      id: formData.id || `LVE-${Date.now().toString().slice(-4)}`
    } as LeaveRequest;

    if (formData.id) onUpdateLeave(data);
    else onAddLeave(data);
    
    setViewMode('LIST');
  };

  const openForm = (l?: LeaveRequest) => {
    if (l) setFormData(l);
    else setFormData({
      status: 'PENDING',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'APPROVED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Approved</span>
    if (status === 'REJECTED') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Rejected</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Pending</span>
  };

  const calculateDays = (start: string, end: string) => {
    if (!start || !end) return 0;
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, diff / (1000 * 3600 * 24)) + 1;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Leave Application</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredLeaves.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Plus className="w-4 h-4" /> Add Leave Application
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <select className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] transition-all" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
                         <option value="ALL">All Status</option>
                         <option value="PENDING">Pending</option>
                         <option value="APPROVED">Approved</option>
                         <option value="REJECTED">Rejected</option>
                      </select>
                      <div className="relative">
                         <input type="text" placeholder="Search Employee" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredLeaves.length > 0 ? `1 of ${filteredLeaves.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-48">Leave ID</div>
                     <div className="w-64">Employee</div>
                     <div className="w-48">Date Range</div>
                     <div className="w-24">Days</div>
                     <div className="flex-1">Status</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredLeaves.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <BookOpen className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No leaves found.</p>
                        </div>
                     )}
                     {filteredLeaves.map((l) => (
                        <div key={l.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(l)}>
                           <div className="w-48 font-medium text-[#1c2126]">{l.id}</div>
                           <div className="w-64 truncate text-[#1c2126] font-medium">{team.find(t => t.id === l.employeeId)?.name || 'Unknown'}</div>
                           <div className="w-48 text-[#525c66]">{l.startDate} to {l.endDate}</div>
                           <div className="w-24 font-semibold">{calculateDays(l.startDate, l.endDate)}</div>
                           <div className="flex-1 flex justify-between items-center">
                              {getStatusBadge(l.status)}
                              {l.status === 'PENDING' && (
                                <div className="space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={(e) => { e.stopPropagation(); onUpdateLeave({...l, status: 'APPROVED'}); }} className="p-1 text-[#10b981] hover:bg-[#10b981]/10 rounded"><Check className="w-4 h-4"/></button>
                                  <button onClick={(e) => { e.stopPropagation(); onUpdateLeave({...l, status: 'REJECTED'}); }} className="p-1 text-[#ef4444] hover:bg-[#ef4444]/10 rounded"><X className="w-4 h-4"/></button>
                                </div>
                              )}
                           </div>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">{formData.id ? formData.id : 'New Leave Application'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[650px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Details</h4>
                         <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Employee</label>
                                    <select required value={formData.employeeId || ''} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                      <option value="">Select Employee...</option>
                                      {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Reason</label>
                                    <textarea rows={3} value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Start Date</label>
                                    <input type="date" required value={formData.startDate || ''} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">End Date</label>
                                    <input type="date" required value={formData.endDate || ''} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                         </div>
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default LeaveApplication;
