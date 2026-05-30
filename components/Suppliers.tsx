import React, { useState, useMemo } from 'react';
import { Supplier, PurchaseOrder, InventoryItem, PurchaseOrderItem, Unit } from '../types';
import { 
  Users, Search, Plus, Phone, MapPin, 
  Trash2, UserCircle, 
  List, Download, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Settings, Check, X
} from 'lucide-react';

interface SuppliersProps {
  suppliers: Supplier[];
  purchaseOrders?: PurchaseOrder[];
  inventory?: InventoryItem[];
  onAddPO?: (po: PurchaseOrder) => void;
  onUpdatePO?: (po: PurchaseOrder) => void;
  onAddSupplier?: (s: Supplier) => void;
  onUpdateSupplier?: (s: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
  currency?: string;
}

const Suppliers: React.FC<SuppliersProps> = ({ 
  suppliers = [], purchaseOrders = [], inventory = [], 
  onAddPO, onUpdatePO, onAddSupplier, onUpdateSupplier, onDeleteSupplier,
  currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  // Check for custom fields optionally saved by the user
  const customFields = useMemo(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try {
        return JSON.parse(raw).filter((f: any) => f.docType === 'Supplier');
      } catch (e) {}
    }
    return [];
  }, [viewMode]);
  
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '', contactPerson: '', email: '', phone: '', location: '', reliabilityScore: 90, materialsProvided: []
  });

  const filteredSuppliers = useMemo(() => {
    const query = filter.toLowerCase();
    return suppliers.filter(s => {
      const name = s.name || '';
      const contactPerson = s.contactPerson || '';
      return name.toLowerCase().includes(query) || 
             contactPerson.toLowerCase().includes(query);
    });
  }, [suppliers, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const supplier = {
      ...formData,
      id: formData.id || `SUP-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as Supplier;

    if (formData.id && onUpdateSupplier) onUpdateSupplier(supplier);
    else onAddSupplier?.(supplier);
    
    setViewMode('LIST');
    setFormData({ name: '', contactPerson: '', email: '', phone: '', location: '', reliabilityScore: 90, materialsProvided: [] });
  };

  const openForm = (s?: Supplier) => {
    if (s) {
       setFormData(s);
    } else {
       setFormData({ name: '', contactPerson: '', email: '', phone: '', location: '', reliabilityScore: 90, materialsProvided: [] });
    }
    setViewMode('FORM');
  };

  const getScoreBadge = (score: number) => {
    const color = score >= 80 ? 'text-[#10b981] bg-[#ecfdf5] border-[#a7f3d0]' : 
                  score >= 60 ? 'text-[#f59e0b] bg-[#fffbeb] border-[#fde68a]' : 
                  'text-[#ef4444] bg-[#fef2f2] border-[#fecaca]';
    return <span className={`px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide border ${color}`}>{score}% Reliable</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Supplier</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredSuppliers.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Supplier
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
                            placeholder="Supplier Name or Contact"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredSuppliers.length > 0 ? `1 of ${filteredSuppliers.length}` : '0 of 0'}</span>
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
                     <div className="flex-1"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Supplier Name</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Contact</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Location</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Score</span></div>
                     <div className="w-16 text-right"></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredSuppliers.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <List className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No suppliers found.</p>
                        </div>
                     )}
                     {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(supplier)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(supplier.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(supplier.id);
                                   else newSet.delete(supplier.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="flex-1 pr-4 truncate flex items-center gap-3">
                              <div className="w-6 h-6 rounded bg-[#f4f5f6] border border-[#d1d8dd] overflow-hidden flex items-center justify-center shrink-0 text-[#8d99a6] text-xs font-bold uppercase">
                                 {supplier.name.charAt(0)}
                              </div>
                              <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none truncate">
                                 {supplier.name}
                              </a>
                           </div>
                           <div className="w-48 pr-2 flex flex-col justify-center">
                               <span className="text-[#1c2126]">{supplier.contactPerson || '-'}</span>
                               {supplier.phone && <span className="text-[#525c66] text-xs">{supplier.phone}</span>}
                           </div>
                           <div className="w-64 pr-2 truncate text-[#525c66]">{supplier.location || '-'}</div>
                           <div className="w-32">{getScoreBadge(supplier.reliabilityScore)}</div>
                           <div className="w-16 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openForm(supplier); }} className="text-[#525c66] hover:text-[#1c2126]"><Settings className="w-4 h-4"/></button>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        {formData.id ? formData.name : 'New Supplier'}
                     </span>
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onDeleteSupplier && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDeleteSupplier(formData.id!); setViewMode('LIST'); }} 
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
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Purchase Orders</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Accounting</a>
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
                     
                     {/* Primary Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Primary Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Supplier Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                   <input 
                                      required
                                      value={formData.name || ''} 
                                      onChange={e => setFormData({...formData, name: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Operating Location</label>
                                   <input 
                                      value={formData.location || ''} 
                                      onChange={e => setFormData({...formData, location: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>
                            
                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Reliability Score</label>
                                   <input 
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={formData.reliabilityScore || 90} 
                                      onChange={e => setFormData({...formData, reliabilityScore: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Contact Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Contact Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            {/* Column 1 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Contact Person</label>
                                   <input 
                                      value={formData.contactPerson || ''} 
                                      onChange={e => setFormData({...formData, contactPerson: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Mobile Number</label>
                                   <input 
                                      value={formData.phone || ''} 
                                      onChange={e => setFormData({...formData, phone: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>
                            
                            {/* Column 2 */}
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                   <label className="text-xs text-[#525c66]">Email Address</label>
                                   <input 
                                      value={formData.email || ''} 
                                      onChange={e => setFormData({...formData, email: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                   />
                                </div>
                            </div>
                         </div>
                     </div>

                      {/* Custom Fields (DocType Integration) */}
                      {customFields.length > 0 && (
                         <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px] animate-fade-in mt-4">
                              <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Custom Information</h4>
                              <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                                {customFields.map((f: any) => (
                                  <div key={f.id} className="space-y-1.5 flex flex-col">
                                      <label className="text-xs text-[#525c66]">{f.label} {f.required && <span className="text-[#ef4444] ml-0.5">*</span>}</label>
                                      {f.type === 'select' ? (
                                         <div className="relative">
                                            <select 
                                               required={f.required}
                                               value={(formData as any)[f.key] || ''}
                                               onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                                               className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                            >
                                                <option value="">{f.placeholder}</option>
                                                {f.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                         </div>
                                      ) : (
                                         <input 
                                            required={f.required}
                                            type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                                            value={(formData as any)[f.key] || ''}
                                            onChange={e => setFormData({...formData, [f.key]: e.target.value})}
                                            className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                            placeholder={f.placeholder}
                                         />
                                      )}
                                  </div>
                                ))}
                              </div>
                         </div>
                      )}

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Suppliers;
