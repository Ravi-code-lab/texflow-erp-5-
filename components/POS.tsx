import React, { useState, useMemo } from 'react';
import { POSInvoice, POSInvoiceItem, InventoryItem, CompanyInfo } from '../types';
import { 
  Search, Plus, Monitor, 
  User, CreditCard, Banknote, HelpCircle, 
  MoreHorizontal, ArrowLeft, Save, Trash2, Printer, 
  ShoppingCart, X, Minus
} from 'lucide-react';

interface POSProps {
  posInvoices: POSInvoice[];
  inventory: InventoryItem[];
  companyInfo: CompanyInfo;
  onAdd: (inv: POSInvoice) => void;
  onUpdate: (inv: POSInvoice) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const POS: React.FC<POSProps> = ({ 
  posInvoices, inventory, companyInfo, onAdd, onUpdate, onDelete, currency = '₹'
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<POSInvoice>>({
    status: 'DRAFT', items: [], paymentMethod: 'CASH',
    date: new Date().toISOString().split('T')[0],
    subTotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0
  });

  const [newItemModel, setNewItemModel] = useState({ productName: '', quantity: 1, rate: 0, discount: 0 });

  const filtered = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (posInvoices || []).filter(o => 
      (o.id || '').toLowerCase().includes(searchLower) ||
      (o.customerName || '').toLowerCase().includes(searchLower)
    );
  }, [posInvoices, filter]);

  const recalculateTotals = (items: POSInvoiceItem[]) => {
    let sub = 0;
    let disc = 0;
    items.forEach(i => {
      sub += (i.rate * i.quantity);
      disc += i.discount;
    });
    
    // Simplistic tax calculation (assumed 12%) or leave as is if we don't have GST field
    const tax = 0; // Using zero for simplicity right now
    const grand = sub - disc + tax;
    
    setFormData(prev => ({ ...prev, subTotal: sub, discountTotal: disc, taxTotal: tax, grandTotal: grand }));
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.items || formData.items.length === 0) return;

