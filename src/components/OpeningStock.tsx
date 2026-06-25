import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { InventoryItem, Unit } from '../types';
import {
  Plus, Search, Edit2, Package,
  MapPin, AlertTriangle, Download,
  LayoutGrid, List, Trash2,
  Tag, X, Check, Layers, Shirt,
  Scissors, Star, TrendingUp, Boxes,
  Camera, Image as ImageIcon, ChevronDown, ChevronUp,
  Ruler, Hash, ArrowLeftRight, Layers3
} from 'lucide-react';
import BaseModal from './BaseModal';
import { commitImage } from '../utils/imageUtils';

// ─── Ready Stock Categories ───────────────────────────────────────────────────
const READY_STOCK_CATEGORIES = [
  { id: 'ALL',            label: 'All Stock',       color: 'slate' },
  { id: 'PRINTED_FABRIC', label: 'Printed Fabric',  color: 'violet' },
  { id: 'DYED_FABRIC',    label: 'Dyed Fabric',     color: 'cyan' },
  { id: 'READY_PC',       label: 'Ready PC',        color: 'emerald' },
  { id: 'GREY_FABRIC',    label: 'Grey Fabric',     color: 'amber' },
  { id: 'FINISHED_ROLL',  label: 'Finished Roll',   color: 'rose' },
  { id: 'OTHER',          label: 'Other',           color: 'slate' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PRINTED_FABRIC: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-700', dot: 'bg-violet-500' },
  DYED_FABRIC:    { bg: 'bg-cyan-50 dark:bg-cyan-900/20',     text: 'text-cyan-700 dark:text-cyan-300',     border: 'border-cyan-200 dark:border-cyan-700',     dot: 'bg-cyan-500' },
  READY_PC:       { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
  GREY_FABRIC:    { bg: 'bg-amber-50 dark:bg-amber-900/20',   text: 'text-amber-700 dark:text-amber-300',   border: 'border-amber-200 dark:border-amber-700',   dot: 'bg-amber-500' },
  FINISHED_ROLL:  { bg: 'bg-rose-50 dark:bg-rose-900/20',     text: 'text-rose-700 dark:text-rose-300',     border: 'border-rose-200 dark:border-rose-700',     dot: 'bg-rose-500' },
  OTHER:          { bg: 'bg-slate-50 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-200 dark:border-slate-700',   dot: 'bg-slate-400' },
};

const getCategoryColor = (cat: string) => CATEGORY_COLORS[cat] ?? CATEGORY_COLORS['OTHER'];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  PRINTED_FABRIC: <Layers className="w-4 h-4" />,
  DYED_FABRIC:    <Layers className="w-4 h-4" />,
  READY_PC:       <Shirt className="w-4 h-4" />,
  GREY_FABRIC:    <Scissors className="w-4 h-4" />,
  FINISHED_ROLL:  <Star className="w-4 h-4" />,
  OTHER:          <Package className="w-4 h-4" />,
};

const READY_STOCK_DOCTYPE = 'READY_STOCK';
const IS_FABRIC_CATEGORY = (type: string) =>
  ['PRINTED_FABRIC', 'DYED_FABRIC', 'GREY_FABRIC', 'FINISHED_ROLL'].includes(type);

// ─── PC Sizes ────────────────────────────────────────────────────────────────
const PC_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const SIZE_COLORS: Record<string, string> = {
  XS: 'bg-purple-100 text-purple-700 border-purple-200',
  S:  'bg-blue-100 text-blue-700 border-blue-200',
  M:  'bg-cyan-100 text-cyan-700 border-cyan-200',
  L:  'bg-teal-100 text-teal-700 border-teal-200',
  XL: 'bg-amber-100 text-amber-700 border-amber-200',
  XXL:'bg-orange-100 text-orange-700 border-orange-200',
  '3XL':'bg-rose-100 text-rose-700 border-rose-200',
};

// ─── Metering Direction Labels ────────────────────────────────────────────────
const METER_DIRECTION_LABEL: Record<string, string> = {
  L: 'Length (L)',
  R: 'Width (R)',
};

interface FabricMeteringEntry {
  id?: string;
  direction: 'L' | 'R';
  meters: number;
  lotNumber?: string;
  rollCount?: number;
  notes?: string;
}

interface PcSizeEntry {
  size: string;
  qty: number;
}

interface ExtendedInventoryItem extends InventoryItem {
  fabricMetering?: FabricMeteringEntry[];
  pcSizes?: PcSizeEntry[];
  imageUrls?: string[];          // multiple images
  lotNumber?: string;
  widthInch?: number;
  fabricComposition?: string;
  colorShade?: string;
}

interface OpeningStockProps {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
  currency?: string;
}

const EMPTY_FORM = (): Partial<ExtendedInventoryItem> => ({
  type: 'PRINTED_FABRIC',
  quantity: 0,
  minStockLevel: 0,
  pricePerUnit: 0,
  unit: 'METER',
  taxRate: 5,
  location: 'MAIN GODOWN',
  tags: [],
  doctype: READY_STOCK_DOCTYPE,
  fabricMetering: [],
  pcSizes: [],
  imageUrls: [],
});

// ─── Small sub-components ─────────────────────────────────────────────────────

const LabelInput: React.FC<{
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  colSpan?: number;
}> = ({ label, icon, children, colSpan }) => (
  <div className={colSpan === 2 ? 'md:col-span-2' : ''}>
    <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">
      {icon}{label}
    </label>
    {children}
  </div>
);

const inputCls = "w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all";
const selectCls = inputCls + " font-semibold";

// ─── Main Component ───────────────────────────────────────────────────────────
const ReadyStock: React.FC<OpeningStockProps> = ({
  items, onAdd, onUpdate, onDelete, currency = '₹'
}) => {
  const [filter, setFilter]           = useState('');
  const [activeTab, setActiveTab]     = useState('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode]       = useState<'LIST' | 'GRID'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [tagInput, setTagInput]       = useState('');
  const [formData, setFormData]       = useState<Partial<ExtendedInventoryItem>>(EMPTY_FORM());
  const [showFabricSection, setShowFabricSection] = useState(true);
  const [showPcSection, setShowPcSection]         = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const readyStockItems = useMemo(() =>
    items.filter(i => i.doctype === READY_STOCK_DOCTYPE) as ExtendedInventoryItem[],
    [items]
  );

  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>();
    readyStockItems.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [readyStockItems]);

  const filteredItems = useMemo(() => {
    const q = filter.toLowerCase();
    return readyStockItems.filter(i => {
      const searchMatch = (i.name || '').toLowerCase().includes(q) ||
                          (i.id || '').toLowerCase().includes(q) ||
                          (i.location || '').toLowerCase().includes(q) ||
                          (i.lotNumber || '').toLowerCase().includes(q) ||
                          (i.colorShade || '').toLowerCase().includes(q);
      const tabMatch    = activeTab === 'ALL' || i.type === activeTab;
      const tagMatch    = selectedTags.length === 0 ||
                          selectedTags.every(t => (i.tags || []).includes(t));
      return searchMatch && tabMatch && tagMatch;
    });
  }, [readyStockItems, filter, activeTab, selectedTags]);

  const stats = useMemo(() => {
    const totalValue  = readyStockItems.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
    const totalPcs    = readyStockItems.filter(i => i.type === 'READY_PC').reduce((s, i) => s + i.quantity, 0);
    const totalMeters = readyStockItems.filter(i => IS_FABRIC_CATEGORY(i.type)).reduce((s, i) => s + i.quantity, 0);
    const lowStock    = readyStockItems.filter(i => i.quantity <= i.minStockLevel).length;
    return { totalValue, totalPcs, totalMeters, lowStock };
  }, [readyStockItems]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { qty: number; value: number }> = {};
    readyStockItems.forEach(i => {
      if (!map[i.type]) map[i.type] = { qty: 0, value: 0 };
      map[i.type].qty   += i.quantity;
      map[i.type].value += i.quantity * i.pricePerUnit;
    });
    return map;
  }, [readyStockItems]);

  // ── PC size total auto-calc ──────────────────────────────────────────────
  const pcSizeTotal = useMemo(() =>
    (formData.pcSizes || []).reduce((s, e) => s + (e.qty || 0), 0),
    [formData.pcSizes]
  );

  // ── Fabric metering total ─────────────────────────────────────────────────
  const fabricMeteringTotal = useMemo(() =>
    (formData.fabricMetering || []).reduce((s, e) => s + (e.meters || 0), 0),
    [formData.fabricMetering]
  );

  // ── Form helpers ──────────────────────────────────────────────────────────
  const isFabric = IS_FABRIC_CATEGORY(formData.type || '');
  const isReadyPc = formData.type === 'READY_PC';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Auto-set quantity from PC sizes if READY_PC
    let quantity = formData.quantity || 0;
    if (isReadyPc && pcSizeTotal > 0) quantity = pcSizeTotal;
    // Auto-set quantity from fabric metering if fabric
    if (isFabric && fabricMeteringTotal > 0) quantity = fabricMeteringTotal;

    const item = {
      ...formData,
      quantity,
      id:        editingId || `RS-${uuidShort(12)}`,
      doctype:   READY_STOCK_DOCTYPE,
      updatedAt: new Date().toISOString(),
    } as ExtendedInventoryItem;
    if (editingId) onUpdate(item); else onAdd(item);
    setIsModalOpen(false);
  };

  const handleEdit = (item: ExtendedInventoryItem) => {
    setEditingId(item.id);
    setFormData({ ...item, imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []) });
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM());
    setIsModalOpen(true);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const t = tagInput.trim().toUpperCase();
      if (!formData.tags?.includes(t))
        setFormData(p => ({ ...p, tags: [...(p.tags || []), t] }));
      setTagInput('');
    }
  };
  const removeTag = (t: string) =>
    setFormData(p => ({ ...p, tags: p.tags?.filter(x => x !== t) }));

  // ── Image Handlers ────────────────────────────────────────────────────────
  const handleAddImages = async (files: FileList | null) => {
    if (!files) return;
    const urls: string[] = [];
    for (const f of Array.from(files)) {
      const url = await commitImage(f, 600);
      urls.push(url);
    }
    setFormData(p => ({
      ...p,
      imageUrls: [...(p.imageUrls || []), ...urls],
      imageUrl:  (p.imageUrls || []).length === 0 && urls.length > 0 ? urls[0] : p.imageUrl,
    }));
  };
  const removeImage = (idx: number) =>
    setFormData(p => {
      const next = (p.imageUrls || []).filter((_, i) => i !== idx);
      return { ...p, imageUrls: next, imageUrl: next[0] };
    });

  // ── Fabric metering helpers ───────────────────────────────────────────────
  const addMeteringEntry = () =>
    setFormData(p => ({
      ...p,
      fabricMetering: [...(p.fabricMetering || []), { direction: 'L', meters: 0, lotNumber: '', rollCount: 1, notes: '' }],
    }));
  const updateMetering = (idx: number, patch: Partial<FabricMeteringEntry>) =>
    setFormData(p => {
      const arr = [...(p.fabricMetering || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...p, fabricMetering: arr };
    });
  const removeMetering = (idx: number) =>
    setFormData(p => ({ ...p, fabricMetering: (p.fabricMetering || []).filter((_, i) => i !== idx) }));

  // ── PC size helpers ───────────────────────────────────────────────────────
  const setPcSize = (size: string, qty: number) =>
    setFormData(p => {
      const arr = [...(p.pcSizes || [])];
      const existing = arr.findIndex(e => e.size === size);
      if (existing >= 0) { arr[existing] = { size, qty }; }
      else { arr.push({ size, qty }); }
      return { ...p, pcSizes: arr.filter(e => e.qty > 0) };
    });
  const getPcQty = (size: string) =>
    (formData.pcSizes || []).find(e => e.size === size)?.qty || 0;

  // ─── CSV Export ───────────────────────────────────────────────────────────
  const handleExport = () => {
    const headers = ['ID','Name','Category','Quantity','Unit','Rate','Value','Location','Lot No','Width(in)','Color','Composition','Tags'];
    const rows = filteredItems.map(i => [
      i.id, i.name, i.type, i.quantity, i.unit,
      i.pricePerUnit, (i.quantity * i.pricePerUnit).toFixed(2),
      i.location, i.lotNumber || '', i.widthInch || '',
      i.colorShade || '', i.fabricComposition || '',
      (i.tags || []).join('|')
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `ReadyStock_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // ─── Primary display image for an item ────────────────────────────────────
  const getPrimaryImage = (item: ExtendedInventoryItem) =>
    (item.imageUrls && item.imageUrls.length > 0) ? item.imageUrls[0] : item.imageUrl;

  return (
    <div className="space-y-5 h-full flex flex-col bg-[#f8fafc] dark:bg-slate-950 -mx-4 -my-5 px-4 py-5 lg:-m-6 lg:p-6 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900">
            <Shirt className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">Ready Stock</h2>
            <p className="text-xs text-slate-500 font-medium">Printed fabric, dyed fabric, ready PC & finished goods</p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="px-4 py-2 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          <button
            onClick={openAdd}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
        {[
          { label: 'Total Value',    value: `${currency}${stats.totalValue.toLocaleString()}`, icon: <TrendingUp className="w-4 h-4" />, color: 'emerald' },
          { label: 'Ready PC (pcs)', value: stats.totalPcs.toLocaleString(),                   icon: <Shirt className="w-4 h-4" />,     color: 'violet' },
          { label: 'Fabric (mtrs)',  value: stats.totalMeters.toLocaleString(),                 icon: <Layers className="w-4 h-4" />,    color: 'cyan' },
          { label: 'Low Stock',      value: `${stats.lowStock} alerts`,                         icon: <AlertTriangle className="w-4 h-4" />, color: stats.lowStock > 0 ? 'rose' : 'slate' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center gap-3 shadow-sm">
            <div className={`p-2 rounded-lg bg-${s.color}-50 dark:bg-${s.color}-900/30 text-${s.color}-600`}>
              {s.icon}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{s.label}</p>
              <p className={`text-base font-black tabular-nums ${s.color === 'rose' && stats.lowStock > 0 ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Category Breakdown Bar ── */}
      {readyStockItems.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shrink-0 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Stock by Category</p>
          <div className="flex flex-wrap gap-2">
            {READY_STOCK_CATEGORIES.filter(c => c.id !== 'ALL' && categoryBreakdown[c.id]).map(cat => {
              const d = categoryBreakdown[cat.id];
              const col = getCategoryColor(cat.id);
              return (
                <div key={cat.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${col.bg} ${col.text} ${col.border}`}>
                  <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                  {cat.label}
                  <span className="font-black">{d.qty.toLocaleString()}</span>
                  <span className="font-medium opacity-60">• {currency}{d.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Main Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden flex-1">

        {/* Tabs + View Toggle */}
        <div className="px-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col">
          <div className="flex justify-between items-center">
            <div className="flex gap-6 overflow-x-auto no-scrollbar">
              {READY_STOCK_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`py-3.5 px-0.5 text-[11px] font-black border-b-2 transition-all uppercase tracking-widest whitespace-nowrap ${
                    activeTab === cat.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {cat.label}
                  {cat.id !== 'ALL' && categoryBreakdown[cat.id] && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500">
                      {categoryBreakdown[cat.id].qty}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
              <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><List className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4" /></button>
            </div>
          </div>

          {allAvailableTags.length > 0 && (
            <div className="flex items-center gap-3 py-2.5 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800">
              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="flex gap-1.5">
                {allAvailableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag])}
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all whitespace-nowrap ${
                      selectedTags.includes(tag)
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >{tag}</button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button onClick={() => setSelectedTags([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline ml-1">Clear</button>
              )}
            </div>
          )}
        </div>

        {/* Search */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Search by name, ID, lot no., godown..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-slate-400 gap-3">
              <Boxes className="w-10 h-10 opacity-30" />
              <p className="text-sm font-bold uppercase tracking-widest">No ready stock found</p>
              <button onClick={openAdd} className="mt-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                + Add First Entry
              </button>
            </div>
          ) : viewMode === 'LIST' ? (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                <tr>
                  <th className="p-4">Item</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-right">Qty / Sizes</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4 text-right">Value</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map(item => {
                  const col = getCategoryColor(item.type);
                  const primaryImg = getPrimaryImage(item);
                  const imgCount = (item.imageUrls?.length || (item.imageUrl ? 1 : 0));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {/* Image with count badge */}
                          <div
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 relative cursor-pointer"
                            onClick={() => primaryImg && setLightboxImg(primaryImg)}
                          >
                            {primaryImg
                              ? <img src={primaryImg} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              : <span className={col.text}>{CATEGORY_ICONS[item.type] || <Package className="w-4 h-4" />}</span>
                            }
                            {imgCount > 1 && (
                              <span className="absolute bottom-0 right-0 bg-slate-900/70 text-white text-[8px] font-bold px-1 rounded-tl">+{imgCount - 1}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700 dark:text-white uppercase text-xs">{item.name}</p>
                            <p className="text-[10px] font-mono text-slate-400">#{item.id}
                              {item.lotNumber && <> · <span className="text-indigo-500">Lot: {item.lotNumber}</span></>}
                              {item.colorShade && <> · <span className="text-rose-400">{item.colorShade}</span></>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${col.bg} ${col.text} ${col.border}`}>
                          {READY_STOCK_CATEGORIES.find(c => c.id === item.type)?.label || item.type}
                        </span>
                        {IS_FABRIC_CATEGORY(item.type) && item.widthInch && (
                          <span className="ml-1.5 text-[10px] text-slate-400 font-medium">{item.widthInch}"</span>
                        )}
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-500 uppercase">{item.location}</td>
                      <td className="p-4 text-right">
                        {item.type === 'READY_PC' && item.pcSizes && item.pcSizes.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5 justify-end">
                            {item.pcSizes.map((e: PcSizeEntry) => (
                              <span key={e.size} className={`px-1.5 py-0.5 rounded border text-[9px] font-black ${SIZE_COLORS[e.size] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                {e.size}:{e.qty}
                              </span>
                            ))}
                            <div className={`ml-1 font-black tabular-nums text-sm ${item.quantity <= item.minStockLevel ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                              {item.quantity}<span className="text-[10px] font-medium text-slate-400 ml-0.5">PC</span>
                            </div>
                          </div>
                        ) : (
                          <span className={`font-black tabular-nums text-sm ${item.quantity <= item.minStockLevel ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                            {item.quantity.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">{item.unit}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-500 tabular-nums text-xs">{currency}{item.pricePerUnit}</td>
                      <td className="p-4 text-right font-black text-slate-900 dark:text-white tabular-nums">{currency}{(item.quantity * item.pricePerUnit).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-emerald-600 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => onDelete?.(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {filteredItems.map(item => {
                const col = getCategoryColor(item.type);
                const catLabel = READY_STOCK_CATEGORIES.find(c => c.id === item.type)?.label || item.type;
                const isLow = item.quantity <= item.minStockLevel;
                const imgs = item.imageUrls || (item.imageUrl ? [item.imageUrl] : []);
                return (
                  <div
                    key={item.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => handleEdit(item)}
                  >
                    {/* Color strip */}
                    <div className={`h-1.5 w-full ${col.dot}`} />

                    {/* Image gallery strip */}
                    {imgs.length > 0 && (
                      <div className="relative h-32 bg-slate-50 dark:bg-slate-800 overflow-hidden" onClick={e => { e.stopPropagation(); setLightboxImg(imgs[0]); }}>
                        <img src={imgs[0]} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {imgs.length > 1 && (
                          <div className="absolute bottom-1 right-1 flex gap-0.5">
                            {imgs.slice(1, 4).map((img, idx) => (
                              <div key={`thumb-${idx}`} className="w-8 h-8 rounded border-2 border-white overflow-hidden shadow">
                                <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              </div>
                            ))}
                            {imgs.length > 4 && (
                              <div className="w-8 h-8 rounded border-2 border-white bg-slate-900/70 flex items-center justify-center text-white text-[9px] font-black shadow">
                                +{imgs.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 dark:text-white uppercase text-xs truncate">{item.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">#{item.id}</p>
                          {item.lotNumber && <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">Lot: {item.lotNumber}</p>}
                          {item.colorShade && <p className="text-[10px] text-rose-400 font-semibold">{item.colorShade}</p>}
                        </div>
                        {imgs.length === 0 && (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${col.bg} ${col.text} border ${col.border} shrink-0`}>{CATEGORY_ICONS[item.type] || <Package className="w-4 h-4" />}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`self-start px-2 py-0.5 rounded text-[9px] font-black uppercase border ${col.bg} ${col.text} ${col.border}`}>{catLabel}</span>
                        {IS_FABRIC_CATEGORY(item.type) && item.widthInch && (
                          <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5"><Ruler className="w-3 h-3" />{item.widthInch}"</span>
                        )}
                        {IS_FABRIC_CATEGORY(item.type) && item.fabricComposition && (
                          <span className="text-[9px] font-bold text-slate-400">{item.fabricComposition}</span>
                        )}
                      </div>

                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.slice(0, 3).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[8px] font-black text-slate-500 uppercase">{t}</span>
                          ))}
                        </div>
                      )}

                      {/* PC sizes mini-grid */}
                      {item.type === 'READY_PC' && item.pcSizes && item.pcSizes.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.pcSizes.map((e: PcSizeEntry) => (
                            <span key={e.size} className={`px-2 py-0.5 rounded border text-[9px] font-black ${SIZE_COLORS[e.size] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {e.size}<span className="ml-0.5 opacity-70">{e.qty}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Fabric L/R metering */}
                      {IS_FABRIC_CATEGORY(item.type) && item.fabricMetering && item.fabricMetering.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.fabricMetering.map((e: FabricMeteringEntry, idx: number) => (
                            <div key={`chip-${idx}`} className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded px-2 py-0.5">
                              <ArrowLeftRight className="w-2.5 h-2.5 text-indigo-400" />
                              <span className="text-[9px] font-black text-indigo-600 uppercase">{e.direction}</span>
                              <span className="text-[9px] font-bold text-indigo-500">{e.meters}m</span>
                              {e.lotNumber && <span className="text-[9px] text-indigo-400">#{e.lotNumber}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Qty</p>
                          <p className={`font-black text-sm tabular-nums ${isLow ? 'text-rose-600' : 'text-slate-800 dark:text-white'}`}>
                            {item.quantity.toLocaleString()}
                            <span className="text-[9px] font-medium text-slate-400 ml-0.5">{item.unit}</span>
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-100 dark:border-slate-800">
                          <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Value</p>
                          <p className="font-black text-sm text-emerald-600 tabular-nums">{currency}{(item.quantity * item.pricePerUnit).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-medium border-t border-slate-50 dark:border-slate-800 pt-2 mt-auto">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.location}</span>
                        {isLow && <span className="text-rose-500 font-black flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Low</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="Preview" className="max-w-full max-h-full rounded-xl shadow-2xl object-contain" referrerPolicy="no-referrer" />
          <button
            onClick={() => setLightboxImg(null)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm"
          ><X className="w-5 h-5" /></button>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Ready Stock Entry' : 'Add Ready Stock'} size="lg">
        <form onSubmit={handleSave} className="space-y-5 pb-20">

          {/* ═══════════════════════════════════════════════════
               SECTION 1: BASIC INFO
          ═══════════════════════════════════════════════════ */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">Basic Information</span>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Multi-image upload */}
              <div className="md:col-span-2">
                <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                  <Camera className="w-3.5 h-3.5" /> Photos
                  <span className="font-medium normal-case text-slate-400 ml-1">(up to 6 images)</span>
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(formData.imageUrls || []).map((img, idx) => (
                    <div key={`img-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 group">
                      <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      ><X className="w-4 h-4 text-white" /></button>
                      {idx === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-emerald-600 text-white text-[8px] font-bold text-center py-0.5">MAIN</span>
                      )}
                    </div>
                  ))}
                  {(formData.imageUrls || []).length < 6 && (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
                      <ImageIcon className="w-5 h-5 text-slate-300" />
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Add</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={e => handleAddImages(e.target.files)}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">First image is used as the main display photo</p>
              </div>

              {/* Name */}
              <LabelInput label="Item / Design Name" colSpan={2}>
                <input
                  required
                  className={inputCls + " font-bold uppercase"}
                  placeholder='e.g. FLORAL PRINT GEORGETTE 44"'
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                />
              </LabelInput>

              {/* Product / Work Order Link (for fabric types) */}
              {['PRINTED_FABRIC', 'GREY_FABRIC', 'DYED_FABRIC'].includes(formData.type || '') && (
                <LabelInput label="Linked Product / Design Name" colSpan={2}>
                  <input
                    className={inputCls}
                    placeholder='e.g. Pink Kurti (must match Work Order product name exactly)'
                    value={formData.productName || ''}
                    onChange={e => setFormData({ ...formData, productName: e.target.value })}
                  />
                  <p className="text-[9px] text-amber-600 mt-1">⚠️ This links the roll to a specific product in Work Orders. Leave blank if not linked.</p>
                </LabelInput>
              )}

              {/* Category */}
              <LabelInput label="Category">
                <select
                  className={selectCls}
                  value={formData.type}
                  onChange={e => {
                    const t = e.target.value;
                    setFormData({
                      ...formData,
                      type: t,
                      unit: t === 'READY_PC' ? 'PIECE' : 'METER',
                      fabricMetering: [],
                      pcSizes: [],
                    });
                  }}
                >
                  {READY_STOCK_CATEGORIES.filter(c => c.id !== 'ALL').map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </LabelInput>

              {/* Unit */}
              <LabelInput label="Unit">
                <select
                  className={selectCls}
                  value={formData.unit}
                  onChange={e => setFormData({ ...formData, unit: e.target.value as Unit })}
                >
                  <option value="METER">Meter</option>
                  <option value="PIECE">Piece (PC)</option>
                  <option value="KG">Kilogram</option>
                  <option value="BOX">Box</option>
                </select>
              </LabelInput>

              {/* HSN Code */}
              <LabelInput label="HSN Code" icon={<Hash className="w-3 h-3" />}>
                <input
                  className={inputCls}
                  placeholder="e.g. 5208"
                  value={formData.hsnCode || ''}
                  onChange={e => setFormData({ ...formData, hsnCode: e.target.value })}
                />
              </LabelInput>

              {/* Rate */}
              <LabelInput label={`Rate per Unit (${currency})`}>
                <input
                  type="number" required min="0"
                  className={inputCls}
                  value={formData.pricePerUnit || ''}
                  onChange={e => setFormData({ ...formData, pricePerUnit: Number(e.target.value) })}
                />
              </LabelInput>

              {/* Godown */}
              <LabelInput label="Godown / Location" icon={<MapPin className="w-3 h-3" />}>
                <input
                  className={inputCls + " font-bold uppercase"}
                  placeholder="MAIN GODOWN"
                  value={formData.location || ''}
                  onChange={e => setFormData({ ...formData, location: e.target.value.toUpperCase() })}
                />
              </LabelInput>

              {/* Min Alert */}
              <LabelInput label="Min Alert Level">
                <input
                  type="number" min="0"
                  className={inputCls}
                  value={formData.minStockLevel || ''}
                  onChange={e => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                />
              </LabelInput>

              {/* Batch / Roll No */}
              <LabelInput label="Batch / Roll No.">
                <input
                  className={inputCls}
                  placeholder="e.g. ROLL-2024-001"
                  value={formData.batchNumber || ''}
                  onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                />
              </LabelInput>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════
               SECTION 2: FABRIC DETAILS (if fabric category)
          ═══════════════════════════════════════════════════ */}
          {isFabric && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFabricSection(p => !p)}
                className="w-full bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2.5 flex items-center justify-between hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers3 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Fabric Details & L/R Metering</span>
                </div>
                {showFabricSection ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-indigo-400" />}
              </button>

              {showFabricSection && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <LabelInput label="Width (inches)" icon={<Ruler className="w-3 h-3" />}>
                      <input
                        type="number" min="0"
                        className={inputCls}
                        placeholder='e.g. 44'
                        value={formData.widthInch || ''}
                        onChange={e => setFormData({ ...formData, widthInch: Number(e.target.value) })}
                      />
                    </LabelInput>
                    <LabelInput label="Lot Number" icon={<Hash className="w-3 h-3" />}>
                      <input
                        className={inputCls}
                        placeholder="LOT-001"
                        value={formData.lotNumber || ''}
                        onChange={e => setFormData({ ...formData, lotNumber: e.target.value })}
                      />
                    </LabelInput>
                    <LabelInput label="Color / Shade">
                      <input
                        className={inputCls}
                        placeholder="e.g. Navy Blue"
                        value={formData.colorShade || ''}
                        onChange={e => setFormData({ ...formData, colorShade: e.target.value })}
                      />
                    </LabelInput>
                    <LabelInput label="Composition">
                      <input
                        className={inputCls}
                        placeholder="e.g. 100% Poly"
                        value={formData.fabricComposition || ''}
                        onChange={e => setFormData({ ...formData, fabricComposition: e.target.value })}
                      />
                    </LabelInput>
                  </div>

                  {/* L / R Metering Table */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-1.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        Length-wise (L) & Width-wise (R) Metering
                      </label>
                      <button
                        type="button"
                        onClick={addMeteringEntry}
                        className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1 uppercase"
                      >
                        <Plus className="w-3 h-3" /> Add Row
                      </button>
                    </div>

                    {(formData.fabricMetering || []).length === 0 ? (
                      <div
                        onClick={addMeteringEntry}
                        className="border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                      >
                        <p className="text-xs text-indigo-400 font-bold">Click to add L/R metering entries</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">L = Length direction · R = Width direction</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(formData.fabricMetering || []).map((entry, idx) => (
                          <div key={entry.id || `meter-${idx}`} className="grid grid-cols-12 gap-2 items-end bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900 rounded-lg p-2">
                            {/* Direction */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Dir.</label>
                              <select
                                className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1.5 text-sm font-black bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                                value={entry.direction}
                                onChange={e => updateMetering(idx, { direction: e.target.value as 'L' | 'R' })}
                              >
                                <option value="L">L</option>
                                <option value="R">R</option>
                              </select>
                            </div>
                            {/* Meters */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Meters</label>
                              <input
                                type="number" min="0" step="0.01"
                                className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                                value={entry.meters || ''}
                                onChange={e => updateMetering(idx, { meters: Number(e.target.value) })}
                              />
                            </div>
                            {/* Lot */}
                            <div className="col-span-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Lot No.</label>
                              <input
                                className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                                placeholder="LOT-001"
                                value={entry.lotNumber || ''}
                                onChange={e => updateMetering(idx, { lotNumber: e.target.value })}
                              />
                            </div>
                            {/* Rolls */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Rolls</label>
                              <input
                                type="number" min="1"
                                className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                                value={entry.rollCount || ''}
                                onChange={e => updateMetering(idx, { rollCount: Number(e.target.value) })}
                              />
                            </div>
                            {/* Notes */}
                            <div className="col-span-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Note</label>
                              <input
                                className="w-full border border-indigo-200 dark:border-indigo-700 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-400"
                                placeholder="optional"
                                value={entry.notes || ''}
                                onChange={e => updateMetering(idx, { notes: e.target.value })}
                              />
                            </div>
                            {/* Delete */}
                            <div className="col-span-1 flex justify-end">
                              <button type="button" onClick={() => removeMetering(idx)} className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors mt-4">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Metering summary */}
                        <div className="flex items-center justify-between bg-indigo-600 text-white px-4 py-2 rounded-lg">
                          <span className="text-xs font-black uppercase tracking-wider">Total Fabric</span>
                          <span className="text-lg font-black tabular-nums">{fabricMeteringTotal.toFixed(1)} m</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Total meters will auto-fill the Quantity field</p>
                      </div>
                    )}
                  </div>

                  {/* Manual qty if no metering rows */}
                  {(formData.fabricMetering || []).length === 0 && (
                    <LabelInput label="Total Quantity (meters)">
                      <input
                        type="number" min="0"
                        className={inputCls}
                        value={formData.quantity || ''}
                        onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      />
                    </LabelInput>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
               SECTION 3: READY PC — SIZE WISE DETAILS
          ═══════════════════════════════════════════════════ */}
          {isReadyPc && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowPcSection(p => !p)}
                className="w-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5 flex items-center justify-between hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Size-wise PC Details</span>
                </div>
                {showPcSection ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
              </button>

              {showPcSection && (
                <div className="p-4 space-y-4">
                  {/* Size grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {PC_SIZES.map(size => (
                      <div key={size} className="text-center">
                        <div className={`rounded-t-lg px-2 py-1 text-[10px] font-black uppercase border ${SIZE_COLORS[size] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {size}
                        </div>
                        <input
                          type="number" min="0"
                          className="w-full border border-t-0 border-slate-200 dark:border-slate-700 rounded-b-lg px-2 py-1.5 text-sm font-bold text-center bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-emerald-400"
                          placeholder="0"
                          value={getPcQty(size) || ''}
                          onChange={e => setPcSize(size, Number(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>

                  {/* PC total + rate preview */}
                  {pcSizeTotal > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase opacity-80">Total Pieces</p>
                          <p className="text-2xl font-black tabular-nums">{pcSizeTotal}</p>
                        </div>
                        <Shirt className="w-8 h-8 opacity-30" />
                      </div>
                      {(formData.pricePerUnit || 0) > 0 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3 rounded-xl flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase">Valuation</p>
                            <p className="text-xl font-black text-emerald-700 tabular-nums">
                              {currency}{(pcSizeTotal * (formData.pricePerUnit || 0)).toLocaleString()}
                            </p>
                          </div>
                          <TrendingUp className="w-7 h-7 text-emerald-300" />
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400">Total pieces will auto-fill the Quantity field</p>
                </div>
              )}
            </div>
          )}

          {/* Manual qty if neither fabric nor PC (OTHER) */}
          {!isFabric && !isReadyPc && (
            <div className="grid grid-cols-2 gap-4">
              <LabelInput label="Quantity">
                <input
                  type="number" required min="0"
                  className={inputCls}
                  value={formData.quantity || ''}
                  onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
              </LabelInput>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════
               SECTION 4: TAGS
          ═══════════════════════════════════════════════════ */}
          <div>
            <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
              <Tag className="w-3.5 h-3.5" /> Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-200 dark:border-emerald-800/50 uppercase">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <input
              className={inputCls}
              placeholder="Type a tag and press Enter... e.g. SUMMER, EXPORT, DENIM"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
            />
          </div>

          {/* Footer Buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 z-[110] rounded-b-xl px-10">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 transition-colors uppercase">Cancel</button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase flex items-center gap-2">
              <Check className="w-4 h-4" /> Save Stock
            </button>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default ReadyStock;
export { ReadyStock as OpeningStock };