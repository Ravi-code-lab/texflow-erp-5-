import React, { useState, useMemo, useEffect } from 'react';
import { Order, Customer, InventoryItem, OrderItem, Design, Agent } from '../types';
import { 
  Search, Plus, ShoppingCart, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, MessageSquare, KanbanSquare, Table2, CheckCircle2,
  Clock, XCircle, ArrowRight, FileCheck, Truck, Receipt, Factory,
  Layers, Palette, Scissors, Tag, Package2, Hash
} from 'lucide-react';
import { createERPDocument } from '../modules/documentEngine';
import { getAvailableTransitions } from '../modules/workflows';
import ProductImageThumb, { resolveProductImage } from './ProductImageThumb';
import { getItem } from '../utils/networkClient';

// ── Apparel size sets ───────────────────────────────────────────────────────
const SIZE_SETS: Record<string, string[]> = {
  'XS-XXL':  ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  'S-XXL':   ['S', 'M', 'L', 'XL', 'XXL'],
  'S-XXXL':  ['S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
  'Free Size': ['Free Size'],
  '28-38 (Even)': ['28', '30', '32', '34', '36', '38'],
  '28-40 (Even)': ['28', '30', '32', '34', '36', '38', '40'],
  '36-44 (Even)': ['36', '38', '40', '42', '44'],
  '26-34 (Kids)': ['26', '28', '30', '32', '34'],
  '0-5 (Kids Yrs)': ['0-1Y', '1-2Y', '2-3Y', '3-4Y', '4-5Y'],
  'Numeric 1-5': ['1', '2', '3', '4', '5'],
};

const DELIVERY_TERMS = ['Ex-Factory', 'FOB', 'CIF', 'C&F', 'DDP', 'FCA', 'EXW'];
const INCOTERMS_PORT = ['Mumbai', 'Delhi', 'Chennai', 'Kolkata', 'Bangalore', 'Surat', 'Jaipur', 'Tirupur'];
const SEASONS = ['SS-25', 'AW-25', 'SS-26', 'AW-26', 'SS-27', 'AW-27', 'Resort-25', 'Resort-26', 'Festive-25'];
const FABRIC_COMPOSITIONS = ['100% Cotton', '100% Polyester', 'Cotton/Poly Blend', 'Viscose', 'Rayon', 'Linen', 'Silk', 'Wool', 'Denim', 'Knit (Jersey)', 'Interlock', 'Rib', 'Modal', 'Bamboo'];

// ── Colour-Size matrix item ─────────────────────────────────────────────────
interface MatrixRow {
  id: string;
  colour: string;
  colourCode: string;
  fabric: string;
  gsm: string;
  sizes: Record<string, number>;   // size → qty
  unitPrice: number;
  discount: number;                 // %
}

interface ApparelOrderItem {
  id: string;
  styleNo: string;
  styleName: string;
  linkedProductName?: string;  // reference to designs/inventory — image resolved at render time
  category: string;
  sizeSet: string;
  season: string;
  collection: string;
  hsn: string;
  unit: string;
  rows: MatrixRow[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);

const rowTotals = (row: MatrixRow) => {
  const qty = Object.values(row.sizes).reduce((a, b) => a + b, 0);
  const gross = qty * row.unitPrice;
  const disc = (gross * row.discount) / 100;
  return { qty, gross, disc, net: gross - disc };
};

const styleTotals = (item: ApparelOrderItem) => {
  let qty = 0, net = 0;
  item.rows.forEach(r => { const t = rowTotals(r); qty += t.qty; net += t.net; });
  return { qty, net };
};

const orderGrandTotal = (items: ApparelOrderItem[], taxRate: number) => {
  let sub = 0;
  items.forEach(it => { sub += styleTotals(it).net; });
  const tax = (sub * taxRate) / 100;
  return { sub, tax, grand: sub + tax };
};

const emptyRow = (sizes: string[]): MatrixRow => ({
  id: uid(), colour: '', colourCode: '', fabric: '', gsm: '',
  sizes: Object.fromEntries(sizes.map(s => [s, 0])), unitPrice: 0, discount: 0
});

const emptyStyle = (): ApparelOrderItem => ({
  id: uid(), styleNo: '', styleName: '', category: 'Kurti', sizeSet: 'XS-XXL',
  season: '', collection: '', hsn: '62', unit: 'PCS',
  rows: [emptyRow(SIZE_SETS['XS-XXL'])]
});

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
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM' | 'KANBAN'>('LIST');
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'MATRIX' | 'SHIPPING' | 'TAXES' | 'MORE'>('DETAILS');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<Order>>({
    status: 'PENDING', paymentStatus: 'UNPAID',
    items: [], apparelItems: [],
    orderDate: new Date().toISOString().split('T')[0],
    taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
    agentCommissionRate: 2, agentCommissionAmount: 0,
    deliveryTerms: 'Ex-Factory', season: '', collection: '',
    buyerDept: '', merchandiser: '', techPackRef: '',
  });

  // Apparel style+matrix items (stored in formData.apparelItems)
  const [apparelItems, setApparelItems] = useState<ApparelOrderItem[]>([emptyStyle()]);
  const [activeStyleIdx, setActiveStyleIdx] = useState(0);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [stylePickerSearch, setStylePickerSearch] = useState('');

  useEffect(() => {
    getItem<any[]>('erpnext_custom_fields').then(parsed => {
      if (Array.isArray(parsed)) setCustomFields(parsed.filter((f: any) => f.docType === 'Order'));
    }).catch(() => {});
  }, []);

  // Sync apparelItems in/out of formData when editing an existing order
  useEffect(() => {
    if (formData.apparelItems && Array.isArray(formData.apparelItems) && formData.apparelItems.length > 0) {
      setApparelItems(formData.apparelItems as ApparelOrderItem[]);
    }
  }, [formData.id]);

  const filteredOrders = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (orders || []).filter(o => 
      (statusFilter === 'ALL' || o.status === statusFilter) &&
      ((o.customerName || '').toLowerCase().includes(searchLower) || 
      (o.id || '').toLowerCase().includes(searchLower))
    );
  }, [orders, filter, statusFilter]);

  const salesStats = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'CANCELLED');
    return {
      totalValue: activeOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      totalPcs: activeOrders.reduce((sum, order) => {
        const ai: ApparelOrderItem[] = order.apparelItems || [];
        return sum + ai.reduce((s, it) => s + styleTotals(it).qty, 0);
      }, 0),
      draft: orders.filter(o => ['DRAFT', 'PENDING'].includes(o.status)).length,
      confirmed: orders.filter(o => ['CONFIRMED', 'SUBMITTED', 'SHIPPED'].includes(o.status)).length,
      fulfilled: orders.filter(o => ['FULFILLED', 'DELIVERED'].includes(o.status)).length,
    };
  }, [orders]);

  const pipelineColumns = [
    { id: 'DRAFT', label: 'Draft', aliases: ['DRAFT', 'PENDING'], icon: Clock },
    { id: 'CONFIRMED', label: 'Confirmed', aliases: ['CONFIRMED', 'SUBMITTED', 'SHIPPED'], icon: FileCheck },
    { id: 'FULFILLED', label: 'Fulfilled', aliases: ['FULFILLED', 'DELIVERED'], icon: CheckCircle2 },
    { id: 'CANCELLED', label: 'Cancelled', aliases: ['CANCELLED'], icon: XCircle },
  ];

  useEffect(() => {
    if (formData.agentName) {
      const agent = agents.find(a => a.name === formData.agentName);
      if (agent) setFormData(prev => ({ ...prev, agentCommissionRate: agent.commissionRate || 2 }));
    }
  }, [formData.agentName, agents]);

  const { sub, tax, grand } = useMemo(() => orderGrandTotal(apparelItems, formData.taxRate || 0), [apparelItems, formData.taxRate]);
  const commissionAmount = (sub * (formData.agentCommissionRate || 0)) / 100;

  const handleCreate = () => {
    if (!formData.customerName) return;
    const payload = {
      ...formData,
      apparelItems,
      agentCommissionAmount: commissionAmount,
      totalAmount: grand,
      totalPcs: apparelItems.reduce((s, it) => s + styleTotals(it).qty, 0),
    };
    const oData = formData.id
      ? payload as Order
      : createERPDocument('ORDERS', { ...payload, status: payload.status || 'DRAFT' }) as Order;
    if (formData.id) onUpdateOrder(oData); else onAddOrder(oData);
    setViewMode('LIST');
  };

  const openForm = (o?: Order) => {
    if (o) {
      setFormData(o);
      setApparelItems((o.apparelItems as ApparelOrderItem[]) || [emptyStyle()]);
    } else {
      setFormData({
        status: 'DRAFT', paymentStatus: 'UNPAID', items: [], apparelItems: [],
        orderDate: new Date().toISOString().split('T')[0],
        taxRate: 5, vehicleNo: '', transportName: '', agentName: '',
        agentCommissionRate: 2, agentCommissionAmount: 0,
        deliveryTerms: 'Ex-Factory', season: '', collection: '',
        buyerDept: '', merchandiser: '', techPackRef: '',
      });
      setApparelItems([emptyStyle()]);
    }
    setActiveStyleIdx(0);
    setActiveTab('DETAILS');
    setViewMode('FORM');
  };

  const applyWorkflowTransition = (to: string) => {
    const nextData = { ...formData, status: to as any };
    setFormData(nextData);
    if (nextData.id) {
      const payload = { ...nextData, apparelItems, agentCommissionAmount: commissionAmount, totalAmount: grand } as Order;
      onUpdateOrder(payload);
    }
  };

  const workflowTransitions = getAvailableTransitions('ORDERS', formData.status || 'DRAFT');

  const handleWhatsApp = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    const msg = `Order #${order.id} for ${order.customerName} is ${order.status}. Total: ${currency}${order.totalAmount?.toLocaleString()}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  // ── Style / Matrix helpers ─────────────────────────────────────────────
  const updateStyle = (idx: number, patch: Partial<ApparelOrderItem>) => {
    const next = apparelItems.map((it, i) => i === idx ? { ...it, ...patch } : it);
    setApparelItems(next);
  };

  const changeSizeSet = (idx: number, set: string) => {
    const sizes = SIZE_SETS[set] || ['S', 'M', 'L'];
    updateStyle(idx, {
      sizeSet: set,
      rows: apparelItems[idx].rows.map(r => ({
        ...r, sizes: Object.fromEntries(sizes.map(s => [s, r.sizes[s] || 0]))
      }))
    });
  };

  const updateRow = (styleIdx: number, rowIdx: number, patch: Partial<MatrixRow>) => {
    const rows = apparelItems[styleIdx].rows.map((r, i) => i === rowIdx ? { ...r, ...patch } : r);
    updateStyle(styleIdx, { rows });
  };

  const updateSize = (styleIdx: number, rowIdx: number, size: string, qty: number) => {
    const sizes = { ...apparelItems[styleIdx].rows[rowIdx].sizes, [size]: Math.max(0, qty) };
    updateRow(styleIdx, rowIdx, { sizes });
  };

  const addRow = (styleIdx: number) => {
    const sizes = SIZE_SETS[apparelItems[styleIdx].sizeSet] || ['S', 'M', 'L'];
    const rows = [...apparelItems[styleIdx].rows, emptyRow(sizes)];
    updateStyle(styleIdx, { rows });
  };

  const removeRow = (styleIdx: number, rowIdx: number) => {
    const rows = apparelItems[styleIdx].rows.filter((_, i) => i !== rowIdx);
    updateStyle(styleIdx, { rows: rows.length ? rows : [emptyRow(SIZE_SETS[apparelItems[styleIdx].sizeSet] || ['S','M','L'])] });
  };

  const addStyle = () => {
    setApparelItems([...apparelItems, emptyStyle()]);
    setActiveStyleIdx(apparelItems.length);
  };

  const removeStyle = (idx: number) => {
    const next = apparelItems.filter((_, i) => i !== idx);
    setApparelItems(next.length ? next : [emptyStyle()]);
    setActiveStyleIdx(Math.max(0, idx - 1));
  };

  // ── Status badge ────────────────────────────────────────────────────────
  const getStatusBadge = (status: string) => {
    if (status === 'FULFILLED' || status === 'DELIVERED') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Fulfilled</span>
    if (['CONFIRMED','SHIPPED','SUBMITTED'].includes(status)) return <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Confirmed</span>
    if (status === 'CANCELLED') return <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Cancelled</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status || 'DRAFT'}</span>
  };

  const fmt = (n: number) => `${currency}${Math.round(n).toLocaleString('en-IN')}`;

  // ─────────────────────────────────────────────────────────────────────────
  // Current style for matrix tab
  const curStyle = apparelItems[activeStyleIdx] ?? apparelItems[0];
  const curSizes = SIZE_SETS[curStyle?.sizeSet] || ['S', 'M', 'L'];

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      {viewMode !== 'FORM' ? (
        <div className="flex flex-col h-full animate-fade-in">
          {/* LIST HEADER */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
            <div className="flex justify-between items-center h-8">
              <div className="flex items-center gap-3">
                <span className="text-xl text-[#1c2126] font-bold tracking-tight">Sales Order</span>
                <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredOrders.length}</span>
                <span className="text-[10px] uppercase tracking-widest text-[#8d99a6] font-bold">SO-.YYYY.-.####</span>
              </div>
              <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
                <Plus className="w-4 h-4" /> Add Sales Order
              </button>
            </div>
            <div className="flex justify-between items-center mt-3 h-8">
              <div className="flex items-center gap-2">
                <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"><MoreHorizontal className="w-3.5 h-3.5" /></button>
                <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] shadow-sm"><Filter className="w-3.5 h-3.5" /> Filter</button>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-7 px-2.5 bg-white border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] focus:outline-none focus:border-[#2490ef]">
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="FULFILLED">Fulfilled</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <div className="relative">
                  <input type="text" placeholder="Customer / Order ID" value={filter} onChange={e => setFilter(e.target.value)}
                    className="h-7 w-[260px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] placeholder-[#8d99a6]" />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                  <button onClick={() => setViewMode('LIST')} className={`h-7 px-2 border-r border-[#d1d8dd] ${viewMode === 'LIST' ? 'bg-[#eaf5ff] text-[#2490ef]' : 'bg-white hover:bg-[#f4f5f6] text-[#1c2126]'}`}><Table2 className="w-4 h-4"/></button>
                  <button onClick={() => setViewMode('KANBAN')} className={`h-7 px-2 ${viewMode === 'KANBAN' ? 'bg-[#eaf5ff] text-[#2490ef]' : 'bg-white hover:bg-[#f4f5f6] text-[#1c2126]'}`}><KanbanSquare className="w-4 h-4"/></button>
                </div>
                <span className="text-[13px] text-[#525c66]">{filteredOrders.length > 0 ? `1 of ${filteredOrders.length}` : '0 of 0'}</span>
                <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                  <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                  <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6]"><ChevronRight className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          </div>

          {/* LIST BODY */}
          <div className="flex-1 overflow-auto p-5 pb-10">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Ordered Value', value: fmt(salesStats.totalValue), icon: ShoppingCart },
                { label: 'Total Pieces', value: salesStats.totalPcs.toLocaleString('en-IN') + ' pcs', icon: Package2 },
                { label: 'Confirmed', value: salesStats.confirmed, icon: FileCheck },
                { label: 'Fulfilled', value: salesStats.fulfilled, icon: CheckCircle2 },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-[#d1d8dd] rounded shadow-sm p-4">
                  <div className="flex items-center justify-between text-[#8d99a6]">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <p className="text-xl font-bold text-[#1c2126] mt-1 tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            {viewMode === 'KANBAN' ? (
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 min-w-[980px]">
                {pipelineColumns.map(column => {
                  const colOrders = filteredOrders.filter(o => column.aliases.includes(o.status));
                  return (
                    <div key={column.id} className="bg-white border border-[#d1d8dd] rounded shadow-sm min-h-[420px]">
                      <div className="flex items-center justify-between p-3 border-b border-[#d1d8dd] bg-[#f4f5f6]">
                        <div className="flex items-center gap-2"><column.icon className="w-4 h-4 text-[#525c66]"/><span className="text-sm font-bold">{column.label}</span></div>
                        <span className="text-xs text-[#525c66] bg-white border border-[#d1d8dd] rounded-full px-2">{colOrders.length}</span>
                      </div>
                      <div className="p-3 space-y-3">
                        {colOrders.map(order => {
                          const ai: ApparelOrderItem[] = order.apparelItems || [];
                          const totalPcs = ai.reduce((s, it) => s + styleTotals(it).qty, 0);
                          return (
                            <button key={order.id} onClick={() => openForm(order)} className="w-full text-left bg-[#fdfdfd] hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded p-3 transition-colors">
                              <div className="flex justify-between gap-2"><span className="font-bold text-[13px] truncate">{order.id}</span><span className="text-[11px] text-[#525c66]">{order.orderDate}</span></div>
                              <p className="text-[13px] mt-1 truncate">{order.customerName}</p>
                              {order.season && <p className="text-[11px] text-indigo-500 font-medium mt-1">{order.season} {order.collection && `· ${order.collection}`}</p>}
                              <div className="flex justify-between mt-2">
                                <span className="text-[11px] text-[#525c66]">{totalPcs > 0 ? `${totalPcs.toLocaleString()} pcs` : `${ai.length} styles`}</span>
                                <span className="font-bold text-[13px] tabular-nums">{fmt(order.totalAmount || 0)}</span>
                              </div>
                            </button>
                          );
                        })}
                        {colOrders.length === 0 && <div className="text-center text-[#8d99a6] text-[12px] py-10">No records</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[980px]">
                <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                  <div className="w-10"><input type="checkbox" className="rounded-sm border-[#d1d8dd] w-3.5 h-3.5"/></div>
                  <div className="w-32">Order ID</div>
                  <div className="w-56">Customer</div>
                  <div className="w-28">Status</div>
                  <div className="w-36">Season / Collection</div>
                  <div className="w-24 text-right">Pcs</div>
                  <div className="flex-1 text-right pr-4">Grand Total</div>
                </div>
                <div className="divide-y divide-[#d1d8dd]/60">
                  {filteredOrders.length === 0 && (
                    <div className="px-4 py-12 flex flex-col items-center text-[#525c66]">
                      <ShoppingCart className="w-8 h-8 text-[#d1d8dd] mb-3"/>
                      <p className="text-[13px]">No sales orders found.</p>
                    </div>
                  )}
                  {filteredOrders.map(o => {
                    const ai: ApparelOrderItem[] = o.apparelItems || [];
                    const pcs = ai.reduce((s, it) => s + styleTotals(it).qty, 0);
                    return (
                      <div key={o.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] cursor-pointer text-[13px]" onClick={() => openForm(o)}>
                        <div className="w-10" onClick={e => e.stopPropagation()}><input type="checkbox" checked={checkedIds.has(o.id)} onChange={e => { const s = new Set(checkedIds); e.target.checked ? s.add(o.id) : s.delete(o.id); setCheckedIds(s); }} className="rounded-sm border-[#d1d8dd] w-3.5 h-3.5"/></div>
                        <div className="w-32 font-semibold text-[#1c2126] group-hover:underline">{o.id}</div>
                        <div className="w-56 pr-4 truncate font-medium">{o.customerName}</div>
                        <div className="w-28">{getStatusBadge(o.status)}</div>
                        <div className="w-36 text-[#525c66] text-[12px]">{o.season || '—'}{o.collection ? ` / ${o.collection}` : ''}</div>
                        <div className="w-24 text-right tabular-nums text-[#525c66]">{pcs > 0 ? pcs.toLocaleString() : '—'}</div>
                        <div className="flex-1 text-right pr-4 font-medium tabular-nums">{fmt(o.totalAmount || 0)}</div>
                        <div className="w-10 flex justify-end opacity-0 group-hover:opacity-100">
                          <button onClick={e => handleWhatsApp(e, o)} className="text-[#525c66] hover:text-[#1c2126]"><MessageSquare className="w-4 h-4"/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ═══════════════ FORM VIEW ═══════════════ */
        <div className="flex flex-col h-full animate-fade-in">
          {/* FORM HEADER */}
          <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
            <div className="flex justify-between items-center h-8">
              <div className="flex items-center gap-3">
                <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66]"><ArrowLeft className="w-4 h-4"/></button>
                <span className="text-xl font-bold tracking-tight truncate max-w-lg">{formData.id ? formData.id : 'New Sales Order'}</span>
                {formData.id && getStatusBadge(formData.status || 'PENDING')}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {formData.id && workflowTransitions.map(t => (
                  <button key={`${t.from}-${t.to}`} type="button" onClick={() => applyWorkflowTransition(t.to)}
                    className={`h-7 px-3 flex items-center gap-1.5 rounded text-[13px] font-medium shadow-sm transition-all ${t.to === 'CANCELLED' ? 'bg-[#fff1f2] border border-[#fecdd3] text-[#e11d48]' : 'bg-[#f4f5f6] border border-[#d1d8dd] text-[#1c2126]'}`}>
                    {t.to === 'CANCELLED' ? <XCircle className="w-3.5 h-3.5"/> : <ArrowRight className="w-3.5 h-3.5"/>}{t.action}
                  </button>
                ))}
                {formData.id && onAction && !['CANCELLED','CONVERTED'].includes(formData.status || '') && (
                  <>
                    <button type="button" onClick={() => onAction('CONVERT_TO_DELIVERY_NOTE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded text-[13px] font-medium"><Truck className="w-3.5 h-3.5"/> Delivery Note</button>
                    <button type="button" onClick={() => onAction('CONVERT_TO_INVOICE', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded text-[13px] font-medium"><Receipt className="w-3.5 h-3.5"/> Invoice</button>
                    <button type="button" onClick={() => onAction('CONVERT_TO_WORK_ORDER', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] rounded text-[13px] font-medium"><Factory className="w-3.5 h-3.5"/> Work Order</button>
                  </>
                )}
                {formData.id && onDeleteOrder && (
                  <button type="button" onClick={() => { onDeleteOrder(formData.id!); setViewMode('LIST'); }} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium"><Trash2 className="w-3.5 h-3.5"/>Delete</button>
                )}
                <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium">Cancel</button>
                <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm"><Save className="w-3.5 h-3.5"/>Save</button>
              </div>
            </div>
            {/* TABS */}
            <div className="flex gap-6 mt-4 overflow-x-auto no-scrollbar">
              {[
                { id: 'DETAILS', label: 'Order Details' },
                { id: 'MATRIX', label: `Style & Size Matrix (${apparelItems.length})` },
                { id: 'SHIPPING', label: 'Shipping & Delivery' },
                { id: 'TAXES', label: 'Taxes & Charges' },
                { id: 'MORE', label: 'Terms & Conditions' }
              ].map(tab => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-[#2490ef] text-[#1c2126]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* FORM BODY */}
          <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
            <div className="w-full max-w-5xl space-y-4">

              {/* ── DETAILS TAB ── */}
              {activeTab === 'DETAILS' && (
                <div className="space-y-4">
                  {/* Order Details */}
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                    <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Sales Order Details</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                      <Field label="Customer *">
                        <select required value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value})} className={sel}>
                          <option value="">Select Customer...</option>
                          {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Order Date *">
                        <input type="date" required value={formData.orderDate || ''} onChange={e => setFormData({...formData, orderDate: e.target.value})} className={inp} />
                      </Field>
                      <Field label="Status">
                        <select value={formData.status || 'PENDING'} onChange={e => setFormData({...formData, status: e.target.value as any})} className={sel}>
                          <option value="PENDING">Pending (Draft)</option>
                          <option value="DRAFT">Draft</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="FULFILLED">Fulfilled</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </Field>
                      <Field label="Buyer PO No.">
                        <input type="text" value={formData.poNo || ''} onChange={e => setFormData({...formData, poNo: e.target.value})} placeholder="e.g. BPO-2025-001" className={inp} />
                      </Field>
                      <Field label="Buyer PO Date">
                        <input type="date" value={formData.poDate || ''} onChange={e => setFormData({...formData, poDate: e.target.value})} className={inp} />
                      </Field>
                      <Field label="Payment Status">
                        <select value={formData.paymentStatus || 'UNPAID'} onChange={e => setFormData({...formData, paymentStatus: e.target.value as any})} className={sel}>
                          <option value="UNPAID">Unpaid</option>
                          <option value="PARTIAL">Partial</option>
                          <option value="PAID">Paid</option>
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Apparel / Merchandising Info */}
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                    <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 flex items-center gap-2"><Scissors className="w-4 h-4 text-indigo-500"/>Apparel & Merchandising</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                      <Field label="Season">
                        <select value={formData.season || ''} onChange={e => setFormData({...formData, season: e.target.value})} className={sel}>
                          <option value="">— Select Season —</option>
                          {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </Field>
                      <Field label="Collection / Range">
                        <input type="text" value={formData.collection || ''} onChange={e => setFormData({...formData, collection: e.target.value})} placeholder="e.g. Embroidery Festive" className={inp}/>
                      </Field>
                      <Field label="Tech Pack / Style Ref">
                        <input type="text" value={formData.techPackRef || ''} onChange={e => setFormData({...formData, techPackRef: e.target.value})} placeholder="TP-2025-001" className={inp}/>
                      </Field>
                      <Field label="Buyer Department">
                        <input type="text" value={formData.buyerDept || ''} onChange={e => setFormData({...formData, buyerDept: e.target.value})} placeholder="e.g. Womenswear" className={inp}/>
                      </Field>
                      <Field label="Merchandiser">
                        <input type="text" value={formData.merchandiser || ''} onChange={e => setFormData({...formData, merchandiser: e.target.value})} placeholder="Name" className={inp}/>
                      </Field>
                      <Field label="Delivery Terms">
                        <select value={formData.deliveryTerms || 'Ex-Factory'} onChange={e => setFormData({...formData, deliveryTerms: e.target.value})} className={sel}>
                          {DELIVERY_TERMS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {/* Broker / Agent */}
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                    <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Sales Broker / Agent</h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      <Field label="Agent Name">
                        <select value={formData.agentName || ''} onChange={e => setFormData({...formData, agentName: e.target.value})} className={sel}>
                          <option value="">Direct Office Booking</option>
                          {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
                        </select>
                      </Field>
                      <Field label="Commission Rate (%)">
                        <input type="number" min="0" max="100" step="0.5" value={formData.agentCommissionRate || 0} onChange={e => setFormData({...formData, agentCommissionRate: Number(e.target.value)})} className={inp}/>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STYLE & SIZE MATRIX TAB ── */}
              {activeTab === 'MATRIX' && (
                <div className="space-y-4">
                  {/* Style tabs strip */}
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm">
                    <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#d1d8dd] overflow-x-auto no-scrollbar">
                      {apparelItems.map((it, idx) => {
                        const tabImg = resolveProductImage(it.linkedProductName || it.styleName, designs, inventory, it.styleNo);
                        return (
                        <button key={it.id} onClick={() => setActiveStyleIdx(idx)}
                          className={`flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap mr-1 ${activeStyleIdx === idx ? 'border-[#2490ef] text-[#1c2126]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}>
                          {tabImg
                            ? <img src={tabImg} alt="" className="w-4 h-4 rounded object-cover border border-[#d1d8dd] shrink-0"/>
                            : <Layers className="w-3.5 h-3.5"/>
                          }
                          {it.styleNo || `Style ${idx + 1}`}
                          {apparelItems.length > 1 && (
                            <span onClick={e => { e.stopPropagation(); removeStyle(idx); }} className="ml-1 text-[#8d99a6] hover:text-[#ef4444] rounded-full text-[11px] leading-none">✕</span>
                          )}
                        </button>
                        );
                      })}
                      <button onClick={addStyle} className="flex items-center gap-1 px-2 py-2 text-[13px] text-[#2490ef] hover:bg-[#eaf5ff] rounded ml-1 mb-1 whitespace-nowrap">
                        <Plus className="w-3.5 h-3.5"/> Add Style
                      </button>
                    </div>

                    {curStyle && (
                      <div className="p-5 space-y-5">
                        {/* Style header fields */}
                        <div className="flex gap-4">
                          {/* Image thumbnail / picker */}
                          <div className="flex flex-col items-center gap-1.5 shrink-0">
                            <div
                              className="w-20 h-20 rounded-lg border-2 border-dashed border-[#d1d8dd] hover:border-[#2490ef] overflow-hidden bg-[#f8fafc] flex items-center justify-center cursor-pointer transition-colors group"
                              onClick={() => { setStylePickerSearch(''); setShowStylePicker(true); }}
                              title="Select product to link image"
                            >
                              {(() => {
                                const img = resolveProductImage(curStyle.linkedProductName || curStyle.styleName, designs, inventory, curStyle.styleNo);
                                return img
                                  ? <img src={img} alt="" className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"/>
                                  : <div className="flex flex-col items-center gap-1 text-[#c0c7cf] group-hover:text-[#2490ef] transition-colors">
                                      <Package2 className="w-6 h-6"/>
                                      <span className="text-[9px] font-medium">Add Image</span>
                                    </div>;
                              })()}
                            </div>
                            {resolveProductImage(curStyle.linkedProductName || curStyle.styleName, designs, inventory, curStyle.styleNo) && (
                              <button type="button" className="text-[10px] text-[#8d99a6] hover:text-[#ef4444] transition-colors"
                                onClick={() => updateStyle(activeStyleIdx, { linkedProductName: '' })}>
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Fields grid */}
                          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4 text-[13px]">
                          <Field label="Style No.">
                            <input value={curStyle.styleNo} onChange={e => updateStyle(activeStyleIdx, { styleNo: e.target.value })} placeholder="e.g. STY-001" className={inp}/>
                          </Field>
                          <Field label="Style Name">
                            <input value={curStyle.styleName} onChange={e => updateStyle(activeStyleIdx, { styleName: e.target.value })} placeholder="e.g. Anarkali Kurti" className={inp}/>
                          </Field>
                          <Field label="Category">
                            <select value={curStyle.category} onChange={e => updateStyle(activeStyleIdx, { category: e.target.value })} className={sel}>
                              {['Kurti','Dress','Top','Bottom','Co-ord Set','Saree','Lehenga','Suit Set','Jacket','Shirt','T-Shirt','Trouser','Shorts','Kids Wear','Ethnic Wear','Accessories'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </Field>
                          <Field label="Size Set">
                            <select value={curStyle.sizeSet} onChange={e => changeSizeSet(activeStyleIdx, e.target.value)} className={sel}>
                              {Object.keys(SIZE_SETS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </Field>
                          <Field label="Season">
                            <input value={curStyle.season} onChange={e => updateStyle(activeStyleIdx, { season: e.target.value })} placeholder="SS-25" className={inp}/>
                          </Field>
                          <Field label="Collection">
                            <input value={curStyle.collection} onChange={e => updateStyle(activeStyleIdx, { collection: e.target.value })} placeholder="Festive" className={inp}/>
                          </Field>
                          <Field label="HSN Code">
                            <input value={curStyle.hsn} onChange={e => updateStyle(activeStyleIdx, { hsn: e.target.value })} placeholder="62" className={inp}/>
                          </Field>
                          <Field label="Unit">
                            <select value={curStyle.unit} onChange={e => updateStyle(activeStyleIdx, { unit: e.target.value })} className={sel}>
                              {['PCS','SET','PAIR','DOZ','BOX'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </Field>
                        </div>{/* end fields grid */}
                        </div>{/* end flex wrapper */}

                        {/* ── Style Product Picker Modal ── */}
                        {showStylePicker && (() => {
                          const allItems = [...designs, ...inventory];
                          const q = stylePickerSearch.trim().toLowerCase();
                          const filtered = q
                            ? allItems.filter(x => x.name.toLowerCase().includes(q) || (x.sku || '').toLowerCase().includes(q) || ((x as any).category || '').toLowerCase().includes(q))
                            : allItems;
                          return (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[1px]" onClick={() => setShowStylePicker(false)}>
                              <div className="bg-white rounded-xl shadow-2xl border border-[#d1d8dd] w-[560px] max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-4 py-3 border-b border-[#d1d8dd]">
                                  <h3 className="font-semibold text-[14px] text-[#1c2126]">Link Product Image</h3>
                                  <button onClick={() => setShowStylePicker(false)} className="text-[#525c66] hover:text-[#1c2126]">✕</button>
                                </div>
                                <div className="px-4 py-2.5 border-b border-[#d1d8dd]">
                                  <input autoFocus className={inp} placeholder="Search by name, SKU, category…"
                                    value={stylePickerSearch} onChange={e => setStylePickerSearch(e.target.value)} />
                                </div>
                                <div className="flex-1 overflow-y-auto p-3">
                                  {filtered.length === 0
                                    ? <div className="py-12 text-center text-[#8d99a6] text-sm">No products found</div>
                                    : <div className="grid grid-cols-3 gap-2.5">
                                        {filtered.map(item => {
                                          const img = resolveProductImage(item.name, designs, inventory, item.sku);
                                          return (
                                            <button key={item.id} type="button"
                                              onClick={() => {
                                                updateStyle(activeStyleIdx, {
                                                  linkedProductName: item.name,
                                                  styleName: curStyle.styleName || item.name,
                                                  styleNo: curStyle.styleNo || (item.sku || ''),
                                                });
                                                setShowStylePicker(false);
                                              }}
                                              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg border border-[#d1d8dd] hover:border-[#2490ef] hover:bg-[#eff6ff]/40 transition-all group">
                                              <div className="w-full aspect-square rounded-md overflow-hidden bg-[#f4f5f6] border border-[#e8ebee] flex items-center justify-center">
                                                {img
                                                  ? <img src={img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"/>
                                                  : <Package2 className="w-7 h-7 text-[#c0c7cf]"/>
                                                }
                                              </div>
                                              <div className="w-full">
                                                <p className="text-[12px] font-semibold text-[#1c2126] truncate leading-tight">{item.name}</p>
                                                <p className="text-[10px] text-[#8d99a6] truncate">{item.sku || (item as any).category || ''}</p>
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                  }
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Colour-Size Matrix Table */}
                        <div className="overflow-x-auto rounded border border-[#d1d8dd]">
                          <table className="w-full text-[12px] border-collapse">
                            <thead>
                              <tr className="bg-[#f4f5f6] text-[#525c66]">
                                <th className="text-left px-3 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Colour</th>
                                <th className="text-left px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Colour Code</th>
                                <th className="text-left px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Fabric</th>
                                <th className="text-left px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">GSM</th>
                                {curSizes.map(s => <th key={s} className="text-center px-3 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap min-w-[52px]">{s}</th>)}
                                <th className="text-center px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Total Pcs</th>
                                <th className="text-right px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Rate ({currency})</th>
                                <th className="text-right px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Disc %</th>
                                <th className="text-right px-2 py-2 font-medium border-r border-[#d1d8dd] whitespace-nowrap">Net Amt ({currency})</th>
                                <th className="px-2 py-2"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {curStyle.rows.map((row, rowIdx) => {
                                const t = rowTotals(row);
                                return (
                                  <tr key={row.id} className="border-t border-[#d1d8dd]/60 hover:bg-[#fdfdfd]">
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <div className="flex items-center gap-1.5">
                                        {row.colourCode && <span className="w-4 h-4 rounded-full border border-[#d1d8dd] flex-shrink-0" style={{ backgroundColor: row.colourCode }}/>}
                                        <input value={row.colour} onChange={e => updateRow(activeStyleIdx, rowIdx, { colour: e.target.value })} placeholder="e.g. Rose Pink" className="w-full bg-transparent outline-none text-[#1c2126]"/>
                                      </div>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <input type="color" value={row.colourCode || '#cccccc'} onChange={e => updateRow(activeStyleIdx, rowIdx, { colourCode: e.target.value })} className="w-8 h-6 rounded cursor-pointer border-0 bg-transparent p-0"/>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <input list="fab-list" value={row.fabric} onChange={e => updateRow(activeStyleIdx, rowIdx, { fabric: e.target.value })} placeholder="Cotton..." className="w-28 bg-transparent outline-none text-[#1c2126]"/>
                                      <datalist id="fab-list">{FABRIC_COMPOSITIONS.map(f => <option key={f} value={f}/>)}</datalist>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <input type="text" value={row.gsm} onChange={e => updateRow(activeStyleIdx, rowIdx, { gsm: e.target.value })} placeholder="180" className="w-14 bg-transparent outline-none text-[#1c2126]"/>
                                    </td>
                                    {curSizes.map(s => (
                                      <td key={s} className="px-1 py-1.5 border-r border-[#d1d8dd]/50 text-center">
                                        <input type="number" min="0" value={row.sizes[s] || 0} onChange={e => updateSize(activeStyleIdx, rowIdx, s, Number(e.target.value))}
                                          className="w-12 text-center bg-transparent outline-none text-[#1c2126] tabular-nums [&::-webkit-inner-spin-button]:hidden"/>
                                      </td>
                                    ))}
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50 text-center font-semibold text-[#1c2126] tabular-nums">{t.qty.toLocaleString()}</td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <input type="number" min="0" value={row.unitPrice || ''} onChange={e => updateRow(activeStyleIdx, rowIdx, { unitPrice: Number(e.target.value) })} placeholder="0" className="w-20 text-right bg-transparent outline-none text-[#1c2126] tabular-nums [&::-webkit-inner-spin-button]:hidden"/>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50">
                                      <input type="number" min="0" max="100" value={row.discount || ''} onChange={e => updateRow(activeStyleIdx, rowIdx, { discount: Number(e.target.value) })} placeholder="0" className="w-12 text-right bg-transparent outline-none text-[#525c66] tabular-nums [&::-webkit-inner-spin-button]:hidden"/>
                                    </td>
                                    <td className="px-2 py-1.5 border-r border-[#d1d8dd]/50 text-right font-semibold text-[#1c2126] tabular-nums whitespace-nowrap">
                                      {t.net > 0 ? t.net.toLocaleString('en-IN') : '—'}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <button onClick={() => removeRow(activeStyleIdx, rowIdx)} className="text-[#d1d8dd] hover:text-[#ef4444] transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="flex items-center justify-between">
                          <button onClick={() => addRow(activeStyleIdx)} className="flex items-center gap-1.5 text-[#2490ef] text-[13px] font-medium hover:underline">
                            <Plus className="w-3.5 h-3.5"/> Add Colour / Row
                          </button>
                          {/* Style sub-total */}
                          <div className="flex items-center gap-6 text-[13px]">
                            <span className="text-[#525c66]">Style Total Pcs: <strong className="text-[#1c2126]">{styleTotals(curStyle).qty.toLocaleString()}</strong></span>
                            <span className="text-[#525c66]">Style Net Amt: <strong className="text-[#1c2126]">{fmt(styleTotals(curStyle).net)}</strong></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grand Summary across all styles */}
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5">
                    <h4 className="font-semibold text-sm mb-4 text-[#1c2126] border-b border-[#d1d8dd] pb-2 flex items-center gap-2"><Hash className="w-4 h-4 text-indigo-500"/>Order Summary</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px] border-collapse">
                        <thead>
                          <tr className="bg-[#f4f5f6] text-[#525c66]">
                            <th className="text-left px-3 py-2 font-medium border border-[#d1d8dd]">Style</th>
                            <th className="text-center px-3 py-2 font-medium border border-[#d1d8dd]">Colours</th>
                            <th className="text-right px-3 py-2 font-medium border border-[#d1d8dd]">Total Pcs</th>
                            <th className="text-right px-3 py-2 font-medium border border-[#d1d8dd]">Net Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apparelItems.map((it, idx) => {
                            const t = styleTotals(it);
                            return (
                              <tr key={it.id} className="border-t border-[#d1d8dd]/60 hover:bg-[#f4f5f6] cursor-pointer" onClick={() => setActiveStyleIdx(idx)}>
                                <td className="px-3 py-2 border border-[#d1d8dd]/50 font-medium">{it.styleNo || `Style ${idx + 1}`}{it.styleName ? ` — ${it.styleName}` : ''}</td>
                                <td className="px-3 py-2 border border-[#d1d8dd]/50 text-center">
                                  <div className="flex items-center justify-center gap-1 flex-wrap">
                                    {it.rows.filter(r => r.colour || r.colourCode).map(r => (
                                      <span key={r.id} title={r.colour} className="w-4 h-4 rounded-full border border-[#d1d8dd] flex-shrink-0" style={{ backgroundColor: r.colourCode || '#ccc' }}/>
                                    ))}
                                    <span className="text-[#525c66]">{it.rows.length}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 border border-[#d1d8dd]/50 text-right tabular-nums font-semibold">{t.qty.toLocaleString()}</td>
                                <td className="px-3 py-2 border border-[#d1d8dd]/50 text-right tabular-nums font-semibold">{fmt(t.net)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-[#f4f5f6] font-bold text-[#1c2126]">
                            <td className="px-3 py-2 border border-[#d1d8dd]" colSpan={2}>Grand Total</td>
                            <td className="px-3 py-2 border border-[#d1d8dd] text-right tabular-nums">{apparelItems.reduce((s, it) => s + styleTotals(it).qty, 0).toLocaleString()}</td>
                            <td className="px-3 py-2 border border-[#d1d8dd] text-right tabular-nums">{fmt(sub)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SHIPPING TAB ── */}
              {activeTab === 'SHIPPING' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2 flex items-center gap-2"><Truck className="w-4 h-4 text-indigo-500"/>Shipping & Delivery</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                    <Field label="Expected Ex-Factory Date">
                      <input type="date" value={formData.dueDate || ''} onChange={e => setFormData({...formData, dueDate: e.target.value})} className={inp}/>
                    </Field>
                    <Field label="Delivery Terms">
                      <select value={formData.deliveryTerms || 'Ex-Factory'} onChange={e => setFormData({...formData, deliveryTerms: e.target.value})} className={sel}>
                        {DELIVERY_TERMS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </Field>
                    <Field label="Port of Loading">
                      <select value={formData.portOfLoading || ''} onChange={e => setFormData({...formData, portOfLoading: e.target.value})} className={sel}>
                        <option value="">— Select Port —</option>
                        {INCOTERMS_PORT.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </Field>
                    <Field label="Transporter Name">
                      <input value={formData.transportName || ''} onChange={e => setFormData({...formData, transportName: e.target.value})} placeholder="e.g. VRL Logistics" className={inp}/>
                    </Field>
                    <Field label="Vehicle No / LR No.">
                      <input value={formData.vehicleNo || ''} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} placeholder="e.g. RJ 14 GX 1234" className={inp}/>
                    </Field>
                    <Field label="Buyer Shipping Address">
                      <textarea rows={3} value={formData.shippingAddress || ''} onChange={e => setFormData({...formData, shippingAddress: e.target.value})} placeholder="Complete shipping address..." className={`${inp} resize-none`}/>
                    </Field>
                  </div>
                </div>
              )}

              {/* ── TAXES TAB ── */}
              {activeTab === 'TAXES' && (
                <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                  <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Taxes and Charges</h4>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5 max-w-sm">
                    <Field label="GST Rate (%)">
                      <select value={formData.taxRate ?? 5} onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})} className={sel}>
                        {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </Field>
                  </div>
                  <div className="flex justify-end mt-8 pt-4 border-t border-[#d1d8dd]">
                    <div className="flex flex-col gap-2 w-64">
                      <div className="flex justify-between text-[13px] font-medium text-[#1c2126]"><span>Sub Total</span><span>{fmt(sub)}</span></div>
                      <div className="flex justify-between text-[13px] font-medium text-[#525c66]"><span>GST @ {formData.taxRate || 0}%</span><span>{fmt(tax)}</span></div>
                      {commissionAmount > 0 && <div className="flex justify-between text-[13px] font-medium text-[#525c66]"><span>Commission ({formData.agentCommissionRate}%)</span><span>{fmt(commissionAmount)}</span></div>}
                      <div className="flex justify-between text-[15px] font-bold text-[#1c2126] mt-2 pt-2 border-t border-[#d1d8dd]"><span>Grand Total</span><span>{fmt(grand)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── MORE / TERMS TAB ── */}
              {activeTab === 'MORE' && (
                <div className="space-y-4">
                  <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                    <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Terms & Conditions</h4>
                    <div className="space-y-5">
                      <Field label="Terms & Conditions">
                        <textarea rows={4} value={formData.termsAndConditions || ''} onChange={e => setFormData({...formData, termsAndConditions: e.target.value})} placeholder="Enter terms and conditions..." className={`${inp} resize-y`}/>
                      </Field>
                      <Field label="Internal Notes / Remarks">
                        <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Internal remarks..." className={`${inp} resize-y`}/>
                      </Field>
                    </div>
                  </div>
                  {customFields.length > 0 && (
                    <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                      <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Custom Information</h4>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                        {customFields.map((f: any) => (
                          <Field key={f.id} label={f.label}>
                            {f.type === 'select' ? (
                              <select value={(formData as any)[f.key] || ''} onChange={e => setFormData({...formData, [f.key]: e.target.value})} className={sel}>
                                <option value="">{f.placeholder}</option>
                                {f.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            ) : (
                              <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={(formData as any)[f.key] || ''} onChange={e => setFormData({...formData, [f.key]: e.target.value})} className={inp} placeholder={f.placeholder}/>
                            )}
                          </Field>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Mini helpers ──────────────────────────────────────────────────────────────
const inp = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] text-[13px]";
const sel = inp + " appearance-none";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs text-[#525c66]">{label}</label>
    {children}
  </div>
);

export default SalesOrder;
