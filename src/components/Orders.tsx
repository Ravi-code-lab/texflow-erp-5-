import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import {
  ArrowLeft, Save, Trash2, X, ShoppingCart, Copy,
  ChevronRight, CreditCard, Truck, Package, FileText, MoreVertical,
  MessageSquare, Printer, Phone
} from 'lucide-react';
import OrderDetailsModal from './OrderDetailsModal';
import ListPage, { ColumnDef, TagFilter, BulkAction, StatusBadge } from './ListPage';
import { resolveProductImage } from './ProductImageThumb';

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

const PAYMENT_TERMS = ['Net 30', 'Net 60', 'Net 90', '50% Advance', '100% Advance', 'On Delivery'];

type FormTab = 'details' | 'items' | 'taxes' | 'payment' | 'shipping' | 'more';

const Orders: React.FC<OrdersProps> = ({
  orders, customers, inventory, designs, agents,
  onAddOrder, onUpdateOrder, onDeleteOrder, currency = '₹'
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState('');
  const [activeTab, setActiveTab] = useState<FormTab>('details');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showCommissionBar, setShowCommissionBar] = useState(false);

  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'PENDING', paymentStatus: 'UNPAID', items: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
    paymentTerms: '', dueDate: '', additionalDiscount: 0,
  });

  const [newItem, setNewItem] = useState<OrderItem>({
    productName: '', quantity: 0, unitPrice: 0, unit: 'PIECE', sizeWise: {},
    discount: 0, description: '',
  } as any);

  // ── Computed totals ──
  const subTotal = useMemo(() =>
    (formData.items || []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0), [formData.items]);

  const additionalDiscountAmt = useMemo(() => {
    const ad = formData.additionalDiscount || 0;
    return ad > 0 ? (subTotal * ad / 100) : 0;
  }, [subTotal, formData.additionalDiscount]);

  const taxableAmount = subTotal - additionalDiscountAmt;
  const taxAmt = taxableAmount * ((formData.taxRate || 0) / 100);
  const grandTotal = taxableAmount + taxAmt;

  // ── Selected customer info ──
  const selectedCustomer = useMemo(() =>
    customers.find(c => c.name === formData.customerName), [customers, formData.customerName]);

  // ── Agent commission ──
  const commissionAmt = useMemo(() => {
    const agent = agents.find(a => a.name === formData.agentName);
    if (!agent || !(agent as any).commissionRate) return 0;
    return grandTotal * ((agent as any).commissionRate / 100);
  }, [agents, formData.agentName, grandTotal]);

  const handleCreate = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.customerName || !formData.items?.length) return;
    const orderData = {
      ...formData,
      id: formData.id || `ORD-${uuidShort(12)}`,
      totalAmount: grandTotal,
    } as Order;
    if (formData.id) onUpdateOrder(orderData);
    else onAddOrder(orderData);
    setViewMode('LIST');
    resetForm();
  };

  const resetForm = () => {
    setFormData({ items: [], status: 'PENDING', orderDate: new Date().toISOString().split('T')[0], taxRate: 5, paymentStatus: 'UNPAID', additionalDiscount: 0 });
    setActiveTab('details');
  };

  const openForm = (o?: Order) => {
    setFormData(o ? { ...o } : { items: [], status: 'PENDING', orderDate: new Date().toISOString().split('T')[0], taxRate: 5, paymentStatus: 'UNPAID', additionalDiscount: 0 });
    setActiveTab('details');
    setViewMode('FORM');
  };

  const duplicateOrder = (o: Order) => {
    const dup = { ...o, id: '', status: 'PENDING' as any, paymentStatus: 'UNPAID' as any, orderDate: new Date().toISOString().split('T')[0] };
    onAddOrder({ ...dup, id: `ORD-${uuidShort(12)}` } as Order);
  };

  const shareWhatsApp = () => {
    const msg = `Hello ${formData.customerName},\nYour Order *#${formData.id || 'New'}* - Amount: ${currency}${grandTotal.toFixed(0)}\n- Ravi-Textile`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Column definitions ──
  const orderColumns: ColumnDef<Order>[] = [
    { key: 'id',           label: 'Order ID',      width: 150, render: r => r.id,           sortValue: r => r.id },
    { key: 'customerName', label: 'Customer',       width: 200, render: r => r.customerName, sortValue: r => r.customerName },
    { key: 'orderDate',    label: 'Date',           width: 110, render: r => r.orderDate,    sortValue: r => r.orderDate },
    { key: 'poNo',         label: 'PO No.',         width: 110, render: r => (r as any).poNo ?? '—', defaultHidden: true },
    { key: 'agentName',    label: 'Agent',          width: 130, render: r => r.agentName ?? '—', defaultHidden: true },
    { key: 'status',       label: 'Status',         width: 110, render: r => <StatusBadge status={r.status} /> },
    { key: 'paymentStatus',label: 'Payment',        width: 100, render: r => <StatusBadge status={r.paymentStatus} /> },
    { key: 'totalAmount',  label: 'Grand Total',               render: (r,cur) => `${cur}${(r.totalAmount||0).toLocaleString()}`, sortValue: r => r.totalAmount||0, align: 'right' },
  ];

  const orderTagFilters: TagFilter[] = [
    { key: 'pending',   label: 'Pending',   match: r => r.status === 'PENDING' },
    { key: 'shipped',   label: 'Shipped',   match: r => r.status === 'SHIPPED' },
    { key: 'delivered', label: 'Delivered', match: r => r.status === 'DELIVERED' },
    { key: 'unpaid',    label: 'Unpaid',    match: r => r.paymentStatus === 'UNPAID' },
    { key: 'cancelled', label: 'Cancelled', match: r => r.status === 'CANCELLED' },
  ];

  const orderBulkActions: BulkAction[] = [
    { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: ids => ids.forEach(id => onDeleteOrder(id)) },
  ];

  // ── Tab definitions ──
  const tabs: { key: FormTab; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details',  icon: <FileText className="w-3.5 h-3.5" /> },
    { key: 'items',   label: 'Items',    icon: <Package className="w-3.5 h-3.5" /> },
    { key: 'taxes',   label: 'Taxes',    icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: 'payment', label: 'Payment Terms', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { key: 'shipping',label: 'Shipping', icon: <Truck className="w-3.5 h-3.5" /> },
    { key: 'more',    label: 'More Info',icon: <FileText className="w-3.5 h-3.5" /> },
  ];

  // ── Field component helpers ──
  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-[#525c66]">{label}{required && <span className="text-[#ef4444] ml-0.5">*</span>}</label>
      {children}
    </div>
  );

  const inputCls = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] text-[13px]";
  const selectCls = inputCls + " appearance-none";

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
          onDuplicate={duplicateOrder}
        />
      ) : (
        <div className="flex flex-col h-full animate-fade-in">

          {/* ─── FORM HEADER ─── */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 sticky top-0 z-20">

            {/* Top bar */}
            <div className="flex justify-between items-center h-12">
              <div className="flex items-center gap-3">
                <button onClick={() => { setViewMode('LIST'); resetForm(); }}
                  className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <span className="text-lg text-[#1c2126] font-bold tracking-tight">
                    {formData.id ? formData.id : 'New Sales Order'}
                  </span>
                  {formData.id && (
                    <span className="ml-2">
                      <StatusBadge status={formData.status || 'PENDING'} />
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                {/* Commission info bar toggle */}
                {formData.agentName && commissionAmt > 0 && (
                  <button onClick={() => setShowCommissionBar(v => !v)}
                    className={`h-7 px-3 flex items-center gap-1.5 border rounded text-[12px] font-medium transition-colors ${showCommissionBar ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                    Commission: {currency}{commissionAmt.toFixed(0)}
                  </button>
                )}

                {/* More (⋮) menu */}
                <div className="relative">
                  <button onClick={() => setShowMoreMenu(v => !v)}
                    className="h-7 w-7 flex items-center justify-center bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[#525c66] transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {showMoreMenu && (
                    <div className="absolute right-0 top-8 z-50 bg-white border border-[#d1d8dd] rounded-lg shadow-lg w-44 py-1" onClick={() => setShowMoreMenu(false)}>
                      <button onClick={() => window.print()} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#1c2126] hover:bg-[#f4f5f6] transition-colors">
                        <Printer className="w-3.5 h-3.5 text-[#525c66]" />Print
                      </button>
                      <button onClick={shareWhatsApp} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#1c2126] hover:bg-[#f4f5f6] transition-colors">
                        <MessageSquare className="w-3.5 h-3.5 text-[#525c66]" />WhatsApp
                      </button>
                      {formData.id && (
                        <button onClick={() => duplicateOrder(formData as Order)} className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#1c2126] hover:bg-[#f4f5f6] transition-colors">
                          <Copy className="w-3.5 h-3.5 text-[#525c66]" />Duplicate
                        </button>
                      )}
                      {formData.id && (
                        <>
                          <div className="border-t border-[#d1d8dd] my-1" />
                          <button onClick={() => { onDeleteOrder(formData.id!); setViewMode('LIST'); resetForm(); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#ef4444] hover:bg-[#fef2f2] transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => { setViewMode('LIST'); resetForm(); }}
                  className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                  Cancel
                </button>
                <button onClick={handleCreate}
                  className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
                  <Save className="w-3.5 h-3.5" />Save
                </button>
              </div>
            </div>

            {/* Commission bar */}
            {showCommissionBar && formData.agentName && (
              <div className="flex items-center gap-4 py-2 px-3 mb-1 bg-amber-50 border border-amber-200 rounded text-[12px] text-amber-800">
                <span className="font-semibold">Agent: {formData.agentName}</span>
                <span className="text-amber-600">Commission on Grand Total</span>
                <span className="font-bold ml-auto">{currency}{commissionAmt.toFixed(2)}</span>
              </div>
            )}

            {/* Tab Bar */}
            <div className="flex items-center gap-0 -mb-px">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'border-[#2490ef] text-[#2490ef]'
                      : 'border-transparent text-[#525c66] hover:text-[#1c2126] hover:border-[#d1d8dd]'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ─── FORM BODY ─── */}
          <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center" onClick={() => setShowMoreMenu(false)}>
            <div className="w-full max-w-[900px] space-y-4">

              {/* ── Details Tab ── */}
              {activeTab === 'details' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Customer & Order Info</h4>

                  {/* Customer info banner */}
                  {selectedCustomer && (
                    <div className="mb-5 flex items-center gap-4 p-3 bg-[#f8fafc] border border-[#d1d8dd] rounded-lg text-[12px]">
                      <div className="w-8 h-8 rounded-full bg-[#eff6ff] flex items-center justify-center text-[#2490ef] font-bold text-sm shrink-0">
                        {selectedCustomer.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1c2126] truncate">{selectedCustomer.name}</p>
                        <p className="text-[#525c66] truncate">{(selectedCustomer as any).email || (selectedCustomer as any).address || ''}</p>
                      </div>
                      {(selectedCustomer as any).phone && (
                        <a href={`tel:${(selectedCustomer as any).phone}`} className="flex items-center gap-1 text-[#2490ef] hover:underline shrink-0">
                          <Phone className="w-3.5 h-3.5" />{(selectedCustomer as any).phone}
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                    <div className="space-y-4">
                      <Field label="Customer" required>
                        <input list="cust-list" required value={formData.customerName || ''}
                          onChange={e => setFormData({...formData, customerName: e.target.value})}
                          className={inputCls} placeholder="Select or type customer…" />
                        <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                      </Field>
                      <Field label="Contact Person">
                        <input value={(formData as any).contactPerson || ''}
                          onChange={e => setFormData({...formData, contactPerson: e.target.value} as any)}
                          className={inputCls} placeholder="Contact name" />
                      </Field>
                      <Field label="Agent">
                        <input list="agent-list" value={formData.agentName || ''}
                          onChange={e => setFormData({...formData, agentName: e.target.value})}
                          className={inputCls} placeholder="Select agent…" />
                        <datalist id="agent-list">{agents.map(a => <option key={a.id} value={a.name}/>)}</datalist>
                      </Field>
                      <Field label="PO Number">
                        <input value={(formData as any).poNo || ''}
                          onChange={e => setFormData({...formData, poNo: e.target.value} as any)}
                          className={inputCls} placeholder="Customer PO ref" />
                      </Field>
                    </div>
                    <div className="space-y-4">
                      <Field label="Order Date">
                        <input type="date" required value={formData.orderDate || ''}
                          onChange={e => setFormData({...formData, orderDate: e.target.value})}
                          className={inputCls} />
                      </Field>
                      <Field label="Delivery Date">
                        <input type="date" value={(formData as any).deliveryDate || ''}
                          onChange={e => setFormData({...formData, deliveryDate: e.target.value} as any)}
                          className={inputCls} />
                      </Field>
                      <Field label="Order Status">
                        <div className="relative">
                          <select value={formData.status || 'PENDING'}
                            onChange={e => setFormData({...formData, status: e.target.value as any})}
                            className={selectCls}>
                            <option value="PENDING">Pending</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                        </div>
                      </Field>
                      <Field label="Delivery Warehouse">
                        <input value={(formData as any).warehouse || ''}
                          onChange={e => setFormData({...formData, warehouse: e.target.value} as any)}
                          className={inputCls} placeholder="e.g. Main Warehouse" />
                      </Field>
                    </div>
                  </div>

                  {/* Billing Address */}
                  <div className="mt-5 pt-4 border-t border-[#d1d8dd]">
                    <Field label="Billing Address">
                      <textarea value={(formData as any).billingAddress || selectedCustomer?.address || ''}
                        onChange={e => setFormData({...formData, billingAddress: e.target.value} as any)}
                        className={inputCls + " resize-none"} rows={2} placeholder="Billing address…" />
                    </Field>
                  </div>
                </div>
              )}

              {/* ── Items Tab ── */}
              {activeTab === 'items' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Order Items</h4>

                  {/* Add item row */}
                  <div className="flex gap-2 mb-4 flex-wrap items-center">
                    {/* Product selector with image preview */}
                    <div className="flex items-center gap-2 flex-1 min-w-[220px] border border-[#d1d8dd] rounded bg-[#fdfdfd] px-2 py-1 cursor-pointer hover:border-[#2490ef] transition-colors"
                      onClick={() => { setItemPickerSearch(''); setShowItemPicker(true); }}>
                      {newItem.productName ? (
                        <>
                          {(() => {
                            const img = resolveProductImage(newItem.productName, designs, inventory);
                            return img
                              ? <img src={img} alt="" className="w-7 h-7 rounded object-cover shrink-0 border border-[#d1d8dd]" />
                              : <div className="w-7 h-7 rounded bg-[#f4f5f6] border border-[#d1d8dd] flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-[#8d99a6]" /></div>;
                          })()}
                          <span className="text-[13px] text-[#1c2126] font-medium truncate flex-1">{newItem.productName}</span>
                          <button type="button" className="text-[#8d99a6] hover:text-[#ef4444] shrink-0" onClick={e => { e.stopPropagation(); setNewItem({...newItem, productName: '', unitPrice: 0}); }}>
                            <X className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[13px] text-[#8d99a6] flex-1 select-none">Select Product…</span>
                      )}
                    </div>
                    <input type="number" className={inputCls + " w-20"} placeholder="Qty" value={newItem.quantity || ''} readOnly />
                    <input type="number" className={inputCls + " w-24"} placeholder="Rate" value={newItem.unitPrice || ''}
                      onChange={e => setNewItem({...newItem, unitPrice: Number(e.target.value)})} />
                    <input type="number" className={inputCls + " w-20"} placeholder="Disc %" value={(newItem as any).discount || ''}
                      onChange={e => setNewItem({...newItem, discount: Number(e.target.value)} as any)} />
                    <button type="button" onClick={() => setShowSizeModal(true)}
                      className="h-[30px] px-3 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded text-xs font-semibold text-[#1c2126]">
                      Sizes
                    </button>
                    <button type="button"
                      onClick={() => { if(newItem.productName && newItem.quantity) { setFormData({...formData, items: [...(formData.items||[]), newItem]}); setNewItem({productName:'',quantity:0,unitPrice:0,unit:'PIECE',sizeWise:{}} as any); }}}
                      className="h-[30px] px-3 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold shadow-sm transition-colors">
                      Add
                    </button>
                  </div>

                  {/* ── Product Picker Modal ── */}
                  {showItemPicker && (() => {
                    const allItems = [...designs, ...inventory];
                    const q = itemPickerSearch.trim().toLowerCase();
                    const filtered = q
                      ? allItems.filter(x => x.name.toLowerCase().includes(q) || (x.sku || '').toLowerCase().includes(q) || ((x as any).category || '').toLowerCase().includes(q))
                      : allItems;
                    return (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={() => setShowItemPicker(false)}>
                        <div className="bg-white rounded-xl shadow-2xl border border-[#d1d8dd] w-[560px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-[#d1d8dd]">
                            <h3 className="font-semibold text-[14px] text-[#1c2126]">Select Product</h3>
                            <button onClick={() => setShowItemPicker(false)} className="text-[#525c66] hover:text-[#1c2126]"><X className="w-4 h-4" /></button>
                          </div>
                          {/* Search */}
                          <div className="px-4 py-2.5 border-b border-[#d1d8dd]">
                            <input autoFocus className={inputCls} placeholder="Search by name, SKU, category…"
                              value={itemPickerSearch} onChange={e => setItemPickerSearch(e.target.value)} />
                          </div>
                          {/* Grid */}
                          <div className="flex-1 overflow-y-auto p-3">
                            {filtered.length === 0 ? (
                              <div className="py-12 text-center text-[#8d99a6] text-sm">No products found</div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2.5">
                                {filtered.map(item => {
                                  const img = resolveProductImage(item.name, designs, inventory, item.sku);
                                  const rate = (item as any).processCostPerPiece
                                    ? (item as any).processCostPerPiece * 1.5
                                    : (item as any).pricePerUnit || 0;
                                  return (
                                    <button key={item.id} type="button"
                                      onClick={() => {
                                        setNewItem({ ...newItem, productName: item.name, unitPrice: rate });
                                        setShowItemPicker(false);
                                      }}
                                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-[#d1d8dd] hover:border-[#2490ef] hover:bg-[#eff6ff]/40 transition-all text-left group">
                                      {/* Image */}
                                      <div className="w-full aspect-square rounded-md overflow-hidden bg-[#f4f5f6] border border-[#e8ebee] flex items-center justify-center">
                                        {img
                                          ? <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                          : <Package className="w-7 h-7 text-[#c0c7cf]" />
                                        }
                                      </div>
                                      {/* Info */}
                                      <div className="w-full">
                                        <p className="text-[12px] font-semibold text-[#1c2126] truncate leading-tight">{item.name}</p>
                                        <p className="text-[10px] text-[#8d99a6] truncate">{item.sku || (item as any).category || ''}</p>
                                        {rate > 0 && <p className="text-[11px] text-[#2490ef] font-medium mt-0.5">₹{rate.toLocaleString()}</p>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Items table */}
                  {(formData.items || []).length > 0 && (
                    <table className="w-full mt-4 text-left border-collapse">
                      <thead>
                        <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                          <th className="py-2 pl-3 font-medium w-8"></th>
                          <th className="py-2 pl-2 font-medium">Item</th>
                          <th className="py-2 px-3 font-medium text-[10px] text-[#8d99a6] italic">Description</th>
                          <th className="py-2 px-3 font-medium text-right">Qty</th>
                          <th className="py-2 px-3 font-medium text-right">Rate</th>
                          <th className="py-2 px-3 font-medium text-right">Disc%</th>
                          <th className="py-2 px-3 font-medium text-right">Amount</th>
                          <th className="py-2 pr-2 font-medium w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData.items || []).map((item, idx) => {
                          const discountedAmt = item.quantity * item.unitPrice * (1 - ((item as any).discount || 0) / 100);
                          return (
                            <tr key={(item as any).id || `item-${idx}`} className="border-b border-[#d1d8dd]/50 hover:bg-[#f4f5f6]/50">
                              <td className="py-2 pl-3">
                                {(() => {
                                  const img = resolveProductImage(item.productName, designs, inventory);
                                  return img
                                    ? <img src={img} alt="" className="w-7 h-7 rounded object-cover border border-[#d1d8dd]" />
                                    : <div className="w-7 h-7 rounded bg-[#f4f5f6] border border-[#d1d8dd] flex items-center justify-center"><Package className="w-3.5 h-3.5 text-[#c0c7cf]" /></div>;
                                })()}
                              </td>
                              <td className="py-2 pl-2 font-semibold text-[#1c2126]">{item.productName}</td>
                              <td className="py-2 px-3">
                                <input className="w-full text-[11px] text-[#8d99a6] bg-transparent border-0 outline-none focus:bg-white focus:border focus:border-[#d1d8dd] focus:rounded px-1 transition-all"
                                  placeholder="Add description…" value={(item as any).description || ''}
                                  onChange={e => { const upd = [...(formData.items||[])]; (upd[idx] as any).description = e.target.value; setFormData({...formData, items: upd}); }} />
                              </td>
                              <td className="py-2 px-3 text-right">{item.quantity}</td>
                              <td className="py-2 px-3 text-right">{item.unitPrice}</td>
                              <td className="py-2 px-3 text-right text-[#10b981]">{(item as any).discount ? `${(item as any).discount}%` : '—'}</td>
                              <td className="py-2 pr-3 text-right font-semibold tabular-nums">
                                {currency}{discountedAmt.toLocaleString()}
                                {(item as any).discount > 0 && <span className="text-[10px] line-through text-[#8d99a6] ml-1">{currency}{(item.quantity*item.unitPrice).toLocaleString()}</span>}
                              </td>
                              <td className="py-2 pr-2 text-right">
                                <button type="button" onClick={() => { const upd = [...(formData.items||[])]; upd.splice(idx,1); setFormData({...formData, items: upd}); }} className="text-[#ef4444] hover:text-[#dc2626]"><X className="w-3.5 h-3.5"/></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}

                  {/* Totals summary */}
                  {(formData.items||[]).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#d1d8dd] flex justify-end">
                      <div className="w-64 space-y-2 text-[13px]">
                        <div className="flex justify-between text-[#525c66]">
                          <span>Subtotal</span>
                          <span className="tabular-nums">{currency}{subTotal.toLocaleString()}</span>
                        </div>
                        {additionalDiscountAmt > 0 && (
                          <div className="flex justify-between text-[#10b981]">
                            <span>Additional Discount ({formData.additionalDiscount}%)</span>
                            <span className="tabular-nums">−{currency}{additionalDiscountAmt.toFixed(2)}</span>
                          </div>
                        )}
                        {(formData.taxRate || 0) > 0 && (
                          <div className="flex justify-between text-[#525c66]">
                            <span>Tax ({formData.taxRate}%)</span>
                            <span className="tabular-nums">+{currency}{taxAmt.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-[#1c2126] text-base pt-2 border-t border-[#d1d8dd]">
                          <span>Grand Total</span>
                          <span className="tabular-nums text-[#2490ef]">{currency}{grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Taxes Tab ── */}
              {activeTab === 'taxes' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Taxes & Discounts</h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                    <div className="space-y-4">
                      <Field label="Tax Rate (%)">
                        <input type="number" min="0" max="100" value={formData.taxRate || ''}
                          onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}
                          className={inputCls} placeholder="e.g. 5" />
                      </Field>
                      <Field label="Additional Discount (%)">
                        <input type="number" min="0" max="100" value={formData.additionalDiscount || ''}
                          onChange={e => setFormData({...formData, additionalDiscount: Number(e.target.value)} as any)}
                          className={inputCls} placeholder="e.g. 2" />
                      </Field>
                      <Field label="Additional Discount (Fixed Amount)">
                        <input type="number" min="0" value={(formData as any).additionalDiscountAmt || ''}
                          onChange={e => setFormData({...formData, additionalDiscountAmt: Number(e.target.value)} as any)}
                          className={inputCls} placeholder="Fixed discount" />
                      </Field>
                    </div>
                    <div className="space-y-4">
                      {/* Calculation breakdown */}
                      <div className="p-4 bg-[#f8fafc] border border-[#d1d8dd] rounded-lg space-y-2">
                        <p className="font-semibold text-[#1c2126] mb-3">Calculation Breakdown</p>
                        <div className="flex justify-between text-[#525c66]"><span>Subtotal</span><span className="tabular-nums font-medium">{currency}{subTotal.toLocaleString()}</span></div>
                        {additionalDiscountAmt > 0 && <div className="flex justify-between text-[#10b981]"><span>Discount ({formData.additionalDiscount}%)</span><span className="tabular-nums">−{currency}{additionalDiscountAmt.toFixed(2)}</span></div>}
                        <div className="flex justify-between text-[#525c66]"><span>Taxable Amount</span><span className="tabular-nums">{currency}{taxableAmount.toFixed(2)}</span></div>
                        <div className="flex justify-between text-[#525c66]"><span>Tax ({formData.taxRate}%)</span><span className="tabular-nums">+{currency}{taxAmt.toFixed(2)}</span></div>
                        <div className="flex justify-between font-bold text-[#1c2126] pt-2 border-t border-[#d1d8dd] text-base"><span>Grand Total</span><span className="tabular-nums text-[#2490ef]">{currency}{grandTotal.toFixed(2)}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Payment Terms Tab ── */}
              {activeTab === 'payment' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Payment Terms</h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                    <div className="space-y-4">
                      <Field label="Payment Terms">
                        <div className="relative">
                          <select value={(formData as any).paymentTerms || ''}
                            onChange={e => setFormData({...formData, paymentTerms: e.target.value} as any)}
                            className={selectCls}>
                            <option value="">Select…</option>
                            {PAYMENT_TERMS.map(pt => <option key={pt} value={pt}>{pt}</option>)}
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                        </div>
                      </Field>
                      <Field label="Due Date">
                        <input type="date" value={(formData as any).dueDate || ''}
                          onChange={e => setFormData({...formData, dueDate: e.target.value} as any)}
                          className={inputCls} />
                      </Field>
                      <Field label="Currency">
                        <div className="relative">
                          <select value={(formData as any).currency || 'INR'}
                            onChange={e => setFormData({...formData, currency: e.target.value} as any)}
                            className={selectCls}>
                            <option value="INR">INR (₹)</option>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="AED">AED (د.إ)</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                        </div>
                      </Field>
                      <Field label="Payment Status">
                        <div className="relative">
                          <select value={formData.paymentStatus || 'UNPAID'}
                            onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})}
                            className={selectCls}>
                            <option value="UNPAID">Unpaid</option>
                            <option value="PAID">Paid</option>
                            <option value="PARTIAL">Partial</option>
                          </select>
                          <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                        </div>
                      </Field>
                    </div>
                    <div className="space-y-4">
                      {/* Outstanding summary */}
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="font-semibold text-amber-800 mb-3 text-[12px] uppercase tracking-wide">Outstanding Amount</p>
                        <p className="text-2xl font-bold text-amber-700 tabular-nums">{currency}{grandTotal.toFixed(2)}</p>
                        {(formData as any).paymentTerms && <p className="text-[11px] text-amber-600 mt-2">Terms: {(formData as any).paymentTerms}</p>}
                        {(formData as any).dueDate && <p className="text-[11px] text-amber-600">Due: {(formData as any).dueDate}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Shipping Tab ── */}
              {activeTab === 'shipping' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Shipping & Transport</h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                    <div className="space-y-4">
                      <Field label="Shipping Address">
                        <textarea value={formData.shippingAddress || ''}
                          onChange={e => setFormData({...formData, shippingAddress: e.target.value})}
                          className={inputCls + " resize-none"} rows={3} placeholder="Delivery address…" />
                      </Field>
                      <Field label="Contact Phone">
                        <input value={(formData as any).shippingPhone || ''}
                          onChange={e => setFormData({...formData, shippingPhone: e.target.value} as any)}
                          className={inputCls} placeholder="+91 XXXXX XXXXX" />
                      </Field>
                    </div>
                    <div className="space-y-4">
                      <Field label="Transport Name">
                        <input value={formData.transportName || ''}
                          onChange={e => setFormData({...formData, transportName: e.target.value})}
                          className={inputCls} placeholder="e.g. Blue Dart" />
                      </Field>
                      <Field label="Vehicle No.">
                        <input value={formData.vehicleNo || ''}
                          onChange={e => setFormData({...formData, vehicleNo: e.target.value})}
                          className={inputCls} placeholder="e.g. GJ 05 AB 1234" />
                      </Field>
                      <Field label="LR / Docket No.">
                        <input value={(formData as any).lrNo || ''}
                          onChange={e => setFormData({...formData, lrNo: e.target.value} as any)}
                          className={inputCls} placeholder="Lorry receipt number" />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── More Info Tab ── */}
              {activeTab === 'more' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Additional Information</h4>
                  <div className="grid grid-cols-2 gap-x-16 gap-y-5">
                    <div className="space-y-4">
                      <Field label="Printing / Packing Notes">
                        <textarea value={(formData as any).packingNotes || ''}
                          onChange={e => setFormData({...formData, packingNotes: e.target.value} as any)}
                          className={inputCls + " resize-none"} rows={4} placeholder="Special packing or printing instructions for warehouse…" />
                      </Field>
                    </div>
                    <div className="space-y-4">
                      <Field label="Internal Remarks">
                        <textarea value={(formData as any).remarks || ''}
                          onChange={e => setFormData({...formData, remarks: e.target.value} as any)}
                          className={inputCls + " resize-none"} rows={4} placeholder="Internal notes…" />
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* Save button at bottom */}
              <div className="flex justify-end gap-2 pt-2 pb-8">
                <button type="button" onClick={() => { setViewMode('LIST'); resetForm(); }}
                  className="h-8 px-4 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                  Cancel
                </button>
                <button onClick={handleCreate}
                  className="h-8 px-5 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
                  <Save className="w-3.5 h-3.5" />Save Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          customer={customers.find(c => c.name === selectedOrder.customerName)}
          onClose={() => setSelectedOrder(null)}
          currency={currency}
          designs={designs}
          inventory={inventory}
        />
      )}

      {/* Size Selection Modal */}
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
                  <input type="number" min="0"
                    className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] font-semibold text-[13px]"
                    placeholder="0" value={newItem.sizeWise?.[size] || ''}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const newSizeWise = {...(newItem.sizeWise||{}), [size]: val};
                      const total = Object.values(newSizeWise).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
                      setNewItem({...newItem, sizeWise: newSizeWise, quantity: total});
                    }} />
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-[#fdfdfd] border-t border-[#d1d8dd] flex justify-between items-center">
              <div className="font-semibold text-sm">Total: <span className="text-[#2490ef] tabular-nums ml-1">{newItem.quantity} PCS</span></div>
              <button onClick={() => setShowSizeModal(false)}
                className="px-4 py-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold shadow-sm transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
