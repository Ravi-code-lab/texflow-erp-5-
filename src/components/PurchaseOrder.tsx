import React, { useState, useMemo } from 'react';
import { PurchaseOrder, Supplier, InventoryItem, PurchaseOrderItem, Unit } from '../types';
import { 
  Search, Plus, ShoppingBag, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, Trash2, Calendar, FileText
} from 'lucide-react';
import ProductImageThumb from './ProductImageThumb';

interface PurchaseOrderProps {
  purchaseOrders: PurchaseOrder[];
  suppliers: Supplier[];
  inventory: InventoryItem[];
  onAddPO: (po: PurchaseOrder) => void;
  onUpdatePO: (po: PurchaseOrder) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const PurchaseOrderComp: React.FC<PurchaseOrderProps> = ({ 
  purchaseOrders, suppliers, inventory, onAddPO, onUpdatePO, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({ items: [], status: 'DRAFT', date: new Date().toISOString().split('T')[0] });
  const [newItem, setNewItem] = useState<PurchaseOrderItem>({ productName: '', quantity: 0, unit: Unit.KG, unitPrice: 0 });

  const filteredOrders = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (purchaseOrders || []).filter(po => 
      (po.supplierName || '').toLowerCase().includes(searchLower) || 
      (po.id || '').toLowerCase().includes(searchLower)
    );
  }, [purchaseOrders, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierId || !formData.items?.length) return;
    const s = suppliers.find(sup => sup.id === formData.supplierId);
    
    const poData = {
      ...formData,
      id: formData.id || `PO-${Date.now().toString().slice(-4)}`,
      supplierName: s?.name || 'Unknown',
      totalAmount: formData.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)
    } as PurchaseOrder;

    if (formData.id) onUpdatePO(poData);
    else onAddPO(poData);
    
    setViewMode('LIST');
  };

  const openForm = (po?: PurchaseOrder) => {
    if (po) {
       setFormData(po);
    } else {
       setFormData({ items: [], status: 'DRAFT', date: new Date().toISOString().split('T')[0] });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'RECEIVED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Received</span>
    if (status === 'ORDERED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Ordered</span>
    if (status === 'CANCELLED') return <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Cancelled</span>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Purchase Order</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredOrders.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Purchase Order
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
                            placeholder="PO ID or Supplier"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredOrders.length > 0 ? `1 of ${filteredOrders.length}` : '0 of 0'}</span>
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
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">PO Name</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Supplier Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="flex-1 min-w-0 pl-10 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Gross Total</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredOrders.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <ShoppingBag className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No purchase orders found.</p>
                        </div>
                     )}
                     {filteredOrders.map((po) => (
                        <div key={po.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(po)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(po.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(po.id);
                                   else newSet.delete(po.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {po.id}
                              </a>
                           </div>
                           <div className="w-64 pr-4 truncate text-[#1c2126] font-medium">{po.supplierName}</div>
                           <div className="w-32">{getStatusBadge(po.status)}</div>
                           <div className="w-48 text-[#525c66]">{po.date}</div>
                           <div className="flex-1 pl-10 text-right pr-4 text-[#1c2126] tabular-nums font-medium">{currency}{po.totalAmount.toLocaleString()}</div>
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
                        {formData.id ? formData.id : 'New Purchase Order'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'DRAFT')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onAction && formData.status !== 'CANCELLED' && (
                       <>
                         <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_RECEIPT', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Receipt
                         </button>
                         <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_INVOICE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Invoice
                         </button>
                       </>
                     )}
                     {formData.id && onAction && formData.status === 'RECEIVED' && (
                         <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_RETURN', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#fff1f2] hover:bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#e11d48]/50">
                            Create Return
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
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Items</a>
                     </div>
                     <div className="flex items-center gap-1">
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Print</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Purchase Order Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Supplier <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <div className="relative">
                                       <select 
                                          required
                                          value={formData.supplierId || ''} 
                                          onChange={e => setFormData({...formData, supplierId: e.target.value})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="">Select Supplier...</option>
                                           {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      type="date"
                                      required
                                      value={formData.date || ''} 
                                      onChange={e => setFormData({...formData, date: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.status || 'DRAFT'} 
                                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="DRAFT">Draft</option>
                                           <option value="ORDERED">Ordered</option>
                                           <option value="RECEIVED">Received</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Items Table */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items Table</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item</th>
                                  <th className="py-2 px-3 font-medium text-xs">Quantity</th>
                                  <th className="py-2 px-3 font-medium text-xs">Rate ({currency})</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Amount ({currency})</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#fdfdfd]">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">
                                        <div className="flex items-center gap-3">
                                          <ProductImageThumb productName={it.productName} inventory={inventory} size="sm" />
                                          <span>{it.productName}</span>
                                        </div>
                                     </td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.quantity}</td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.unitPrice.toLocaleString()}</td>
                                     <td className="py-2 px-3 text-right font-medium text-[#1c2126]">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                     <td className="py-2 pr-3 text-right">
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, items: prev.items?.filter((_, i) => i !== idx) }))} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                               <tr className="bg-[#fdfdfd] border-b border-[#d1d8dd]">
                                  <td className="py-2 pl-3 border-r border-[#d1d8dd]">
                                      <div className="flex items-center gap-3">
                                        <ProductImageThumb productName={newItem.productName} inventory={inventory} size="sm" />
                                        <input list="inv-list" className="w-full bg-transparent text-[13px] outline-none" placeholder="Item Name" value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})} />
                                      </div>
                                      <datalist id="inv-list">{inventory.map(i => <option key={i.id} value={i.name}/>)}</datalist>
                                  </td>
                                  <td className="py-2 px-3 border-r border-[#d1d8dd]">
                                      <input type="number" className="w-full bg-transparent text-[13px] outline-none" placeholder="Qty" value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                                  </td>
                                  <td className="py-2 px-3 border-r border-[#d1d8dd]">
                                      <input type="number" className="w-full bg-transparent text-[13px] outline-none" placeholder="Rate" value={newItem.unitPrice || ''} onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})} />
                                  </td>
                                  <td className="py-2 px-3 text-right text-[#8d99a6]">
                                      {((newItem.quantity || 0) * (newItem.unitPrice || 0)).toLocaleString()}
                                  </td>
                                  <td className="py-2 pl-3 text-center">
                                      <button type="button" onClick={() => { if(newItem.productName && newItem.quantity) { setFormData({...formData, items: [...(formData.items || []), newItem]}); setNewItem({productName:'', quantity:0, unit: Unit.KG, unitPrice:0}); } }} className="text-[#2490ef] font-medium hover:underline text-[13px]">Add Row</button>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                         
                         <div className="flex justify-end mt-4 pt-4 border-t border-[#d1d8dd]">
                            <div className="flex flex-col gap-2 w-64">
                                <div className="flex justify-between items-center text-[13px] font-medium text-[#1c2126]">
                                    <span>Total (INR)</span>
                                    <span className="text-lg">{(formData.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0).toLocaleString()}</span>
                                </div>
                            </div>
                         </div>
                     </div>

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default PurchaseOrderComp;
