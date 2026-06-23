import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Order, Customer, OrderItem } from '../types';
import { 
  Plus, Undo2, Calendar, Printer, Box, Check, X, AlertTriangle,
  ArrowLeft, Search, Filter, Save, ChevronLeft, ChevronRight, FileText, Settings, Copy, MoreHorizontal
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import ProductImageThumb from './ProductImageThumb';
import { toast } from "../utils/toast";

interface SalesReturnProps {
  orders: Order[];
  customers: Customer[];
  onAddReturn: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  currency?: string;
  designs?: any[];
  inventory?: any[];
  onUpdateInventory?: (item: any) => void;
  onAddNote?: (note: any) => void;
}

const REASONS = {
  DEFECTIVE: 'Fabric / Printing Imperfections (Mill Accountable)',
  SIZE_FIT: 'Incorrect Size or Fit spec mismatch (Tailor Accountable)',
  DELAYED: 'Delayed delivery / Client cancellation',
  COLOR_SHADE: 'Color Shade or embroidery mismatch',
  NOT_ORDERED: 'Wrong items / shipped by error'
};

const SalesReturn: React.FC<SalesReturnProps> = ({ 
  orders, customers, onAddReturn, onUpdateOrder, currency = '₹', designs = [], inventory = [], onUpdateInventory, onAddNote 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedReturn, setSelectedReturn] = useState<Order | null>(null);
  
  const [autoRestock, setAutoRestock] = useState(true);
  const [autoCreditNote, setAutoCreditNote] = useState(true);
  const [returnReason, setReturnReason] = useState('DEFECTIVE');

  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 1, unitPrice: 0, unit: 'PIECE' });
  const [formData, setFormData] = useState<Partial<Order>>({
    customerName: '',
    status: 'RETURNED',
    paymentStatus: 'REFUND_PENDING',
    items: [],
    orderDate: new Date().toISOString().split('T')[0],
    shippingAddress: ''
  });

  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string>('');

  // Filtering returns (defined as orders starting with 'RET' or status is 'RETURNED')
  const returns = useMemo(() => {
    return orders.filter(o => o.id?.startsWith('RET') || o.status === 'RETURNED');
  }, [orders]);

  const filteredReturns = useMemo(() => {
    return returns.filter(o => {
      const name = o.customerName || '';
      const id = o.id || '';
      const notes = o.shippingAddress || ''; 
      const match = name.toLowerCase().includes(filter.toLowerCase()) || 
                    id.toLowerCase().includes(filter.toLowerCase()) || 
                    notes.toLowerCase().includes(filter.toLowerCase());
      return statusFilter === 'ALL' ? match : (match && o.paymentStatus === statusFilter);
    });
  }, [returns, filter, statusFilter]);

  // List of unique products in invoices to suggest in manual adding
  const uniqueProducts = useMemo(() => {
    const items = new Set<string>();
    orders.forEach(o => {
      o.items?.forEach(i => {
        if (i.productName) items.add(i.productName);
      });
    });
    return Array.from(items);
  }, [orders]);

  // Available invoices for the selected customer to allow linking
  const availableInvoices = useMemo(() => {
    if (!formData.customerName) return [];
    return orders.filter(o => o.id?.startsWith('INV') && o.customerName === formData.customerName);
  }, [orders, formData.customerName]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;

    // Calculate sum of return items
    const calculatedTotal = (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);

    const reasonsText = REASONS[returnReason as keyof typeof REASONS] || returnReason;
    const returnData = {
      ...formData,
      id: formData.id || `RET-${uuidShort(12)}`,
      status: 'RETURNED',
      totalAmount: calculatedTotal,
      agentName: linkedInvoiceId ? `Linked to Invoice #${linkedInvoiceId}` : undefined,
      shippingAddress: `Reason: ${reasonsText}. Remarks: ${formData.shippingAddress || 'None'}`
    } as Order;

    // Call standard list additions
    onAddReturn(returnData);
    // Mark the linked source invoice/order as RETURNED to remove from receivables
    if (linkedInvoiceId && onUpdateOrder) {
      const sourceOrder = orders.find(o => o.id === linkedInvoiceId);
      if (sourceOrder && sourceOrder.status !== 'RETURNED') {
        onUpdateOrder({ ...sourceOrder, status: 'RETURNED' });
      }
    }

    // 1. ERPNext Inventory Restock update trigger
    // Only run for NEW returns (formData.id is absent). Editing an existing return
    // must NOT re-add stock, which would cause double-credit.
    if (!formData.id && autoRestock && onUpdateInventory && inventory && inventory.length > 0) {
      (formData.items || []).forEach(item => {
        const itemLower = item.productName.toLowerCase();
        const matchedInv = inventory.find(i => i.name.toLowerCase() === itemLower);
        if (matchedInv) {
          onUpdateInventory({
            ...(matchedInv as any),
            quantity: Number(matchedInv.quantity || 0) + Number(item.quantity)
          });
        }
      });
    }

    // 2. ERPNext auto Credit Note ledger injection trigger
    if (autoCreditNote && onAddNote) {
      onAddNote({
        id: `CN-${uuidShort(12)}`,
        date: formData.orderDate || new Date().toISOString().split('T')[0],
        description: `Ref Return ${returnData.id} for ${formData.customerName}: ${reasonsText}`,
        amount: calculatedTotal,
        type: 'CREDIT',
        category: 'SALES_RETURN',
        paymentMethod: 'LEDGER_ADJUSTMENT',
        subType: 'CREDIT_NOTE',
        referenceId: returnData.id
      });
    }

    setViewMode('LIST');
    setFormData({ customerName: '', status: 'RETURNED', paymentStatus: 'REFUND_PENDING', items: [], orderDate: new Date().toISOString().split('T')[0], shippingAddress: '' });
    setLinkedInvoiceId('');
  };

  const openForm = (ret?: Order) => {
    if (ret) {
      setFormData(ret);
      const linked = ret.agentName?.match(/Invoice #(\w+-\d+)/);
      if (linked && linked[1]) {
        setLinkedInvoiceId(linked[1]);
      } else {
        setLinkedInvoiceId('');
      }
    } else {
      setFormData({ 
        customerName: '', 
        status: 'RETURNED', 
        paymentStatus: 'REFUND_PENDING', 
        items: [], 
        orderDate: new Date().toISOString().split('T')[0], 
        shippingAddress: '' 
      });
      setLinkedInvoiceId('');
    }
    setViewMode('FORM');
  };

  // Pull All Items from the selected linked invoice
  const handlePullItems = () => {
    if (!linkedInvoiceId) return;
    const inv = orders.find(o => o.id === linkedInvoiceId);
    if (inv && inv.items) {
      // Copy items but allow setting return quantity
      const pulled = (inv.items || []).map(item => ({
        ...item,
        quantity: item.quantity
      }));
      setFormData({
        ...formData,
        items: pulled
      });
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'REFUNDED') {
      return (
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
          Refunded
        </span>
      );
    }
    if (status === 'CREDIT_ADJUSTED') {
      return (
        <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
          Credit Adjusted
        </span>
      );
    }
    return (
      <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase">
        Refund Pending
      </span>
    );
  };

  const parseReason = (addr: string) => {
    if (!addr) return 'General Return';
    const match = addr.match(/Reason: (.*?)\. Remarks:/);
    return match ? match[1] : 'Inward Defect';
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      {viewMode === 'LIST' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* ─── LIST HEADER ─── */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
             <div className="flex justify-between items-center h-8">
                <div className="flex items-center gap-3">
                   <span className="text-xl text-[#1c2126] font-bold tracking-tight">Sales Returns</span>
                   <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredReturns.length}</span>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all active:scale-95">
                      <Plus className="w-4 h-4" />
                      Log Sales Return
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
                          placeholder="Search returns, customers, reasons..."
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] placeholder-[#8d99a6]"
                       />
                       <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                    </div>
                    <select 
                      className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                       <option value="ALL">All Statuses</option>
                       <option value="REFUND_PENDING">Refund Pending</option>
                       <option value="REFUNDED">Refunded</option>
                       <option value="CREDIT_ADJUSTED">Credit Adjusted</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-[13px] text-[#525c66]">{filteredReturns.length > 0 ? `1 of ${filteredReturns.length}` : '0 of 0'}</span>
                   <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                      <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                      <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                   </div>
                </div>
             </div>
          </div>

          {/* ─── LIST BODY ─── */}
          <div className="flex-1 overflow-auto p-5 pb-10">
             <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[950px]">
                {/* Table Header */}
                <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                   <div className="w-10">
                      <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5 cursor-pointer"/>
                   </div>
                   <div className="w-36"><span className="cursor-pointer hover:text-[#1c2126]">Return Ref</span></div>
                   <div className="w-52"><span className="cursor-pointer hover:text-[#1c2126]">Customer</span></div>
                   <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126]">Reason / Fault Code</span></div>
                   <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126]">Posting Date</span></div>
                   <div className="w-36"><span className="cursor-pointer hover:text-[#1c2126]">Status</span></div>
                   <div className="flex-1 min-w-0 text-right pr-6"><span className="cursor-pointer hover:text-[#1c2126]">Return Value</span></div>
                </div>
                
                {/* Table Body */}
                <div className="divide-y divide-[#d1d8dd]/60">
                   {filteredReturns.length === 0 && (
                      <div className="px-4 py-16 flex flex-col items-center justify-center text-[#525c66]">
                         <Undo2 className="w-12 h-12 text-[#d1d8dd] mb-3" />
                         <p className="text-[13px] font-semibold text-slate-400">No Sales Return records match filters.</p>
                      </div>
                   )}
                   {filteredReturns.map((ret) => (
                      <div 
                        key={ret.id} 
                        className="group flex items-center px-4 py-[11px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" 
                        onClick={() => setSelectedReturn(ret)}
                      >
                         <div className="w-10" onClick={(e) => e.stopPropagation()}>
                            <input 
                               type="checkbox" 
                               className="rounded-sm border-[#d1d8dd] w-3.5 h-3.5 cursor-pointer"
                            />
                         </div>
                         <div className="w-36 pr-2 font-medium">
                             <span className="font-semibold text-rose-600 group-hover:underline select-none">
                               {ret.id}
                            </span>
                         </div>
                         <div className="w-52 pr-4 truncate font-semibold text-[#1c2126]">{ret.customerName}</div>
                         <div className="w-64 pr-4 truncate text-xs text-slate-500 flex flex-col justify-center">
                            <span className="font-bold text-slate-800">{parseReason(ret.shippingAddress || '')}</span>
                            <span className="text-[10px] text-slate-400 font-medium italic">{ret.agentName || 'Stand-alone Inward'}</span>
                         </div>
                         <div className="w-32 truncate text-[#525c66]">{ret.orderDate}</div>
                         <div className="w-36 truncate">{getStatusBadge(ret.paymentStatus || 'REFUND_PENDING')}</div>
                         <div className="flex-1 text-right pr-6 text-rose-600 font-bold truncate tabular-nums">
                           {currency}{(ret.totalAmount || 0).toLocaleString()}
                         </div>
                         <div className="w-10 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => openForm(ret)} className="text-[#525c66] hover:text-[#1c2126]"><Settings className="w-4 h-4"/></button>
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
                      {formData.id ? formData.id : 'New Sales Return Node'}
                   </span>
                   {formData.id && getStatusBadge(formData.paymentStatus || 'REFUND_PENDING')}
                </div>
                <div className="flex items-center gap-2">
                   <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] shadow-sm">
                      Cancel
                   </button>
                   <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                      <Save className="w-3.5 h-3.5" />
                      Save Log
                   </button>
                </div>
             </div>
           </div>

           {/* ─── FORM BODY ─── */}
           <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                <form onSubmit={handleCreate} className="w-full max-w-[850px] space-y-4">
                    
                    {/* Customer & Return Info Card */}
                    <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                        <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Customer & Invoice Connection</h4>
                        <div className="grid grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase">Customer Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      list="return-cust-list" 
                                      required 
                                      value={formData.customerName || ''} 
                                      onChange={e => {
                                        setFormData({...formData, customerName: e.target.value, items: []});
                                        setLinkedInvoiceId('');
                                      }}
                                      placeholder="Type customer name..."
                                      className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] text-[#1c2126] font-medium uppercase"
                                    />
                                    <datalist id="return-cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                                </div>

                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase">Link Sales Invoice (ERPNext style)</label>
                                    <div className="flex gap-2">
                                       <select 
                                          value={linkedInvoiceId} 
                                          onChange={e => setLinkedInvoiceId(e.target.value)}
                                          disabled={!formData.customerName}
                                          className="flex-1 px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] text-xs font-semibold appearance-none disabled:bg-slate-50 disabled:text-slate-400"
                                       >
                                           <option value="">-- Standalone Return --</option>
                                           {availableInvoices.map(inv => (
                                               <option key={inv.id} value={inv.id}>{inv.id} ({currency}{(inv.totalAmount || 0).toLocaleString()} - {inv.orderDate})</option>
                                           ))}
                                       </select>
                                       <button 
                                         type="button" 
                                         onClick={handlePullItems}
                                         disabled={!linkedInvoiceId}
                                         className="px-3 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 disabled:opacity-50 disabled:pointer-events-none rounded font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95"
                                       >
                                           <Copy className="w-3.5 h-3.5" /> Pull Items
                                       </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase">Return Posting Date</label>
                                    <input 
                                      type="date" 
                                      required 
                                      value={formData.orderDate || ''} 
                                      onChange={e => setFormData({...formData, orderDate: e.target.value})}
                                      className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] text-xs"
                                    />
                                </div>

                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase">Return Slip No Series</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. RET-1011 (Auto-generated if empty)"
                                      value={formData.id || ''} 
                                      onChange={e => setFormData({...formData, id: e.target.value})}
                                      className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] font-mono text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Item Return Selector and List Table */}
                    <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                        <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Returned Items</h4>
                        
                        {/* Manual Item Input Form */}
                        <div className="flex gap-2 mb-4">
                           <input 
                               list="return-products" 
                               className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded flex-1 focus:outline-none text-xs focus:border-[#2490ef]"
                               placeholder="Select returned design / item..."
                               value={newItem.productName || ''}
                               onChange={e => {
                                 const designObj = designs.find(d => d.name === e.target.value);
                                 const invObj = inventory.find(i => i.name === e.target.value);
                                 const defaultRate = designObj?.processCostPerPiece ? designObj.processCostPerPiece * 1.5 : (invObj?.pricePerUnit || 100);
                                 setNewItem({...newItem, productName: e.target.value, unitPrice: defaultRate});
                               }}
                           />
                           <datalist id="return-products">{uniqueProducts.map(p => <option key={p} value={p}/>)}</datalist>
                           
                           <input 
                               type="number" 
                               className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded w-24 focus:outline-none text-xs focus:border-[#2490ef]" 
                               placeholder="Quantity" 
                               value={newItem.quantity || ''} 
                               onChange={e => setNewItem({...newItem, quantity: Number(e.target.value)})}
                           />
                           <input 
                               type="number" 
                               className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded w-28 focus:outline-none text-xs focus:border-[#2490ef]" 
                               placeholder="Return Rate" 
                               value={newItem.unitPrice || ''} 
                               onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})}
                           />
                           <button 
                               type="button" 
                               onClick={() => { 
                                 if (newItem.productName && newItem.quantity) { 
                                   setFormData({
                                     ...formData, 
                                     items: [...(formData.items || []), newItem]
                                   }); 
                                   setNewItem({productName:'', quantity:1, unitPrice:0, unit:'PIECE'}); 
                                 } 
                               }} 
                               className="px-4 py-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white font-bold rounded text-xs leading-none transition-all active:scale-95"
                           >
                             Add Block
                           </button>
                        </div>
                        
                        {formData.items && formData.items.length > 0 ? (
                            <table className="w-full mt-4 text-left border-collapse border border-[#d1d8dd]/60">
                               <thead>
                                  <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-b border-[#d1d8dd]">
                                     <th className="py-2.5 pl-3 font-semibold">Product Shard</th>
                                     <th className="py-2.5 px-3 font-semibold text-right w-24">Qty Inward</th>
                                     <th className="py-2.5 px-3 font-semibold text-right w-32">Rate Rejected ({currency})</th>
                                     <th className="py-2.5 pr-3 font-semibold text-right w-36">Total Value ({currency})</th>
                                     <th className="py-2.5 pr-2 w-10 text-center"></th>
                                  </tr>
                               </thead>
                               <tbody>
                                  {(formData.items || []).map((item, idx) => (
                                     <tr key={(item as any).id || `item-${idx}`} className="border-b border-[#d1d8dd]/50 hover:bg-[#fcfdfd] text-xs">
                                        <td className="py-2.5 pl-3 font-semibold text-slate-800">
                                           <div className="flex items-center gap-2">
                                              <ProductImageThumb productName={item.productName} designs={designs} inventory={inventory} size="sm" />
                                              <span>{item.productName}</span>
                                           </div>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                           <input 
                                             type="number" 
                                             value={item.quantity}
                                             onChange={e => {
                                               const updated = [...(formData.items || [])];
                                               updated[idx] = { ...item, quantity: Number(e.target.value) };
                                               setFormData({ ...formData, items: updated });
                                             }}
                                             className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right focus:outline-none focus:border-[#2490ef] font-medium"
                                           />
                                        </td>
                                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums">
                                           <input 
                                             type="number" 
                                             value={item.unitPrice}
                                             onChange={e => {
                                               const updated = [...(formData.items || [])];
                                               updated[idx] = { ...item, unitPrice: Number(e.target.value) };
                                               setFormData({ ...formData, items: updated });
                                             }}
                                             className="w-20 px-1.5 py-0.5 border border-slate-200 rounded text-right focus:outline-none focus:border-[#2490ef] font-medium"
                                           />
                                        </td>
                                        <td className="py-2.5 pr-3 text-right font-bold text-rose-600 tabular-nums">
                                           {currency}{(item.quantity * item.unitPrice).toLocaleString()}
                                        </td>
                                        <td className="py-2.5 text-center">
                                           <button 
                                             type="button" 
                                             onClick={() => { 
                                               const updated = [...(formData.items || [])]; 
                                               updated.splice(idx, 1); 
                                               setFormData({ ...formData, items: updated }); 
                                             }} 
                                             className="text-slate-400 hover:text-red-500"
                                           >
                                             <X className="w-4 h-4 mx-auto"/>
                                           </button>
                                        </td>
                                     </tr>
                                  ))}
                                  <tr className="bg-rose-50/50 font-bold border-t border-rose-100">
                                     <td colSpan={3} className="py-3 px-3 text-right text-slate-600 uppercase tracking-wider text-[10px]">Return Value Inward</td>
                                     <td className="py-3 pr-3 text-right text-base text-rose-600 tabular-nums">
                                        {currency}{(formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}
                                     </td>
                                     <td></td>
                                  </tr>
                               </tbody>
                            </table>
                        ) : (
                           <div className="py-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                               <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-rose-400" />
                               <p className="text-xs font-semibold">No products yet. Use "Pull Items from Invoice" or add items above manually.</p>
                           </div>
                        )}
                    </div>

                    {/* Options & Status Card with bookkeeping triggers */}
                    <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                        <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 uppercase tracking-wide">Return Protocol Specifications</h4>
                        
                        {/* GL ledger impact board */}
                        {formData.items && formData.items.length > 0 && (
                          <div className="mb-6 bg-slate-50 border border-slate-200/85 rounded-lg p-4">
                             <div className="flex justify-between items-center mb-3">
                                <div>
                                   <span className="text-[12px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                                      <FileText className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> ERPNext-style Double-Entry General Ledger Postings
                                   </span>
                                   <p className="text-[10px] text-[#8d99a6] font-bold uppercase tracking-widest mt-0.5">Audited trial balance ledger impact before document posting approval</p>
                                </div>
                                <span className="text-[10px] font-mono bg-[#e4fbf0] text-[#0ca873] border border-[#a6f3cc] px-2 py-0.5 rounded font-black uppercase">ledger balanced</span>
                             </div>

                             <div className="border border-[#d1d8dd]/80 rounded overflow-hidden shadow-sm">
                                <table className="w-full text-left border-collapse text-xs">
                                   <thead>
                                      <tr className="bg-slate-100 text-[10px] text-slate-500 font-extrabold uppercase border-b border-slate-200">
                                         <th className="py-2 pl-3">Ledger Posting Account</th>
                                         <th className="py-2 px-3 text-center">Posting Class</th>
                                         <th className="py-2 px-2 text-right">Debit Amt ({currency})</th>
                                         <th className="py-3 pr-3 text-right">Credit Amt ({currency})</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-slate-200/50 font-bold text-slate-700 bg-white leading-relaxed">
                                      <tr>
                                         <td className="py-2.5 pl-3 text-[#1c2126]">4100 - Sales Return Account</td>
                                         <td className="py-2.5 px-3 text-center text-red-600 uppercase text-[9px] font-black">Income Adjustment (-)</td>
                                         <td className="py-2.5 px-2 text-right text-indigo-600 font-extrabold tabular-nums">{currency}{(formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}</td>
                                         <td className="py-2.5 pr-3 text-right text-slate-400">-</td>
                                      </tr>
                                      <tr>
                                         <td className="py-2.5 pl-3 text-[#1c2126]">1200 - Customer Debtors ({formData.customerName || 'Selected Customer'})</td>
                                         <td className="py-2.5 px-3 text-center text-blue-600 uppercase text-[9px] font-black">Asset Decrease (-)</td>
                                         <td className="py-2.5 px-2 text-right text-slate-400">-</td>
                                         <td className="py-2.5 pr-3 text-right text-indigo-600 font-extrabold tabular-nums">{currency}{(formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toLocaleString()}</td>
                                      </tr>
                                      {autoRestock && (
                                        <>
                                          <tr>
                                             <td className="py-2.5 pl-3 text-[#1c2126]">1400 - Raw Materials & FGs Warehouse Store</td>
                                             <td className="py-2.5 px-3 text-center text-emerald-600 uppercase text-[9px] font-black">Asset Increase (+)</td>
                                             <td className="py-2.5 px-2 text-right text-emerald-600 font-extrabold tabular-nums">{currency}{((formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0) * 0.70).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                             <td className="py-2.5 pr-3 text-right text-slate-400">-</td>
                                          </tr>
                                          <tr>
                                             <td className="py-2.5 pl-3 text-[#1c2126]">5100 - Direct Manufacturing Expense Account (COGS)</td>
                                             <td className="py-2.5 px-3 text-center text-amber-600 uppercase text-[9px] font-black">Expense Decrease (-)</td>
                                             <td className="py-2.5 px-2 text-slate-400">-</td>
                                             <td className="py-2.5 pr-3 text-right text-emerald-600 font-extrabold tabular-nums">{currency}{((formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0) * 0.70).toLocaleString(undefined, {maximumFractionDigits:0})}</td>
                                          </tr>
                                        </>
                                      )}
                                   </tbody>
                                </table>
                             </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase select-none">ERP Rejected Reason Code</label>
                                    <select 
                                       value={returnReason} 
                                       onChange={e => setReturnReason(e.target.value)}
                                       className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] font-semibold text-xs shadow-sm"
                                    >
                                        <option value="DEFECTIVE">Fabric / Printing Imperfections (Mill Accountable)</option>
                                        <option value="SIZE_FIT">Incorrect Size or Fit spec mismatch (Tailor Accountable)</option>
                                        <option value="DELAYED">Delayed delivery / Client cancellation</option>
                                        <option value="COLOR_SHADE">Color Shade or embroidery mismatch</option>
                                        <option value="NOT_ORDERED">Wrong items / shipped by error</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase select-none">Settlement/Payment Action</label>
                                    <select 
                                       value={formData.paymentStatus || 'REFUND_PENDING'} 
                                       onChange={e => setFormData({...formData, paymentStatus: e.target.value})}
                                       className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] font-semibold text-xs shadow-sm"
                                    >
                                        <option value="REFUND_PENDING">Refund Pending</option>
                                        <option value="REFUNDED">Refunded</option>
                                        <option value="CREDIT_ADJUSTED">Credit Adjusted / Created Credit Note</option>
                                    </select>
                                </div>
                            </div>
 
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs text-[#525c66] font-bold uppercase block select-none">Automatic Ledger Triggers</label>
                                    <div className="space-y-2 border border-slate-150 rounded p-2.5 bg-slate-50">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1c2126]">
                                            <input 
                                                type="checkbox" 
                                                checked={autoRestock} 
                                                onChange={e => setAutoRestock(e.target.checked)}
                                                className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                            />
                                            <span>Update Inventory Stock on submit</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#1c2126] mt-1.5">
                                            <input 
                                                type="checkbox" 
                                                checked={autoCreditNote} 
                                                onChange={e => setAutoCreditNote(e.target.checked)}
                                                className="rounded border-[#d1d8dd] text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                                            />
                                            <span>Create Credit Note ledger entry</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66] font-bold uppercase select-none">Reason of Rejection / Remarks</label>
                                    <textarea 
                                      rows={2}
                                      placeholder="e.g. Broken seams, defective warp threads, delivery delayed..."
                                      value={formData.shippingAddress || ''} 
                                      onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                                      className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-[#1c2126] text-xs font-medium"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="hidden">Submit</button>
                </form>
            </div>
         </div>
       )}

       {/* Selected Sales Return Detailed Drawer / Modal */}
       {selectedReturn && (
          <OrderDetailsModal 
            order={selectedReturn} 
            customer={customers.find(c => c.name === selectedReturn.customerName)} 
            onClose={() => setSelectedReturn(null)} 
            currency={currency} 
            designs={designs} 
            inventory={inventory} 
          />
       )}
     </div>
   );
};

export default SalesReturn;
