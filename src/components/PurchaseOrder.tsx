import React, { useState, useMemo, useCallback, useRef } from 'react';
import { uuidShort } from "../utils/uuid";
import { PurchaseOrder, Supplier, InventoryItem, PurchaseOrderItem, Unit } from '../types';
import { 
  Search, Plus, ShoppingBag, ArrowLeft, Save,
  Trash2, Calendar, FileText, Download, Printer,
  ChevronDown, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  Activity, Link2, Mail, Copy, MoreHorizontal, Filter,
  Package, TrendingDown, Building2, Phone, MapPin
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

const PIPELINE_STEPS = ['DRAFT', 'ORDERED', 'RECEIVED'];

const STATUS_META: Record<string, { color: string; dot: string }> = {
  RECEIVED:  { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  ORDERED:   { color: 'bg-blue-50 text-blue-700 border-blue-200',           dot: 'bg-blue-500' },
  DRAFT:     { color: 'bg-amber-50 text-amber-700 border-amber-200',        dot: 'bg-amber-400' },
  CANCELLED: { color: 'bg-rose-50 text-rose-600 border-rose-200',           dot: 'bg-rose-400' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] || STATUS_META['DRAFT'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[2px] rounded border text-[10px] font-bold uppercase tracking-wide ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`}></span>
      {status}
    </span>
  );
};

const PipelineStepper = ({ status }: { status: string }) => {
  const idx = PIPELINE_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-0">
      {PIPELINE_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <React.Fragment key={step}>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-semibold
              ${active ? 'bg-[#2490ef] text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4f5f6] text-[#8d99a6]'}`}>
              {done && <CheckCircle2 className="w-3 h-3" />}
              {step}
            </div>
            {i < PIPELINE_STEPS.length - 1 && (
              <ArrowRight className={`w-3.5 h-3.5 mx-0.5 ${done ? 'text-emerald-400' : 'text-[#d1d8dd]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const EditableCell = ({ value, onChange, type = 'text', className = '', disabled = false }: {
  value: string | number; onChange: (v: any) => void; type?: string; className?: string; disabled?: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [local, setLocal] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);
  React.useEffect(() => { if (editing) ref.current?.select(); }, [editing]);
  if (disabled) return <span className={className}>{value}</span>;
  const commit = () => { setEditing(false); onChange(type === 'number' ? Number(local) : local); };
  return editing ? (
    <input ref={ref} type={type} value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className={`border border-[#2490ef] rounded px-1.5 py-0.5 text-xs outline-none bg-blue-50 ${className}`} />
  ) : (
    <span onDoubleClick={() => { setLocal(String(value)); setEditing(true); }}
      className={`cursor-text rounded px-1 hover:bg-[#e8f4fd] transition-colors ${className}`}>{value}</span>
  );
};

const PurchaseOrderComp: React.FC<PurchaseOrderProps> = ({ 
  purchaseOrders, suppliers, inventory, onAddPO, onUpdatePO, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'TAXES' | 'CONNECTIONS'>('ITEMS');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    items: [], status: 'DRAFT',
    date: new Date().toISOString().split('T')[0],
    expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  } as any);
  const [newItem, setNewItem] = useState<PurchaseOrderItem>({ productName: '', quantity: 0, unit: Unit.KG, unitPrice: 0 });

  const filteredOrders = useMemo(() => {
    const q = (filter || '').toLowerCase();
    let list = (purchaseOrders || []).filter(po => 
      (statusFilter === 'ALL' || po.status === statusFilter) &&
      ((po.supplierName || '').toLowerCase().includes(q) || (po.id || '').toLowerCase().includes(q))
    );
    return [...list].sort((a: any, b: any) => {
      const va = a[sortCol] ?? ''; const vb = b[sortCol] ?? '';
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
  }, [purchaseOrders, filter, statusFilter, sortCol, sortDir]);

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    <span className="ml-0.5 opacity-40">{sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
  );

  const stats = useMemo(() => {
    const all = purchaseOrders || [];
    return {
      total: all.length,
      draft: all.filter(p => p.status === 'DRAFT').length,
      ordered: all.filter(p => p.status === 'ORDERED').length,
      received: all.filter(p => p.status === 'RECEIVED').length,
      totalValue: all.reduce((s, p) => s + (p.totalAmount || 0), 0),
    };
  }, [purchaseOrders]);

  const subTotal = useMemo(() =>
    (formData.items || []).reduce((s, i) => s + ((i.quantity || 0) * (i.unitPrice || 0)), 0),
    [formData.items]
  );
  const taxRate = (formData as any).taxRate || 0;
  const taxAmount = (subTotal * taxRate) / 100;
  const grandTotal = subTotal + taxAmount;

  const handleSave = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!formData.supplierId || !formData.items?.length) return;
    const s = suppliers.find(sup => sup.id === formData.supplierId);
    const poData = {
      ...formData,
      id: formData.id || `PO-${uuidShort(12)}`,
      supplierName: s?.name || formData.supplierName || 'Unknown',
      totalAmount: grandTotal,
    } as PurchaseOrder;
    if (formData.id) onUpdatePO(poData);
    else onAddPO(poData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [formData, grandTotal, suppliers, onUpdatePO, onAddPO]);

  const openForm = (po?: PurchaseOrder) => {
    setFormData(po ? { ...po } : {
      items: [], status: 'DRAFT',
      date: new Date().toISOString().split('T')[0],
      expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    } as any);
    setActiveTab('ITEMS');
    setViewMode('FORM');
  };

  const addItem = () => {
    if (newItem.productName && newItem.quantity) {
      setFormData(prev => ({ ...prev, items: [...(prev.items || []), { ...newItem }] }));
      setNewItem({ productName: '', quantity: 0, unit: Unit.KG, unitPrice: 0 });
    }
  };

  const updateItem = (idx: number, field: keyof PurchaseOrderItem, value: any) => {
    const updated = (formData.items || []).map((it, i) => i === idx ? { ...it, [field]: value } : it);
    setFormData(prev => ({ ...prev, items: updated }));
  };

  const supplierInfo = useMemo(() =>
    suppliers.find(s => s.id === formData.supplierId),
    [suppliers, formData.supplierId]
  );

  // ─── LIST VIEW ───────────────────────────────────────────────────────────
  if (viewMode === 'LIST') return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 pt-4 pb-0 sticky top-0 z-20">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight">Purchase Order</span>
            <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#525c66]">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={() => openForm()}
              className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm">
              <Plus className="w-4 h-4" /> Add Purchase Order
            </button>
          </div>
        </div>

        {/* KPI bar */}
        <div className="flex items-center gap-4 mb-3 text-[12px]">
          {[
            { label: 'Draft', val: stats.draft, color: 'text-amber-600' },
            { label: 'Ordered', val: stats.ordered, color: 'text-blue-600' },
            { label: 'Received', val: stats.received, color: 'text-emerald-600' },
            { label: 'Total Value', val: currency + stats.totalValue.toLocaleString('en-IN'), color: 'text-[#1c2126]', bold: true },
          ].map(k => (
            <div key={k.label} className="flex items-center gap-1.5">
              <span className="text-[#8d99a6]">{k.label}:</span>
              <span className={`font-semibold ${k.color} ${(k as any).bold ? 'font-bold' : ''}`}>{k.val}</span>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex justify-between items-center h-8 gap-2 border-t border-[#f4f5f6] pt-2 pb-2">
          <div className="flex items-center gap-2">
            {['ALL', 'DRAFT', 'ORDERED', 'RECEIVED', 'CANCELLED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`h-7 px-3 text-[12px] font-medium rounded transition-colors
                  ${statusFilter === s ? 'bg-[#2490ef] text-white' : 'bg-white border border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
            <div className="relative ml-1">
              <input type="text" placeholder="Search supplier or PO ID…" value={filter}
                onChange={e => setFilter(e.target.value)}
                className="h-7 w-[220px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] placeholder-[#8d99a6]" />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
            </div>
          </div>
          <span className="text-[13px] text-[#525c66]">{filteredOrders.length} records</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 pb-10">
        <div className="bg-white border border-[#d1d8dd] rounded shadow-sm min-w-[900px]">
          <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] font-semibold rounded-t select-none">
            <div className="w-8">
              <input type="checkbox" className="w-3.5 h-3.5 rounded-sm border-[#d1d8dd]" />
            </div>
            {[
              { key: 'id', label: 'PO Name', w: 'w-36' },
              { key: 'supplierName', label: 'Supplier', w: 'w-52' },
              { key: 'status', label: 'Status', w: 'w-28' },
              { key: 'date', label: 'Date', w: 'w-28' },
              { key: 'expectedDelivery', label: 'Expected By', w: 'w-28' },
            ].map(col => (
              <div key={col.key} className={`${col.w} cursor-pointer hover:text-[#1c2126]`} onClick={() => toggleSort(col.key)}>
                {col.label}<SortIcon col={col.key} />
              </div>
            ))}
            <div className="flex-1 text-right pr-4 cursor-pointer hover:text-[#1c2126]" onClick={() => toggleSort('totalAmount')}>
              Grand Total<SortIcon col="totalAmount" />
            </div>
          </div>

          <div className="divide-y divide-[#d1d8dd]/60">
            {filteredOrders.length === 0 && (
              <div className="px-4 py-16 flex flex-col items-center text-[#525c66]">
                <ShoppingBag className="w-10 h-10 text-[#d1d8dd] mb-3" />
                <p className="text-[14px] font-medium mb-1">No purchase orders found</p>
                <p className="text-[12px] text-[#8d99a6]">Create your first PO to track procurement</p>
                <button onClick={() => openForm()} className="mt-4 h-8 px-4 bg-[#2490ef] text-white rounded text-[13px] font-medium">
                  + New Purchase Order
                </button>
              </div>
            )}
            {filteredOrders.map(po => {
              const checked = checkedIds.has(po.id);
              const isLate = (po as any).expectedDelivery && new Date((po as any).expectedDelivery) < new Date() && po.status !== 'RECEIVED';
              return (
                <div key={po.id}
                  className={`group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] cursor-pointer text-[13px] transition-colors ${checked ? 'bg-blue-50' : ''}`}
                  onClick={() => openForm(po)}>
                  <div className="w-8" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checked}
                      onChange={e => {
                        const s = new Set(checkedIds);
                        e.target.checked ? s.add(po.id) : s.delete(po.id);
                        setCheckedIds(s);
                      }}
                      className="w-3.5 h-3.5 rounded-sm border-[#d1d8dd] text-[#2490ef]" />
                  </div>
                  <div className="w-36 font-mono font-semibold text-[#2490ef] hover:underline">{po.id}</div>
                  <div className="w-52 truncate font-medium text-[#1c2126]">{po.supplierName}</div>
                  <div className="w-28"><StatusBadge status={po.status} /></div>
                  <div className="w-28 text-[#525c66]">{po.date}</div>
                  <div className="w-28">
                    {(po as any).expectedDelivery && (
                      <span className={`text-[11px] font-medium ${isLate ? 'text-rose-600' : 'text-[#525c66]'}`}>
                        {isLate && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                        {(po as any).expectedDelivery}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-right pr-4 tabular-nums font-bold text-[#1c2126]">
                    {currency}{(po.totalAmount ?? 0).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>

          {filteredOrders.length > 0 && (
            <div className="flex items-center px-4 py-2.5 border-t border-[#d1d8dd] bg-[#f4f5f6] rounded-b text-xs text-[#525c66] font-semibold">
              <div className="flex-1">Total ({filteredOrders.length} records)</div>
              <div className="pr-4 tabular-nums text-[#1c2126] font-bold">
                {currency}{filteredOrders.reduce((s, p) => s + (p.totalAmount || 0), 0).toLocaleString('en-IN')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">

      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 pt-3 pb-0 sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] text-[#8d99a6] mb-2">
          <button onClick={() => setViewMode('LIST')} className="hover:text-[#2490ef] transition-colors">Purchase Order</button>
          <span>/</span>
          <span className="text-[#1c2126] font-medium">{formData.id || 'New'}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight">{formData.id || 'New Purchase Order'}</span>
                <StatusBadge status={formData.status || 'DRAFT'} />
              </div>
              <div className="mt-1.5">
                <PipelineStepper status={formData.status || 'DRAFT'} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {formData.id && onAction && formData.status !== 'CANCELLED' && formData.status !== 'RECEIVED' && (
              <>
                <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_RECEIPT', formData)}
                  className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] text-[#525c66] rounded text-[13px] font-medium">
                  <ArrowRight className="w-3.5 h-3.5" /> Create Receipt
                </button>
                <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_INVOICE', formData)}
                  className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] text-[#525c66] rounded text-[13px] font-medium">
                  <FileText className="w-3.5 h-3.5" /> Create Invoice
                </button>
              </>
            )}
            {formData.id && onAction && formData.status === 'RECEIVED' && (
              <button type="button" onClick={() => onAction('CONVERT_TO_PURCHASE_RETURN', formData)}
                className="h-7 px-3 flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded text-[13px] font-medium">
                Create Return
              </button>
            )}
            <button type="button" onClick={() => setViewMode('LIST')}
              className="h-7 px-3 bg-white border border-[#d1d8dd] rounded text-[13px] font-medium text-[#525c66] hover:bg-[#f4f5f6]">
              Cancel
            </button>
            <button onClick={handleSave}
              className={`h-7 px-4 flex items-center gap-1.5 rounded text-[13px] font-medium transition-all
                ${saved ? 'bg-emerald-500 text-white' : 'bg-[#2490ef] hover:bg-[#2081d6] text-white'}`}>
              {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-3 border-t border-[#f4f5f6]">
          {(['ITEMS', 'TAXES', 'CONNECTIONS'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors
                ${activeTab === tab ? 'border-[#2490ef] text-[#2490ef]' : 'border-transparent text-[#525c66] hover:text-[#1c2126]'}`}>
              {tab === 'ITEMS' ? 'Items' : tab === 'TAXES' ? 'Taxes & More' : 'Connections'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-16">
        <div className="flex gap-4 p-5 max-w-[1100px] mx-auto">

          {/* Main form */}
          <div className="flex-1 space-y-4">

            {/* Supplier & Dates */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd]">
                <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Supplier & Dates</span>
              </div>
              <div className="p-5 grid grid-cols-3 gap-4 text-[13px]">
                <div className="col-span-1 space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1">
                    <Building2 className="w-3 h-3"/>Supplier *
                  </label>
                  <select required value={formData.supplierId || ''}
                    onChange={e => setFormData(p => ({ ...p, supplierId: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd] appearance-none">
                    <option value="">Select Supplier...</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {supplierInfo?.phone && (
                    <p className="text-[11px] text-[#8d99a6] flex items-center gap-1">
                      <Phone className="w-3 h-3"/>{supplierInfo.phone}
                    </p>
                  )}
                  {supplierInfo?.address && (
                    <p className="text-[11px] text-[#8d99a6] flex items-start gap-1">
                      <MapPin className="w-3 h-3 mt-0.5"/>{supplierInfo.address}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3 h-3"/>Order Date *
                  </label>
                  <input type="date" required value={formData.date || ''}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="w-3 h-3"/>Expected Delivery
                  </label>
                  <input type="date" value={(formData as any).expectedDelivery || ''}
                    onChange={e => setFormData(p => ({ ...p, expectedDelivery: e.target.value } as any))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Status</label>
                  <select value={formData.status || 'DRAFT'}
                    onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd] appearance-none">
                    <option value="DRAFT">Draft</option>
                    <option value="ORDERED">Ordered</option>
                    <option value="RECEIVED">Received</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Payment Terms</label>
                  <select value={(formData as any).paymentTerms || ''}
                    onChange={e => setFormData(p => ({ ...p, paymentTerms: e.target.value } as any))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd] appearance-none">
                    <option value="">Select...</option>
                    {['Advance', 'Net 7', 'Net 15', 'Net 30', '50% Advance + 50% on Delivery', 'Against Delivery'].map(t =>
                      <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">PO Ref / Note</label>
                  <input value={(formData as any).note || ''}
                    onChange={e => setFormData(p => ({ ...p, note: e.target.value } as any))}
                    className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]"
                    placeholder="Internal reference…" />
                </div>
              </div>
            </div>

            {/* Items */}
            {activeTab === 'ITEMS' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd] flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Items Table</span>
                  <span className="text-[11px] text-[#8d99a6]">Double-click cell to edit inline</span>
                </div>
                <div className="p-5">
                  {/* Add row */}
                  <div className="flex gap-2 mb-4 p-3 bg-[#f4f5f6] rounded border border-[#d1d8dd]">
                    <input list="inv-list"
                      className="flex-1 px-2.5 py-1.5 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs bg-white"
                      placeholder="Item name…" value={newItem.productName}
                      onChange={e => {
                        const inv = inventory.find(i => i.name === e.target.value);
                        setNewItem(n => ({ ...n, productName: e.target.value, unitPrice: (inv as any)?.pricePerUnit || n.unitPrice }));
                      }} />
                    <datalist id="inv-list">{inventory.map(i => <option key={i.id} value={i.name} />)}</datalist>
                    <input type="number" placeholder="Qty"
                      className="w-16 px-2 py-1.5 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs bg-white"
                      value={newItem.quantity || ''} onChange={e => setNewItem(n => ({ ...n, quantity: Number(e.target.value) }))} />
                    <select className="w-20 px-2 py-1.5 border border-[#d1d8dd] rounded focus:outline-none text-xs bg-white appearance-none"
                      value={newItem.unit} onChange={e => setNewItem(n => ({ ...n, unit: e.target.value as Unit }))}>
                      {Object.values(Unit).map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                    <input type="number" placeholder="Rate ₹"
                      className="w-28 px-2.5 py-1.5 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs bg-white"
                      value={newItem.unitPrice || ''} onChange={e => setNewItem(n => ({ ...n, unitPrice: Number(e.target.value) }))} />
                    <button type="button" onClick={addItem}
                      className="h-[30px] px-4 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">+ Add</button>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f4f5f6] text-[#525c66] border-y border-[#d1d8dd]">
                        <th className="py-2 pl-3 font-semibold w-8"></th>
                        <th className="py-2 pl-2 font-semibold">Item</th>
                        <th className="py-2 px-3 font-semibold text-right w-20">Qty</th>
                        <th className="py-2 px-2 font-semibold w-16">Unit</th>
                        <th className="py-2 px-3 font-semibold text-right w-28">Rate</th>
                        <th className="py-2 pr-3 font-semibold text-right w-28">Amount</th>
                        <th className="py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(formData.items || []).map((it, idx) => (
                        <tr key={idx} className="border-b border-[#d1d8dd]/50 hover:bg-[#f9fafb] group">
                          <td className="py-2 pl-3">
                            <ProductImageThumb productName={it.productName} inventory={inventory} size="sm" />
                          </td>
                          <td className="py-2 pl-2 font-semibold">
                            <EditableCell value={it.productName} onChange={v => updateItem(idx, 'productName', v)} />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <EditableCell value={it.quantity} onChange={v => updateItem(idx, 'quantity', v)} type="number" className="w-16 text-right" />
                          </td>
                          <td className="py-2 px-2 text-[#8d99a6]">{it.unit}</td>
                          <td className="py-2 px-3 text-right">
                            <EditableCell value={it.unitPrice} onChange={v => updateItem(idx, 'unitPrice', v)} type="number" className="w-24 text-right" />
                          </td>
                          <td className="py-2 pr-3 text-right font-bold tabular-nums">
                            {currency}{((it.quantity || 0) * (it.unitPrice || 0)).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 pr-2">
                            <button type="button"
                              onClick={() => setFormData(p => ({ ...p, items: p.items?.filter((_, i) => i !== idx) }))}
                              className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {(formData.items || []).length === 0 && (
                        <tr><td colSpan={7} className="py-10 text-center text-[#8d99a6]">
                          <Package className="w-7 h-7 mx-auto mb-2 text-[#d1d8dd]" />
                          <p className="text-[12px]">No items. Use the form above.</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Taxes tab */}
            {activeTab === 'TAXES' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd]">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Taxes & Charges</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4 text-[13px]">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">GST Rate %</label>
                    <select value={taxRate}
                      onChange={e => setFormData(p => ({ ...p, taxRate: Number(e.target.value) } as any))}
                      className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd] appearance-none">
                      {[0, 3, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Shipping Charges</label>
                    <input type="number" value={(formData as any).shipping || ''}
                      onChange={e => setFormData(p => ({ ...p, shipping: Number(e.target.value) } as any))}
                      className="w-full px-2.5 py-[6px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] bg-[#fdfdfd]"
                      placeholder="0" />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] text-[#8d99a6] font-medium uppercase tracking-wide">Remarks</label>
                    <textarea rows={3} value={(formData as any).remarks || ''}
                      onChange={e => setFormData(p => ({ ...p, remarks: e.target.value } as any))}
                      className="w-full px-2.5 py-2 border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-xs resize-none bg-[#fdfdfd]"
                      placeholder="Internal notes or supplier instructions…" />
                  </div>
                </div>
              </div>
            )}

            {/* Connections tab */}
            {activeTab === 'CONNECTIONS' && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-5 py-2.5 border-b border-[#d1d8dd]">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Linked Documents</span>
                </div>
                <div className="p-5">
                  {formData.status === 'RECEIVED' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded text-[13px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="font-semibold text-emerald-700">Purchase Receipt Created</p>
                          <p className="text-[11px] text-emerald-600">GRN has been generated for this PO.</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-[#8d99a6]">
                      <Link2 className="w-6 h-6 mx-auto mb-2 text-[#d1d8dd]" />
                      <p className="text-[13px]">No linked documents yet.</p>
                      <p className="text-[11px] mt-1">Create a Receipt or Invoice to see connections.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 space-y-4 flex-shrink-0">

            {/* Summary */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#2490ef] px-4 py-2.5">
                <span className="text-[12px] font-bold text-white uppercase tracking-wide">Order Summary</span>
              </div>
              <div className="p-4 space-y-2 text-[12px]">
                <div className="flex justify-between text-[#525c66]">
                  <span>Subtotal</span>
                  <span className="tabular-nums font-mono">{currency}{subTotal.toLocaleString('en-IN')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-[#525c66]">
                    <span>GST ({taxRate}%)</span>
                    <span className="tabular-nums font-mono">{currency}{taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {(formData as any).shipping > 0 && (
                  <div className="flex justify-between text-[#525c66]">
                    <span>Shipping</span>
                    <span className="tabular-nums font-mono">{currency}{(formData as any).shipping}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-[#d1d8dd] font-bold text-[14px] text-[#1c2126]">
                  <span>Grand Total</span>
                  <span className="tabular-nums font-mono text-[#2490ef]">
                    {currency}{(grandTotal + ((formData as any).shipping || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="pt-2 text-[11px] text-[#8d99a6]">
                  {(formData.items || []).length} items · {(formData.items || []).reduce((s, i) => s + (i.quantity || 0), 0)} units
                </div>
              </div>
            </div>

            {/* Delivery tracking */}
            {(formData as any).expectedDelivery && (
              <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
                <div className="bg-[#f4f5f6] px-4 py-2.5 border-b border-[#d1d8dd]">
                  <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Delivery</span>
                </div>
                <div className="p-4">
                  {(() => {
                    const days = Math.ceil((new Date((formData as any).expectedDelivery).getTime() - Date.now()) / 86400000);
                    const late = days < 0 && formData.status !== 'RECEIVED';
                    return (
                      <div className={`text-center p-3 rounded ${late ? 'bg-rose-50' : formData.status === 'RECEIVED' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                        {formData.status === 'RECEIVED' ? (
                          <p className="text-[12px] font-semibold text-emerald-700">✓ Received</p>
                        ) : late ? (
                          <>
                            <AlertTriangle className="w-5 h-5 text-rose-500 mx-auto mb-1" />
                            <p className="text-[12px] font-bold text-rose-600">{Math.abs(days)}d overdue</p>
                          </>
                        ) : (
                          <>
                            <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                            <p className="text-[12px] font-bold text-blue-700">{days}d remaining</p>
                          </>
                        )}
                        <p className="text-[11px] text-[#8d99a6] mt-1">{(formData as any).expectedDelivery}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
              <div className="bg-[#f4f5f6] px-4 py-2.5 border-b border-[#d1d8dd]">
                <span className="text-[12px] font-bold text-[#525c66] uppercase tracking-wide">Quick Actions</span>
              </div>
              <div className="p-3 space-y-1.5">
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded">
                  <Printer className="w-3.5 h-3.5" /> Print PO
                </button>
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded">
                  <Mail className="w-3.5 h-3.5" /> Email Supplier
                </button>
                <button type="button"
                  className="w-full h-8 flex items-center gap-2 px-3 text-[12px] text-[#525c66] hover:bg-[#f4f5f6] rounded">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseOrderComp;
