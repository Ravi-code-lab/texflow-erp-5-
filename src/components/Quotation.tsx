import React, { useState, useMemo, useEffect } from 'react';
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import { 
  Search, Plus, FileText, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, MessageSquare
} from 'lucide-react';
import ProductImageThumb from './ProductImageThumb';

interface QuotationProps {
  quotations: Order[];
  customers: Customer[];
  inventory: InventoryItem[];
  designs: Design[];
  agents: Agent[];
  onAddQuotation: (order: Order) => void;
  onUpdateQuotation: (order: Order) => void;
  onDeleteQuotation: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const Quotation: React.FC<QuotationProps> = ({ 
  quotations, customers, inventory, designs, agents, 
  onAddQuotation, onUpdateQuotation, onDeleteQuotation, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'DRAFT', paymentStatus: 'UNPAID', items: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
    agentCommissionRate: 2, agentCommissionAmount: 0
  });

  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });

  const filteredQuotations = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (quotations || []).filter(o => 
      (o.customerName || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower)
    );
  }, [quotations, filter]);

  useEffect(() => {
      if (formData.agentName) {
          const agent = agents.find(a => a.name === formData.agentName);
          if (agent) {
              setFormData(prev => ({ ...prev, agentCommissionRate: agent.commissionRate || 2 }));
          }
      }
  }, [formData.agentName, agents]);

  const subTotal = useMemo(() => (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0), [formData.items]);
  const taxAmount = (subTotal * (formData.taxRate || 5)) / 100;
  const commissionAmount = (subTotal * (formData.agentCommissionRate || 0)) / 100;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;

    const oData = {
      ...formData,
      id: formData.id || `QTN-${Date.now().toString().slice(-4)}`,
      agentCommissionAmount: commissionAmount,
      totalAmount: subTotal + taxAmount
    } as Order;

    if (formData.id) onUpdateQuotation(oData);
    else onAddQuotation(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: Order) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'DRAFT', paymentStatus: 'UNPAID', items: [],
         orderDate: new Date().toISOString().split('T')[0],
         taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
         agentCommissionRate: 2, agentCommissionAmount: 0
       });
    }
    setViewMode('FORM');
  };

  const handleAddItem = () => {
    if(newItem.productName && newItem.quantity > 0) {
      setFormData({
        ...formData,
        items: [...(formData.items || []), { ...newItem }]
      });
      setNewItem({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
    }
  };

  const removeItem = (idx: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'CONVERTED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Converted</span>
    if (status === 'SENT') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Sent</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Quotation</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredQuotations.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> Add Quotation
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <Filter className="w-3.5 h-3.5" /> Filter
                      </button>
                      <div className="relative">
                         <input type="text" placeholder="Name or Quotation ID" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredQuotations.length > 0 ? `1 of ${filteredQuotations.length}` : '0 of 0'}</span>
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
                     <div className="w-32">Quotation ID</div>
                     <div className="w-64">Customer</div>
                     <div className="w-32">Status</div>
                     <div className="w-48">Date</div>
                     <div className="flex-1 text-right pr-4">Grand Total</div>
                  </div>
                  
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredQuotations.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <FileText className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No quotations found.</p>
                        </div>
                     )}
                     {filteredQuotations.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10"></div>
                           <div className="w-32 font-medium text-[#1c2126]">{o.id}</div>
                           <div className="w-64 truncate text-[#1c2126] font-medium">{o.customerName}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="w-48 text-[#525c66]">{o.orderDate}</div>
                           <div className="flex-1 text-right pr-4 text-[#1c2126] tabular-nums font-medium">{currency}{o.totalAmount.toLocaleString()}</div>
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
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Quotation'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onAction && (
                       <button type="button" onClick={() => onAction('CONVERT_TO_SALES_ORDER', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                          Convert to Order
                       </button>
                     )}
                     <button type="button" onClick={() => { if(formData.id) onDeleteQuotation(formData.id); setViewMode('LIST'); }} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-red-50 border border-[#d1d8dd] hover:border-red-200 hover:text-red-600 rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                         <Trash2 className="w-3.5 h-3.5" /> Delete
                     </button>
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Customer & Date</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input list="cust-list" required value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                    <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Date</label>
                                    <input type="date" required value={formData.orderDate || ''} onChange={e => setFormData({...formData, orderDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Valid Until</label>
                                    <input type="date" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" />
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Items</h4>
                         <div className="flex gap-2 mb-4">
                            <input list="prod-list" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" placeholder="Product Name..." value={newItem.productName} onChange={e => {
                                const d = designs.find(x => x.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                                setNewItem({...newItem, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || 0});
                            }}/>
                            <datalist id="prod-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name}/>)}</datalist>
                            <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-20 focus:outline-none focus:border-[#2490ef]" placeholder="Qty" value={newItem.quantity || ''} onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})} />
                            <input type="number" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef]" placeholder="Price" value={newItem.unitPrice || ''} onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})} />
                            <button type="button" onClick={handleAddItem} className="h-[30px] px-3 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">Add</button>
                         </div>
                         
                         {formData.items && formData.items.length > 0 && (
                             <table className="w-full mt-4 text-left border-collapse">
                                <thead>
                                   <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium w-10"></th>
                                      <th className="py-2 pl-3 font-medium">Item</th>
                                      <th className="py-2 px-3 font-medium text-right">Quantity</th>
                                      <th className="py-2 px-3 font-medium text-right">Price</th>
                                      <th className="py-2 pr-3 font-medium text-right">Amount</th>
                                      <th className="py-2 pr-2 font-medium w-8"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {(formData.items || []).map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#d1d8dd]/50">
                                         <td className="py-2 pl-2">
                                           <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                                         </td>
                                         <td className="py-2 pl-3 font-semibold text-[#1c2126]">{item.productName}</td>
                                         <td className="py-2 px-3 text-right">{item.quantity}</td>
                                         <td className="py-2 px-3 text-right">{item.unitPrice}</td>
                                         <td className="py-2 pr-3 text-right">{currency}{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                         <td className="py-2 pr-2 text-right">
                                            <button type="button" onClick={() => removeItem(idx)} className="text-[#ef4444] hover:text-[#dc2626]"><Trash2 className="w-3.5 h-3.5"/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                         )}
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Quotation;
