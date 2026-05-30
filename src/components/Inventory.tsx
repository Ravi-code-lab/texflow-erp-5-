import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, MaterialType, InventoryRoll, Order, ProductionJob, Design } from '../types';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowLeft, Save, Trash2, List, Sparkles, Scroll
} from 'lucide-react';
import SmartPurchase from './SmartPurchase';

interface InventoryProps {
  items: InventoryItem[];
  orders?: Order[];
  production?: ProductionJob[];
  designs?: Design[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const Inventory: React.FC<InventoryProps> = ({ 
  items, orders = [], production = [], designs = [], onAdd, onUpdate, onDelete, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'SMART'>('LIST');
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    type: MaterialType.FABRIC, unit: 'METER', quantity: 0, minStockLevel: 0, pricePerUnit: 0,
    inwardDate: new Date().toISOString().split('T')[0], rolls: []
  });
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCustomFields(parsed.filter((f: any) => f.docType === 'InventoryItem'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [viewMode]);

  const filteredItems = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return items.filter(item => {
      const name = item.name || '';
      const location = item.location || '';
      const id = item.id || '';
      return name.toLowerCase().includes(searchLower) || 
             location.toLowerCase().includes(searchLower) ||
             id.toLowerCase().includes(searchLower);
    });
  }, [items, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const item = { 
      ...formData, 
      id: formData.id || `INV-${Date.now().toString().slice(-6)}`, 
      updatedAt: new Date().toISOString() 
    } as InventoryItem;

    if (formData.id) onUpdate(item); 
    else onAdd(item);
    
    setViewMode('LIST');
    setFormData({ type: MaterialType.FABRIC, unit: 'METER', quantity: 0, minStockLevel: 0, pricePerUnit: 0, inwardDate: new Date().toISOString().split('T')[0], rolls: [] });
  };

  const openForm = (i?: InventoryItem) => {
    if (i) {
      setFormData(i);
    } else {
      setFormData({ type: MaterialType.FABRIC, unit: 'METER', quantity: 0, minStockLevel: 0, pricePerUnit: 0, inwardDate: new Date().toISOString().split('T')[0], rolls: [] });
    }
    setViewMode('FORM');
  };

  // ───────────────────────────────────────────────────────────────────────────
  // ERPNEXT (FRAPPE) FULL UI RECREATION
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Raw Material Item</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredItems.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => setViewMode('SMART')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Smart Purchase
                     </button>
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Item
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
                            placeholder="ID, Name, or Location"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredItems.length > 0 ? `1 of ${filteredItems.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── LIST BODY ─── */}
            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Item Code</span></div>
                     <div className="w-72"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Item Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Item Group</span></div>
                     <div className="w-24 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Actual Qty</span></div>
                     <div className="w-16 text-center"><span className="text-transparent">UOM</span></div>
                     <div className="flex-1 min-w-0 pl-10"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Valuation</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredItems.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <List className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No items found.</p>
                        </div>
                     )}
                     {filteredItems.map((item) => (
                        <div key={item.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(item)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(item.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(item.id);
                                   else newSet.delete(item.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 text-[#525c66] truncate font-medium">{item.id}</div>
                           <div className="w-72 pr-4 truncate">
                              <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {item.name}
                              </a>
                           </div>
                           <div className="w-32 truncate text-[#525c66]">{item.type}</div>
                           <div className="w-24 text-right tabular-nums text-[#1c2126]">{item.quantity}</div>
                           <div className="w-16 text-center text-[#525c66] uppercase text-xs">{item.unit}</div>
                           <div className="flex-1 pl-10 text-[#525c66] truncate tabular-nums">{currency}{(item.quantity * item.pricePerUnit).toLocaleString()}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : viewMode === 'SMART' ? (
          <div className="flex flex-col h-full animate-fade-in">
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex items-center gap-3 h-8">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        Smart Purchase Recommendations
                     </span>
               </div>
             </div>
             <div className="flex-1 overflow-auto p-5 pb-16">
                 <SmartPurchase production={production} designs={designs} inventory={items} />
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
                        {formData.id ? formData.name : 'New Item'}
                     </span>
                     {formData.id && (
                         <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">
                            Enabled
                         </span>
                     )}
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

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Stock Ledger</a>
                     </div>
                     <div className="flex items-center gap-1">
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Print</button>
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Menu</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">

                     {/* Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Item Group & Units</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Item Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                   <input 
                                      value={formData.name || ''} 
                                      onChange={e => setFormData({...formData, name: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Item Group</label>
                                   <div className="relative">
                                      <select 
                                         value={formData.type || MaterialType.FABRIC} 
                                         onChange={e => setFormData({...formData, type: e.target.value as any})}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                      >
                                          <option value="FABRIC">Fabric</option>
                                          <option value="YARN">Yarn</option>
                                          <option value="DYE">Chemicals/Dye</option>
                                          <option value="ACCESSORY">Accessories</option>
                                      </select>
                                      <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                   </div>
                                </div>
                            </div>
                            
                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Default UOM</label>
                                   <div className="relative">
                                      <select 
                                         value={formData.unit || 'METER'} 
                                         onChange={e => setFormData({...formData, unit: e.target.value as any})}
                                         className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                      >
                                          <option value="METER">Meter</option>
                                          <option value="KG">Kilogram</option>
                                          <option value="YARD">Yard</option>
                                      </select>
                                      <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                   </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Default Warehouse</label>
                                   <input 
                                      value={formData.location || ''} 
                                      onChange={e => setFormData({...formData, location: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>

                         </div>
                     </div>

                     {/* Valuation Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex items-center justify-between border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Stock and Valuation</h4>
                         </div>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Opening Quantity</label>
                                   <input 
                                      type="number"
                                      value={formData.quantity || 0} 
                                      onChange={e => setFormData({...formData, quantity: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Minimum Order Qty</label>
                                   <input 
                                      type="number"
                                      value={formData.minStockLevel || 0} 
                                      onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                   />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Valuation Rate</label>
                                   <input 
                                      type="number"
                                      value={formData.pricePerUnit || 0} 
                                      onChange={e => setFormData({...formData, pricePerUnit: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                   />
                                </div>
                                <div className="pt-4 border-t border-[#d1d8dd]/60 mt-2">
                                  <div className="flex justify-between items-center text-sm font-medium">
                                      <span className="text-[#525c66]">Valuation</span>
                                      <span className="text-[#1c2126]">{currency}{((formData.quantity || 0) * (formData.pricePerUnit || 0)).toLocaleString()}</span>
                                  </div>
                                </div>
                            </div>
                         </div>
                     </div>

                     {customFields.length > 0 && (
                         <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                             <div className="flex items-center justify-between border-b border-[#d1d8dd] pb-2 mb-5">
                                 <h4 className="font-semibold text-sm text-[#1c2126]">Custom Fields</h4>
                             </div>
                             <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                               {customFields.map((f: any) => (
                                  <div key={f.id} className="space-y-1.5 flex flex-col">
                                     <label className="text-xs text-[#525c66]">{f.label} {f.required && <span className="text-[#ef4444] ml-0.5">*</span>}</label>
                                     {f.type === 'select' ? (
                                     <div className="relative">
                                        <select 
                                           required={f.required}
                                           className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                           value={(formData as any)[f.key] || ''}
                                           onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                                        >
                                           <option value="">{f.placeholder}</option>
                                           {f.options.map((opt: string) => (
                                              <option key={opt} value={opt}>{opt}</option>
                                           ))}
                                        </select>
                                        <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                     </div>
                                     ) : (
                                        <input 
                                           required={f.required}
                                           type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                           className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                           placeholder={f.placeholder}
                                           value={(formData as any)[f.key] || ''}
                                           onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                                        />
                                     )}
                                  </div>
                               ))}
                             </div>
                         </div>
                     )}

                     {/* Hidden button to capture enter press */}
                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};
export default Inventory;
