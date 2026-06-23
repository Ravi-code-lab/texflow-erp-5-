import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Transaction, Customer, Supplier } from '../types';
import { 
  FileText, Plus, Search, Printer, History, CheckCircle2, ShieldCheck, 
  Banknote, Calendar, ArrowLeft, Filter, ChevronLeft, ChevronRight, 
  MoreHorizontal, Download, ArrowUpRight, ArrowDownLeft, Trash2, Settings, Save
} from 'lucide-react';

interface CreditDebitNotesProps {
  type: 'CREDIT' | 'DEBIT';
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddNote: (note: Transaction) => void;
  currency?: string;
}

const CreditDebitNotes: React.FC<CreditDebitNotesProps> = ({ 
  type, transactions, customers, suppliers, onAddNote, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: type === 'CREDIT' ? 'EXPENSE' : 'INCOME',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN',
    paymentMethod: 'ADJUSTMENT',
    description: '',
    referenceId: ''
  });

  const filteredNotes = useMemo(() => {
    const searchLower = filter.toLowerCase();
    const subType = type === 'CREDIT' ? 'CREDIT_NOTE' : 'DEBIT_NOTE';
    
    return transactions.filter(t => {
      if (t.subType !== subType) return false;
      
      const matchSearch = t.description?.toLowerCase()?.includes(searchLower) || 
                          (t.id || '').toLowerCase().includes(searchLower) ||
                          (t.referenceId || '').toLowerCase().includes(searchLower);
                          
      if (categoryFilter === 'ALL') return matchSearch;
      return matchSearch && t.category === categoryFilter;
    });
  }, [transactions, type, filter, categoryFilter]);

  const stats = useMemo(() => {
    const total = filteredNotes.reduce((s, n) => s + n.amount, 0);
    return { total, count: filteredNotes.length };
  }, [filteredNotes]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.referenceId) return;

    const noteId = formData.id || `${type === 'CREDIT' ? 'CN' : 'DN'}-${uuidShort(8)}`;
    
    const note: Transaction = {
      ...formData,
      id: noteId,
      subType: type === 'CREDIT' ? 'CREDIT_NOTE' : 'DEBIT_NOTE',
      updatedAt: new Date().toISOString()
    } as Transaction;

    onAddNote(note);
    setViewMode('LIST');
    setFormData({
      type: type === 'CREDIT' ? 'EXPENSE' : 'INCOME',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN',
      paymentMethod: 'ADJUSTMENT',
      description: '',
      referenceId: ''
    });
  };

  const getAccountName = (id: string) => {
    if (type === 'CREDIT') return customers.find(c => c.id === id || c.name === id)?.name || id || 'Unknown Customer';
    return suppliers.find(s => s.id === id || s.name === id)?.name || id || 'Unknown Supplier';
  };

  const openForm = (note?: Transaction) => {
    if (note) {
      setFormData(note);
    } else {
      setFormData({
        type: type === 'CREDIT' ? 'EXPENSE' : 'INCOME',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        category: type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN',
        paymentMethod: 'ADJUSTMENT',
        description: '',
        referenceId: ''
      });
    }
    setViewMode('FORM');
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      {viewMode === 'LIST' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* ─── LIST HEADER ─── */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
             <div className="flex justify-between items-center h-8">
                <div className="flex items-center gap-3">
                   <span className="text-xl text-[#1c2126] font-bold tracking-tight">
                     {type === 'CREDIT' ? 'Credit Note Hub' : 'Debit Note Hub'}
                   </span>
                   <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredNotes.length}</span>
                </div>
                <div className="flex items-center gap-2">
                   <button 
                     onClick={() => openForm()} 
                     className={`h-7 px-3 flex items-center gap-1.5 ${type === 'CREDIT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'} border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1`}
                   >
                      <Plus className="w-4 h-4" />
                      Add {type === 'CREDIT' ? 'Credit' : 'Debit'} Note
                   </button>
                </div>
             </div>
             
             {/* ─── FILTER BAR ─── */}
             <div className="flex justify-between items-center mt-3 h-8">
                <div className="flex items-center gap-2">
                    <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] shadow-sm">
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] shadow-sm">
                      <Filter className="w-3.5 h-3.5" /> Filter
                    </button>
                    <div className="relative">
                       <input
                          type="text"
                          placeholder={`Search ${type.toLowerCase()} notes, reference, reasons...`}
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] placeholder-[#8d99a6]"
                       />
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                    </div>
                    <select 
                      className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                       <option value="ALL">All Categories</option>
                       <option value={type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN'}>
                         {type === 'CREDIT' ? 'Sales Return' : 'Purchase Return'}
                       </option>
                       <option value="RATE_DIFFERENCE">Rate Difference</option>
                       <option value="GOODS_DAMAGE">Goods Quality Adjustment</option>
                       <option value="DISCOUNT">Discount Adjustment</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[13px] text-[#525c66]">{filteredNotes.length > 0 ? `1 of ${filteredNotes.length}` : '0 of 0'}</span>
                   <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                      <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                      <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                   </div>
                </div>
             </div>
          </div>

          {/* ─── SUMMARY GRID ─── */}
          <div className="px-5 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
              <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${type === 'CREDIT' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                          {type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5"/> : <ArrowUpRight className="w-5 h-5"/>}
                      </div>
                      <div>
                          <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Adjustment Magnitude</p>
                          <h3 className={`text-lg font-bold ${type === 'CREDIT' ? 'text-rose-600' : 'text-amber-600'} tabular-nums`}>{currency}{stats.total.toLocaleString()}</h3>
                      </div>
                  </div>
              </div>
              <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded">
                          <FileText className="w-5 h-5"/>
                      </div>
                      <div>
                          <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Note Count</p>
                          <h3 className="text-lg font-bold text-slate-800 tabular-nums">{stats.count} Committed</h3>
                      </div>
                  </div>
              </div>
          </div>

          {/* ─── LIST BODY ─── */}
          <div className="flex-1 overflow-auto p-5 pb-10">
             <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                {/* Table Header */}
                <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                   <div className="w-10">
                      <input type="checkbox" className="rounded-sm border-[#d1d8dd] w-3.5 h-3.5 cursor-pointer"/>
                   </div>
                   <div className="w-44"><span>Note ID</span></div>
                   <div className="w-64"><span>Linked Account Node</span></div>
                   <div className="w-36"><span>Posting Date</span></div>
                   <div className="w-56"><span>Adjustment Protocol</span></div>
                   <div className="flex-1 min-w-0 text-right pr-12"><span>Value Adjustment</span></div>
                </div>
                
                {/* Table Body */}
                <div className="divide-y divide-[#d1d8dd]/60">
                   {filteredNotes.length === 0 && (
                      <div className="px-4 py-16 flex flex-col items-center justify-center text-[#525c66]">
                         <FileText className="w-12 h-12 text-[#d1d8dd] mb-3" />
                         <p className="text-[13px] font-semibold text-slate-400">No active {type.toLowerCase()} notes.</p>
                      </div>
                   )}
                   {filteredNotes.map((note) => (
                      <div 
                        key={note.id} 
                        className="group flex items-center px-4 py-[11px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]"
                        onClick={() => openForm(note)}
                      >
                         <div className="w-10" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={checkedIds.has(note.id)}
                              onChange={(e) => {
                                 const newSet = new Set(checkedIds);
                                 if(e.target.checked) newSet.add(note.id);
                                 else newSet.delete(note.id);
                                 setCheckedIds(newSet);
                              }}
                              className="rounded-sm border-[#d1d8dd] w-3.5 h-3.5 cursor-pointer"
                            />
                         </div>
                         <div className="w-44 pr-2 font-medium">
                             <span className={`font-mono font-bold ${type === 'CREDIT' ? 'text-rose-600' : 'text-amber-600'} selection:bg-rose-100 group-hover:underline`}>
                               #{note.id}
                            </span>
                         </div>
                         <div className="w-64 pr-4 truncate font-semibold text-[#1c2126]">
                           {getAccountName(note.referenceId || '')}
                         </div>
                         <div className="w-36 truncate text-[#525c66]">{note.date}</div>
                         <div className="w-56 truncate text-xs font-semibold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block max-w-[200px]">
                           {note.category?.replace('_', ' ')}
                         </div>
                         <div className={`flex-1 text-right pr-12 font-bold ${type === 'CREDIT' ? 'text-rose-600' : 'text-amber-600'} truncate tabular-nums`}>
                           {currency}{(note.amount || 0).toLocaleString()}
                         </div>
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
                   <span className="text-xl text-[#1c2126] font-bold tracking-tight truncate max-w-lg">
                      {formData.id ? formData.id : `New ${type === 'CREDIT' ? 'Credit Note Protocol' : 'Debit Note Protocol'}`}
                   </span>
                </div>
                <div className="flex items-center gap-2">
                   <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] shadow-sm">
                      Cancel
                   </button>
                   <button onClick={handleSave} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                      <Save className="w-3.5 h-3.5" />
                      Commit Note
                   </button>
                </div>
             </div>
           </div>

           {/* ─── FORM BODY ─── */}
           <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
               <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                   
                   {/* Target Account Info */}
                   <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                       <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Target Account details</h4>
                       <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                           <div className="space-y-4 col-span-2 md:col-span-1">
                               <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66] font-bold uppercase">Account Counter-Party <span className="text-[#ef4444] ml-0.5">*</span></label>
                                   <select 
                                     required 
                                     className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs font-semibold"
                                     value={formData.referenceId || ''}
                                     onChange={e => setFormData({...formData, referenceId: e.target.value})}
                                   >
                                       <option value="">Select Account...</option>
                                       {type === 'CREDIT' 
                                         ? customers.map(c => <option key={c.id} value={c.id}>{c.name} (Customer)</option>)
                                         : suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (Supplier)</option>)
                                       }
                                   </select>
                               </div>
                           </div>

                           <div className="space-y-4 col-span-2 md:col-span-1">
                               <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66] font-bold uppercase">Note ID Series</label>
                                   <input 
                                     type="text" 
                                     placeholder={`e.g. ${type === 'CREDIT' ? 'CN-1002' : 'DN-1002'} (Auto-generated if empty)`}
                                     value={formData.id || ''} 
                                     onChange={e => setFormData({...formData, id: e.target.value})}
                                     className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded font-mono text-xs focus:outline-none focus:border-[#2490ef] text-[#1c2126]"
                                   />
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Pricing & Ledger Impact Info */}
                   <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                       <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Ledger Value Adjustment</h4>
                       <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                           <div className="space-y-4">
                               <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66] font-bold uppercase">Adjustment Amount ({currency}) <span className="text-[#ef4444] ml-0.5">*</span></label>
                                   <input 
                                     type="number" 
                                     required 
                                     placeholder="0.00"
                                     value={formData.amount || ''} 
                                     onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                                     className={`w-full px-2.5 py-1.5 bg-slate-950 font-black tracking-tight text-lg rounded focus:outline-none focus:ring-2 focus:ring-[#2490ef] ${type === 'CREDIT' ? 'text-red-400' : 'text-amber-400'}`}
                                   />
                               </div>
                           </div>

                           <div className="space-y-4">
                               <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66] font-bold uppercase">Adjustment Reason / Type</label>
                                   <select 
                                      value={formData.category || (type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN')} 
                                      onChange={e => setFormData({...formData, category: e.target.value})}
                                      className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs font-semibold"
                                   >
                                       <option value={type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN'}>
                                         {type === 'CREDIT' ? 'Sales Return' : 'Purchase Return'}
                                       </option>
                                       <option value="RATE_DIFFERENCE">Rate Difference</option>
                                       <option value="GOODS_DAMAGE">Goods Quality Damage</option>
                                       <option value="DISCOUNT">Discount Adjustment</option>
                                       <option value="OTHER">Other Adjustments</option>
                                   </select>
                               </div>
                           </div>

                           <div className="space-y-4 col-span-2">
                               <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66] font-bold uppercase">Posting Date</label>
                                   <input 
                                     type="date" 
                                     required 
                                     value={formData.date || ''} 
                                     onChange={e => setFormData({...formData, date: e.target.value})}
                                     className="w-1/2 px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none text-xs focus:border-[#2490ef] text-[#1c2126]"
                                   />
                               </div>
                           </div>
                       </div>
                   </div>

                   {/* Narration */}
                   <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                       <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Particulars / Narration</h4>
                       <div className="space-y-4">
                           <div className="space-y-1.5 flex flex-col">
                               <label className="text-xs text-[#525c66] font-bold uppercase">Particulars Description <span className="text-[#ef4444] ml-0.5">*</span></label>
                               <textarea 
                                 required
                                 rows={3}
                                 placeholder="Write auditing description, e.g. Credit booked as rate difference adjust against INV-402..."
                                 value={formData.description || ''} 
                                 onChange={e => setFormData({...formData, description: e.target.value})}
                                 className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] text-xs font-medium"
                               />
                           </div>
                       </div>
                   </div>

                   <div className="bg-blue-50/50 border border-blue-100 p-4 rounded flex gap-3">
                       <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0"/>
                       <p className="text-[11px] text-blue-800 font-bold uppercase tracking-wide leading-relaxed">
                         Finalizing this transaction immediately applies adjustments on the ledger books of the selected party. Once authorized, it creates an immutable audit protocol node.
                       </p>
                   </div>

                   <button type="submit" className="hidden">Submit</button>
               </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default CreditDebitNotes;
