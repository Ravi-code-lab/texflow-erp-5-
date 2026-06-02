import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { InventoryItem, MaterialType, Unit } from '../types';
import {
  Search, Plus, Filter, ChevronDown, ChevronRight,
  ArrowLeft, Save, Trash2, Package, Sparkles, X,
  TrendingDown, TrendingUp, AlertTriangle, BarChart3,
  RefreshCw, Download, Upload, Eye, Layers, Tag,
  MapPin, Hash, Calendar, DollarSign, Boxes,
  ClipboardList, ArrowRightLeft, History, CheckCircle,
  ChevronUp, MoreHorizontal, Printer, Copy, Star,
  ShoppingCart, Zap, Activity
} from 'lucide-react';
import SmartPurchase from './SmartPurchase';
import ListPage, { ColumnDef, TagFilter, BulkAction, StatusBadge } from './ListPage';
import { Order, ProductionJob, Design } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StockLedgerEntry {
  id: string;
  date: string;
  type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'OPENING' | 'RETURN' | 'MANUFACTURE';
  voucher: string;
  party?: string;
  warehouse?: string;
  toWarehouse?: string;
  qty: number;
  rate: number;
  value: number;
  balance: number;
  note?: string;
}

interface BatchEntry {
  id: string;
  batchId: string;
  qty: number;
  manufactureDate?: string;
  expiryDate?: string;
  supplier?: string;
  rate: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEM_GROUPS = [
  'Fabric', 'Yarn', 'Chemicals/Dye', 'Accessories',
  'Packaging Material', 'Finished Goods', 'Semi-Finished',
  'Consumables', 'Tools & Equipment'
];

const UOMS = [
  { value: 'METER', label: 'Meter' },
  { value: 'KG', label: 'Kilogram' },
  { value: 'PIECE', label: 'Piece' },
  { value: 'YARD', label: 'Yard' },
  { value: 'LITER', label: 'Liter' },
  { value: 'BOX', label: 'Box' },
  { value: 'SET', label: 'Set' },
  { value: 'ROLL', label: 'Roll' },
  { value: 'BUNDLE', label: 'Bundle' },
  { value: 'DOZEN', label: 'Dozen' },
  { value: 'GRAM', label: 'Gram' },
  { value: 'TON', label: 'Ton' },
];

const WAREHOUSES = [
  'Main Godown', 'Raw Material Store', 'Finished Goods Store',
  'Production Floor', 'Dispatch Area', 'Quality Hold',
  'Rejection Bin', 'Transit'
];

const VALUATION_METHODS = ['Moving Average', 'FIFO', 'LIFO', 'Standard Rate'];

const TAX_RATES = [0, 5, 12, 18, 28];

const TYPE_MAP: Record<string, MaterialType | string> = {
  'Fabric': MaterialType.FABRIC,
  'Yarn': MaterialType.YARN,
  'Chemicals/Dye': MaterialType.DYE,
  'Accessories': MaterialType.ACCESSORY,
  'Packaging Material': 'PACKAGING',
  'Finished Goods': 'FINISHED',
  'Semi-Finished': 'WIP',
  'Consumables': 'CONSUMABLE',
  'Tools & Equipment': 'ASSET',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number, cur = '₹') =>
  `${cur}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const stockStatus = (item: InventoryItem) => {
  if (item.quantity <= 0) return 'OUT_OF_STOCK';
  if (item.quantity <= item.minStockLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
};

const STOCK_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  IN_STOCK:     { bg: '#ecfdf5', text: '#059669', dot: '#10b981' },
  LOW_STOCK:    { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
  OUT_OF_STOCK: { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StockStatusBadge({ item }: { item: InventoryItem }) {
  const status = stockStatus(item);
  const c = STOCK_STATUS_COLORS[status];
  const label = status === 'IN_STOCK' ? 'In Stock' : status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
  return (
    <span style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}33` }}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold">
      <span style={{ background: c.dot }} className="w-1.5 h-1.5 rounded-full" />
      {label}
    </span>
  );
}

function FieldRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-[#6b7280] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-2.5 py-[6px] bg-white dark:bg-slate-800 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[13px] text-[#1c2126] dark:text-slate-100 focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef]/30 transition-all placeholder-[#9ca3af]";
const selectCls = inputCls + " appearance-none cursor-pointer";

function SectionCard({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon?: React.ComponentType<any>; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-lg shadow-sm overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 border-b border-[#e5e7eb] dark:border-slate-700 bg-[#f9fafb] dark:bg-slate-800/60 hover:bg-[#f3f4f6] dark:hover:bg-slate-800 transition-colors">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#6b7280]" />}
          <span className="text-[13px] font-semibold text-[#374151] dark:text-slate-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#9ca3af]" /> : <ChevronDown className="w-4 h-4 text-[#9ca3af]" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  );
}

// ─── Stock Ledger View ────────────────────────────────────────────────────────

function StockLedgerView({ item, currency }: { item: InventoryItem; currency: string }) {
  const ledger: StockLedgerEntry[] = useMemo(() => {
    const entries: StockLedgerEntry[] = [];
    let bal = 0;

    // Opening
    if (item.openingStock && item.openingStock > 0) {
      bal = item.openingStock;
      entries.push({
        id: 'open',
        date: item.inwardDate || item.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        type: 'OPENING',
        voucher: 'Opening Stock',
        qty: item.openingStock,
        rate: item.pricePerUnit,
        value: item.openingStock * item.pricePerUnit,
        balance: bal,
        note: 'Opening stock entry',
      });
    }

    // Current quantity diff from opening = net movement (simulated)
    const consumed = Math.max(0, bal - item.quantity);
    if (consumed > 0) {
      bal -= consumed;
      entries.push({
        id: 'issue-1',
        date: new Date().toISOString().split('T')[0],
        type: 'ISSUE',
        voucher: `MFGR-${item.id}`,
        qty: -consumed,
        rate: item.pricePerUnit,
        value: -(consumed * item.pricePerUnit),
        balance: bal,
        note: 'Material issued to production',
      });
    }

    const received = Math.max(0, item.quantity - bal);
    if (received > 0) {
      bal += received;
      entries.push({
        id: 'rcpt-1',
        date: new Date().toISOString().split('T')[0],
        type: 'RECEIPT',
        voucher: `PRCPT-${item.id}`,
        qty: received,
        rate: item.pricePerUnit,
        value: received * item.pricePerUnit,
        balance: bal,
        note: 'Purchase receipt',
      });
    }

    return entries.reverse();
  }, [item]);

  const typeColors: Record<string, string> = {
    RECEIPT: '#059669', ISSUE: '#dc2626', TRANSFER: '#2563eb',
    ADJUSTMENT: '#7c3aed', OPENING: '#374151', RETURN: '#d97706', MANUFACTURE: '#0891b2',
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Current Qty', value: `${item.quantity} ${item.unit}`, color: '#2490ef' },
          { label: 'Reserved Qty', value: `0 ${item.unit}`, color: '#d97706' },
          { label: 'Projected Qty', value: `${item.quantity} ${item.unit}`, color: '#059669' },
          { label: 'Stock Value', value: fmt(item.quantity * item.pricePerUnit, currency), color: '#7c3aed' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-lg p-3">
            <p className="text-[11px] text-[#6b7280] mb-1">{s.label}</p>
            <p className="text-[15px] font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e5e7eb] dark:border-slate-700 bg-[#f9fafb] dark:bg-slate-800/60">
          <h4 className="text-[13px] font-semibold text-[#374151] dark:text-slate-200">Stock Ledger Entries</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#e5e7eb] dark:border-slate-700 bg-[#f9fafb] dark:bg-slate-800/40">
                {['Date', 'Type', 'Voucher', 'Qty', 'Rate', 'Value', 'Balance'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#6b7280] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-[#9ca3af]">No ledger entries</td></tr>
              ) : ledger.map(e => (
                <tr key={e.id} className="border-b border-[#f3f4f6] dark:border-slate-800 hover:bg-[#f9fafb] dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-2.5 text-[#374151] dark:text-slate-300">{e.date}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{ background: typeColors[e.type] || '#6b7280' }}>
                      {e.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[#2490ef] font-medium">{e.voucher}</td>
                  <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: e.qty >= 0 ? '#059669' : '#dc2626' }}>
                    {e.qty >= 0 ? '+' : ''}{e.qty} {e.qty >= 0 ? '' : ''}
                  </td>
                  <td className="px-4 py-2.5 text-[#374151] dark:text-slate-300">{fmt(e.rate, currency)}</td>
                  <td className="px-4 py-2.5 text-[#374151] dark:text-slate-300">{fmt(Math.abs(e.value), currency)}</td>
                  <td className="px-4 py-2.5 font-mono font-bold text-[#1c2126] dark:text-slate-100">{e.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Quick Stock Entry Modal ──────────────────────────────────────────────────

function StockEntryModal({
  item, onClose, onSave, currency
}: {
  item: InventoryItem;
  onClose: () => void;
  onSave: (updated: InventoryItem, note: string, type: string) => void;
  currency: string;
}) {
  const [type, setType] = useState<'RECEIPT' | 'ISSUE' | 'ADJUSTMENT'>('RECEIPT');
  const [qty, setQty] = useState('');
  const [rate, setRate] = useState(String(item.pricePerUnit));
  const [note, setNote] = useState('');
  const [warehouse, setWarehouse] = useState(item.location || 'Main Godown');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    if (!qtyNum) return;
    const delta = type === 'ISSUE' ? -qtyNum : type === 'ADJUSTMENT' ? (qtyNum - item.quantity) : qtyNum;
    const newQty = Math.max(0, item.quantity + delta);
    const newRate = parseFloat(rate) || item.pricePerUnit;
    // Moving average rate on receipt
    const newRate2 = type === 'RECEIPT'
      ? ((item.quantity * item.pricePerUnit) + (qtyNum * newRate)) / Math.max(newQty, 1)
      : item.pricePerUnit;
    onSave(
      { ...item, quantity: newQty, pricePerUnit: type === 'RECEIPT' ? newRate2 : item.pricePerUnit },
      note || `${type} - ${qtyNum} ${item.unit}`,
      type
    );
    onClose();
  };

  const typeOpts = [
    { v: 'RECEIPT', label: 'Material Receipt', color: '#059669' },
    { v: 'ISSUE', label: 'Material Issue', color: '#dc2626' },
    { v: 'ADJUSTMENT', label: 'Stock Adjustment', color: '#7c3aed' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md border border-[#e5e7eb] dark:border-slate-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e7eb] dark:border-slate-700">
          <div>
            <h3 className="text-[14px] font-bold text-[#1c2126] dark:text-white">Stock Entry</h3>
            <p className="text-[12px] text-[#6b7280] mt-0.5">{item.name} · {item.quantity} {item.unit} on hand</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[#f3f4f6] dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-[#6b7280]" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <FieldRow label="Entry Type">
            <div className="grid grid-cols-3 gap-2">
              {typeOpts.map(t => (
                <button key={t.v} type="button" onClick={() => setType(t.v as any)}
                  className="py-2 px-2 rounded-md border text-[11px] font-semibold text-center transition-all"
                  style={{
                    background: type === t.v ? t.color + '15' : '#f9fafb',
                    borderColor: type === t.v ? t.color : '#d1d8dd',
                    color: type === t.v ? t.color : '#374151',
                  }}>
                  {t.label}
                </button>
              ))}
            </div>
          </FieldRow>
          <FieldRow label={type === 'ADJUSTMENT' ? 'New Quantity' : 'Quantity'} required>
            <div className="flex gap-2">
              <input type="number" min="0" step="0.01" value={qty} onChange={e => setQty(e.target.value)}
                placeholder={type === 'ADJUSTMENT' ? `Current: ${item.quantity}` : '0.00'}
                className={inputCls} required />
              <span className="flex items-center px-3 bg-[#f3f4f6] dark:bg-slate-800 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#6b7280] whitespace-nowrap">
                {item.unit}
              </span>
            </div>
          </FieldRow>
          {type === 'RECEIPT' && (
            <FieldRow label="Rate per unit">
              <input type="number" min="0" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
                className={inputCls} />
            </FieldRow>
          )}
          <FieldRow label="Warehouse">
            <div className="relative">
              <select value={warehouse} onChange={e => setWarehouse(e.target.value)} className={selectCls}>
                {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
            </div>
          </FieldRow>
          <FieldRow label="Remarks">
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional remarks..." className={inputCls} />
          </FieldRow>
          {qty && (
            <div className="bg-[#f0f9ff] dark:bg-blue-900/20 border border-[#bae6fd] dark:border-blue-800 rounded-lg p-3 text-[12px] space-y-1">
              <div className="flex justify-between text-[#0369a1] dark:text-blue-300">
                <span>After this entry:</span>
                <span className="font-bold">
                  {Math.max(0, type === 'ADJUSTMENT' ? parseFloat(qty) || 0 : type === 'ISSUE' ? item.quantity - (parseFloat(qty) || 0) : item.quantity + (parseFloat(qty) || 0))} {item.unit}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[13px] font-medium text-[#374151] dark:text-slate-300 hover:bg-[#f3f4f6] dark:hover:bg-slate-800 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-[#2490ef] hover:bg-[#1d7dd4] text-white rounded-md text-[13px] font-semibold transition-colors">
              Submit Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface InventoryProps {
  items: InventoryItem[];
  orders?: Order[];
  production?: ProductionJob[];
  designs?: Design[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

type ViewMode = 'LIST' | 'FORM' | 'SMART' | 'LEDGER';
type FormTab = 'DETAILS' | 'STOCK' | 'PURCHASE' | 'ACCOUNTING';

const EMPTY_FORM = (): Partial<InventoryItem> => ({
  type: MaterialType.FABRIC,
  unit: 'METER',
  quantity: 0,
  minStockLevel: 10,
  pricePerUnit: 0,
  inwardDate: new Date().toISOString().split('T')[0],
  rolls: [],
  tags: [],
  location: 'Main Godown',
  hsnCode: '',
  taxRate: 5,
  abcGrade: 'A',
});

const Inventory: React.FC<InventoryProps> = ({
  items, orders = [], production = [], designs = [], onAdd, onUpdate, onDelete, currency = '₹'
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  const [formData, setFormData] = useState<Partial<InventoryItem>>(EMPTY_FORM());
  const [formTab, setFormTab] = useState<FormTab>('DETAILS');
  const [isDirty, setIsDirty] = useState(false);
  const [stockEntryItem, setStockEntryItem] = useState<InventoryItem | null>(null);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('erpnext_custom_fields');
      if (raw) {
        const parsed = JSON.parse(raw);
        setCustomFields(parsed.filter((f: any) => f.docType === 'InventoryItem'));
      }
    } catch {}
  }, [viewMode]);

  const setField = useCallback((patch: Partial<InventoryItem>) => {
    setFormData(prev => ({ ...prev, ...patch }));
    setIsDirty(true);
  }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = items.filter(i => !i.deleted);
    const totalValue = active.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
    const lowStock = active.filter(i => i.quantity > 0 && i.quantity <= i.minStockLevel).length;
    const outOfStock = active.filter(i => i.quantity <= 0).length;
    const inStock = active.filter(i => i.quantity > i.minStockLevel).length;
    return { total: active.length, totalValue, lowStock, outOfStock, inStock };
  }, [items]);

  // ── Columns ────────────────────────────────────────────────────────────────

  const columns: ColumnDef<InventoryItem>[] = [
    {
      key: 'id', label: 'Item Code', width: 130,
      render: r => <span className="font-mono text-[11px] text-[#2490ef]">{r.id}</span>,
      sortValue: r => r.id,
    },
    {
      key: 'name', label: 'Item Name', width: 220,
      render: r => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
            <Package className="w-3 h-3 text-indigo-500" />
          </div>
          <span className="font-medium text-[#1c2126] dark:text-slate-100 truncate">{r.name}</span>
        </div>
      ),
      sortValue: r => r.name,
    },
    {
      key: 'type', label: 'Item Group', width: 120,
      render: r => (
        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-[11px] font-medium">
          {r.type}
        </span>
      ),
      sortValue: r => r.type,
    },
    {
      key: 'location', label: 'Warehouse', width: 140,
      render: r => (
        <div className="flex items-center gap-1 text-[#6b7280] dark:text-slate-400 text-[12px]">
          <MapPin className="w-3 h-3 shrink-0" />{r.location || '—'}
        </div>
      ),
    },
    {
      key: 'quantity', label: 'Actual Qty', width: 100,
      render: r => (
        <div className="text-right tabular-nums">
          <span className="font-semibold text-[#1c2126] dark:text-slate-100">{r.quantity.toLocaleString()}</span>
          <span className="text-[10px] text-[#9ca3af] ml-1">{r.unit}</span>
        </div>
      ),
      sortValue: r => r.quantity, align: 'right',
    },
    {
      key: 'minStockLevel', label: 'Reorder', width: 80,
      render: r => <span className="text-[#9ca3af] text-right w-full block tabular-nums">{r.minStockLevel} {r.unit}</span>,
      sortValue: r => r.minStockLevel, align: 'right', defaultHidden: true,
    },
    {
      key: 'pricePerUnit', label: 'Rate', width: 100,
      render: (r, cur) => <span className="text-right w-full block tabular-nums text-[#374151] dark:text-slate-300">{fmt(r.pricePerUnit, cur)}</span>,
      sortValue: r => r.pricePerUnit, align: 'right',
    },
    {
      key: 'valuation', label: 'Stock Value', width: 120,
      render: (r, cur) => (
        <span className="text-right w-full block font-semibold tabular-nums text-[#1c2126] dark:text-slate-100">
          {fmt(r.quantity * r.pricePerUnit, cur)}
        </span>
      ),
      sortValue: r => r.quantity * r.pricePerUnit, align: 'right',
    },
    {
      key: 'status', label: 'Status', width: 110,
      render: r => <StockStatusBadge item={r} />,
      sortValue: r => stockStatus(r),
    },
  ];

  const tagFilters: TagFilter[] = [
    { key: 'low_stock',   label: 'Low Stock',   match: r => r.quantity > 0 && r.quantity <= r.minStockLevel },
    { key: 'out',         label: 'Out of Stock', match: r => r.quantity <= 0 },
    { key: 'fabric',      label: 'Fabric',       match: r => r.type === MaterialType.FABRIC || r.type === 'Fabric' },
    { key: 'yarn',        label: 'Yarn',         match: r => r.type === MaterialType.YARN || r.type === 'Yarn' },
    { key: 'dye',         label: 'Chemicals',    match: r => r.type === MaterialType.DYE || r.type === 'Chemicals/Dye' },
    { key: 'accessory',   label: 'Accessories',  match: r => r.type === MaterialType.ACCESSORY || r.type === 'Accessories' },
    { key: 'finished',    label: 'Finished',     match: r => r.type === 'FINISHED' || r.type === 'Finished Goods' },
  ];

  const bulkActions: BulkAction[] = [
    { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: ids => ids.forEach(id => onDelete(id)) },
  ];

  // ── Form handlers ──────────────────────────────────────────────────────────

  const openForm = (item?: InventoryItem) => {
    setFormData(item ? { ...item } : EMPTY_FORM());
    setFormTab('DETAILS');
    setIsDirty(false);
    setViewMode('FORM');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    const item = {
      ...formData,
      id: formData.id || `ITM-${Date.now().toString().slice(-6)}`,
      updatedAt: new Date().toISOString(),
    } as InventoryItem;
    if (formData.id) onUpdate(item);
    else onAdd(item);
    setViewMode('LIST');
    setIsDirty(false);
  };

  const handleStockEntrySave = (updated: InventoryItem) => {
    onUpdate(updated);
    setStockEntryItem(null);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    const existing = formData.tags || [];
    if (!existing.includes(t)) setField({ tags: [...existing, t] });
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setField({ tags: (formData.tags || []).filter(x => x !== t) });
  };

  // ── FORM TABS ──────────────────────────────────────────────────────────────

  const formTabs: { key: FormTab; label: string; icon: React.ComponentType<any> }[] = [
    { key: 'DETAILS',    label: 'Details',    icon: Package },
    { key: 'STOCK',      label: 'Stock',      icon: Boxes },
    { key: 'PURCHASE',   label: 'Purchase',   icon: ShoppingCart },
    { key: 'ACCOUNTING', label: 'Accounting', icon: BarChart3 },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (viewMode === 'SMART') {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex-none flex items-center gap-3 px-5 py-3.5 border-b border-[#e5e7eb] dark:border-slate-700 bg-[#f9fafb] dark:bg-slate-800/60">
          <button onClick={() => setViewMode('LIST')}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#e5e7eb] dark:hover:bg-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#6b7280]" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-[14px] font-bold text-[#1c2126] dark:text-white">Smart Purchase Recommendations</span>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <SmartPurchase production={production} designs={designs} inventory={items} />
        </div>
      </div>
    );
  }

  if (viewMode === 'LEDGER') {
    const ledgerItem = items.find(i => i.id === formData.id);
    if (!ledgerItem) { setViewMode('LIST'); return null; }
    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-[#f9fafb] dark:bg-slate-950 border border-[#e5e7eb] dark:border-slate-700 rounded-xl overflow-hidden">
        <div className="flex-none flex items-center justify-between px-5 py-3.5 border-b border-[#e5e7eb] dark:border-slate-700 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('FORM')}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] dark:hover:bg-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4 text-[#6b7280]" />
            </button>
            <div>
              <h2 className="text-[14px] font-bold text-[#1c2126] dark:text-white">Stock Ledger</h2>
              <p className="text-[11px] text-[#6b7280]">{ledgerItem.name}</p>
            </div>
          </div>
          <button onClick={() => setStockEntryItem(ledgerItem)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2490ef] text-white rounded-md text-[12px] font-semibold hover:bg-[#1d7dd4] transition-colors">
            <Plus className="w-3.5 h-3.5" />New Entry
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          <StockLedgerView item={ledgerItem} currency={currency} />
        </div>
      </div>
    );
  }

  if (viewMode === 'FORM') {
    const isEdit = !!formData.id;
    const stockValue = (formData.quantity || 0) * (formData.pricePerUnit || 0);
    const existingItem = isEdit ? items.find(i => i.id === formData.id) : undefined;
    const ss = existingItem ? stockStatus(existingItem) : 'IN_STOCK';

    return (
      <div className="flex flex-col h-[calc(100vh-120px)] bg-[#f9fafb] dark:bg-slate-950 border border-[#e5e7eb] dark:border-slate-700 rounded-xl overflow-hidden">

        {/* ── Form Header ── */}
        <div className="flex-none bg-white dark:bg-slate-900 border-b border-[#e5e7eb] dark:border-slate-700 px-5 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => {
                if (isDirty && !window.confirm('Discard unsaved changes?')) return;
                setViewMode('LIST');
              }} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f3f4f6] dark:hover:bg-slate-800 shrink-0 transition-colors">
                <ArrowLeft className="w-4 h-4 text-[#6b7280]" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-[#1c2126] dark:text-white truncate max-w-xs">
                    {isEdit ? formData.name : 'New Item'}
                  </h2>
                  {isEdit && (
                    <span className="shrink-0" style={{
                      background: STOCK_STATUS_COLORS[ss].bg,
                      color: STOCK_STATUS_COLORS[ss].text,
                      border: `1px solid ${STOCK_STATUS_COLORS[ss].dot}44`,
                      padding: '1px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700
                    }}>
                      {ss === 'IN_STOCK' ? 'In Stock' : ss === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}
                    </span>
                  )}
                  {isDirty && (
                    <span className="shrink-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Unsaved
                    </span>
                  )}
                </div>
                {isEdit && (
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    {formData.id} · {formData.location}
                    {formData.hsnCode ? ` · HSN ${formData.hsnCode}` : ''}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isEdit && (
                <>
                  <button type="button"
                    onClick={() => { setFormData(formData); setViewMode('LEDGER'); }}
                    className="h-7 px-3 flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-[#f3f4f6] dark:hover:bg-slate-700 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 transition-colors">
                    <History className="w-3.5 h-3.5" />Stock Ledger
                  </button>
                  <button type="button"
                    onClick={() => setStockEntryItem(items.find(i => i.id === formData.id) || null)}
                    className="h-7 px-3 flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-[#f3f4f6] dark:hover:bg-slate-700 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 transition-colors">
                    <ArrowRightLeft className="w-3.5 h-3.5" />Stock Entry
                  </button>
                  <button type="button"
                    onClick={() => { if (window.confirm('Delete this item?')) { onDelete(formData.id!); setViewMode('LIST'); } }}
                    className="h-7 px-3 flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-red-50 hover:border-red-400 hover:text-red-600 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button type="button" onClick={() => setViewMode('LIST')}
                className="h-7 px-3 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 hover:bg-[#f3f4f6] dark:hover:bg-slate-800 transition-colors">
                Discard
              </button>
              <button onClick={handleSave}
                className="h-7 px-4 bg-[#2490ef] hover:bg-[#1d7dd4] text-white rounded-md text-[12px] font-semibold flex items-center gap-1.5 shadow-sm transition-colors">
                <Save className="w-3.5 h-3.5" />{isEdit ? 'Update' : 'Save'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-3 border-b border-transparent -mb-3 pb-3">
            {formTabs.map(t => (
              <button key={t.key} type="button" onClick={() => setFormTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-[12px] font-medium transition-all border-b-2 ${
                  formTab === t.key
                    ? 'border-[#2490ef] text-[#2490ef] bg-blue-50/60 dark:bg-blue-900/20'
                    : 'border-transparent text-[#6b7280] hover:text-[#374151] dark:hover:text-slate-300 hover:bg-[#f3f4f6] dark:hover:bg-slate-800'
                }`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSave} className="flex-1 overflow-auto p-5">
          <div className="max-w-4xl mx-auto space-y-4">

            {/* ── DETAILS TAB ── */}
            {formTab === 'DETAILS' && (
              <>
                <SectionCard title="Basic Information" icon={Package}>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <FieldRow label="Item Name" required>
                      <input value={formData.name || ''} onChange={e => setField({ name: e.target.value })}
                        className={inputCls} placeholder="e.g. Cotton Fabric 60s" required />
                    </FieldRow>
                    <FieldRow label="Item Code">
                      <input value={formData.id || ''} onChange={e => setField({ id: e.target.value })}
                        className={inputCls} placeholder="Auto-generated if blank" />
                    </FieldRow>
                    <FieldRow label="Item Group" required>
                      <div className="relative">
                        <select value={formData.type || MaterialType.FABRIC}
                          onChange={e => setField({ type: TYPE_MAP[e.target.value] || e.target.value })}
                          className={selectCls}>
                          {ITEM_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                      </div>
                    </FieldRow>
                    <FieldRow label="Default UOM" required>
                      <div className="relative">
                        <select value={formData.unit || 'METER'} onChange={e => setField({ unit: e.target.value as any })} className={selectCls}>
                          {UOMS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                      </div>
                    </FieldRow>
                    <FieldRow label="HSN / SAC Code">
                      <input value={formData.hsnCode || ''} onChange={e => setField({ hsnCode: e.target.value })}
                        className={inputCls} placeholder="e.g. 5208" />
                    </FieldRow>
                    <FieldRow label="ABC Classification">
                      <div className="relative">
                        <select value={formData.abcGrade || 'A'} onChange={e => setField({ abcGrade: e.target.value })} className={selectCls}>
                          {['A', 'B', 'C'].map(g => <option key={g}>{g}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                      </div>
                    </FieldRow>
                    <FieldRow label="Inward Date">
                      <input type="date" value={formData.inwardDate || ''} onChange={e => setField({ inwardDate: e.target.value })} className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Expiry Date">
                      <input type="date" value={formData.expiryDate || ''} onChange={e => setField({ expiryDate: e.target.value })} className={inputCls} />
                    </FieldRow>
                    <div className="col-span-2">
                      <FieldRow label="Tags">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(formData.tags || []).map(t => (
                            <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-full text-[11px] font-medium">
                              {t}
                              <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500 transition-colors">
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                            placeholder="Add tag and press Enter..." className={inputCls + " flex-1"} />
                          <button type="button" onClick={addTag}
                            className="px-3 py-1.5 bg-[#f3f4f6] dark:bg-slate-800 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 hover:bg-[#e5e7eb] dark:hover:bg-slate-700 transition-colors">
                            Add
                          </button>
                        </div>
                      </FieldRow>
                    </div>
                  </div>
                </SectionCard>

                {customFields.length > 0 && (
                  <SectionCard title="Custom Fields" icon={Zap}>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                      {customFields.map((f: any) => (
                        <FieldRow key={f.id} label={f.label} required={f.required}>
                          {f.type === 'select' ? (
                            <div className="relative">
                              <select className={selectCls}
                                value={(formData as any)[f.key] || ''}
                                onChange={e => setField({ [f.key]: e.target.value } as any)}>
                                <option value="">{f.placeholder}</option>
                                {f.options.map((o: string) => <option key={o}>{o}</option>)}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                            </div>
                          ) : (
                            <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                              className={inputCls} placeholder={f.placeholder}
                              value={(formData as any)[f.key] || ''}
                              onChange={e => setField({ [f.key]: e.target.value } as any)} />
                          )}
                        </FieldRow>
                      ))}
                    </div>
                  </SectionCard>
                )}
              </>
            )}

            {/* ── STOCK TAB ── */}
            {formTab === 'STOCK' && (
              <>
                <SectionCard title="Inventory Settings" icon={Boxes}>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    <FieldRow label="Default Warehouse" required>
                      <div className="relative">
                        <select value={formData.location || 'Main Godown'} onChange={e => setField({ location: e.target.value })} className={selectCls}>
                          {WAREHOUSES.map(w => <option key={w}>{w}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                      </div>
                    </FieldRow>
                    <FieldRow label="Valuation Method">
                      <div className="relative">
                        <select className={selectCls} defaultValue="Moving Average">
                          {VALUATION_METHODS.map(v => <option key={v}>{v}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                      </div>
                    </FieldRow>
                    <FieldRow label="Opening Stock (Qty)">
                      <input type="number" min="0" step="0.01"
                        value={formData.openingStock ?? formData.quantity ?? 0}
                        onChange={e => setField({ openingStock: Number(e.target.value), quantity: Number(e.target.value) })}
                        className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Valuation Rate (per unit)">
                      <input type="number" min="0" step="0.01" value={formData.pricePerUnit || 0}
                        onChange={e => setField({ pricePerUnit: Number(e.target.value) })} className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Reorder Level">
                      <input type="number" min="0" step="0.01" value={formData.minStockLevel || 0}
                        onChange={e => setField({ minStockLevel: Number(e.target.value) })} className={inputCls} />
                    </FieldRow>
                    <FieldRow label="Batch Number">
                      <input value={formData.batchNumber || ''} onChange={e => setField({ batchNumber: e.target.value })}
                        className={inputCls} placeholder="e.g. BATCH-2026-001" />
                    </FieldRow>
                  </div>
                </SectionCard>

                {/* Stock Summary Box */}
                {isEdit && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg p-5">
                    <h4 className="text-[13px] font-bold text-[#374151] dark:text-slate-200 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-500" />Stock Summary
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: 'Actual Qty', value: `${formData.quantity || 0} ${formData.unit}`, color: '#2490ef' },
                        { label: 'Reorder Level', value: `${formData.minStockLevel || 0} ${formData.unit}`, color: '#d97706' },
                        { label: 'Stock Value', value: fmt(stockValue, currency), color: '#7c3aed' },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="text-[11px] text-[#6b7280] dark:text-slate-400 mb-1">{s.label}</p>
                          <p className="text-[16px] font-bold" style={{ color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                    {(formData.quantity || 0) <= (formData.minStockLevel || 0) && (formData.quantity || 0) > 0 && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-[12px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Stock is below reorder level. Consider raising a Purchase Order.
                      </div>
                    )}
                    {(formData.quantity || 0) <= 0 && (
                      <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-[12px] text-red-700 dark:text-red-400">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        This item is out of stock.
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ── PURCHASE TAB ── */}
            {formTab === 'PURCHASE' && (
              <SectionCard title="Purchase Details" icon={ShoppingCart}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <FieldRow label="Lead Time (days)">
                    <input type="number" min="0" className={inputCls} defaultValue={7} />
                  </FieldRow>
                  <FieldRow label="Min Order Qty">
                    <input type="number" min="0" step="0.01" value={formData.minStockLevel || 0}
                      onChange={e => setField({ minStockLevel: Number(e.target.value) })} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Last Purchase Rate">
                    <input type="number" min="0" step="0.01" value={formData.pricePerUnit || 0}
                      onChange={e => setField({ pricePerUnit: Number(e.target.value) })} className={inputCls} />
                  </FieldRow>
                  <FieldRow label="Safety Stock">
                    <input type="number" min="0" step="0.01" className={inputCls} defaultValue={0} />
                  </FieldRow>
                  <FieldRow label="Preferred Supplier">
                    <input className={inputCls} placeholder="Supplier name..." />
                  </FieldRow>
                  <FieldRow label="Supplier Part No.">
                    <input className={inputCls} placeholder="Supplier's item code" />
                  </FieldRow>
                </div>
              </SectionCard>
            )}

            {/* ── ACCOUNTING TAB ── */}
            {formTab === 'ACCOUNTING' && (
              <SectionCard title="Accounting & Tax" icon={BarChart3}>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <FieldRow label="Tax Rate (GST %)">
                    <div className="relative">
                      <select value={formData.taxRate ?? 5} onChange={e => setField({ taxRate: Number(e.target.value) })} className={selectCls}>
                        {TAX_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                    </div>
                  </FieldRow>
                  <FieldRow label="HSN / SAC Code">
                    <input value={formData.hsnCode || ''} onChange={e => setField({ hsnCode: e.target.value })}
                      className={inputCls} placeholder="e.g. 5208" />
                  </FieldRow>
                  <FieldRow label="Stock Adjustment Account">
                    <input className={inputCls} defaultValue="Stock Adjustment - Raw Material" />
                  </FieldRow>
                  <FieldRow label="Purchase Account">
                    <input className={inputCls} defaultValue="Purchases - Raw Material" />
                  </FieldRow>
                  <FieldRow label="Expense Account">
                    <input className={inputCls} defaultValue="Cost of Goods Sold" />
                  </FieldRow>
                  <FieldRow label="Stock Valuation Account">
                    <input className={inputCls} defaultValue="Stock In Hand" />
                  </FieldRow>
                </div>
                <div className="mt-5 p-4 bg-[#f9fafb] dark:bg-slate-800/60 border border-[#e5e7eb] dark:border-slate-700 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-[11px] text-[#9ca3af] mb-1">Base Value</p>
                      <p className="text-[14px] font-bold text-[#374151] dark:text-slate-200">{fmt(stockValue, currency)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9ca3af] mb-1">GST @ {formData.taxRate ?? 5}%</p>
                      <p className="text-[14px] font-bold text-[#374151] dark:text-slate-200">
                        {fmt(stockValue * ((formData.taxRate ?? 5) / 100), currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9ca3af] mb-1">Total with Tax</p>
                      <p className="text-[14px] font-bold text-[#2490ef]">
                        {fmt(stockValue * (1 + (formData.taxRate ?? 5) / 100), currency)}
                      </p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            <button type="submit" className="hidden">Submit</button>
          </div>
        </form>
      </div>
    );
  }

  // ── LIST VIEW ────────────────────────────────────────────────────────────────

  const toolbarRight = (
    <button onClick={() => setViewMode('SMART')}
      className="h-7 px-3 flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-[#f4f5f6] dark:hover:bg-slate-700 border border-[#d1d8dd] dark:border-slate-600 rounded-md text-[12px] font-medium text-[#374151] dark:text-slate-300 transition-colors">
      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />Smart Purchase
    </button>
  );

  return (
    <>
      {/* Summary Strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Items', value: stats.total, icon: Package, color: '#2490ef', bg: '#eff6ff' },
          { label: 'In Stock', value: stats.inStock, icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
          { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: '#d97706', bg: '#fffbeb' },
          { label: 'Stock Value', value: fmt(stats.totalValue, currency), icon: BarChart3, color: '#7c3aed', bg: '#faf5ff' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: s.bg }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <p className="text-[11px] text-[#6b7280] dark:text-slate-400">{s.label}</p>
              <p className="text-[15px] font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col h-[calc(100vh-260px)] min-h-[500px] bg-white dark:bg-slate-900 border border-[#e5e7eb] dark:border-slate-700 rounded-xl overflow-hidden">
        <ListPage<InventoryItem>
          doctype="Item"
          rows={items}
          columns={columns}
          onRowClick={item => openForm(item)}
          onNew={() => openForm()}
          newLabel="New Item"
          toolbarRight={toolbarRight}
          searchFields={['id', 'name', 'location', 'type', 'hsnCode', 'batchNumber']}
          tagFilters={tagFilters}
          bulkActions={bulkActions}
          currency={currency}
          emptyIcon={Package}
          emptyMessage="No items found. Add your first raw material."
        />
      </div>

      {stockEntryItem && (
        <StockEntryModal
          item={stockEntryItem}
          currency={currency}
          onClose={() => setStockEntryItem(null)}
          onSave={handleStockEntrySave}
        />
      )}
    </>
  );
};

export default Inventory;
