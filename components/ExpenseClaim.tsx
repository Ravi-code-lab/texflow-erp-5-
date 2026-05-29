import React, { useState, useMemo } from 'react';
import { ExpenseClaim, TeamMember } from '../types';
import { 
  Search, Plus, Receipt, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, X, Check
} from 'lucide-react';

interface ExpenseClaimProps {
  claims: ExpenseClaim[];
  team: TeamMember[];
  onAdd: (claim: ExpenseClaim) => void;
  onUpdate: (claim: ExpenseClaim) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const ExpenseClaimComp: React.FC<ExpenseClaimProps> = ({ 
  claims, team, onAdd, onUpdate, onDelete, currency = '₹'
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<ExpenseClaim>>({
    status: 'PENDING',
    date: new Date().toISOString().split('T')[0],
    expenseType: 'TRAVEL',
    amount: 0
  });

  const filteredClaims = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (claims || []).filter(o => 
      (o.employeeId || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower) ||
      (o.description || '').toLowerCase().includes(searchLower)
    );
  }, [claims, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    const oData = {
      ...formData,
      id: formData.id || `EXP-${Date.now().toString().slice(-4)}`,
    } as ExpenseClaim;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: ExpenseClaim) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'PENDING',
         date: new Date().toISOString().split('T')[0],
         expenseType: 'TRAVEL',
         amount: 0
       });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Paid</span>
    if (status === 'APPROVED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Approved</span>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Expense Claim</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredClaims.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> New Claim
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Claims..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredClaims.length > 0 ? `1 of ${filteredClaims.length}` : '0 of 0'}</span>
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
                     <div className="w-32">Claim ID</div>
                     <div className="w-48">Employee</div>
                     <div className="w-48">Type</div>
                     <div className="w-32">Status</div>
                     <div className="w-32 text-right">Amount</div>
                     <div className="flex-1 text-right pr-4">Date</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredClaims.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <Receipt className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No expense claims found.</p>
                        </div>
                     )}
                     {filteredClaims.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10"></div>
                           <div className="w-32 font-medium text-[#1c2126]">{o.id}</div>
                           <div className="w-48 truncate text-[#1c2126]">{team.find(t=>t.id===o.employeeId)?.name || o.employeeId}</div>
                           <div className="w-48 truncate text-[#525c66]">{o.expenseType}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="w-32 text-right tabular-nums font-semibold text-[#1c2126]">{currency}{o.amount.toLocaleString()}</div>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Expense Claim'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && formData.status === 'PENDING' && (
                        <>
                           <button type="button" onClick={() => { setFormData({...formData, status: 'APPROVED'}); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#059669] rounded text-[13px] font-medium transition-colors shadow-sm">
                              Approve
                           </button>
                           <button type="button" onClick={() => { setFormData({...formData, status: 'REJECTED'}); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#fef2f2] hover:bg-[#fee2e2] border border-[#fecaca] text-[#dc2626] rounded text-[13px] font-medium transition-colors shadow-sm">
                              Reject
                           </button>
                        </>
                     )}
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
                                    <label className="text-xs text-[#525c66]">Employee <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <select required value={formData.employeeId || ''} onChange={e => setFormData({...formData, employeeId: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                      <option value="">Select Employee...</option>
                                      {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Type</label>
                                    <select value={formData.expenseType} onChange={e => setFormData({...formData, expenseType: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="TRAVEL">Travel</option>
                                       <option value="MEALS">Meals</option>
                                       <option value="SUPPLIES">Supplies</option>
                                       <option value="OTHER">Other</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Description</label>
                                    <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input type="date" required value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Amount</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525c66]">{currency}</span>
                                      <input type="number" required value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full pl-8 pr-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="DRAFT">Draft</option>
                                       <option value="PENDING">Pending</option>
                                       <option value="APPROVED">Approved</option>
                                       <option value="REJECTED">Rejected</option>
                                       <option value="PAID">Paid</option>
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

export default ExpenseClaimComp;
