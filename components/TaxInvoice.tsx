
import React, { useState, useMemo } from 'react';
import { Order, Customer, InventoryItem, Design, OrderItem } from '../types';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowLeft, Save, Trash2, List, Settings, FileText, Check, X
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

interface TaxInvoiceProps {
  orders: Order[]; // Really invoices
  customers: Customer[];
  inventory?: InventoryItem[];
  designs?: Design[];
  onAddInvoice: (order: Order) => void;
  currency?: string;
}

const TaxInvoice: React.FC<TaxInvoiceProps> = ({ 
  orders, customers, inventory = [], designs = [], onAddInvoice, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 0, unitPrice: 0, unit: 'PIECE' });
  
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'DELIVERED', paymentStatus: 'UNPAID', items: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5
  });

  const invoices = useMemo(() => orders.filter(o => o.id.startsWith('INV')), [orders]);
  
  const filteredInvoices = useMemo(() => {
    return invoices.filter(o => {
      const name = o.customerName || '';
      const id = o.id || '';
      const match = name.toLowerCase().includes(filter.toLowerCase()) || id.toLowerCase().includes(filter.toLowerCase());
      return statusFilter === 'ALL' ? match : (match && o.paymentStatus === statusFilter);
    });
  }, [invoices, filter, statusFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;

    const calculatedTotal = (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const tax = calculatedTotal * ((formData.taxRate || 0) / 100);

    const invData = {
      ...formData,
      id: formData.id || `INV-${Date.now().toString().slice(-4)}`,
      totalAmount: calculatedTotal + tax
    } as Order;

    onAddInvoice(invData);
    setViewMode('LIST');
    setFormData({ items: [], paymentStatus: 'UNPAID', orderDate: new Date().toISOString().split('T')[0], taxRate: 5 });
  };

  const openForm = (inv?: Order) => {
    if (inv) {
      setFormData(inv);
    } else {
      setFormData({ items: [], paymentStatus: 'UNPAID', orderDate: new Date().toISOString().split('T')[0], taxRate: 5 });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'PAID') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Paid</span>
    if (status === 'UNPAID') return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Unpaid</span>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Sales Invoice</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredInvoices.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Sales Invoice
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
                            placeholder="Invoice ID or Customer"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                      <select 
                        className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] transition-all"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                      >
                         <option value="ALL">All Status</option>
                         <option value="UNPAID">Unpaid</option>
                         <option value="PAID">Paid</option>
                      </select>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredInvoices.length > 0 ? `1 of ${filteredInvoices.length}` : '0 of 0'}</span>
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
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Invoice Number</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="flex-1 min-w-0 pl-10"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Grand Total</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredInvoices.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileText className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No invoices found.</p>
                        </div>
                     )}
                     {filteredInvoices.map((inv) => (
                        <div key={inv.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => setSelectedInvoice(inv)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(inv.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(inv.id);
                                   else newSet.delete(inv.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-48 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {inv.id}
                              </a>
                           </div>
                           <div className="w-64 pr-4 truncate text-[#1c2126]">{inv.customerName}</div>
                           <div className="w-32 truncate text-[#525c66]">{inv.orderDate}</div>
                           <div className="w-32 truncate">{getStatusBadge(inv.paymentStatus || 'UNPAID')}</div>
                           <div className="flex-1 pl-10 text-[#525c66] truncate tabular-nums">{currency}{(inv.totalAmount || 0).toLocaleString()}</div>
                           <div className="w-16 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openForm(inv); }} className="text-[#525c66] hover:text-[#1c2126]"><Settings className="w-4 h-4"/></button>
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
                        {formData.id ? formData.id : 'New Sales Invoice'}
                     </span>
                     {formData.id && getStatusBadge(formData.paymentStatus || 'UNPAID')}
                  </div>
                  <div className="flex items-center gap-2">
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50 disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Primary Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Customer & Date</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      list="cust-list" 
                                      required 
                                      value={formData.customerName || ''} 
                                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                    <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Posting Date</label>
                                    <input 
                                      type="date" 
                                      required 
                                      value={formData.orderDate || ''} 
                                      onChange={e => setFormData({...formData, orderDate: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Items</h4>
                         <div className="flex gap-2 mb-4">
                            <input 
                                list="inv-list" 
                                className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]"
                                placeholder="Select Product..."
                                value={newItem.productName || ''}
                                onChange={e => {
                                  const d = designs.find(des => des.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                                  setNewItem({...newItem, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || 0});
                                }}
                            />
                            <datalist id="inv-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name}/>)}</datalist>
                            <input 
                                type="number" 
                                className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded w-20 focus:outline-none focus:border-[#2490ef]" 
                                placeholder="Qty" 
                                value={newItem.quantity || ''} 
                                onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                            />
                            <button 
                                type="button" 
                                onClick={() => { if(newItem.productName && newItem.quantity) { setFormData({...formData, items: [...(formData.items || []), newItem]}); setNewItem({productName:'', quantity:1, unitPrice:0, unit:'PIECE'}); } }} 
                                className="h-[30px] px-3 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold"
                            >
                              Add
                            </button>
                         </div>
                         
                         {formData.items && formData.items.length > 0 && (
                             <table className="w-full mt-4 text-left border-collapse">
                                <thead>
                                   <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Item Code</th>
                                      <th className="py-2 px-3 font-medium text-right">Quantity</th>
                                      <th className="py-2 px-3 font-medium text-right">Rate</th>
                                      <th className="py-2 pr-3 font-medium text-right">Amount</th>
                                      <th className="py-2 pr-2 font-medium w-8"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {formData.items.map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#f4f5f6]/50">
                                         <td className="py-2 pl-3 font-semibold text-[#1c2126]">{item.productName}</td>
                                         <td className="py-2 px-3 text-right">{item.quantity}</td>
                                         <td className="py-2 px-3 text-right">{item.unitPrice}</td>
                                         <td className="py-2 pr-3 text-right tabular-nums">{currency}{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                         <td className="py-2 pr-2 text-right">
                                            <button type="button" onClick={() => { const updated = [...(formData.items || [])]; updated.splice(idx, 1); setFormData({ ...formData, items: updated }); }} className="text-[#ef4444] hover:text-[#dc2626]"><X className="w-3.5 h-3.5"/></button>
                                         </td>
                                      </tr>
                                   ))}
                                   <tr className="bg-[#fcfdfd]">
                                      <td colSpan={3} className="py-3 px-3 text-right font-semibold text-[#525c66]">Total Amount</td>
                                      <td className="py-3 pr-3 text-right font-bold text-[#1c2126] tabular-nums">
                                         {currency}{(formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}
                                      </td>
                                      <td></td>
                                   </tr>
                                </tbody>
                             </table>
                         )}
                     </div>

                     {/* Shipping Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Status</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Payment Status</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.paymentStatus || 'UNPAID'} 
                                          onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="UNPAID">Unpaid</option>
                                           <option value="PAID">Paid</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}

      {/* Basic modal view for an existing invoice */}
      {selectedInvoice && <OrderDetailsModal order={selectedInvoice} customer={customers.find(c => c.name === selectedInvoice.customerName)} onClose={() => setSelectedInvoice(null)} currency={currency} />}
    </div>
  );
};

export default TaxInvoice;

