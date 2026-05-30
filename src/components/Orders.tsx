import React, { useState, useMemo } from 'react';
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import { 
  Search, Plus, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, ArrowLeft, Save, Trash2, List, Settings, Layers, X, ShoppingCart
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import ListPage, { ColumnDef, TagFilter, BulkAction, StatusBadge } from './shared/ListPage';

interface OrdersProps {
  orders: Order[];
  customers: Customer[];
  inventory: InventoryItem[];
  designs: Design[];
  agents: Agent[];
  onAddOrder: (order: Order) => void;
  onUpdateOrder: (order: Order) => void;
  onDeleteOrder: (id: string) => void;
  currency?: string;
}

const SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

const Orders: React.FC<OrdersProps> = ({ 
  orders, customers, inventory, designs, agents, 
  onAddOrder, onUpdateOrder, onDeleteOrder, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'SHIPPED' | 'DELIVERED' | 'ALL'>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showSizeModal, setShowSizeModal] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'PENDING', paymentStatus: 'UNPAID', items: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5, vehicleNo: '', transportName: '', agentName: ''
  });
  
  const [newItem, setNewItem] = useState<OrderItem>({ productName: '', quantity: 0, unitPrice: 0, unit: 'PIECE', sizeWise: {} });

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const name = o.customerName || '';
      const id = o.id || '';
      const match = name.toLowerCase().includes(filter.toLowerCase()) || id.toLowerCase().includes(filter.toLowerCase());
      return statusFilter === 'ALL' ? match : (match && o.status === statusFilter);
    });
  }, [orders, filter, statusFilter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;

    const calculatedTotal = (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const tax = calculatedTotal * ((formData.taxRate || 0) / 100);

    const orderData = {
      ...formData,
      id: formData.id || `ORD-${Date.now().toString().slice(-4)}`,
      totalAmount: calculatedTotal + tax
    } as Order;

    if (formData.id) onUpdateOrder(orderData);
    else onAddOrder(orderData);

    setViewMode('LIST');
    setFormData({ items: [], status: 'PENDING', orderDate: new Date().toISOString().split('T')[0], taxRate: 5 });
  };

  const openForm = (o?: Order) => {
    if (o) {
      setFormData(o);
    } else {
      setFormData({ items: [], status: 'PENDING', orderDate: new Date().toISOString().split('T')[0], taxRate: 5, paymentStatus: 'UNPAID' });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'DELIVERED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Delivered</span>
    if (status === 'SHIPPED') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Shipped</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Pending</span>
  };

  const orderColumns: ColumnDef<Order>[] = [
    { key: 'id',           label: 'Order ID',    width: 160, render: r => r.id,           sortValue: r => r.id },
    { key: 'customerName', label: 'Customer',    width: 220, render: r => r.customerName, sortValue: r => r.customerName },
    { key: 'orderDate',    label: 'Date',        width: 110, render: r => r.orderDate,     sortValue: r => r.orderDate },
    { key: 'status',       label: 'Status',      width: 120, render: r => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus',label: 'Payment',     width: 110, render: r => <StatusBadge status={r.paymentStatus} />, defaultHidden: true },
    { key: 'agentName',    label: 'Agent',       width: 140, render: r => r.agentName ?? '—', defaultHidden: true },
    { key: 'totalAmount',  label: 'Grand Total',             render: (r, cur) => `${cur}${(r.totalAmount || 0).toLocaleString()}`, sortValue: r => r.totalAmount || 0, align: 'right' },
  ];

  const orderTagFilters: TagFilter[] = [
    { key: 'pending',   label: 'Pending',   match: r => r.status === 'PENDING' },
    { key: 'shipped',   label: 'Shipped',   match: r => r.status === 'SHIPPED' },
    { key: 'delivered', label: 'Delivered', match: r => r.status === 'DELIVERED' },
    { key: 'unpaid',    label: 'Unpaid',    match: r => r.paymentStatus === 'UNPAID' },
  ];

  const orderBulkActions: BulkAction[] = [
    { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: ids => ids.forEach(id => onDeleteOrder(id)) },
  ];

  return (
    <div className="flex flex-col h-full font-sans antialiased absolute inset-0 overflow-hidden">
       {viewMode === 'LIST' ? (
          <ListPage<Order>
            doctype="Sales Order"
            rows={orders}
            columns={orderColumns}
            onRowClick={order => setSelectedOrder(order)}
            onNew={() => openForm()}
            newLabel="New Order"
            searchFields={['id', 'customerName', 'agentName']}
            tagFilters={orderTagFilters}
            bulkActions={orderBulkActions}
            currency={currency}
            emptyIcon={ShoppingCart}
            emptyMessage="No sales orders yet"
          />
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
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50 disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Connections</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
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
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Agent</label>
                                    <input 
                                      list="agent-list" 
                                      value={formData.agentName || ''} 
                                      onChange={e => setFormData({...formData, agentName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                    <datalist id="agent-list">{agents.map(a => <option key={a.id} value={a.name}/>)}</datalist>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Order Date</label>
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

                     {/* Order Items */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <div className="flex items-center justify-between border-b border-[#d1d8dd] pb-2 mb-5">
                            <h4 className="font-semibold text-sm text-[#1c2126]">Items</h4>
                         </div>
                         
                         {/* Item input row */}
                         <div className="flex gap-2 mb-4">
                            <input 
                                list="prod-list" 
                                className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]"
                                placeholder="Select Product..."
                                value={newItem.productName || ''}
                                onChange={e => {
                                  const d = designs.find(des => des.name === e.target.value) || inventory.find(i => i.name === e.target.value);
                                  setNewItem({...newItem, productName: e.target.value, unitPrice: (d as any)?.processCostPerPiece ? (d as any).processCostPerPiece * 1.5 : (d as any)?.pricePerUnit || 0});
                                }}
                            />
                            <datalist id="prod-list">{[...designs, ...inventory].map(x => <option key={x.id} value={x.name}/>)}</datalist>
                            <input 
                                type="number" 
                                className="px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded w-20 focus:outline-none focus:border-[#2490ef]" 
                                placeholder="Qty" 
                                value={newItem.quantity || ''} 
                                readOnly 
                            />
                            <button 
                                type="button" 
                                onClick={() => setShowSizeModal(true)}
                                className="h-[30px] px-3 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded text-xs font-semibold text-[#1c2126]"
                            >
                              Sizes
                            </button>
                            <button 
                                type="button" 
                                onClick={() => { if(newItem.productName && newItem.quantity) { setFormData({...formData, items: [...(formData.items || []), newItem]}); setNewItem({productName:'', quantity:1, unitPrice:0, unit:'PIECE', sizeWise: {}}); } }} 
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
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Status & Transport</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.status || 'PENDING'} 
                                          onChange={e => setFormData({...formData, status: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="PENDING">Pending</option>
                                           <option value="SHIPPED">Shipped</option>
                                           <option value="DELIVERED">Delivered</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Transport Name</label>
                                    <input 
                                      value={formData.transportName || ''} 
                                      onChange={e => setFormData({...formData, transportName: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
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

      {/* Real-time Order Details Viewer Modal keeps existing minimal styled approach but we use the modal component */}
      {selectedOrder && <OrderDetailsModal order={selectedOrder} customer={customers.find(c => c.name === selectedOrder.customerName)} onClose={() => setSelectedOrder(null)} currency={currency} />}

      {/* Size Selection Mini Overlay */}
      {showSizeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
             <div className="bg-white border border-[#d1d8dd] rounded-lg shadow-xl w-[400px] overflow-hidden flex flex-col text-[#1c2126] font-sans text-[13px]">
                <div className="px-4 py-3 border-b border-[#d1d8dd] bg-[#f4f5f6] flex justify-between items-center">
                   <h3 className="font-bold text-sm">Select Sizes & Quantities</h3>
                   <button onClick={() => setShowSizeModal(false)} className="text-[#525c66] hover:text-[#1c2126]"><X className="w-4 h-4"/></button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                   {SIZES.map(size => (
                     <div key={size} className="space-y-1">
                        <label className="text-xs text-[#525c66] ml-1">{size}</label>
                        <input 
                          type="number" 
                          min="0" 
                          className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-semibold" 
                          placeholder="0"
                          value={newItem.sizeWise?.[size] || ''} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            const newSizeWise = { ...(newItem.sizeWise || {}), [size]: val };
                            const total = Object.values(newSizeWise).reduce((s, v) => s + (v || 0), 0);
                            setNewItem({...newItem, sizeWise: newSizeWise, quantity: total});
                          }}
                        />
                     </div>
                   ))}
                </div>
                <div className="px-4 py-3 bg-[#fdfdfd] border-t border-[#d1d8dd] flex justify-between items-center">
                   <div className="font-semibold text-sm">Total: <span className="text-[#2490ef] tabular-nums ml-1">{newItem.quantity} PCS</span></div>
                   <button onClick={() => setShowSizeModal(false)} className="px-4 py-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold shadow-sm transition-colors">Done</button>
                </div>
             </div>
          </div>
      )}
    </div>
  );
};

export default Orders;
