import React, { useState, useMemo } from 'react';
import { StockTransfer as StockEntry, InventoryItem } from '../types';
import { 
  Search, Plus, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, Trash2, ArrowRightLeft, MapPin
} from 'lucide-react';

interface StockTransferProps {
  inventory: InventoryItem[];
  transfers: StockEntry[];
  onAdd: (transfer: StockEntry) => void;
  onUpdate: (transfer: StockEntry) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const StockTransfer: React.FC<StockTransferProps> = ({ 
  inventory, transfers, onAdd, onUpdate, onDelete, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<StockEntry>>({
    fromGodown: '', toGodown: '', items: [], status: 'PENDING', date: new Date().toISOString().split('T')[0]
  });

  const [newItem, setNewItem] = useState({ sku: '', quantity: 1, unit: 'PCS' });

  const filteredTransfers = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (transfers || []).filter(t => 
      (t.id || '').toLowerCase().includes(searchLower) || 
      (t.fromGodown || '').toLowerCase().includes(searchLower) ||
      (t.toGodown || '').toLowerCase().includes(searchLower)
    );
  }, [transfers, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fromGodown || !formData.toGodown || !formData.items?.length) return;
    
    const trxData = {
      ...formData,
      id: formData.id || `STE-${Date.now().toString().slice(-4)}`,
      totalItems: formData.items.reduce((sum, i) => sum + i.quantity, 0),
      updatedAt: new Date().toISOString()
    } as StockEntry;

    if (formData.id) onUpdate(trxData);
    else onAdd(trxData);
    
    setViewMode('LIST');
  };

  const openForm = (t?: StockEntry) => {
    if (t) {
       setFormData(t);
    } else {
       setFormData({
         fromGodown: '', toGodown: '', items: [], status: 'PENDING', date: new Date().toISOString().split('T')[0]
       });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'COMPLETED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Completed</span>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Stock Entry</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredTransfers.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Stock Entry
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
                            placeholder="ID or Godown"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredTransfers.length > 0 ? `1 of ${filteredTransfers.length}` : '0 of 0'}</span>
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
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Entry Name</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Source Warehouse</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Target Warehouse</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredTransfers.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <ArrowRightLeft className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No stock entries found.</p>
                        </div>
                     )}
                     {filteredTransfers.map((trx) => (
                        <div key={trx.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(trx)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(trx.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(trx.id);
                                   else newSet.delete(trx.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {trx.id}
                              </a>
                           </div>
                           <div className="w-48 pr-4 truncate text-[#1c2126] font-medium">{trx.fromGodown}</div>
                           <div className="w-48 pr-4 truncate text-[#1c2126] font-medium">{trx.toGodown}</div>
                           <div className="w-32">{getStatusBadge(trx.status)}</div>
                           <div className="w-32 text-[#525c66]">{trx.date?.split('T')[0]}</div>
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
                        {formData.id ? formData.id : 'New Stock Entry'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'DRAFT')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onDelete && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDelete(formData.id!); setViewMode('LIST'); }} 
                            className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                         </button>
                     )}
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleSave} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Stock Entry Type</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Source Warehouse</label>
                                    <input 
                                      value={formData.fromGodown || ''} 
                                      onChange={e => setFormData({...formData, fromGodown: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input 
                                      type="date"
                                      value={formData.date || ''} 
                                      onChange={e => setFormData({...formData, date: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Target Warehouse</label>
                                    <input 
                                      value={formData.toGodown || ''} 
                                      onChange={e => setFormData({...formData, toGodown: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select 
                                       value={formData.status || 'DRAFT'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Items Table */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Code</th>
                                  <th className="py-2 px-3 font-medium text-xs">Quantity</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#fdfdfd]">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">{it.sku}</td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.quantity} {it.unit}</td>
                                     <td className="py-2 pr-3 text-right">
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== idx) }))} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                               <tr className="bg-[#fdfdfd] border-b border-[#d1d8dd]">
                                  <td className="py-2 pl-3 border-r border-[#d1d8dd]">
                                      <input list="inv-list" className="w-full bg-transparent text-[13px] outline-none" placeholder="Item Name or SKU" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} />
                                      <datalist id="inv-list">{inventory.map(i => <option key={i.id} value={i.name}/>)}</datalist>
                                  </td>
                                  <td className="py-2 px-3 border-r border-[#d1d8dd]">
                                      <input type="number" className="w-full bg-transparent text-[13px] outline-none" placeholder="Qty" value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                                  </td>
                                  <td className="py-2 pl-3 text-center">
                                      <button type="button" onClick={() => { if(newItem.sku && newItem.quantity) { setFormData({...formData, items: [...(formData.items || []), newItem]}); setNewItem({sku:'', quantity:1, unit:'PCS'}); } }} className="text-[#2490ef] font-medium hover:underline text-[13px]">Add Row</button>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                     </div>

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default StockTransfer;
