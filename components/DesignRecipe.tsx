import React, { useState, useMemo, useCallback } from 'react';
import { Design, InventoryItem, RecipeItem } from '../types';
import {
  Palette, Plus, Search, FlaskRound, Trash2, Edit2, Zap, Calculator,
  X, FlaskConical, Info, ChevronDown, ChevronRight, ChevronUp,
  Copy, GitBranch, Settings, BarChart2, Layers, ArrowRight,
  CheckCircle, AlertTriangle, Clock, Package, Wrench, TrendingUp,
  Download, Upload, RefreshCw, Eye, Lock, Unlock, Star, Tag,
  List, Grid, Filter, MoreHorizontal, PlusCircle, MinusCircle,
  Scissors, Shirt, ZapOff, Activity, FileText, Hash, Percent
} from 'lucide-react';
import BaseModal from './BaseModal';

// ─── Extended Types ──────────────────────────────────────────────────────────

interface BOMOperation {
  id: string;
  sequence: number;
  operationName: string;
  workstationOrKarigar: string;
  timeInMinutes: number;
  ratePerHour: number;
  description?: string;
  isOutsourced?: boolean;
  vendorName?: string;
  outsourceRate?: number;
}

interface BOMScrapItem {
  materialName: string;
  quantity: number;
  unit: string;
  scrapValue: number;
}

interface BOMVersion {
  version: number;
  createdAt: string;
  createdBy?: string;
  note: string;
  isActive: boolean;
}

interface SubAssembly {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unit: string;
  costPerUnit: number;
}

interface ExtendedRecipeItem extends RecipeItem {
  id?: string;
  batchSize?: number;
  transferQuantity?: number;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  isCritical?: boolean;
  leadTimeDays?: number;
  alternativeMaterial?: string;
}

interface ExtendedDesign extends Design {
  operations?: BOMOperation[];
  scrapItems?: BOMScrapItem[];
  subAssemblies?: SubAssembly[];
  versions?: BOMVersion[];
  batchSize?: number;
  bomNote?: string;
  isTemplate?: boolean;
  templateId?: string;
  currency?: string;
  projectCode?: string;
  targetSellingPrice?: number;
  recipe?: ExtendedRecipeItem[];
}

