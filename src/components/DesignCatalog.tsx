import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Design, InventoryItem, RecipeItem, DesignLaborCost } from '../types';
import {
  Palette, Search, Plus, Filter,
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  ShieldCheck, Camera, X, Trash2, Settings, Download, Layers,
  Tag, Copy, Eye, DollarSign, Package,
  AlertTriangle, CheckCircle2, SlidersHorizontal,
  Grid, List, MoreVertical, Info, History,
  ChevronDown, Truck, RefreshCcw, FileText
} from 'lucide-react';
import { commitImage } from '../utils/imageUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DesignCatalogProps {
  designs: Design[];
  inventory: InventoryItem[];
  onAdd: (design: Design) => void;
  onUpdate: (design: Design) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

type TabId = 'DETAILS' | 'INVENTORY' | 'BOM' | 'PRICING' | 'VARIANTS' | 'QUALITY' | 'SUPPLIERS' | 'SETTINGS' | 'ACTIVITY';
type ViewLayoutMode = 'LIST' | 'GRID';
type SortField = 'name' | 'sku' | 'category' | 'status' | 'processCostPerPiece';

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ACTIVE:       { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0', dot: '#10b981' },
  DRAFT:        { bg: '#fefce8', text: '#b45309', border: '#fde68a', dot: '#f59e0b' },
  ARCHIVED:     { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', dot: '#9ca3af' },
  DISCONTINUED: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
};

const CATEGORIES = ['KURTI', 'PANT', 'DUPATTA', 'SET', 'FABRIC', 'ACCESSORY', 'SAREE', 'SUIT', 'LEHENGA', 'COORD SET'];
const UOMS = ['Nos', 'Kg', 'Meters', 'Sets', 'Dozens', 'Pieces', 'Boxes', 'Pairs'];
const TAX_CATS = ['Standard (12%)', 'Standard (5%)', 'Exempt', 'Zero Rated', 'Luxury (28%)', 'Reduced (3%)'];

const statusBadge = (status: string) => {
  const s = STATUS_CFG[status] ?? STATUS_CFG['DRAFT'];
  return (
    <span style={{ background: s.bg, color: s.text, borderColor: s.border }}
      className="inline-flex items-center gap-1.5 px-2 py-[2px] rounded-full text-[11px] font-semibold border tracking-wide">
      <span style={{ background: s.dot }} className="w-1.5 h-1.5 rounded-full shrink-0" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const inp = "w-full px-2.5 py-[6px] bg-white border border-[#d1d8dd] rounded-md text-[13px] text-[#1c2126] focus:outline-none focus:border-[#2490ef] focus:ring-2 focus:ring-[#2490ef]/20 transition-all placeholder-[#c0c7cf]";
const sel = inp + " appearance-none pr-7 cursor-pointer";

const FF: React.FC<{ label: string; req?: boolean; hint?: string; children: React.ReactNode; wide?: boolean }> = ({ label, req, hint, children, wide }) => (
  <div className={wide ? 'col-span-2' : ''}>
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1 text-[11px] font-medium text-[#525c66] uppercase tracking-wide">
        {label}
        {req && <span className="text-[#ef4444]">*</span>}
        {hint && <span title={hint} className="cursor-help text-[#aab1b9]"><Info className="w-3 h-3" /></span>}
      </label>
      {children}
    </div>
  </div>
);

const Sel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">{children}<ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none" /></div>
);

const Card: React.FC<{ title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, sub, action, children }) => (
  <div className="bg-white border border-[#e1e8ed] rounded-lg shadow-sm overflow-hidden">
    <div className="flex justify-between items-center px-5 py-3.5 border-b border-[#e8edf2] bg-[#fafbfc]">
      <div>
        <h4 className="text-[13px] font-semibold text-[#1c2126]">{title}</h4>
        {sub && <p className="text-[11px] text-[#8d99a6] mt-0.5">{sub}</p>}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const DesignCatalog: React.FC<DesignCatalogProps> = ({ designs, inventory, onAdd, onUpdate, onDelete, currency = '₹' }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>('LIST');
  const [activeTab, setActiveTab] = useState<TabId>('DETAILS');
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAlt, setIsUploadingAlt] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [newRecipeItem, setNewRecipeItem] = useState<any>({ materialName: '', quantity: 0, wastagePercent: 0 });
  const [newTag, setNewTag] = useState('');
  const [newSupplier, setNewSupplier] = useState({ name: '', leadTime: '', minQty: '', price: '' });
  const [newQSpec, setNewQSpec] = useState({ param: '', value: '', tolerance: '' });
  const altRef = useRef<HTMLInputElement>(null);

  const defForm: any = {
    status: 'ACTIVE', category: 'KURTI', imageUrl: '', altImages: [],
    recipe: [], processCostPerPiece: 0, targetMargin: 20,
    hasVariants: false, options: [], variants: [],
    description: '', sku: '', finishedGsm: '180', composition: '',
    laborCosts: { cutting: 0, stitching: 0, embroidery: 0, washing: 0, finishing: 0, packing: 0, folding: 0, other: 0 },
    processLossPercent: 2, hsnCode: '', shrinkage: '2-4%', finishedWidth: '44',
    tags: [], uom: 'Nos', brand: '', maintainStock: true,
    allowPurchase: false, allowSales: true, returnable: true, serialized: false,
    weight: '', dimensions: '', reorderLevel: 0, reorderQty: 0,
    taxCategory: 'Standard (12%)', barcode: '',
    sellingPrice: 0, mrp: 0, wholesalePrice: 0, discountPercent: 0,
    supplierList: [], qualitySpecs: [], internalNote: '',
    countryOfOrigin: 'India', warrantyMonths: 0,
  };
  const [form, setForm] = useState<any>(defForm);
  const set = (patch: any) => setForm((p: any) => ({ ...p, ...patch }));

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    let list = (designs || []).filter(d => {
      const mQ = !q || (d.name || '').toLowerCase().includes(q) || (d.sku || '').toLowerCase().includes(q)
        || (d.category || '').toLowerCase().includes(q) || ((d as any).brand || '').toLowerCase().includes(q)
        || ((d.tags || []).some((t: string) => t.toLowerCase().includes(q)));
      return mQ && (statusFilter === 'ALL' || d.status === statusFilter) && (categoryFilter === 'ALL' || d.category === categoryFilter);
    });
    return [...list].sort((a, b) => {
      let va = (a as any)[sortField] ?? '', vb = (b as any)[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [designs, filter, statusFilter, categoryFilter, sortField, sortDir]);

  const cost = useMemo(() => {
    const mat = (form.recipe || []).reduce((acc: number, item: RecipeItem) => {
      const m = inventory.find(i => i.name === item.materialName);
      const r = m?.pricePerUnit || item.estimatedCost || 0;
      return acc + item.quantity * r * (1 + (item.wastagePercent || 0) / 100);
    }, 0);
    const lab = Object.values(form.laborCosts || {}).reduce((a: number, b: any) => a + (Number(b) || 0), 0) - (form.laborCosts?.printingRate || 0);
    const sub = mat + lab;
    const loss = sub * ((form.processLossPercent || 0) / 100);
    const landed = sub + loss;
    return { mat, lab, loss, landed, wsp: landed * (1 + (form.targetMargin || 0) / 100) };
  }, [form.recipe, form.laborCosts, form.processLossPercent, form.targetMargin, inventory]);

  useEffect(() => {
    if (form.laborCosts?.printingRate !== undefined && form.laborCosts.printingRate > 0) {
      const pRate = form.laborCosts.printingRate;
      const mtrQty = (form.recipe || []).reduce((acc: number, item: any) => {
        return acc + ((item.unit?.toUpperCase().includes('METER') || item.unit?.toUpperCase() === 'MTR') ? (Number(item.quantity) || 0) : 0);
      }, 0);
      const calculatedPrinting = pRate * mtrQty;
      
      if (form.laborCosts.printing !== calculatedPrinting) {
        // use a distinct update so we don't cause render loops
        setForm((prev: any) => ({
          ...prev,
          laborCosts: {
            ...prev.laborCosts,
            printing: calculatedPrinting
          }
        }));
      }
    }
  }, [form.recipe, form.laborCosts?.printingRate]);

  const handleSave = () => {
    if (!form.name) return;
    const d = { ...form, processCostPerPiece: cost.landed, id: form.id || `ITM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`, updatedAt: new Date().toISOString() } as Design;
    if (form.id && onUpdate) onUpdate(d); else onAdd(d);
    setViewMode('LIST');
  };

  const openForm = (d?: any) => {
    setForm(d ? { ...defForm, ...d } : { ...defForm });
    setActiveTab('DETAILS');
    setViewMode('FORM');
  };

  const handleImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setIsUploading(true);
    try { const url = await commitImage(f, 600); set({ imageUrl: url }); } catch {}
    finally { setIsUploading(false); }
  };

  const handleAltImg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setIsUploadingAlt(true);
    try { const url = await commitImage(f, 600); set({ altImages: [...(form.altImages || []), url] }); } catch {}
    finally { setIsUploadingAlt(false); }
  };

  const addBomRow = () => {
    if (!newRecipeItem.materialName || !newRecipeItem.quantity) return;
    const m = inventory.find(i => i.name === newRecipeItem.materialName);
    const item: RecipeItem = { materialName: newRecipeItem.materialName, quantity: newRecipeItem.quantity, unit: newRecipeItem.unit || 'PCS', estimatedCost: m?.pricePerUnit || newRecipeItem.unitCost || 0, wastagePercent: newRecipeItem.wastagePercent || 0 };
    set({ recipe: [...(form.recipe || []), item] });
    setNewRecipeItem({ materialName: '', quantity: 0, wastagePercent: 0 });
  };

  const doSort = (f: SortField) => { if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortField(f); setSortDir('asc'); } };
  const si = (f: SortField) => <span className={`ml-0.5 ${sortField === f ? 'text-[#2490ef]' : 'text-[#bcc4cc]'}`}>{sortField === f ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>;

  const dup = (d: Design) => openForm({ ...d, id: undefined, name: d.name + ' (Copy)', sku: (d.sku || '') + '-COPY', status: 'DRAFT' });

  const allChk = filtered.length > 0 && filtered.every(d => checkedIds.has(d.id));
  const someChk = filtered.some(d => checkedIds.has(d.id));

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('PRODUCT CATALOG', 15, 18);
    doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 15, 26);
    autoTable(doc, {
      startY: 32,
      head: [['Item Code', 'Product Name', 'Category', 'UOM', 'Status', `Landed Cost (${currency})`]],
      body: filtered.map(d => [d.sku || '-', d.name, d.category, (d as any).uom || 'Nos', d.status, (d.processCostPerPiece || 0).toLocaleString()]),
      styles: { fontSize: 9, cellPadding: 3 }, headStyles: { fillColor: [36, 144, 239] },
    });
    doc.save(`Catalog_${Date.now()}.pdf`);
  };

  const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'DETAILS',   label: 'Details',        icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'INVENTORY', label: 'Inventory',      icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'BOM',       label: 'BOM & Costing',  icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'PRICING',   label: 'Pricing',        icon: <DollarSign className="w-3.5 h-3.5" /> },
    { id: 'VARIANTS',  label: 'Variants',       icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
    { id: 'QUALITY',   label: 'Quality',        icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'SUPPLIERS', label: 'Suppliers',      icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'SETTINGS',  label: 'Settings',       icon: <Settings className="w-3.5 h-3.5" /> },
    { id: 'ACTIVITY',  label: 'Activity',       icon: <History className="w-3.5 h-3.5" /> },
  ];

  // ─── LIST VIEW ───────────────────────────────────────────────────────────────
  if (viewMode === 'LIST') return (
    <div className="flex flex-col h-full bg-[#f4f5f7] font-sans antialiased text-[#1c2126]">
      {/* top bar */}
      <div className="flex-none bg-white border-b border-[#e1e8ed] px-5 py-3.5 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-[#2490ef]/10 rounded-md flex items-center justify-center">
              <Package className="w-4 h-4 text-[#2490ef]" />
            </div>
            <span className="text-[15px] font-bold tracking-tight">Item</span>
            <span className="text-[11px] text-[#8d99a6] bg-[#f0f2f5] px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLayoutMode(m => m === 'LIST' ? 'GRID' : 'LIST')} className="h-7 w-7 flex items-center justify-center border border-[#d1d8dd] rounded-md text-[#525c66] hover:bg-[#f4f5f7] transition-colors">
              {layoutMode === 'LIST' ? <Grid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
            </button>
            <button onClick={downloadPDF} className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f7] rounded-md text-[12px] font-medium text-[#525c66]">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            {someChk && (
              <button onClick={() => { checkedIds.forEach(id => onDelete(id)); setCheckedIds(new Set()); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] rounded-md text-[12px] font-medium">
                <Trash2 className="w-3.5 h-3.5" /> Delete ({checkedIds.size})
              </button>
            )}
            <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#1d7dd4] text-white rounded-md text-[12px] font-semibold shadow-sm">
              <Plus className="w-4 h-4" /> New Item
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <input type="text" placeholder="Search name, SKU, tag…" value={filter} onChange={e => setFilter(e.target.value)}
                className="h-7 w-[240px] pl-8 pr-3 text-[12px] bg-[#f4f5f7] border border-[#d1d8dd] rounded-md focus:outline-none focus:border-[#2490ef] focus:bg-white transition-all placeholder-[#a0a9b3]" />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a0a9b3]" />
              {filter && <button onClick={() => setFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#a0a9b3] hover:text-[#525c66]"><X className="w-3 h-3" /></button>}
            </div>
            <div className="flex items-center gap-1">
              {['ALL', 'ACTIVE', 'DRAFT', 'ARCHIVED'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`h-7 px-2.5 text-[11px] font-medium rounded-md border transition-colors ${statusFilter === s ? 'bg-[#2490ef] text-white border-[#2490ef]' : 'bg-white text-[#525c66] border-[#d1d8dd] hover:border-[#b0bac5]'}`}>
                  {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="relative">
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="h-7 pl-2.5 pr-7 text-[12px] bg-white border border-[#d1d8dd] rounded-md appearance-none focus:outline-none focus:border-[#2490ef] text-[#525c66] cursor-pointer">
                <option value="ALL">All Groups</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#a0a9b3] pointer-events-none" />
            </div>
          </div>
          <span className="text-[12px] text-[#8d99a6]">{filtered.length} of {designs.length} items</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 pb-10">
        {layoutMode === 'LIST' ? (
          <div className="bg-white border border-[#e1e8ed] rounded-lg shadow-sm overflow-hidden min-w-[920px]">
            <div className="grid items-center border-b border-[#e8edf2] bg-[#f7f9fb] px-3 py-2 text-[11px] font-semibold text-[#6b7a8d] uppercase tracking-wide select-none"
              style={{ gridTemplateColumns: '2rem 3.5rem 1fr 8rem 8rem 5.5rem 8rem 7rem 2.5rem' }}>
              <div><input type="checkbox" checked={allChk} ref={el => { if (el) el.indeterminate = someChk && !allChk; }} onChange={e => setCheckedIds(e.target.checked ? new Set(filtered.map(d => d.id)) : new Set())} className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5 cursor-pointer" /></div>
              <div className="text-center">Img</div>
              <button className="flex items-center gap-0.5 hover:text-[#1c2126] text-left" onClick={() => doSort('name')}>Name {si('name')}</button>
              <button className="flex items-center gap-0.5 hover:text-[#1c2126]" onClick={() => doSort('sku')}>Item Code {si('sku')}</button>
              <button className="flex items-center gap-0.5 hover:text-[#1c2126]" onClick={() => doSort('category')}>Group {si('category')}</button>
              <div>UOM</div>
              <button className="flex items-center gap-0.5 hover:text-[#1c2126]" onClick={() => doSort('status')}>Status {si('status')}</button>
              <button className="flex items-center gap-0.5 hover:text-[#1c2126] justify-end" onClick={() => doSort('processCostPerPiece')}>Cost {si('processCostPerPiece')}</button>
              <div />
            </div>

            <div className="divide-y divide-[#f0f2f5]">
              {filtered.length === 0 && (
                <div className="py-16 flex flex-col items-center gap-3 text-[#a0a9b3]">
                  <Package className="w-10 h-10 opacity-40" />
                  <p className="text-[13px] font-medium">No items found</p>
                  <button onClick={() => openForm()} className="mt-2 h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] text-white rounded-md text-[12px] font-semibold"><Plus className="w-3.5 h-3.5" /> Add Item</button>
                </div>
              )}
              {filtered.map(d => (
                <div key={d.id} onClick={() => openForm(d)} className="group grid items-center px-3 py-2.5 hover:bg-[#f7f9fb] transition-colors cursor-pointer text-[12px]"
                  style={{ gridTemplateColumns: '2rem 3.5rem 1fr 8rem 8rem 5.5rem 8rem 7rem 2.5rem' }}>
                  <div onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={checkedIds.has(d.id)} onChange={e => { const s = new Set(checkedIds); e.target.checked ? s.add(d.id) : s.delete(d.id); setCheckedIds(s); }} className="rounded-sm border-[#d1d8dd] text-[#2490ef] w-3.5 h-3.5 cursor-pointer" />
                  </div>
                  <div className="flex justify-center">
                    <div className="w-9 h-9 rounded-md border border-[#e1e8ed] overflow-hidden bg-[#f4f5f7] flex items-center justify-center group-hover:border-[#2490ef]/30 transition-colors">
                      {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover" alt="" /> : <Palette className="w-4 h-4 text-[#c0c7cf]" />}
                    </div>
                  </div>
                  <div className="pr-4 min-w-0">
                    <p className="font-semibold text-[#1c2126] truncate group-hover:text-[#2490ef] transition-colors">{d.name}</p>
                    {(d.tags || []).length > 0 && (
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        {(d.tags || []).slice(0, 3).map((t: string) => <span key={t} className="text-[10px] px-1.5 py-0 rounded bg-[#eff6ff] text-[#2490ef] border border-[#bfdbfe]">{t}</span>)}
                      </div>
                    )}
                  </div>
                  <div className="text-[#525c66] truncate pr-2 font-mono text-[11px]">{d.sku || '—'}</div>
                  <div className="text-[#525c66] truncate pr-2">{d.category || '—'}</div>
                  <div className="text-[#525c66]">{(d as any).uom || 'Nos'}</div>
                  <div>{statusBadge(d.status || 'ACTIVE')}</div>
                  <div className="text-right font-semibold text-[#1c2126] tabular-nums">{currency}{(d.processCostPerPiece || 0).toLocaleString()}</div>
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    <div className="relative group/m">
                      <button className="w-6 h-6 flex items-center justify-center text-[#a0a9b3] hover:text-[#525c66] rounded hover:bg-[#e8edf2] opacity-0 group-hover:opacity-100 transition-all"><MoreVertical className="w-3.5 h-3.5" /></button>
                      <div className="absolute right-0 top-7 bg-white border border-[#e1e8ed] rounded-lg shadow-lg z-30 w-36 py-1 hidden group-hover/m:block text-[12px]">
                        <button onClick={() => openForm(d)} className="w-full text-left px-3 py-1.5 hover:bg-[#f4f5f7] text-[#1c2126] flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> View / Edit</button>
                        <button onClick={() => dup(d)} className="w-full text-left px-3 py-1.5 hover:bg-[#f4f5f7] text-[#1c2126] flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> Duplicate</button>
                        <div className="my-1 border-t border-[#f0f2f5]" />
                        <button onClick={() => onDelete(d.id)} className="w-full text-left px-3 py-1.5 hover:bg-[#fef2f2] text-[#dc2626] flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(d => (
              <div key={d.id} onClick={() => openForm(d)} className="group bg-white border border-[#e1e8ed] rounded-lg overflow-hidden hover:shadow-md hover:border-[#2490ef]/30 transition-all cursor-pointer">
                <div className="aspect-square bg-[#f4f5f7] relative overflow-hidden">
                  {d.imageUrl ? <img src={d.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="" /> : <div className="w-full h-full flex items-center justify-center"><Palette className="w-10 h-10 text-[#d1d8dd]" /></div>}
                  <div className="absolute top-2 right-2">{statusBadge(d.status || 'ACTIVE')}</div>
                </div>
                <div className="p-3">
                  <p className="font-semibold text-[#1c2126] text-[13px] truncate">{d.name}</p>
                  <p className="text-[11px] text-[#8d99a6] font-mono mt-0.5">{d.sku || 'No SKU'}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[11px] text-[#8d99a6]">{d.category}</span>
                    <span className="text-[13px] font-bold">{currency}{(d.processCostPerPiece || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => openForm()} className="border-2 border-dashed border-[#d1d8dd] rounded-lg flex flex-col items-center justify-center gap-2 text-[#a0a9b3] hover:border-[#2490ef] hover:text-[#2490ef] hover:bg-[#eff6ff] transition-all min-h-[180px] cursor-pointer">
              <Plus className="w-8 h-8" />
              <span className="text-[12px] font-medium">New Item</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ─── FORM VIEW ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] font-sans antialiased text-[#1c2126]">
      {/* Header */}
      <div className="flex-none bg-white border-b border-[#e1e8ed] px-5 pt-4 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center h-9 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#f4f5f7] text-[#525c66] border border-[#e1e8ed]">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold tracking-tight truncate max-w-[380px]">{form.id ? (form.name || 'Edit Item') : 'New Item'}</span>
                {form.id && statusBadge(form.status || 'ACTIVE')}
              </div>
              {form.id && <p className="text-[11px] text-[#8d99a6] mt-0.5 font-mono">{form.sku || 'No SKU'} · {form.category}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {form.id && <button onClick={() => dup(form)} className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f7] rounded-md text-[12px] font-medium text-[#525c66]"><Copy className="w-3.5 h-3.5" /> Duplicate</button>}
            {form.id && onDelete && <button onClick={() => { onDelete(form.id); setViewMode('LIST'); }} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#dc2626] border border-[#d1d8dd] hover:border-[#fca5a5] rounded-md text-[12px] font-medium text-[#525c66]"><Trash2 className="w-3.5 h-3.5" /> Delete</button>}
            <button onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f7] rounded-md text-[12px] font-medium text-[#525c66]">Discard</button>
            <button onClick={handleSave} className="h-7 px-4 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#1d7dd4] text-white rounded-md text-[12px] font-semibold shadow-sm"><Save className="w-3.5 h-3.5" /> Save</button>
          </div>
        </div>
        <div className="flex gap-0 overflow-x-auto no-scrollbar -mb-px">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id ? 'border-[#2490ef] text-[#2490ef]' : 'border-transparent text-[#6b7a8d] hover:text-[#1c2126]'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 pb-20">
        <div className="max-w-[920px] mx-auto space-y-4">

          {/* ── DETAILS ── */}
          {activeTab === 'DETAILS' && (<>
            <Card title="Item Information" sub="Core identity and classification">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="shrink-0 flex flex-col gap-2">
                  <label className="text-[11px] font-medium text-[#525c66] uppercase tracking-wide">Primary Image</label>
                  <div className="w-28 h-28 rounded-lg border-2 border-dashed border-[#d1d8dd] bg-[#f7f9fb] flex items-center justify-center relative overflow-hidden group hover:border-[#2490ef] transition-colors cursor-pointer">
                    {form.imageUrl ? <img src={form.imageUrl} className="w-full h-full object-cover" alt="" /> :
                      <div className="flex flex-col items-center gap-1">
                        {isUploading ? <RefreshCcw className="w-6 h-6 text-[#2490ef] animate-spin" /> : <Camera className="w-7 h-7 text-[#c0c7cf]" />}
                        <span className="text-[10px] text-[#a0a9b3] text-center px-1">{isUploading ? 'Uploading…' : 'Click to upload'}</span>
                      </div>}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-5 h-5 text-white" /></div>
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImg} />
                  </div>
                  {form.imageUrl && <button onClick={() => set({ imageUrl: '' })} className="text-[11px] text-[#dc2626] hover:underline text-center">Remove</button>}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4">
                  <div className="col-span-2"><FF label="Item Name" req><input required value={form.name || ''} onChange={e => set({ name: e.target.value })} className={inp + ' text-[14px] font-semibold'} placeholder="e.g. Floral Kurti Set" /></FF></div>
                  <FF label="Item Code / SKU"><input value={form.sku || ''} onChange={e => set({ sku: e.target.value })} className={inp + ' font-mono'} placeholder="e.g. KTI-001" /></FF>
                  <FF label="HSN Code" hint="Harmonized System Nomenclature for GST"><input value={form.hsnCode || ''} onChange={e => set({ hsnCode: e.target.value })} className={inp} placeholder="e.g. 62044200" /></FF>
                  <FF label="Item Group"><Sel><select value={form.category || 'KURTI'} onChange={e => set({ category: e.target.value })} className={sel}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></Sel></FF>
                  <FF label="Status"><Sel><select value={form.status || 'ACTIVE'} onChange={e => set({ status: e.target.value })} className={sel}>{['ACTIVE', 'DRAFT', 'ARCHIVED', 'DISCONTINUED'].map(s => <option key={s} value={s}>{s}</option>)}</select></Sel></FF>
                </div>
              </div>
            </Card>

            <Card title="Description & Tags">
              <div className="space-y-4">
                <FF label="Description"><textarea rows={3} value={form.description || ''} onChange={e => set({ description: e.target.value })} className={inp} placeholder="Material, style, occasion…" /></FF>
                <div>
                  <label className="text-[11px] font-medium text-[#525c66] uppercase tracking-wide">Tags</label>
                  <div className="flex flex-wrap gap-1.5 mt-2 mb-2">
                    {(form.tags || []).map((t: string) => (
                      <span key={t} className="inline-flex items-center gap-1 bg-[#eff6ff] text-[#2490ef] border border-[#bfdbfe] rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                        <Tag className="w-2.5 h-2.5" />{t}
                        <button onClick={() => set({ tags: form.tags?.filter((x: string) => x !== t) })} className="ml-0.5 hover:text-[#1d4ed8]"><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newTag.trim() && !form.tags?.includes(newTag.trim())) set({ tags: [...(form.tags || []), newTag.trim()] }); setNewTag(''); } }} className={inp + ' w-44'} placeholder="Add tag…" />
                    <button onClick={() => { if (newTag.trim() && !form.tags?.includes(newTag.trim())) set({ tags: [...(form.tags || []), newTag.trim()] }); setNewTag(''); }} className="h-8 px-3 bg-[#f0f7ff] border border-[#bfdbfe] text-[#2490ef] rounded-md text-[12px] font-medium hover:bg-[#dbeafe]">Add</button>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Fabric & Physical Specs">
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                <FF label="Composition"><input value={form.composition || ''} onChange={e => set({ composition: e.target.value })} className={inp} placeholder="e.g. 100% Cotton" /></FF>
                <FF label="Finished GSM"><input value={form.finishedGsm || ''} onChange={e => set({ finishedGsm: e.target.value })} className={inp} placeholder="e.g. 180" /></FF>
                <FF label="Width (inches)"><input value={form.finishedWidth || ''} onChange={e => set({ finishedWidth: e.target.value })} className={inp} placeholder="e.g. 44" /></FF>
                <FF label="Shrinkage"><input value={form.shrinkage || ''} onChange={e => set({ shrinkage: e.target.value })} className={inp} placeholder="e.g. 2-4%" /></FF>
                <FF label="Weight/unit"><input value={form.weight || ''} onChange={e => set({ weight: e.target.value })} className={inp} placeholder="e.g. 250g" /></FF>
                <FF label="Dimensions (L×W×H)"><input value={form.dimensions || ''} onChange={e => set({ dimensions: e.target.value })} className={inp} placeholder="e.g. 30×25×5 cm" /></FF>
                <FF label="Country of Origin"><input value={form.countryOfOrigin || 'India'} onChange={e => set({ countryOfOrigin: e.target.value })} className={inp} /></FF>
                <FF label="Brand"><input value={form.brand || ''} onChange={e => set({ brand: e.target.value })} className={inp} placeholder="e.g. In-house" /></FF>
                <FF label="Barcode / EAN"><input value={form.barcode || ''} onChange={e => set({ barcode: e.target.value })} className={inp + ' font-mono'} /></FF>
              </div>
            </Card>

            <Card title="Image Gallery" sub="Additional product images"
              action={<label className="h-7 px-3 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f7] rounded-md text-[12px] font-medium text-[#525c66] cursor-pointer"><Plus className="w-3.5 h-3.5" />{isUploadingAlt ? 'Uploading…' : 'Add'}<input ref={altRef} type="file" className="hidden" accept="image/*" onChange={handleAltImg} /></label>}>
              <div className="flex gap-3 flex-wrap">
                {(form.altImages || []).map((url: string, i: number) => (
                  <div key={url + '_' + i} className="relative group/img w-20 h-20 rounded-md border border-[#e1e8ed] overflow-hidden bg-[#f7f9fb]">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => set({ altImages: form.altImages?.filter((_: any, j: number) => j !== i) })} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover/img:opacity-100"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
                {(form.altImages || []).length === 0 && <p className="text-[12px] text-[#a0a9b3]">No additional images.</p>}
              </div>
            </Card>
          </>)}

          {/* ── INVENTORY ── */}
          {activeTab === 'INVENTORY' && (
            <Card title="Inventory & Stock Settings">
              <div className="space-y-6">
                <div className="flex items-start gap-8 flex-wrap">
                  {[
                    { k: 'maintainStock', l: 'Maintain Stock', d: 'Track qty on hand' },
                    { k: 'allowSales', l: 'Allow Sales', d: 'Can be sold' },
                    { k: 'allowPurchase', l: 'Allow Purchase', d: 'Can be purchased' },
                    { k: 'returnable', l: 'Returnable', d: 'Accept returns' },
                    { k: 'serialized', l: 'Serialized', d: 'Track serial numbers' },
                  ].map(o => (
                    <label key={o.k} className="flex items-start gap-2 cursor-pointer group">
                      <input type="checkbox" checked={!!form[o.k]} onChange={e => set({ [o.k]: e.target.checked })} className="mt-0.5 rounded border-[#d1d8dd] text-[#2490ef] w-4 h-4 cursor-pointer" />
                      <div><p className="text-[13px] font-medium text-[#1c2126] group-hover:text-[#2490ef]">{o.l}</p><p className="text-[10px] text-[#a0a9b3]">{o.d}</p></div>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-[#f0f2f5]">
                  <FF label="Default UOM" req><Sel><select value={form.uom || 'Nos'} onChange={e => set({ uom: e.target.value })} className={sel}>{UOMS.map(u => <option key={u} value={u}>{u}</option>)}</select></Sel></FF>
                  <FF label="Reorder Level" hint="Alert when stock falls below"><input type="number" min={0} value={form.reorderLevel || ''} onChange={e => set({ reorderLevel: Number(e.target.value) })} className={inp} /></FF>
                  <FF label="Reorder Qty" hint="Qty to reorder when triggered"><input type="number" min={0} value={form.reorderQty || ''} onChange={e => set({ reorderQty: Number(e.target.value) })} className={inp} /></FF>
                </div>
                {(form.reorderLevel || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-[#fefce8] border border-[#fde68a] rounded-md px-4 py-3 text-[12px] text-[#92400e]">
                    <AlertTriangle className="w-4 h-4 text-[#f59e0b] shrink-0" />
                    Reorder alert triggers when stock drops below <strong className="mx-1">{form.reorderLevel}</strong> {form.uom || 'units'}.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* ── BOM ── */}
          {activeTab === 'BOM' && (<>
            <Card title="Bill of Materials" sub="Raw materials and components" action={<span className="text-[11px] text-[#8d99a6] font-medium">{form.recipe?.length || 0} items</span>}>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left min-w-[600px]">
                  <thead><tr className="bg-[#f7f9fb] text-[11px] text-[#6b7a8d] uppercase tracking-wide border-y border-[#e8edf2]">
                    <th className="py-2 pl-3 font-semibold w-48">Material</th>
                    <th className="py-2 px-3 font-semibold">Qty / Unit</th>
                    <th className="py-2 px-3 font-semibold">Wastage %</th>
                    <th className="py-2 px-3 font-semibold">Unit Rate</th>
                    <th className="py-2 px-3 font-semibold text-right">Total</th>
                    <th className="py-2 pr-3 w-10" />
                  </tr></thead>
                  <tbody>
                    {(form.recipe || []).map((item: RecipeItem, idx: number) => {
                      const m = inventory.find(i => i.name === item.materialName);
                      const r = m?.pricePerUnit || item.estimatedCost || 0;
                      const t = item.quantity * r * (1 + (item.wastagePercent || 0) / 100);
                      return (
                        <tr key={(item as any).id || (item as any).name + idx} className="border-b border-[#f0f2f5] hover:bg-[#f7f9fb]">
                          <td className="py-2.5 pl-3 text-[13px] font-medium">{item.materialName}</td>
                          <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{item.quantity} {item.unit}</td>
                          <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{item.wastagePercent || 0}%</td>
                          <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{currency}{r}</td>
                          <td className="py-2.5 px-3 text-right text-[13px] font-semibold">{currency}{t.toFixed(2)}</td>
                          <td className="py-2.5 pr-3 text-right"><button onClick={() => set({ recipe: form.recipe?.filter((_: any, i: number) => i !== idx) })} className="text-[#dc2626] hover:bg-[#fef2f2] p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      );
                    })}
                    <tr className="bg-[#f7f9fb] border-b border-[#e1e8ed]">
                      <td className="py-2 pl-3">
                        <select value={newRecipeItem.materialName || ''} onChange={e => { const m = inventory.find(i => i.name === e.target.value); setNewRecipeItem({ ...newRecipeItem, materialName: e.target.value, unit: m?.unit, unitCost: m?.pricePerUnit }); }} className="w-full text-[12px] bg-transparent border-0 focus:outline-none text-[#1c2126]">
                          <option value="">Select material…</option>
                          {inventory.map(i => <option key={i.id} value={i.name}>{i.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-3"><input type="number" min={0} className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Qty" value={newRecipeItem.quantity || ''} onChange={e => setNewRecipeItem({ ...newRecipeItem, quantity: Number(e.target.value) })} /></td>
                      <td className="py-2 px-3"><input type="number" min={0} className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Wastage %" value={newRecipeItem.wastagePercent || ''} onChange={e => setNewRecipeItem({ ...newRecipeItem, wastagePercent: Number(e.target.value) })} /></td>
                      <td className="py-2 px-3 text-[12px] text-[#8d99a6]">{currency}{newRecipeItem.unitCost || 0}</td>
                      <td colSpan={2} className="py-2 px-3"><button onClick={addBomRow} className="text-[12px] font-semibold text-[#2490ef] hover:underline">+ Add Row</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title="Labor & Process Costs">
              <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                {[
                  { k: 'cutting', l: 'Cutting' }, { k: 'stitching', l: 'Stitching' }, { k: 'embroidery', l: 'Embroidery' },
                  { k: 'washing', l: 'Washing' }, { k: 'finishing', l: 'Finishing' }, { k: 'packing', l: 'Packing' },
                  { k: 'folding', l: 'Folding' }, { k: 'other', l: 'Other' },
                ].map(p => (
                  <FF key={p.k} label={p.l + ' Cost'}>
                    <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8d99a6]">{currency}</span>
                      <input type="number" min={0} className={inp + ' pl-6'} value={form.laborCosts?.[p.k] || ''} onChange={e => set({ laborCosts: { ...form.laborCosts, [p.k]: Number(e.target.value) } })} />
                    </div>
                  </FF>
                ))}
                
                <div className="col-span-4 border-t pt-4 mt-2">
                  <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3">Printing Calculation (Auto)</h4>
                  <div className="grid grid-cols-4 gap-x-6 gap-y-4">
                    <FF label="Printing Rate (per Meter)">
                      <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8d99a6]">{currency}</span>
                        <input type="number" min={0} className={inp + ' pl-6'} value={form.laborCosts?.printingRate || ''} 
                          onChange={e => {
                            const pRate = Number(e.target.value);
                            const mtrQty = (form.recipe || []).reduce((acc: number, item: any) => {
                              return acc + ((item.unit?.toUpperCase().includes('METER') || item.unit?.toUpperCase() === 'MTR') ? (Number(item.quantity) || 0) : 0);
                            }, 0);
                            set({ laborCosts: { ...form.laborCosts, printingRate: pRate, printing: pRate * mtrQty } });
                          }} 
                        />
                      </div>
                    </FF>
                    <FF label="Total Fabric (Meters)">
                      <div className="relative">
                        <input type="text" readOnly className={inp + ' bg-slate-50 font-mono'} value={(form.recipe || []).reduce((acc: number, item: any) => acc + ((item.unit?.toUpperCase().includes('METER') || item.unit?.toUpperCase() === 'MTR') ? (Number(item.quantity) || 0) : 0), 0) + ' MTR'} />
                      </div>
                    </FF>
                    <FF label="Printing Cost (Auto)">
                      <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8d99a6]">{currency}</span>
                        <input type="number" readOnly className={inp + ' pl-6 bg-slate-50 font-bold text-[#1b6bf9]'} value={form.laborCosts?.printing || ''} />
                      </div>
                    </FF>
                  </div>
                </div>

                <FF label="Process Loss %" hint="% overhead on wastage"><input type="number" min={0} max={100} className={inp} value={form.processLossPercent || ''} onChange={e => set({ processLossPercent: Number(e.target.value) })} /></FF>
              </div>
            </Card>

            <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2490ef] rounded-lg p-5 text-white shadow-md">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider opacity-75 mb-4">Cost Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { l: 'Material Cost', v: cost.mat },
                  { l: 'Labor & Process', v: cost.lab },
                  { l: 'Process Loss', v: cost.loss },
                  { l: 'Total Landed Cost', v: cost.landed, big: true },
                ].map(item => (
                  <div key={item.l} className={item.big ? 'bg-white/20 rounded-lg p-3' : ''}>
                    <p className="text-[11px] opacity-70 mb-1">{item.l}</p>
                    <p className={`font-bold tabular-nums ${item.big ? 'text-[20px]' : 'text-[16px]'}`}>{currency}{item.v.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] opacity-70 mb-1">Target Margin</p>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100} value={form.targetMargin || 0} onChange={e => set({ targetMargin: Number(e.target.value) })} className="w-20 bg-white/20 border border-white/30 rounded px-2 py-1 text-white text-[13px] font-bold focus:outline-none" />
                    <span className="font-bold">%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] opacity-70 mb-1">Suggested WSP</p>
                  <p className="text-[20px] font-bold tabular-nums text-[#7dd3fc]">{currency}{cost.wsp.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </>)}

          {/* ── PRICING ── */}
          {activeTab === 'PRICING' && (<>
            <Card title="Selling Prices" sub="Configure pricing tiers for different channels">
              <div className="grid grid-cols-3 gap-x-6 gap-y-4">
                {[
                  { k: 'mrp', l: 'MRP (Maximum Retail Price)' },
                  { k: 'sellingPrice', l: 'Selling Price' },
                  { k: 'wholesalePrice', l: 'Wholesale Price' },
                ].map(p => (
                  <FF key={p.k} label={p.l}>
                    <div className="relative"><span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-[#8d99a6]">{currency}</span>
                      <input type="number" min={0} className={inp + ' pl-6'} value={form[p.k] || ''} onChange={e => set({ [p.k]: Number(e.target.value) })} placeholder="0.00" />
                    </div>
                  </FF>
                ))}
                <FF label="Default Discount %" hint="Discount applied on sales"><input type="number" min={0} max={100} className={inp} value={form.discountPercent || ''} onChange={e => set({ discountPercent: Number(e.target.value) })} placeholder="0" /></FF>
                <FF label="Tax Category"><Sel><select value={form.taxCategory || 'Standard (12%)'} onChange={e => set({ taxCategory: e.target.value })} className={sel}>{TAX_CATS.map(t => <option key={t} value={t}>{t}</option>)}</select></Sel></FF>
              </div>
            </Card>

            {cost.landed > 0 && (
              <Card title="Margin Analysis" sub="Based on landed cost vs entered prices">
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { l: 'Landed Cost', v: cost.landed, c: '#6b7280' },
                    { l: 'Wholesale', v: form.wholesalePrice || 0, c: '#2490ef' },
                    { l: 'Selling Price', v: form.sellingPrice || 0, c: '#10b981' },
                    { l: 'MRP', v: form.mrp || 0, c: '#8b5cf6' },
                  ].map(item => {
                    const m = item.v > 0 ? (item.v - cost.landed) / item.v * 100 : 0;
                    return (
                      <div key={item.l} className="bg-[#f7f9fb] rounded-lg p-4 border border-[#e8edf2]">
                        <p className="text-[11px] text-[#8d99a6] mb-1">{item.l}</p>
                        <p className="text-[18px] font-bold tabular-nums" style={{ color: item.c }}>{currency}{item.v.toFixed(2)}</p>
                        {item.v > 0 && <p className={`text-[11px] mt-1 font-medium ${m > 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>{m > 0 ? '+' : ''}{m.toFixed(1)}% margin</p>}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>)}

          {/* ── VARIANTS ── */}
          {activeTab === 'VARIANTS' && (
            <Card title="Item Variants" sub="Size, color, and other attributes"
              action={<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.hasVariants || false} onChange={e => set({ hasVariants: e.target.checked })} className="rounded border-[#d1d8dd] text-[#2490ef] w-4 h-4 cursor-pointer" /><span className="text-[12px] font-medium text-[#525c66]">Has Variants</span></label>}>
              {form.hasVariants ? (
                <div className="space-y-4">
                  {(form.options || []).map((opt: any, idx: number) => (
                    <div key={opt.id} className="flex gap-3 items-center">
                      <input className={inp + ' w-36'} value={opt.name} onChange={e => { const o = [...(form.options || [])]; o[idx].name = e.target.value; set({ options: o }); }} placeholder="Attribute" />
                      <input className={inp + ' flex-1'} value={opt.values.join(', ')} onChange={e => { const o = [...(form.options || [])]; o[idx].values = e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean); set({ options: o }); }} placeholder="Values (comma-separated)" />
                      <button onClick={() => set({ options: form.options?.filter((_: any, i: number) => i !== idx) })} className="p-2 text-[#dc2626] hover:bg-[#fef2f2] rounded-md"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => set({ options: [...(form.options || []), { id: crypto.randomUUID(), name: '', values: [] }] })} className="text-[12px] font-semibold text-[#2490ef] hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add Attribute</button>
                </div>
              ) : (
                <div className="py-10 text-center text-[#a0a9b3] bg-[#f7f9fb] rounded-lg border border-dashed border-[#d1d8dd]">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-3 opacity-40" />
                  <p className="text-[13px] font-medium">No variants configured</p>
                  <p className="text-[12px] mt-1">Enable "Has Variants" to add Colors, Sizes, etc.</p>
                </div>
              )}
            </Card>
          )}

          {/* ── QUALITY ── */}
          {activeTab === 'QUALITY' && (
            <Card title="Quality Specifications" sub="Define acceptable quality parameters">
              <div className="overflow-x-auto -mx-5 px-5 mb-4">
                <table className="w-full text-left min-w-[500px]">
                  <thead><tr className="bg-[#f7f9fb] text-[11px] text-[#6b7a8d] uppercase tracking-wide border-y border-[#e8edf2]">
                    <th className="py-2 pl-3 font-semibold">Parameter</th>
                    <th className="py-2 px-3 font-semibold">Standard Value</th>
                    <th className="py-2 px-3 font-semibold">Tolerance</th>
                    <th className="py-2 pr-3 w-10" />
                  </tr></thead>
                  <tbody>
                    {(form.qualitySpecs || []).map((s: any, idx: number) => (
                      <tr key={s.id || s.name || idx} className="border-b border-[#f0f2f5] hover:bg-[#f7f9fb]">
                        <td className="py-2.5 pl-3 text-[13px] font-medium">{s.param}</td>
                        <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{s.value}</td>
                        <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{s.tolerance || '—'}</td>
                        <td className="py-2.5 pr-3 text-right"><button onClick={() => set({ qualitySpecs: form.qualitySpecs?.filter((_: any, i: number) => i !== idx) })} className="text-[#dc2626] hover:bg-[#fef2f2] p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                    <tr className="bg-[#f7f9fb] border-b border-[#e1e8ed]">
                      <td className="py-2 pl-3"><input className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="e.g. GSM, Color Fastness…" value={newQSpec.param} onChange={e => setNewQSpec({ ...newQSpec, param: e.target.value })} /></td>
                      <td className="py-2 px-3"><input className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Value" value={newQSpec.value} onChange={e => setNewQSpec({ ...newQSpec, value: e.target.value })} /></td>
                      <td className="py-2 px-3"><input className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="±" value={newQSpec.tolerance} onChange={e => setNewQSpec({ ...newQSpec, tolerance: e.target.value })} /></td>
                      <td className="py-2 pr-3"><button onClick={() => { if (!newQSpec.param) return; set({ qualitySpecs: [...(form.qualitySpecs || []), newQSpec] }); setNewQSpec({ param: '', value: '', tolerance: '' }); }} className="text-[12px] font-semibold text-[#2490ef] hover:underline">+ Add</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <FF label="Warranty (Months)"><input type="number" min={0} className={inp} value={form.warrantyMonths || ''} onChange={e => set({ warrantyMonths: Number(e.target.value) })} /></FF>
                <FF label="QC Note"><textarea rows={2} className={inp} value={form.internalNote || ''} onChange={e => set({ internalNote: e.target.value })} placeholder="Internal QC notes…" /></FF>
              </div>
            </Card>
          )}

          {/* ── SUPPLIERS ── */}
          {activeTab === 'SUPPLIERS' && (
            <Card title="Supplier Information" sub="Preferred suppliers and purchase terms">
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-left min-w-[540px]">
                  <thead><tr className="bg-[#f7f9fb] text-[11px] text-[#6b7a8d] uppercase tracking-wide border-y border-[#e8edf2]">
                    <th className="py-2 pl-3 font-semibold">Supplier</th>
                    <th className="py-2 px-3 font-semibold">Lead Time (days)</th>
                    <th className="py-2 px-3 font-semibold">Min Qty</th>
                    <th className="py-2 px-3 font-semibold text-right">Price ({currency})</th>
                    <th className="py-2 pr-3 w-10" />
                  </tr></thead>
                  <tbody>
                    {(form.supplierList || []).map((s: any, idx: number) => (
                      <tr key={s.id || s.name || idx} className="border-b border-[#f0f2f5] hover:bg-[#f7f9fb]">
                        <td className="py-2.5 pl-3 text-[13px] font-medium flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-[#8d99a6]" />{s.name}</td>
                        <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{s.leadTime || '—'}</td>
                        <td className="py-2.5 px-3 text-[12px] text-[#525c66]">{s.minQty || '—'}</td>
                        <td className="py-2.5 px-3 text-right text-[13px] font-semibold">{currency}{s.price || '0'}</td>
                        <td className="py-2.5 pr-3 text-right"><button onClick={() => set({ supplierList: form.supplierList?.filter((_: any, i: number) => i !== idx) })} className="text-[#dc2626] hover:bg-[#fef2f2] p-1 rounded"><Trash2 className="w-3.5 h-3.5" /></button></td>
                      </tr>
                    ))}
                    <tr className="bg-[#f7f9fb] border-b border-[#e1e8ed]">
                      <td className="py-2 pl-3"><input className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Supplier name…" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} /></td>
                      <td className="py-2 px-3"><input type="number" className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Days" value={newSupplier.leadTime} onChange={e => setNewSupplier({ ...newSupplier, leadTime: e.target.value })} /></td>
                      <td className="py-2 px-3"><input type="number" className="w-full text-[12px] bg-transparent border-0 focus:outline-none" placeholder="Min qty" value={newSupplier.minQty} onChange={e => setNewSupplier({ ...newSupplier, minQty: e.target.value })} /></td>
                      <td className="py-2 px-3"><input type="number" className="w-full text-[12px] bg-transparent border-0 focus:outline-none text-right" placeholder="Price" value={newSupplier.price} onChange={e => setNewSupplier({ ...newSupplier, price: e.target.value })} /></td>
                      <td className="py-2 pr-3"><button onClick={() => { if (!newSupplier.name) return; set({ supplierList: [...(form.supplierList || []), newSupplier] }); setNewSupplier({ name: '', leadTime: '', minQty: '', price: '' }); }} className="text-[12px] font-semibold text-[#2490ef] hover:underline">+ Add</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === 'SETTINGS' && (<>
            <Card title="Sales & Purchase Settings">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-4">
                  {[
                    { k: 'allowSales', l: 'Allow Sales', d: 'Item can be included in sales orders' },
                    { k: 'allowPurchase', l: 'Allow Purchase', d: 'Item can be included in purchase orders' },
                    { k: 'maintainStock', l: 'Maintain Stock', d: 'Track inventory levels for this item' },
                  ].map(o => (
                    <label key={o.k} className="flex items-start gap-3 cursor-pointer group">
                      <input type="checkbox" checked={!!form[o.k]} onChange={e => set({ [o.k]: e.target.checked })} className="mt-0.5 rounded border-[#d1d8dd] text-[#2490ef] w-4 h-4 cursor-pointer" />
                      <div><p className="text-[13px] font-medium text-[#1c2126] group-hover:text-[#2490ef]">{o.l}</p><p className="text-[11px] text-[#a0a9b3]">{o.d}</p></div>
                    </label>
                  ))}
                </div>
                <div className="space-y-4">
                  <FF label="Tax Category"><Sel><select value={form.taxCategory || 'Standard (12%)'} onChange={e => set({ taxCategory: e.target.value })} className={sel}>{TAX_CATS.map(t => <option key={t} value={t}>{t}</option>)}</select></Sel></FF>
                  <FF label="Target Margin (%)"><input type="number" min={0} max={100} className={inp} value={form.targetMargin || ''} onChange={e => set({ targetMargin: Number(e.target.value) })} /></FF>
                </div>
              </div>
            </Card>
            <Card title="Internal Notes">
              <FF label="Internal Remarks"><textarea rows={4} className={inp} value={form.internalNote || ''} onChange={e => set({ internalNote: e.target.value })} placeholder="Private notes visible only to staff…" /></FF>
            </Card>
          </>)}

          {/* ── ACTIVITY ── */}
          {activeTab === 'ACTIVITY' && (
            <Card title="Item Timeline" sub="Recent activity and change history">
              {form.id ? (
                <div className="space-y-3">
                  {[
                    { icon: <CheckCircle2 className="w-4 h-4 text-[#10b981]" />, l: 'Last saved', t: form.updatedAt ? new Date(form.updatedAt).toLocaleString('en-IN') : 'Unknown', d: 'Record updated' },
                    { icon: <Package className="w-4 h-4 text-[#2490ef]" />, l: 'Item created', t: form.createdAt ? new Date(form.createdAt).toLocaleString('en-IN') : 'Unknown', d: `ID: ${form.id}` },
                  ].map((e) => (
                    <div key={e.l} className="flex gap-3 items-start">
                      <div className="w-8 h-8 rounded-full bg-[#f4f5f7] border border-[#e1e8ed] flex items-center justify-center shrink-0">{e.icon}</div>
                      <div className="flex-1 pt-1">
                        <p className="text-[13px] font-medium">{e.l}</p>
                        <p className="text-[11px] text-[#8d99a6]">{e.d} · {e.t}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#a0a9b3]">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-[13px]">Save the item first to see activity history.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DesignCatalog;
