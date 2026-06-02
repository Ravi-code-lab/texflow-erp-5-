import React, { useState, useMemo } from 'react';
import { InventoryItem, StockAudit } from '../types';
import { 
  Search, Plus, Filter, MoreHorizontal, ArrowLeft, Save, 
  Trash2, ChevronLeft, ChevronRight, FileText, CheckCircle
} from 'lucide-react';

interface PhysicalAuditProps {
  items: InventoryItem[];
  audits: StockAudit[];
  onCommitAudit: (audit: StockAudit) => void;
  currency?: string;
}

const PhysicalAudit: React.FC<PhysicalAuditProps> = ({ 
  items, audits = [], onCommitAudit, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<StockAudit>>({ 
    status: 'DRAFT', 
    items: [], 
    date: new Date().toISOString().split('T')[0],
    godown: 'MAIN WAREHOUSE',
    performedBy: ''
  });

  const filteredAudits = useMemo(() => {
    const q = filter.toLowerCase();
    return audits.filter(a => 
        a.id.toLowerCase().includes(q) || 
        a.godown.toLowerCase().includes(q) ||
        a.performedBy.toLowerCase().includes(q)
    );
  }, [audits, filter]);

  const openForm = (a?: any) => {
     if(a) {
         setFormData(a);
     } else {
         const auditItems = items.map(i => ({
             itemId: i.id,
             name: i.name,
             systemQty: i.quantity,
             physicalQty: i.quantity,
             unit: i.unit,
             variance: 0
         }));

         setFormData({ 
            status: 'DRAFT', 
            items: auditItems, 
            date: new Date().toISOString().split('T')[0], 
            godown: 'MAIN WAREHOUSE',
            performedBy: '' 
         });
     }
     setViewMode('FORM');
  };

  const updatePhysicalQty = (itemId: string, qty: number) => {
    const updatedItems = (formData.items || []).map(item => {
        if (item.itemId === itemId) {
            return {
                ...item,
                physicalQty: qty,
                variance: qty - item.systemQty
            };
        }
        return item;
    });
    setFormData({ ...formData, items: updatedItems });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.godown || !formData.items?.length) return;
    
    // Auto-complete it for this demo, usually Frappe has DRAFT until SUBMIT
    onCommitAudit({
       ...formData,
       id: formData.id || `REC-${Date.now().toString().slice(-4)}`,
       status: 'COMPLETED',
       updatedAt: new Date().toISOString()
    } as StockAudit);
    
    setViewMode('LIST');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Submitted</span>
    if (status === 'DRAFT') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Draft</span>
    return <span className="bg-[#f4f5f6] text-[#525c66] border border-[#d1d8dd] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Stock Reconciliation</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredAudits.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Stock Reconciliation
                     </button>
                  </div>
               </div>
               
               {/* ─── FILTER BAR ─── */}
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <Filter className="w-3.5 h-3.5" /> Filter
                      </button>
                      <div className="relative">
                         <input
                            type="text"
                            placeholder="ID or Location"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredAudits.length > 0 ? `1 of ${filteredAudits.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── LIST BODY ─── */}
            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[800px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">ID</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Warehouse Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Posting Date</span></div>
                     <div className="flex-1 min-w-0 pr-4 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Total Items</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredAudits.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileText className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No stock reconciliation records found.</p>
                        </div>
                     )}
                     {filteredAudits.map((a) => (
                        <div key={a.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(a)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(a.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(a.id);
                                   else newSet.delete(a.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {a.id}
                               </a>
                           </div>
                           <div className="w-64 pr-4 truncate font-medium text-[#1c2126]">{a.godown}</div>
                           <div className="w-32">{getStatusBadge(a.status)}</div>
                           <div className="w-32 text-[#525c66]">{a.date}</div>
                           <div className="flex-1 pr-4 truncate text-[#1c2126] text-right font-medium">{a.items?.length || 0}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             {/* ─── FORM HEADER ─── */}
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        {formData.id ? formData.id : 'New Stock Reconciliation'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'DRAFT')}
                  </div>
                  <div className="flex items-center gap-2">
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     {(!formData.id || formData.status === 'DRAFT') && (
                        <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                           <Save className="w-3.5 h-3.5" />
                           Save & Submit
                        </button>
                     )}
                  </div>
               </div>

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Stock Ledger</a>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Reconciliation Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Default Warehouse <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <select 
                                      value={formData.godown || ''} 
                                      onChange={e => setFormData({...formData, godown: e.target.value})}
                                      className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      disabled={!!formData.id}
                                    >
                                        <option value="MAIN WAREHOUSE">Main Warehouse</option>
                                        <option value="SOUTH GODOWN">South Godown</option>
                                        <option value="UNIT A FLOOR">Unit A Floor</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Performed By (Auditor)</label>
                                    <input 
                                      value={formData.performedBy || ''} 
                                      onChange={e => setFormData({...formData, performedBy: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      disabled={!!formData.id}
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Posting Date <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      type="date"
                                      value={formData.date || ''} 
                                      onChange={e => setFormData({...formData, date: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      disabled={!!formData.id}
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select 
                                       value={formData.status || 'DRAFT'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                       disabled
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="COMPLETED">Submitted</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items</h4>
                             {(!formData.id || formData.status === 'DRAFT') && (
                                <button type="button" className="text-[#2490ef] font-semibold text-xs hover:underline">Download Template</button>
                             )}
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Code / Name</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">System Qty</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Qty After</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Difference (Qty)</th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it: any, idx: number) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">{it.name}</td>
                                     <td className="py-2 px-3 text-[#525c66] tabular-nums text-right">{it.systemQty} {it.unit}</td>
                                     <td className="py-2 px-3 text-[#1c2126] tabular-nums text-right w-32">
                                        <input 
                                           disabled={!!formData.id}
                                           type="number" 
                                           value={it.physicalQty} 
                                           onChange={e => updatePhysicalQty(it.itemId, Number(e.target.value))}
                                           className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-[#d1d8dd] focus:border-[#2490ef] rounded outline-none text-right" 
                                        />
                                     </td>
                                     <td className={`py-2 px-3 tabular-nums text-right font-medium ${it.variance > 0 ? 'text-[#10b981]' : it.variance < 0 ? 'text-[#ef4444]' : 'text-[#8d99a6]'}`}>
                                        {it.variance > 0 ? '+' : ''}{it.variance}
                                     </td>
                                  </tr>
                               ))}
                               {(!formData.items || formData.items.length === 0) && (
                                   <tr>
                                       <td colSpan={4} className="py-6 text-center text-[#525c66]">No items integrated in this reconciliation.</td>
                                   </tr>
                               )}
                            </tbody>
                         </table>
                         <div className="pt-4 flex justify-end">
                            <span className="text-[#525c66] text-xs">Total Items: {formData.items?.length || 0}</span>
                         </div>
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default PhysicalAudit;
