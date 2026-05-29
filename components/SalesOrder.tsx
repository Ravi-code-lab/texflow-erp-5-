import React, { useState, useMemo, useEffect } from 'react';
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import { 
  Search, Plus, ShoppingCart, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, Trash2, Calendar, MessageSquare, Printer
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';

interface SalesOrderProps {
  orders: Order[];
  customers: Customer[];
  inventory: InventoryItem[];
  designs: Design[];
  agents: Agent[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const SalesOrder: React.FC<SalesOrderProps> = ({ 
  orders, customers, inventory, designs, agents, 
  onAddOrder, onUpdateOrder, onDeleteOrder, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'PENDING', paymentStatus: 'UNPAID', items: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
    agentCommissionRate: 2, agentCommissionAmount: 0
  });

  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
  const [customFields, setCustomFields] = useState<any[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('erpnext_custom_fields');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setCustomFields(parsed.filter((f: any) => f.docType === 'Order'));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const filteredOrders = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (orders || []).filter(o => 
      (o.customerName || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower)
    );
  }, [orders, filter]);

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
      id: formData.id || `ORD-${Date.now().toString().slice(-4)}`,
      agentCommissionAmount: commissionAmount,
      totalAmount: subTotal + taxAmount
    } as Order;

    if (formData.id) onUpdateOrder(oData);
    else onAddOrder(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: Order) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'PENDING', paymentStatus: 'UNPAID', items: [],
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

  const handleWhatsApp = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const msg = `Order #${order.id} for ${order.customerName} is ${order.status}. Total: ${currency}${order.totalAmount.toLocaleString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'DELIVERED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Delivered</span>
    if (status === 'SHIPPED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Shipped</span>
    if (status === 'SUBMITTED') return <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Submitted</span>
    if (status === 'CANCELLED') return <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Cancelled</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Sales Order</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredOrders.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Sales Order
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
                            placeholder="Name or Order ID"
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
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Order ID</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Customer</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Date</span></div>
                     <div className="flex-1 min-w-0 pl-10 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Grand Total</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredOrders.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <ShoppingCart className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No sales orders found.</p>
                        </div>
                     )}
                     {filteredOrders.map((o) => (
                        <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(o.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(o.id);
                                   else newSet.delete(o.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {o.id}
                              </a>
                           </div>
                           <div className="w-64 pr-4 truncate text-[#1c2126] font-medium">{o.customerName}</div>
                           <div className="w-32">{getStatusBadge(o.status)}</div>
                           <div className="w-48 text-[#525c66]">{o.orderDate}</div>
                           <div className="flex-1 pl-10 text-right pr-4 text-[#1c2126] tabular-nums font-medium">{currency}{o.totalAmount.toLocaleString()}</div>
                           <div className="w-16 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => handleWhatsApp(e, o)} className="text-[#525c66] hover:text-[#1c2126]"><MessageSquare className="w-4 h-4"/></button>
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
                        {formData.id ? formData.id : 'New Sales Order'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'PENDING')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && formData.status === 'PENDING' && (
                         <button type="button" onClick={() => { setFormData({...formData, status: 'SUBMITTED' as any}); handleCreate({ preventDefault: () => {} } as any); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Submit Order
                         </button>
                     )}
                     {formData.id && formData.status !== 'CANCELLED' && (
                         <button type="button" onClick={() => { setFormData({...formData, status: 'CANCELLED' as any}); handleCreate({ preventDefault: () => {} } as any); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#fff1f2] hover:bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#e11d48]/50">
                            Cancel
                         </button>
                     )}
                     {formData.id && onAction && formData.status !== 'CANCELLED' && (
                       <>
                         <button type="button" onClick={() => onAction('CONVERT_TO_DELIVERY_NOTE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Delivery Note
                         </button>
                         <button type="button" onClick={() => onAction('CONVERT_TO_INVOICE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Invoice
                         </button>
                         <button type="button" onClick={() => onAction('CONVERT_TO_WORK_ORDER', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Work Order
                         </button>
                       </>
                     )}
                     {formData.id && onAction && formData.status === 'DELIVERED' && (
                         <button type="button" onClick={() => onAction('CONVERT_TO_SALES_RETURN', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#fff1f2] hover:bg-[#ffe4e6] border border-[#fecdd3] text-[#e11d48] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#e11d48]/50">
                            Create Return
                         </button>
                     )}
                     {formData.id && onDeleteOrder && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDeleteOrder(formData.id!); setViewMode('LIST'); }} 
                            className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                         </button>
                     )}
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
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
                 <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                     
                     {/* ERPNext Workflow Progress Timeline Status Stepper */}
                     {formData.id && (
                        <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5 text-[13px] mb-4 animate-fade-in relative overflow-hidden">
                           <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Frappe Workflow Progress</span>
                              <span className="text-xs text-slate-500 font-medium">State: <span className="font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded ml-1">{formData.status || 'PENDING'}</span></span>
                           </div>
                           <div className="flex items-center w-full px-6 py-2 justify-between relative mt-4">
                              {/* Background Connection Line */}
                              <div className="absolute top-[16px] left-12 right-12 h-[2px] bg-slate-200 z-0"></div>
                              
                              {/* Steps */}
                              {['PENDING', 'SUBMITTED', 'SHIPPED', 'DELIVERED'].map((step, idx) => {
                                 const listStates = ['PENDING', 'SUBMITTED', 'SHIPPED', 'DELIVERED'];
                                 const currentIdx = listStates.indexOf(formData.status || 'PENDING');
                                 const stepIdx = listStates.indexOf(step);
                                 
                                 const isCompleted = stepIdx < currentIdx || formData.status === 'DELIVERED';
                                 const isActive = stepIdx === currentIdx && formData.status !== 'CANCELLED';
                                 
                                 let nodeColor = 'bg-white border-slate-300 text-slate-400 hover:border-[#2490ef] hover:text-[#2490ef]';
                                 if (isActive) {
                                    nodeColor = 'bg-[#2490ef] border-[#2490ef] text-white ring-4 ring-[#2490ef]/10 font-bold scale-105';
                                 } else if (isCompleted) {
                                    nodeColor = 'bg-[#10b981] border-[#10b981] text-white';
                                 }
                                 
                                 return (
                                    <div key={step} className="flex flex-col items-center z-10 relative cursor-pointer group" onClick={() => {
                                       setFormData({...formData, status: step as any});
                                    }}>
                                       <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 text-xs font-semibold ${nodeColor}`}>
                                          {isCompleted && !isActive ? '✓' : idx + 1}
                                       </div>
                                       <span className={`mt-2 text-[10px] font-bold tracking-wide transition-colors ${isActive ? 'text-[#1c2126]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                          {step}
                                       </span>
                                    </div>
                                 );
                               })}
                              
                              {/* Canceled node if applicable */}
                              {formData.status === 'CANCELLED' && (
                                 <div className="flex flex-col items-center z-10 relative">
                                    <div className="w-8 h-8 rounded-full border-2 bg-rose-50 border-rose-500 text-rose-600 flex items-center justify-center text-xs font-bold ring-4 ring-rose-100">
                                       ✕
                                    </div>
                                    <span className="mt-2 text-[10px] font-bold tracking-wide uppercase text-rose-500">
                                       CANCELLED
                                    </span>
                                 </div>
                               )}
                           </div>
                        </div>
                     )}
                     
                     {/* Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Sales Order Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Customer <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <div className="relative">
                                       <select 
                                          required
                                          value={formData.customerName || ''} 
                                          onChange={e => setFormData({...formData, customerName: e.target.value})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="">Select Customer...</option>
                                           {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Order Date <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      type="date"
                                      required
                                      value={formData.orderDate || ''} 
                                      onChange={e => setFormData({...formData, orderDate: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.status || 'PENDING'} 
                                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="PENDING">Pending (Draft)</option>
                                           <option value="SUBMITTED">Submitted</option>
                                           <option value="SHIPPED">Shipped</option>
                                           <option value="DELIVERED">Delivered</option>
                                           <option value="CANCELLED">Cancelled</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Payment Status</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.paymentStatus || 'UNPAID'} 
                                          onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="UNPAID">Unpaid</option>
                                           <option value="PARTIAL">Partial</option>
                                           <option value="PAID">Paid</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Broker Section */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Sales Broker / Agent</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Agent Name</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.agentName || ''} 
                                          onChange={e => setFormData({...formData, agentName: e.target.value})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="">Direct Office Booking</option>
                                           {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Commission Rate (%)</label>
                                    <input 
                                      type="number"
                                      value={formData.agentCommissionRate || 0} 
                                      onChange={e => setFormData({...formData, agentCommissionRate: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                         </div>
                     </div>

                     {/* Custom Fields */}
                     {customFields.length > 0 && (
                        <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                             <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Custom Information</h4>
                             <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                               {customFields.map((f: any) => (
                                 <div key={f.id} className="space-y-1.5 flex flex-col">
                                     <label className="text-xs text-[#525c66]">{f.label}</label>
                                     {f.type === 'select' ? (
                                        <div className="relative">
                                           <select 
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

                     {/* Items Table */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex justify-between items-center border-b border-[#d1d8dd] pb-2 mb-5">
                             <h4 className="font-semibold text-sm text-[#1c2126]">Items Table</h4>
                         </div>
                         <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                                  <th className="py-2 pl-3 font-medium text-xs">Item Description</th>
                                  <th className="py-2 px-3 font-medium text-xs">Quantity</th>
                                  <th className="py-2 px-3 font-medium text-xs">Rate ({currency})</th>
                                  <th className="py-2 px-3 font-medium text-xs text-right">Amount ({currency})</th>
                                  <th className="py-2 pr-3"></th>
                               </tr>
                            </thead>
                            <tbody>
                               {formData.items?.map((it, idx) => (
                                  <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#fdfdfd]">
                                     <td className="py-2 pl-3 text-[#1c2126] font-medium">{it.productName}</td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.quantity} {it.unit}</td>
                                     <td className="py-2 px-3 text-[#525c66]">{it.unitPrice.toLocaleString()}</td>
                                     <td className="py-2 px-3 text-right font-medium text-[#1c2126]">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                     <td className="py-2 pr-3 text-right">
                                        <button type="button" onClick={() => removeItem(idx)} className="text-[#ef4444] hover:bg-[#fef2f2] p-1 rounded">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                     </td>
                                  </tr>
                               ))}
                               <tr className="bg-[#fdfdfd] border-b border-[#d1d8dd]">
                                  <td className="py-2 pl-3 border-r border-[#d1d8dd]">
                                      <input list="prod-list" className="w-full bg-transparent text-[13px] outline-none" placeholder="Item Name or SKU" value={newItem.productName} onChange={e => {
                                         const d = designs.find(des => des.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                                         setNewItem({...newItem, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || 0});
                                      }} />
                                      <datalist id="prod-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name}/>)}</datalist>
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
                                      <button type="button" onClick={handleAddItem} className="text-[#2490ef] font-medium hover:underline text-[13px]">Add Row</button>
                                  </td>
                               </tr>
                            </tbody>
                         </table>
                         
                         <div className="flex justify-end mt-4 pt-4 border-t border-[#d1d8dd]">
                            <div className="flex flex-col gap-2 w-64">
                                <div className="flex justify-between items-center text-[13px] font-medium text-[#1c2126]">
                                    <span>Sub Total</span>
                                    <span>{(formData.items || []).reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px] font-medium text-[#1c2126]">
                                    <span>Taxes and Charges 
                                        <input type="number" className="w-10 ml-2 bg-[#f4f5f6] border border-[#d1d8dd] rounded px-1 py-0.5" value={formData.taxRate} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} />%
                                    </span>
                                    <span>{taxAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[15px] font-bold text-[#1c2126] mt-2 pt-2 border-t border-[#d1d8dd]">
                                    <span>Grand Total</span>
                                    <span>{(subTotal + taxAmount).toLocaleString()}</span>
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

export default SalesOrder;