    const oData = {
      ...formData,
      cashier: formData.cashier || 'Admin',
      status: 'PAID', // In POS it's Paid immediately usually
      id: formData.id || `POS-${Date.now().toString().slice(-4)}`,
    } as POSInvoice;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    // Reset back to list or clear for next customer
    setViewMode('LIST');
  };

  const openForm = (o?: POSInvoice) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'DRAFT', items: [], paymentMethod: 'CASH', cashier: 'Admin',
         date: new Date().toISOString().split('T')[0],
         subTotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0
       });
    }
    setViewMode('FORM');
  };

  const handleAddItem = (productName: string) => {
    const defaultProduct = inventory.find(i => i.name === productName);
    if(productName) {
      const items = [...(formData.items || [])];
      
      const existing = items.findIndex(i => i.productName === productName);
      if(existing >= 0) {
         items[existing].quantity += 1;
         items[existing].amount = items[existing].quantity * items[existing].rate - items[existing].discount;
      } else {
         const rate = defaultProduct?.pricePerUnit || 0;
         const qty = 1;
         const discount = 0;
         items.push({ productName, quantity: qty, rate, discount, amount: qty * rate - discount });
      }
      
      setFormData({ ...formData, items });
      recalculateTotals(items);
      setNewItemModel({ productName: '', quantity: 1, rate: 0, discount: 0 });
    }
  };

  const removeItem = (idx: number) => {
    const items = [...(formData.items || [])];
    items.splice(idx, 1);
    setFormData({ ...formData, items });
    recalculateTotals(items);
  };

  const updateItemQty = (idx: number, delta: number) => {
    const items = [...(formData.items || [])];
    if (items[idx].quantity + delta > 0) {
       items[idx].quantity += delta;
       items[idx].amount = items[idx].quantity * items[idx].rate - items[idx].discount;
       setFormData({ ...formData, items });
       recalculateTotals(items);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">POS Invoices</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> New Sale (POS)
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Invoices..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.length === 0 && (
                     <div className="col-span-full px-4 py-12 flex flex-col items-center justify-center text-[#525c66] bg-white border border-[#d1d8dd] rounded shadow-sm">
                        <Monitor className="w-8 h-8 text-[#d1d8dd] mb-3" />
                        <p className="text-[13px]">No recent POS sales found.</p>
                     </div>
                  )}
                  {filtered.map((v) => (
                     <div key={v.id} onClick={() => openForm(v)} className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-[#2490ef]/50 hover:shadow transition-all cursor-pointer">
                         <div className="p-4 flex flex-col h-full">
                             <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-[15px] text-[#1c2126]">{v.id}</h4>
                                <span className={`px-2 py-[2px] rounded-md text-[10px] font-bold tracking-wide uppercase ${v.status === 'PAID' ? 'bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0]' : 'bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a]'}`}>{v.status}</span>
                             </div>
                             <p className="text-[12px] text-[#525c66] font-medium mb-3">{v.customerName || 'Walk-in Customer'}</p>
                             
                             <div className="mt-auto pt-3 border-t border-[#d1d8dd]/50 flex justify-between items-center tabular-nums">
                                <div className="text-[12px] text-[#525c66]">{v.paymentMethod}</div>
                                <div className="font-bold text-[#1c2126] text-[15px]">{currency}{v.grandTotal?.toLocaleString()}</div>
                             </div>
                         </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
       ) : (
          <div className="flex h-full animate-fade-in relative">
             {/* Left side: Items & Catalogue */}
             <div className="flex-1 flex flex-col min-w-0 bg-[#f4f5f6] border-r border-[#d1d8dd]">
                 <div className="flex-none bg-white border-b border-[#d1d8dd] px-4 py-3 h-14 flex items-center justify-between shadow-sm z-10 relative">
                     <div className="flex items-center gap-3 w-full">
                        <button onClick={() => setViewMode('LIST')} className="h-8 w-8 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                        <div className="relative flex-1 max-w-md">
                           <input type="text" list="pos-inventory-list" placeholder="Scan or search item..." 
                               className="w-full h-8 pl-9 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all"
                               onKeyDown={e => {
                                  if(e.key === 'Enter') {
                                     handleAddItem(e.currentTarget.value);
                                     e.currentTarget.value = '';
                                  }
                               }}
                               onChange={e => {
                                  if(inventory.some(i => i.name === e.target.value)){
                                    handleAddItem(e.target.value);
                                    e.target.value = '';
                                  }
                               }}
                           />
                           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                           <datalist id="pos-inventory-list">{inventory.map(x => <option key={x.id} value={x.name}/>)}</datalist>
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex-1 overflow-auto p-4">
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                         {inventory.filter(i => i.type === 'FABRIC' || i.type === 'ACCESSORY').map(item => (
                             <div key={item.id} onClick={() => handleAddItem(item.name)} 
                                className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-[#2490ef] hover:shadow-md cursor-pointer transition-all flex flex-col p-3 active:scale-95">
                                 <div className="h-16 bg-[#f4f5f6] rounded mb-2 flex items-center justify-center text-[#8d99a6] text-[10px] uppercase font-bold tracking-wider relative overflow-hidden">
                                     {item.name.substring(0,2)}
                                 </div>
                                 <h5 className="text-[12px] font-semibold text-[#1c2126] leading-tight line-clamp-2 min-h-[30px]">{item.name}</h5>
                                 <div className="mt-1 flex justify-between items-end">
                                     <span className="text-[#8d99a6] text-[10px]">{item.quantity} {item.unit}</span>
                                     <span className="font-bold text-[#1c2126] text-[13px] tabular-nums">{currency}{item.pricePerUnit}</span>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             {/* Right side: Cart / Receipt */}
             <div className="w-[380px] flex-none bg-white flex flex-col h-full relative z-20 shadow-[-4px_0_15px_-5px_rgba(0,0,0,0.05)]">
                 <div className="flex-none p-4 border-b border-[#d1d8dd]">
                     <div className="flex gap-2">
                         <div className="flex-1 relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8d99a6]" />
                            <input type="text" placeholder="Walk-in Customer" value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full h-9 pl-9 pr-3 text-[13px] bg-[#f4f5f6] border border-transparent rounded focus:outline-none focus:bg-white focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all" />
                         </div>
                     </div>
                     <div className="flex gap-2 mt-2">
                        <input type="text" placeholder="Phone (optional)" value={formData.customerPhone || ''} onChange={e => setFormData({...formData, customerPhone: e.target.value})} className="w-full h-8 px-3 text-[12px] bg-[#f4f5f6] border border-transparent rounded focus:outline-none focus:bg-white focus:border-[#2490ef]" />
                     </div>
                 </div>

                 {/* Cart Items */}
                 <div className="flex-1 overflow-auto bg-[#fafafa]">
                    <div className="divide-y divide-[#d1d8dd]/50">
                        {(!formData.items || formData.items.length === 0) && (
                            <div className="p-8 text-center text-[#8d99a6]">
                                <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                <p className="text-[13px]">Cart is empty</p>
                            </div>
                        )}
                        {formData.items?.map((item, idx) => (
                            <div key={idx} className="p-3 bg-white">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-[13px] text-[#1c2126]">{item.productName}</h4>
                                    <button onClick={() => removeItem(idx)} className="text-[#8d99a6] hover:text-[#ef4444]"><X className="w-4 h-4"/></button>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="flex border border-[#d1d8dd] rounded">
                                            <button onClick={() => updateItemQty(idx, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#f4f5f6] text-[#525c66] border-r border-[#d1d8dd]"><Minus className="w-3.5 h-3.5"/></button>
                                            <div className="w-9 h-7 flex items-center justify-center text-[13px] font-semibold">{item.quantity}</div>
                                            <button onClick={() => updateItemQty(idx, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-[#f4f5f6] text-[#525c66] border-l border-[#d1d8dd]"><Plus className="w-3.5 h-3.5"/></button>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-[#1c2126] text-[14px] tabular-nums">{currency}{item.amount.toLocaleString()}</div>
                                        <div className="text-[11px] text-[#8d99a6] tabular-nums">{currency}{item.rate} / ea</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </div>

                 {/* Totals & Pay */}
                 <div className="flex-none p-4 bg-white border-t border-[#d1d8dd]">
                     <div className="space-y-2 mb-4 text-[13px]">
                         <div className="flex justify-between text-[#525c66]">
                             <span>Sub Total</span>
                             <span className="tabular-nums">{currency}{(formData.subTotal || 0).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between text-[#525c66]">
                             <span>Discount</span>
                             <span className="tabular-nums">-{currency}{(formData.discountTotal || 0).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between font-bold text-[18px] text-[#1c2126] pt-2 border-t border-[#d1d8dd]/50 mt-2">
                             <span>Total</span>
                             <span className="tabular-nums text-[#2490ef]">{currency}{(formData.grandTotal || 0).toLocaleString()}</span>
                         </div>
                     </div>

                     <div className="grid grid-cols-4 gap-2 mb-4">
                         <button onClick={() => setFormData({...formData, paymentMethod: 'CASH'})} className={`flex flex-col items-center justify-center h-14 rounded-md border text-[11px] font-medium transition-colors ${formData.paymentMethod === 'CASH' ? 'bg-[#eff6ff] border-[#2490ef] text-[#2490ef]' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                             <Banknote className="w-5 h-5 mb-1"/> Cash
                         </button>
                         <button onClick={() => setFormData({...formData, paymentMethod: 'CARD'})} className={`flex flex-col items-center justify-center h-14 rounded-md border text-[11px] font-medium transition-colors ${formData.paymentMethod === 'CARD' ? 'bg-[#eff6ff] border-[#2490ef] text-[#2490ef]' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                             <CreditCard className="w-5 h-5 mb-1"/> Card
                         </button>
                         <button onClick={() => setFormData({...formData, paymentMethod: 'UPI'})} className={`flex flex-col items-center justify-center h-14 rounded-md border text-[11px] font-medium transition-colors ${formData.paymentMethod === 'UPI' ? 'bg-[#eff6ff] border-[#2490ef] text-[#2490ef]' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                             <span className="font-bold text-[14px] mb-[2px]">UPI</span> UPI
                         </button>
                         <button onClick={() => setFormData({...formData, paymentMethod: 'OTHER'})} className={`flex flex-col items-center justify-center h-14 rounded-md border text-[11px] font-medium transition-colors ${formData.paymentMethod === 'OTHER' ? 'bg-[#eff6ff] border-[#2490ef] text-[#2490ef]' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                             <HelpCircle className="w-5 h-5 mb-1"/> Other
                         </button>
                     </div>

                     <div className="flex gap-2">
                        <button type="button" onClick={() => window.print()} className="h-12 w-12 flex items-center justify-center bg-[#f4f5f6] border border-[#d1d8dd] text-[#1c2126] rounded-lg hover:bg-[#e2e6ea] transition-colors">
                            <Printer className="w-5 h-5"/>
                        </button>
                        <button onClick={handleCreate} disabled={!formData.items || formData.items.length === 0} className="flex-1 h-12 bg-[#10b981] hover:bg-[#059669] text-white rounded-lg text-[15px] font-bold shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            Complete Sale
                        </button>
                     </div>
                 </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default POS;
