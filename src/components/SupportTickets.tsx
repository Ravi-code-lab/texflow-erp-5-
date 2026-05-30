import React, { useState, useMemo } from 'react';
import { SupportTicket, Customer } from '../types';
import { 
  Search, Plus, PhoneCall, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, AlertTriangle, AlertOctagon, CheckCircle2
} from 'lucide-react';

interface SupportTicketProps {
  tickets: SupportTicket[];
  customers: Customer[];
  onAdd: (req: SupportTicket) => void;
  onUpdate: (req: SupportTicket) => void;
  onDelete: (id: string) => void;
}

const SupportTicketsComp: React.FC<SupportTicketProps> = ({ 
  tickets, customers, onAdd, onUpdate, onDelete
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    status: 'OPEN',
    priority: 'MEDIUM',
    date: new Date().toISOString().split('T')[0],
  });

  const filteredTickets = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (tickets || []).filter(o => 
      (o.customerName || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower) ||
      (o.subject || '').toLowerCase().includes(searchLower)
    );
  }, [tickets, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject) return;

    const oData = {
      ...formData,
      id: formData.id || `TKT-${Date.now().toString().slice(-4)}`,
    } as SupportTicket;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: SupportTicket) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'OPEN',
         priority: 'MEDIUM',
         date: new Date().toISOString().split('T')[0],
       });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RESOLVED' || status === 'CLOSED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
    if (status === 'IN_PROGRESS') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">In Progress</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };
  
  const getPriorityIcon = (priority: string) => {
    if (priority === 'CRITICAL') return <AlertOctagon className="w-3.5 h-3.5 text-red-500" />;
    if (priority === 'HIGH') return <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />;
    if (priority === 'LOW') return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    return <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />;
  }

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Support Tickets</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredTickets.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> New Ticket
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Tickets..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredTickets.length > 0 ? `1 of ${filteredTickets.length}` : '0 of 0'}</span>
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
                     <div className="w-32">Ticket ID</div>
                     <div className="w-10"></div>
                     <div className="w-64">Customer</div>
                     <div className="w-48">Subject</div>
                     <div className="w-32">Status</div>
                     <div className="flex-1 text-right pr-4">Date</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredTickets.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <PhoneCall className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No support tickets found.</p>
                        </div>
                     )}
                     {filteredTickets.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10"></div>
                           <div className="w-32 font-medium text-[#1c2126]">{o.id}</div>
                           <div className="w-10" title={o.priority}>{getPriorityIcon(o.priority)}</div>
                           <div className="w-64 truncate text-[#1c2126]">{o.customerName || 'N/A'}</div>
                           <div className="w-48 truncate text-[#525c66] font-medium">{o.subject}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="flex-1 text-[#525c66] text-right pr-4">{o.date}</div>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Ticket'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer</label>
                                    <select value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                      <option value="">Select Customer...</option>
                                      {customers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Subject <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input required value={formData.subject || ''} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Description</label>
                                    <textarea rows={4} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input type="date" required value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Priority</label>
                                    <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="CRITICAL">Critical</option>
                                       <option value="HIGH">High</option>
                                       <option value="MEDIUM">Medium</option>
                                       <option value="LOW">Low</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="OPEN">Open</option>
                                       <option value="IN_PROGRESS">In Progress</option>
                                       <option value="RESOLVED">Resolved</option>
                                       <option value="CLOSED">Closed</option>
                                    </select>
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

export default SupportTicketsComp;