interface DesignRecipeProps {
  designs: Design[];
  inventory: InventoryItem[];
  onAdd: (d: Design) => void;
  onUpdate: (d: Design) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const OPERATION_TEMPLATES = [
  { name: 'Cutting', workstation: 'Cutting Dept', time: 30, rate: 120 },
  { name: 'Stitching', workstation: 'Stitching Unit', time: 60, rate: 150 },
  { name: 'Embroidery', workstation: 'Embroidery Machine', time: 90, rate: 200 },
  { name: 'Washing & Finishing', workstation: 'Processing Unit', time: 45, rate: 100 },
  { name: 'Quality Check', workstation: 'QC Desk', time: 15, rate: 80 },
  { name: 'Packing', workstation: 'Packing Dept', time: 20, rate: 80 },
];

const CATEGORIES = ['SAREE', 'KURTI', 'SUIT', 'FABRIC', 'LEHENGA', 'DUPATTA', 'BLOUSE', 'PALAZZOS'] as const;

const TABS = [
  { id: 'materials', label: 'Raw Materials', icon: Package },
  { id: 'operations', label: 'Operations & Routing', icon: Wrench },
  { id: 'subassemblies', label: 'Sub-Assemblies', icon: Layers },
  { id: 'scrap', label: 'Scrap & By-Products', icon: Scissors },
  { id: 'costing', label: 'Cost Summary', icon: BarChart2 },
  { id: 'versions', label: 'Versions', icon: GitBranch },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Utility ─────────────────────────────────────────────────────────────────

const genId = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

const fmt = (n: number, c = '₹') =>
  `${c}${Math.round(n).toLocaleString('en-IN')}`;

const pct = (part: number, total: number) =>
  total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';

// ─── Small Components ─────────────────────────────────────────────────────────

const Badge: React.FC<{ label: string; color?: string }> = ({ label, color = 'slate' }) => {
  const colors: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${colors[color]} border-current/20`}>
      {label}
    </span>
  );
};

const StatCard: React.FC<{ label: string; value: string; sub?: string; color?: string; pctVal?: string }> = ({
  label, value, sub, color = 'slate', pctVal
}) => (
  <div className={`rounded-xl p-4 border ${
    color === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' :
    color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' :
    color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
    color === 'red' ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800' :
    'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
  }`}>
    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className={`text-xl font-bold tabular-nums ${
      color === 'green' ? 'text-emerald-700 dark:text-emerald-400' :
      color === 'amber' ? 'text-amber-700 dark:text-amber-400' :
      color === 'blue' ? 'text-blue-700 dark:text-blue-400' :
      color === 'red' ? 'text-rose-700 dark:text-rose-400' :
      'text-slate-800 dark:text-white'
    }`}>{value}</p>
    {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    {pctVal && (
      <div className="mt-2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${
          color === 'green' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' :
          color === 'blue' ? 'bg-blue-500' : color === 'red' ? 'bg-rose-500' : 'bg-slate-500'
        }`} style={{ width: `${Math.min(parseFloat(pctVal), 100)}%` }} />
      </div>
    )}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const DesignRecipe: React.FC<DesignRecipeProps> = ({
  designs, inventory, onAdd, onUpdate, onDelete, onAction, currency = '₹'
}) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('materials');
  const [expandedOperations, setExpandedOperations] = useState<Record<string, boolean>>({});

  // ── Form State ──────────────────────────────────────────────────────────────
  const emptyForm = (): Partial<ExtendedDesign> => ({
    recipe: [],
    status: 'ACTIVE',
    laborCosts: { cutting: 0, stitching: 0, embroidery: 0, washing: 0, finishing: 0, packing: 0 },
    processLossPercent: 2,
    operations: [],
    scrapItems: [],
    subAssemblies: [],
    batchSize: 1,
    bomNote: '',
    versions: [{ version: 1, createdAt: new Date().toISOString(), note: 'Initial version', isActive: true }],
    targetSellingPrice: 0,
  });

  const [formData, setFormData] = useState<Partial<ExtendedDesign>>(emptyForm());

  // Add row states
  const [newMaterial, setNewMaterial] = useState<Partial<ExtendedRecipeItem>>({
    materialName: '', quantity: 0, wastagePercent: 0, isCritical: false
  });
  const [newOperation, setNewOperation] = useState<Partial<BOMOperation>>({
    operationName: '', workstationOrKarigar: '', timeInMinutes: 0, ratePerHour: 0, sequence: 1
  });
  const [newScrap, setNewScrap] = useState<Partial<BOMScrapItem>>({
    materialName: '', quantity: 0, unit: 'KG', scrapValue: 0
  });
  const [newSubAssembly, setNewSubAssembly] = useState<Partial<SubAssembly>>({
    name: '', sku: '', qty: 1, unit: 'PCS', costPerUnit: 0
  });

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredDesigns = useMemo(() => {
    return (designs as ExtendedDesign[]).filter(d => {
      const matchText = d.name.toLowerCase().includes(filter.toLowerCase()) ||
        d.sku?.toLowerCase().includes(filter.toLowerCase());
      const matchCat = categoryFilter === 'ALL' || d.category === categoryFilter;
      const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
      return matchText && matchCat && matchStatus;
    });
  }, [designs, filter, categoryFilter, statusFilter]);

  // ── Cost Calculation (ERPNext-style rollup) ─────────────────────────────────
  const costing = useMemo(() => {
    const batchSize = formData.batchSize || 1;

    // Raw material cost
    const rawMaterialCost = (formData.recipe || []).reduce((acc, item) => {
      const mat = inventory.find(i => i.name === item.materialName);
      const rate = mat?.pricePerUnit || item.estimatedCost || 0;
      const wastage = 1 + (item.wastagePercent || 0) / 100;
      return acc + item.quantity * rate * wastage;
    }, 0);

    // Sub-assembly cost
    const subAssemblyCost = (formData.subAssemblies || []).reduce((acc, sa) =>
      acc + sa.qty * sa.costPerUnit, 0);

    // Operation cost (time-based)
    const operationCost = (formData.operations || []).reduce((acc, op) => {
      if (op.isOutsourced) return acc + (op.outsourceRate || 0);
      return acc + (op.timeInMinutes / 60) * op.ratePerHour;
    }, 0);

    // Legacy labor cost (from laborCosts object)
    const legacyLaborCost = Object.values(formData.laborCosts || {})
      .reduce((a: number, b: any) => a + (Number(b) || 0), 0);

    const totalLaborCost = operationCost + legacyLaborCost;

    // Scrap credit (deducted)
    const scrapCredit = (formData.scrapItems || []).reduce((acc, s) =>
      acc + s.quantity * s.scrapValue, 0);

    // Process loss on materials
    const materialPlusAssemblies = rawMaterialCost + subAssemblyCost;
    const processLossAmount = materialPlusAssemblies * ((formData.processLossPercent || 0) / 100);

    // Total before profit
    const totalBeforeProfit = materialPlusAssemblies + totalLaborCost + processLossAmount - scrapCredit;
    const totalPerUnit = totalBeforeProfit / batchSize;

    // Margin analysis
    const sellingPrice = formData.targetSellingPrice || 0;
    const grossProfit = sellingPrice - totalPerUnit;
    const marginPct = sellingPrice > 0 ? (grossProfit / sellingPrice) * 100 : 0;

    return {
      rawMaterialCost,
      subAssemblyCost,
      operationCost,
      legacyLaborCost,
      totalLaborCost,
      processLossAmount,
      scrapCredit,
      totalBeforeProfit,
      totalPerUnit,
      grossProfit,
      marginPct,
    };
  }, [formData, inventory]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm());
    setActiveTab('materials');
    setIsModalOpen(true);
  };

  const openEdit = (design: ExtendedDesign) => {
    setEditingId(design.id);
    setFormData({
      ...design,
      operations: design.operations || [],
      scrapItems: design.scrapItems || [],
      subAssemblies: design.subAssemblies || [],
      batchSize: design.batchSize || 1,
      versions: design.versions || [{ version: 1, createdAt: new Date().toISOString(), note: 'Initial', isActive: true }],
    });
    setActiveTab('materials');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const design = {
      ...formData,
      processCostPerPiece: costing.totalPerUnit,
      id: editingId || genId('BOM'),
      updatedAt: new Date().toISOString(),
    } as ExtendedDesign;
    if (editingId) onUpdate(design); else onAdd(design);
    setIsModalOpen(false);
  };

  const addMaterial = () => {
    if (!newMaterial.materialName || !newMaterial.quantity) return;
    const mat = inventory.find(i => i.name === newMaterial.materialName);
    const item: ExtendedRecipeItem = {
      id: genId('MAT'),
      materialName: newMaterial.materialName!,
      quantity: newMaterial.quantity!,
      unit: mat?.unit || 'MTR',
      wastagePercent: newMaterial.wastagePercent || 0,
      estimatedCost: mat?.pricePerUnit || 0,
      isCritical: newMaterial.isCritical || false,
      leadTimeDays: newMaterial.leadTimeDays || 0,
      alternativeMaterial: newMaterial.alternativeMaterial || '',
    };
    setFormData(p => ({ ...p, recipe: [...(p.recipe || []), item] }));
    setNewMaterial({ materialName: '', quantity: 0, wastagePercent: 0, isCritical: false });
  };

  const addOperation = () => {
    if (!newOperation.operationName) return;
    const op: BOMOperation = {
      id: genId('OP'),
      sequence: (formData.operations?.length || 0) + 1,
      operationName: newOperation.operationName!,
      workstationOrKarigar: newOperation.workstationOrKarigar || '',
      timeInMinutes: newOperation.timeInMinutes || 0,
      ratePerHour: newOperation.ratePerHour || 0,
      isOutsourced: newOperation.isOutsourced || false,
      outsourceRate: newOperation.outsourceRate || 0,
      description: newOperation.description || '',
    };
    setFormData(p => ({ ...p, operations: [...(p.operations || []), op] }));
    setNewOperation({ operationName: '', workstationOrKarigar: '', timeInMinutes: 0, ratePerHour: 0 });
  };

  const addScrap = () => {
    if (!newScrap.materialName) return;
    setFormData(p => ({ ...p, scrapItems: [...(p.scrapItems || []), newScrap as BOMScrapItem] }));
    setNewScrap({ materialName: '', quantity: 0, unit: 'KG', scrapValue: 0 });
  };

  const addSubAssembly = () => {
    if (!newSubAssembly.name) return;
    const sa: SubAssembly = { ...newSubAssembly, id: genId('SA') } as SubAssembly;
    setFormData(p => ({ ...p, subAssemblies: [...(p.subAssemblies || []), sa] }));
    setNewSubAssembly({ name: '', sku: '', qty: 1, unit: 'PCS', costPerUnit: 0 });
  };

  const duplicateBOM = (design: ExtendedDesign) => {
    const copy: ExtendedDesign = {
      ...design,
      id: genId('BOM'),
      name: design.name + ' (Copy)',
      sku: (design.sku || '') + '-COPY',
      updatedAt: new Date().toISOString(),
      versions: [{ version: 1, createdAt: new Date().toISOString(), note: 'Copied from ' + design.sku, isActive: true }],
    };
    onAdd(copy as Design);
  };

  // ── Render helpers ───────────────────────────────────────────────────────────

  const statusColor = (s?: string) => {
    if (s === 'ACTIVE') return 'green';
    if (s === 'DRAFT') return 'amber';
    if (s === 'ARCHIVED' || s === 'DISCONTINUED') return 'red';
    return 'slate';
  };

  const renderMaterialsTab = () => (
    <div className="space-y-4">
      {/* Add Row */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="col-span-3">
          <input
            list="bom-mats"
            className="shopify-input w-full text-sm py-2"
            placeholder="Material name"
            value={newMaterial.materialName || ''}
            onChange={e => setNewMaterial(p => ({ ...p, materialName: e.target.value }))}
          />
          <datalist id="bom-mats">{inventory.map(i => <option key={i.id} value={i.name} />)}</datalist>
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Qty"
            value={newMaterial.quantity || ''}
            onChange={e => setNewMaterial(p => ({ ...p, quantity: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Wastage %"
            value={newMaterial.wastagePercent || ''}
            onChange={e => setNewMaterial(p => ({ ...p, wastagePercent: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <input className="shopify-input w-full text-sm py-2" placeholder="Alt. Material"
            value={newMaterial.alternativeMaterial || ''}
            onChange={e => setNewMaterial(p => ({ ...p, alternativeMaterial: e.target.value }))} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs font-medium text-slate-500 cursor-pointer">
            <input type="checkbox" className="w-3.5 h-3.5 rounded"
              checked={newMaterial.isCritical || false}
              onChange={e => setNewMaterial(p => ({ ...p, isCritical: e.target.checked }))} />
            Critical
          </label>
        </div>
        <div className="col-span-1">
          <button type="button" onClick={addMaterial}
            className="w-full shopify-btn-primary py-2 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      {(formData.recipe || []).length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div className="col-span-3">Material</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-1 text-center">Unit</div>
          <div className="col-span-1 text-center">Rate</div>
          <div className="col-span-1 text-center">Wastage</div>
          <div className="col-span-2 text-center">Alt. Material</div>
          <div className="col-span-2 text-right">Line Total</div>
          <div className="col-span-1" />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {(formData.recipe || []).map((item, idx) => {
          const mat = inventory.find(i => i.name === item.materialName);
          const rate = mat?.pricePerUnit || item.estimatedCost || 0;
          const lineTotal = item.quantity * rate * (1 + (item.wastagePercent || 0) / 100);
          return (
            <div key={idx}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg border items-center text-sm transition-colors ${
                (item as ExtendedRecipeItem).isCritical
                  ? 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              <div className="col-span-3 flex items-center gap-1.5">
                {(item as ExtendedRecipeItem).isCritical && (
                  <Star className="w-3 h-3 text-rose-500 fill-current shrink-0" />
                )}
                <span className="font-semibold text-slate-800 dark:text-white truncate">{item.materialName}</span>
              </div>
              <div className="col-span-1 text-center tabular-nums">{item.quantity}</div>
              <div className="col-span-1 text-center text-slate-500">{item.unit}</div>
              <div className="col-span-1 text-center tabular-nums text-slate-600 dark:text-slate-400">
                {fmt(rate, currency)}
              </div>
              <div className="col-span-1 text-center">
                {item.wastagePercent ? (
                  <span className="text-amber-600 font-medium">+{item.wastagePercent}%</span>
                ) : <span className="text-slate-400">—</span>}
              </div>
              <div className="col-span-2 text-center text-slate-400 text-xs truncate">
                {(item as ExtendedRecipeItem).alternativeMaterial || '—'}
              </div>
              <div className="col-span-2 text-right font-bold tabular-nums text-slate-800 dark:text-white">
                {fmt(lineTotal, currency)}
              </div>
              <div className="col-span-1 flex justify-end">
                <button type="button"
                  onClick={() => setFormData(p => ({ ...p, recipe: p.recipe?.filter((_, i) => i !== idx) }))}
                  className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(formData.recipe || []).length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No materials added. Add raw materials above.</p>
        </div>
      )}

      {/* Process Loss */}
      <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Process Loss %
        </label>
        <input type="number" step="0.1"
          className="shopify-input w-28 text-sm py-1.5 text-center"
          value={formData.processLossPercent || 0}
          onChange={e => setFormData(p => ({ ...p, processLossPercent: Number(e.target.value) }))} />
        <p className="text-xs text-slate-400">Applied to material + sub-assembly cost</p>
      </div>
    </div>
  );

  const renderOperationsTab = () => (
    <div className="space-y-4">
      {/* Quick-add templates */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Quick Add Operation</p>
        <div className="flex flex-wrap gap-2">
          {OPERATION_TEMPLATES.map(t => (
            <button key={t.name} type="button"
              onClick={() => setNewOperation({ operationName: t.name, workstationOrKarigar: t.workstation, timeInMinutes: t.time, ratePerHour: t.rate })}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-700">
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Add Row */}
      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="col-span-3">
          <input className="shopify-input w-full text-sm py-2" placeholder="Operation name"
            value={newOperation.operationName || ''}
            onChange={e => setNewOperation(p => ({ ...p, operationName: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input className="shopify-input w-full text-sm py-2" placeholder="Workstation / Karigar"
            value={newOperation.workstationOrKarigar || ''}
            onChange={e => setNewOperation(p => ({ ...p, workstationOrKarigar: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Min"
            value={newOperation.timeInMinutes || ''}
            onChange={e => setNewOperation(p => ({ ...p, timeInMinutes: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Rate/Hr"
            value={newOperation.ratePerHour || ''}
            onChange={e => setNewOperation(p => ({ ...p, ratePerHour: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer whitespace-nowrap">
            <input type="checkbox" className="w-3.5 h-3.5"
              checked={newOperation.isOutsourced || false}
              onChange={e => setNewOperation(p => ({ ...p, isOutsourced: e.target.checked }))} />
            Outsource
          </label>
        </div>
        <div className="col-span-1">
          <button type="button" onClick={addOperation}
            className="w-full shopify-btn-primary py-2 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header */}
      {(formData.operations || []).length > 0 && (
        <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-3">Operation</div>
          <div className="col-span-2">Workstation</div>
          <div className="col-span-2 text-center">Time (min)</div>
          <div className="col-span-2 text-center">Rate/Hr</div>
          <div className="col-span-1 text-center">Type</div>
          <div className="col-span-1 text-right">Cost</div>
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {(formData.operations || []).map((op, idx) => {
          const opCost = op.isOutsourced
            ? (op.outsourceRate || 0)
            : (op.timeInMinutes / 60) * op.ratePerHour;
          return (
            <div key={op.id || idx}
              className={`grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg border items-center text-sm ${
                op.isOutsourced
                  ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="col-span-1 text-center">
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 flex items-center justify-center">{op.sequence}</span>
              </div>
              <div className="col-span-3 font-semibold text-slate-800 dark:text-white truncate">{op.operationName}</div>
              <div className="col-span-2 text-slate-500 text-xs truncate">{op.workstationOrKarigar || '—'}</div>
              <div className="col-span-2 text-center tabular-nums">{op.timeInMinutes} min</div>
              <div className="col-span-2 text-center text-slate-500 tabular-nums">{fmt(op.ratePerHour, currency)}</div>
              <div className="col-span-1 text-center">
                {op.isOutsourced
                  ? <Badge label="Out" color="purple" />
                  : <Badge label="In-house" color="blue" />}
              </div>
              <div className="col-span-1 text-right font-bold tabular-nums">{fmt(opCost, currency)}</div>
            </div>
          );
        })}
      </div>

      {(formData.operations || []).length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Wrench className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No operations defined. Add routing steps above.</p>
        </div>
      )}
    </div>
  );

  const renderSubAssembliesTab = () => (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
        Sub-assemblies are pre-built components or semi-finished goods that go into the final product. Their cost is rolled up into the parent BOM.
      </p>
      <div className="grid grid-cols-12 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="col-span-3">
          <input className="shopify-input w-full text-sm py-2" placeholder="Component name"
            value={newSubAssembly.name || ''}
            onChange={e => setNewSubAssembly(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input className="shopify-input w-full text-sm py-2" placeholder="SKU"
            value={newSubAssembly.sku || ''}
            onChange={e => setNewSubAssembly(p => ({ ...p, sku: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Qty"
            value={newSubAssembly.qty || ''}
            onChange={e => setNewSubAssembly(p => ({ ...p, qty: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <input className="shopify-input w-full text-sm py-2 text-center" placeholder="Unit"
            value={newSubAssembly.unit || 'PCS'}
            onChange={e => setNewSubAssembly(p => ({ ...p, unit: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Cost/unit"
            value={newSubAssembly.costPerUnit || ''}
            onChange={e => setNewSubAssembly(p => ({ ...p, costPerUnit: Number(e.target.value) }))} />
        </div>
        <div className="col-span-1">
          <button type="button" onClick={addSubAssembly}
            className="w-full shopify-btn-primary py-2 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {(formData.subAssemblies || []).map((sa, idx) => (
          <div key={sa.id || idx} className="grid grid-cols-12 gap-2 px-3 py-2.5 rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 items-center text-sm">
            <div className="col-span-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-white truncate">{sa.name}</span>
            </div>
            <div className="col-span-2 text-slate-400 text-xs font-mono">{sa.sku}</div>
            <div className="col-span-2 text-center tabular-nums">{sa.qty} {sa.unit}</div>
            <div className="col-span-2 text-center text-slate-500">{fmt(sa.costPerUnit, currency)}</div>
            <div className="col-span-2 text-right font-bold tabular-nums">{fmt(sa.qty * sa.costPerUnit, currency)}</div>
            <div className="col-span-1 flex justify-end">
              <button type="button"
                onClick={() => setFormData(p => ({ ...p, subAssemblies: p.subAssemblies?.filter((_, i) => i !== idx) }))}
                className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(formData.subAssemblies || []).length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No sub-assemblies defined.</p>
        </div>
      )}
    </div>
  );

  const renderScrapTab = () => (
    <div className="space-y-4">
      <p className="text-xs text-slate-500 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
        <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
        Scrap items are by-products generated during production. Their value is credited back, reducing the net cost.
      </p>
      <div className="grid grid-cols-10 gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="col-span-3">
          <input className="shopify-input w-full text-sm py-2" placeholder="Scrap / by-product name"
            value={newScrap.materialName || ''}
            onChange={e => setNewScrap(p => ({ ...p, materialName: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Qty"
            value={newScrap.quantity || ''}
            onChange={e => setNewScrap(p => ({ ...p, quantity: Number(e.target.value) }))} />
        </div>
        <div className="col-span-2">
          <input className="shopify-input w-full text-sm py-2 text-center" placeholder="Unit (KG/MTR)"
            value={newScrap.unit || ''}
            onChange={e => setNewScrap(p => ({ ...p, unit: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <input type="number" className="shopify-input w-full text-sm py-2 text-center" placeholder="Value/unit"
            value={newScrap.scrapValue || ''}
            onChange={e => setNewScrap(p => ({ ...p, scrapValue: Number(e.target.value) }))} />
        </div>
        <div className="col-span-1">
          <button type="button" onClick={addScrap}
            className="w-full shopify-btn-primary py-2 flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto">
        {(formData.scrapItems || []).map((s, idx) => (
          <div key={idx} className="grid grid-cols-10 gap-2 px-3 py-2.5 rounded-lg border bg-amber-50/30 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 items-center text-sm">
            <div className="col-span-3 font-semibold text-slate-800 dark:text-white">{s.materialName}</div>
            <div className="col-span-2 text-center tabular-nums">{s.quantity} {s.unit}</div>
            <div className="col-span-2 text-center text-slate-500">{fmt(s.scrapValue, currency)}/unit</div>
            <div className="col-span-2 text-right font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{fmt(s.quantity * s.scrapValue, currency)}
            </div>
            <div className="col-span-1 flex justify-end">
              <button type="button"
                onClick={() => setFormData(p => ({ ...p, scrapItems: p.scrapItems?.filter((_, i) => i !== idx) }))}
                className="p-1 text-slate-300 hover:text-rose-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(formData.scrapItems || []).length === 0 && (
        <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <Scissors className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">No scrap/by-products defined.</p>
        </div>
      )}
    </div>
  );

  const renderCostingTab = () => {
    const total = costing.totalPerUnit;
    const sp = formData.targetSellingPrice || 0;
    const segments = [
      { label: 'Raw Materials', value: costing.rawMaterialCost, color: '#6366f1' },
      { label: 'Sub-Assemblies', value: costing.subAssemblyCost, color: '#8b5cf6' },
      { label: 'Operations', value: costing.operationCost, color: '#ec4899' },
      { label: 'Process Loss', value: costing.processLossAmount, color: '#f59e0b' },
      { label: 'Scrap Credit', value: -costing.scrapCredit, color: '#10b981' },
    ].filter(s => s.value !== 0);

    return (
      <div className="space-y-6">
        {/* Cost breakdown bar */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Cost Breakdown</p>
          <div className="flex h-8 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
            {segments.filter(s => s.value > 0).map((s, i) => {
              const w = (s.value / (costing.rawMaterialCost + costing.subAssemblyCost + costing.operationCost + costing.processLossAmount)) * 100;
              return (
                <div key={i} style={{ width: `${w}%`, backgroundColor: s.color }}
                  className="relative group h-full flex items-center justify-center overflow-hidden transition-all">
                  {w > 10 && <span className="text-[10px] font-bold text-white truncate px-1">{s.label}</span>}
                  <div className="absolute inset-x-0 bottom-0 bg-black/10 h-1/3" />
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {segments.filter(s => s.value > 0).map((s, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                <span className="text-slate-500">{s.label}</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(s.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatCard label="Raw Materials" value={fmt(costing.rawMaterialCost, currency)}
            pctVal={pct(costing.rawMaterialCost, total)} color="blue" />
          <StatCard label="Sub-Assemblies" value={fmt(costing.subAssemblyCost, currency)}
            pctVal={pct(costing.subAssemblyCost, total)} color="blue" />
          <StatCard label="Operations" value={fmt(costing.operationCost, currency)}
            pctVal={pct(costing.operationCost, total)} color="slate" />
          <StatCard label="Process Loss" value={fmt(costing.processLossAmount, currency)}
            sub={`${formData.processLossPercent || 0}% applied`} color="amber" />
          <StatCard label="Scrap Credit" value={`-${fmt(costing.scrapCredit, currency)}`}
            sub="Deducted from cost" color="green" />
          <StatCard label="Total Cost / Piece" value={fmt(total, currency)} color="slate" />
        </div>

        {/* Selling price & margin */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Margin Analysis</p>
          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Target Selling Price</label>
              <input type="number" className="shopify-input w-full text-sm py-2"
                value={formData.targetSellingPrice || ''}
                onChange={e => setFormData(p => ({ ...p, targetSellingPrice: Number(e.target.value) }))}
                placeholder="0" />
            </div>
            <div className={`p-3 rounded-xl text-center ${costing.grossProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Gross Profit</p>
              <p className={`text-xl font-bold tabular-nums ${costing.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmt(costing.grossProfit, currency)}
              </p>
            </div>
            <div className={`p-3 rounded-xl text-center ${costing.marginPct >= 20 ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200' : costing.marginPct >= 10 ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200' : 'bg-rose-50 dark:bg-rose-900/20 border border-rose-200'}`}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Margin %</p>
              <p className={`text-xl font-bold tabular-nums ${costing.marginPct >= 20 ? 'text-emerald-600' : costing.marginPct >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                {costing.marginPct.toFixed(1)}%
              </p>
            </div>
          </div>
          {sp > 0 && (
            <div className="mt-3 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${costing.marginPct >= 20 ? 'bg-emerald-500' : costing.marginPct >= 10 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(Math.max(costing.marginPct, 0), 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Batch info */}
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Batch Size</label>
            <input type="number" className="shopify-input w-24 text-sm py-1.5 text-center"
              value={formData.batchSize || 1}
              onChange={e => setFormData(p => ({ ...p, batchSize: Math.max(1, Number(e.target.value)) }))} />
          </div>
          <div className="text-xs text-slate-400 flex-1">
            Cost above is per piece. Total batch cost: <span className="font-bold text-slate-700 dark:text-white">
              {fmt(costing.totalPerUnit * (formData.batchSize || 1), currency)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderVersionsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-xs text-slate-500">Version history allows you to track changes to this BOM over time.</p>
        <button type="button"
          onClick={() => {
            const newVer: BOMVersion = {
              version: (formData.versions?.length || 0) + 1,
              createdAt: new Date().toISOString(),
              note: 'New version',
              isActive: false,
            };
            setFormData(p => ({ ...p, versions: [...(p.versions || []), newVer] }));
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" /> New Version
        </button>
      </div>
      <div className="space-y-2">
        {(formData.versions || []).map((v, idx) => (
          <div key={idx} className={`flex items-center gap-4 px-4 py-3 rounded-xl border ${
            v.isActive ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              v.isActive ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>v{v.version}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input className="bg-transparent text-sm font-semibold text-slate-800 dark:text-white border-0 outline-none w-full"
                  value={v.note}
                  onChange={e => setFormData(p => ({ ...p, versions: p.versions?.map((vv, i) => i === idx ? { ...vv, note: e.target.value } : vv) }))} />
              </div>
              <p className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
            {v.isActive
              ? <Badge label="Active" color="green" />
              : (
                <button type="button"
                  onClick={() => setFormData(p => ({ ...p, versions: p.versions?.map((vv, i) => ({ ...vv, isActive: i === idx })) }))}
                  className="text-xs text-indigo-600 font-medium hover:text-indigo-700">Set Active</button>
              )}
          </div>
        ))}
      </div>

      {/* BOM Note */}
      <div>
        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">BOM Notes / Instructions</label>
        <textarea rows={3} className="shopify-input w-full text-sm py-2 resize-none"
          placeholder="Special instructions, notes, or change log for this BOM..."
          value={formData.bomNote || ''}
          onChange={e => setFormData(p => ({ ...p, bomNote: e.target.value }))} />
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === 'materials') return renderMaterialsTab();
    if (activeTab === 'operations') return renderOperationsTab();
    if (activeTab === 'subassemblies') return renderSubAssembliesTab();
    if (activeTab === 'scrap') return renderScrapTab();
    if (activeTab === 'costing') return renderCostingTab();
    if (activeTab === 'versions') return renderVersionsTab();
    return null;
  };

  // ── BOM Card ────────────────────────────────────────────────────────────────
  const BOMCard: React.FC<{ design: ExtendedDesign }> = ({ design }) => {
    const mats = design.recipe?.length || 0;
    const ops = design.operations?.length || 0;

    return (
      <div
        onClick={() => openEdit(design)}
        className="shopify-card p-5 group cursor-pointer hover:border-shopify-primary transition-all flex flex-col h-full relative overflow-hidden"
      >
        {/* Version badge */}
        {design.versions && (
          <div className="absolute top-3 right-3 z-10">
            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
              v{design.versions.find(v => v.isActive)?.version || 1}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
            {design.imageUrl
              ? <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <FlaskRound className="w-6 h-6 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-slate-800 dark:text-white truncate text-sm">{design.name}</h4>
            <p className="text-xs text-slate-400 font-mono">{design.sku}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge label={design.category} />
              <Badge label={design.status} color={statusColor(design.status)} />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Mats</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{mats}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Ops</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{ops}</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Sub</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{design.subAssemblies?.length || 0}</p>
          </div>
        </div>

        {/* Materials preview */}
        {design.recipe && design.recipe.length > 0 ? (
          <div className="space-y-1.5 mb-4 flex-1">
            {design.recipe.slice(0, 3).map((item, i) => {
              const mat = inventory.find(inv => inv.name === item.materialName);
              const rate = mat?.pricePerUnit || item.estimatedCost || 0;
              const lineTotal = item.quantity * rate * (1 + (item.wastagePercent || 0) / 100);
              return (
                <div key={i} className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 truncate max-w-[55%]">
                    {(item as ExtendedRecipeItem).isCritical && <Star className="w-2.5 h-2.5 text-rose-400 fill-current" />}
                    {item.materialName}
                  </span>
                  <span className="tabular-nums font-medium shrink-0">
                    {item.quantity} {item.unit}
                    {item.wastagePercent ? <span className="text-amber-500 ml-1">+{item.wastagePercent}%</span> : null}
                  </span>
                </div>
              );
            })}
            {design.recipe.length > 3 && (
              <p className="text-[10px] font-bold text-indigo-500 uppercase">
                +{design.recipe.length - 3} more materials
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl mb-4 py-4">
            <p className="text-xs text-slate-300 uppercase font-bold">No BOM defined</p>
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Landed Cost</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">
              {fmt(design.processCostPerPiece || 0, currency)}
            </p>
            {(design as ExtendedDesign).targetSellingPrice ? (
              <p className="text-[10px] text-emerald-600 font-bold">
                SP: {fmt((design as ExtendedDesign).targetSellingPrice || 0, currency)}
              </p>
            ) : null}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={e => { e.stopPropagation(); duplicateBOM(design); }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
              title="Duplicate BOM">
              <Copy className="w-4 h-4" />
            </button>
            {onAction && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', design); }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                title="Create Work Order">
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); if (confirm('Delete BOM?')) onDelete(design.id); }}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── List Row ─────────────────────────────────────────────────────────────────
  const BOMListRow: React.FC<{ design: ExtendedDesign }> = ({ design }) => (
    <div
      onClick={() => openEdit(design)}
      className="shopify-card px-4 py-3 group cursor-pointer hover:border-shopify-primary transition-all flex items-center gap-4"
    >
      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
        {design.imageUrl ? <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <FlaskRound className="w-5 h-5 text-slate-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-slate-800 dark:text-white truncate">{design.name}</p>
        <p className="text-xs text-slate-400 font-mono">{design.sku}</p>
      </div>
      <div className="hidden md:flex items-center gap-2">
        <Badge label={design.category} />
        <Badge label={design.status} color={statusColor(design.status)} />
      </div>
      <div className="text-xs text-slate-500 hidden lg:block w-16 text-center tabular-nums">
        {design.recipe?.length || 0} mats
      </div>
      <div className="text-xs text-slate-500 hidden xl:block w-16 text-center tabular-nums">
        {design.operations?.length || 0} ops
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold text-slate-800 dark:text-white tabular-nums">{fmt(design.processCostPerPiece || 0, currency)}</p>
        <p className="text-[10px] text-slate-400">Landed cost</p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button type="button" onClick={e => { e.stopPropagation(); duplicateBOM(design); }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={e => { e.stopPropagation(); if (confirm('Delete?')) onDelete(design.id); }}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-shopify-bg dark:bg-slate-950">

      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-shopify-text dark:text-white flex items-center gap-2">
            <FlaskConical className="w-7 h-7 text-indigo-500" />
            Bill of Materials
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Multi-level BOM with operations, costing & version control — like ERPNext
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors">
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
          <button onClick={openCreate}
            className="shopify-btn-primary flex items-center gap-2 px-5 py-2.5 text-sm">
            <Plus className="w-4 h-4" /> Create BOM
          </button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="shopify-input w-full pl-9 py-2 text-sm" placeholder="Search by name or SKU..."
            value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <select className="shopify-input py-2 text-sm" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="ALL">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="shopify-input py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
          <option value="DISCONTINUED">Discontinued</option>
        </select>
        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 flex items-center">
          {filteredDesigns.length} BOMs
        </div>
      </div>

      {/* ── Grid / List ─────────────────────────────────────────────────────── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
          {filteredDesigns.map(d => <BOMCard key={d.id} design={d as ExtendedDesign} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDesigns.map(d => <BOMListRow key={d.id} design={d as ExtendedDesign} />)}
        </div>
      )}

      {filteredDesigns.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
          <FlaskConical className="w-16 h-16 text-slate-200 dark:text-slate-700 mb-4" />
          <p className="text-lg font-bold text-slate-400">No BOMs found</p>
          <p className="text-sm text-slate-400 mb-6">
            {filter || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
              ? 'Try adjusting your filters'
              : 'Create your first Bill of Materials to get started'}
          </p>
          {!filter && categoryFilter === 'ALL' && statusFilter === 'ALL' && (
            <button onClick={openCreate} className="shopify-btn-primary flex items-center gap-2 px-6 py-2.5">
              <Plus className="w-4 h-4" /> Create First BOM
            </button>
          )}
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <BaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit BOM' : 'Create Bill of Materials'}
        size="xl"
      >
        <form onSubmit={handleSave}>
          {/* Top info row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Design / Product Name *</label>
              <input required className="shopify-input w-full py-2.5 text-sm"
                placeholder="e.g. Summer Blossom Kurti"
                value={formData.name || ''}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">SKU Code *</label>
              <input required className="shopify-input w-full py-2.5 text-sm font-mono"
                placeholder="SKU-001"
                value={formData.sku || ''}
                onChange={e => setFormData(p => ({ ...p, sku: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
              <select className="shopify-input w-full py-2.5 text-sm"
                value={formData.category || 'KURTI'}
                onChange={e => setFormData(p => ({ ...p, category: e.target.value as any }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
              <select className="shopify-input w-full py-2.5 text-sm"
                value={formData.status || 'ACTIVE'}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value as any }))}>
                <option value="ACTIVE">Active</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">HSN Code</label>
              <input className="shopify-input w-full py-2.5 text-sm font-mono"
                placeholder="5208"
                value={formData.hsnCode || ''}
                onChange={e => setFormData(p => ({ ...p, hsnCode: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project Code</label>
              <input className="shopify-input w-full py-2.5 text-sm font-mono"
                placeholder="SS-2026"
                value={(formData as ExtendedDesign).projectCode || ''}
                onChange={e => setFormData(p => ({ ...p, projectCode: e.target.value }))} />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Image URL</label>
              <input className="shopify-input w-full py-2.5 text-sm"
                placeholder="https://..."
                value={formData.imageUrl || ''}
                onChange={e => setFormData(p => ({ ...p, imageUrl: e.target.value }))} />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-700 mb-5">
            <div className="flex gap-0 overflow-x-auto">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                // Counts for badges
                let count = 0;
                if (tab.id === 'materials') count = formData.recipe?.length || 0;
                if (tab.id === 'operations') count = formData.operations?.length || 0;
                if (tab.id === 'subassemblies') count = formData.subAssemblies?.length || 0;
                if (tab.id === 'scrap') count = formData.scrapItems?.length || 0;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as TabId)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {renderTabContent()}
          </div>

          {/* Footer: cost summary + actions */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Landed Cost / Piece</p>
                  <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums">
                    {fmt(costing.totalPerUnit, currency)}
                  </p>
                </div>
                <div className="flex gap-4 pl-6 border-l border-slate-200 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Materials</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(costing.rawMaterialCost + costing.subAssemblyCost, currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Operations</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(costing.totalLaborCost, currency)}</p>
                  </div>
                  {costing.scrapCredit > 0 && (
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Scrap Credit</p>
                      <p className="text-sm font-bold text-emerald-600">-{fmt(costing.scrapCredit, currency)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 md:flex-none px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                {editingId && onAction && (
                  <button type="button"
                    onClick={() => { onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', formData); setIsModalOpen(false); }}
                    className="flex-1 md:flex-none px-5 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700 text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Work Order
                  </button>
                )}
                <button type="submit"
                  className="flex-1 md:flex-none shopify-btn-primary px-8 py-2.5 text-sm">
                  {editingId ? 'Update BOM' : 'Save BOM'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default DesignRecipe;