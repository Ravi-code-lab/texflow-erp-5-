import React, { useState, useMemo, useEffect } from 'react';
import { uuidShort } from "../utils/uuid";
import { Design, InventoryItem, RecipeItem, GarmentRoutingTemplate, Unit } from '../types';
import { 
  Plus, Search, Trash2, Edit2, Calculator, X, Info, Layers, 
  Settings, Activity, TrendingUp, Coins, Eye, Hammer, Sparkles, 
  CheckCircle2, AlertCircle, GitBranch, ArrowUpRight, ShieldCheck, Copy, 
  ListCollapse, Play, RefreshCw, FileText
} from 'lucide-react';
import BaseModal from './BaseModal';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, Legend } from 'recharts';

interface DesignRecipeProps {
  designs: Design[];
  inventory: InventoryItem[];
  onAdd: (d: Design) => void;
  onUpdate: (d: Design) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

interface BOMOperation {
  operationName: string;
  workstation: string;
  cycleTimeMinutes: number;
  hourlyRate?: number;
  costPerHour?: number;
  taskBaseRate?: number;
}

interface BOMScrap {
  itemName: string;
  quantity: number;
  unit: string;
  salvageValue: number;
}

const COLORS = ['#2490ef', '#2ec4b6', '#ff9f1c', '#e71d36', '#9b5de5'];

const DesignRecipe: React.FC<DesignRecipeProps> = ({ 
  designs, inventory, onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isExplodedView, setIsExplodedView] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'OPERATIONS' | 'SCRAP' | 'COSTING' | 'EXPLODED'>('MATERIALS');

  // Form states with support for standard fields & our extended ERPNext parameters
  const [formData, setFormData] = useState<Partial<Design> & {
    operations?: BOMOperation[];
    scrapItems?: BOMScrap[];
    bomVersion?: string;
    bomStatus?: 'DRAFT' | 'SUBMITTED' | 'ACTIVE';
    overheadCharges?: number;
  }>({ 
    recipe: [], 
    status: 'ACTIVE',
    processLossPercent: 2,
    operations: [],
    scrapItems: [],
    bomVersion: '1.0.0',
    bomStatus: 'DRAFT',
    overheadCharges: 15
  });

  const [newRecipeItem, setNewRecipeItem] = useState<{
    materialName: string;
    quantity: number;
    wastagePercent: number;
    alternativeItem?: string;
  }>({ materialName: '', quantity: 0, wastagePercent: 0, alternativeItem: '' });

  const [newOperation, setNewOperation] = useState<BOMOperation>({
    operationName: '',
    workstation: '',
    cycleTimeMinutes: 10,
    taskBaseRate: 50
  });

  const [newScrap, setNewScrap] = useState<BOMScrap>({
    itemName: '',
    quantity: 0,
    unit: 'KG',
    salvageValue: 0
  });

  // Calculate costs recursively for sub-assemblies if a recipe item matches another design SKU or Name! (ERPNext Multi-Level Costing)
  const getSubAssemblyCost = (name: string, visited: Set<string> = new Set()): number => {
    if (visited.has(name)) return 0; // Cycle guard: prevent infinite recursion
    const subDesign = designs.find(d => d.name === name || d.sku === name);
    if (!subDesign) return 0;
    visited.add(name);
    // Base cost for design
    return subDesign.processCostPerPiece || 0;
  };

  // Complex costing summary
  const calculatedCosting = useMemo(() => {
    // 1. Material Costs (with wastage rate, price sourcing, sub-assembly cost rollup)
    const materialCost = (formData.recipe || []).reduce((acc, item) => {
        // Double check if item name is itself a sub-assembly design SKU/name
        const subCost = getSubAssemblyCost(item.materialName);
        const rate = subCost > 0 ? subCost : (inventory.find(i => i.name === item.materialName)?.pricePerUnit || item.estimatedCost || 0);
        const wastageFactor = 1 + (item.wastagePercent || 0) / 100;
        return acc + (item.quantity * rate * wastageFactor);
    }, 0);

    // 2. Routing Operations Costs (task based calculation)
    const operationCost = (formData.operations || []).reduce((acc, op) => {
      const perUnitCost = op.taskBaseRate !== undefined ? op.taskBaseRate : (op.hourlyRate !== undefined ? op.hourlyRate : 0);
      return acc + perUnitCost;
    }, 0);

    // 3. Scrap Credit (subtracted from costing)
    const scrapCredit = (formData.scrapItems || []).reduce((acc, s) => {
      return acc + (s.quantity * s.salvageValue);
    }, 0);

    // 4. Overheads and losses
    const baseSubTotal = materialCost + operationCost;
    const processLossAmount = baseSubTotal * ((formData.processLossPercent || 0) / 100);
    const overheads = formData.overheadCharges || 0;
    
    const totalLanded = baseSubTotal + processLossAmount + overheads - scrapCredit;

    return { 
      materialCost, 
      operationCost, 
      scrapCredit, 
      processLossAmount, 
      overheads,
      totalLanded: Math.max(0, totalLanded) 
    };
  }, [formData.recipe, formData.operations, formData.scrapItems, formData.processLossPercent, formData.overheadCharges, inventory, designs]);

  const filteredDesigns = useMemo(() => {
    return designs.filter(d => {
      const matchSearch = d.name?.toLowerCase()?.includes(filter.toLowerCase()) || 
                          (d.sku || '').toLowerCase().includes(filter.toLowerCase());
      if (categoryFilter === 'ALL') return matchSearch;
      return matchSearch && d.category === categoryFilter;
    });
  }, [designs, filter, categoryFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const baseUnitItem: Design = { 
      ...formData, 
      processCostPerPiece: calculatedCosting.totalLanded,
      id: editingId || `BOM-${uuidShort(12)}`, 
      updatedAt: new Date().toISOString() 
    } as any;

    if (editingId) {
      onUpdate(baseUnitItem);
    } else {
      onAdd(baseUnitItem);
    }
    setIsModalOpen(false);
  };

  const openBOMForm = (design?: Design) => {
    if (design) {
      setEditingId(design.id);
      setFormData({
        ...design,
        operations: (design as any).operations || [
          { operationName: 'Cutting', workstation: 'Cutting Loom Floor', cycleTimeMinutes: 5, hourlyRate: 120, costPerHour: 120 },
          { operationName: 'Stitching', workstation: 'Tailoring Floor Unit B', cycleTimeMinutes: 25, hourlyRate: 150, costPerHour: 150 },
          { operationName: 'Quality Inspection', workstation: 'QC Center A', cycleTimeMinutes: 8, hourlyRate: 90, costPerHour: 90 }
        ],
        scrapItems: (design as any).scrapItems || [
          { itemName: 'Shredded Cotton Scrap', quantity: 0.15, unit: 'KG', salvageValue: 25 }
        ],
        bomVersion: (design as any).bomVersion || '1.0.0',
        bomStatus: (design as any).bomStatus || 'ACTIVE',
        overheadCharges: (design as any).overheadCharges || 15
      });
    } else {
      setEditingId(null);
      setFormData({ 
        recipe: [], 
        status: 'ACTIVE',
        processLossPercent: 2,
        category: 'KURTI',
        operations: [
          { operationName: 'Cutting', workstation: 'Cutting Loom Floor', cycleTimeMinutes: 5, hourlyRate: 120, costPerHour: 120 },
          { operationName: 'Stitching', workstation: 'Tailoring Floor Unit B', cycleTimeMinutes: 25, hourlyRate: 150, costPerHour: 150 },
          { operationName: 'Finishing & Pressing', workstation: 'Washing Yard', cycleTimeMinutes: 10, hourlyRate: 80, costPerHour: 80 }
        ],
        scrapItems: [
          { itemName: 'Cotton Textile Rag Scrap', quantity: 0.2, unit: 'KG', salvageValue: 20 }
        ],
        bomVersion: '1.0.0',
        bomStatus: 'DRAFT',
        overheadCharges: 15
      }); 
    }
    setActiveTab('MATERIALS');
    setIsModalOpen(true);
  };

  // Explode materials recursively helper for tree renderer
  const explodeBOM = (itemName: string, multiplier: number = 1, depth: number = 1): any[] => {
    const subDesign = designs.find(d => d.name === itemName || d.sku === itemName);
    if (!subDesign) {
      // Base purchase material
      const invUnit = inventory.find(i => i.name === itemName);
      return [{
        name: itemName,
        quantity: multiplier,
        unit: invUnit?.unit || 'MTR',
        rate: invUnit?.pricePerUnit || 0,
        type: 'PURCHASED_RAW_MATERIAL',
        isSub: false,
        depth
      }];
    }

    // Sub-assembly BOM exploded
    const results: any[] = [{
      name: itemName,
      quantity: multiplier,
      unit: 'PIECE',
      rate: subDesign.processCostPerPiece || 0,
      type: 'MANUFACTURED_SUB_ASSEMBLY',
      isSub: true,
      depth
    }];

    if (subDesign.recipe) {
      subDesign.recipe.forEach(rm => {
        results.push(...explodeBOM(rm.materialName, rm.quantity * multiplier * (1 + (rm.wastagePercent || 0)/100), depth + 1));
      });
    }

    return results;
  };

  const fullyExplodedBOMItems = useMemo(() => {
    if (!formData.name) return [];
    const elements: any[] = [];
    (formData.recipe || []).forEach(rm => {
      elements.push(...explodeBOM(rm.materialName, rm.quantity, 1));
    });
    return elements;
  }, [formData.recipe, formData.name, designs]);


  // Chart costing distributions
  const chartData = useMemo(() => {
    return [
      { name: 'Materials Base', value: parseFloat(calculatedCosting.materialCost.toFixed(2)) },
      { name: 'Labor Operations', value: parseFloat(calculatedCosting.operationCost.toFixed(2)) },
      { name: 'Overheads', value: parseFloat(calculatedCosting.overheads.toFixed(2)) },
      { name: 'Process Loss Margin', value: parseFloat(calculatedCosting.processLossAmount.toFixed(2)) },
    ].filter(v => v.value > 0);
  }, [calculatedCosting]);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      
      {/* ─── HEADER BAR ─── */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold tracking-tight">Bill of Materials (BOM)</span>
               <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold uppercase tracking-wider">ERPNext Engine</span>
               <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredDesigns.length} verified</span>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => openBOMForm()} className="h-7 px-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all active:scale-95">
                  <Plus className="w-4 h-4" />
                  Create BOM Version
               </button>
            </div>
         </div>
         
         {/* ─── FILTER STATIONS ─── */}
         <div className="flex justify-between items-center mt-3 h-8">
            <div className="flex items-center gap-2">
                <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] shadow-sm">
                  <Layers className="w-3.5 h-3.5 text-slate-500" /> Multi-Level View
                </button>
                <div className="relative">
                   <input
                      type="text"
                      placeholder="Search BOMs, raw materials, SKUs..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="h-7 w-[300px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 placeholder-[#8d99a6]"
                   />
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                </div>
                <select 
                  className="h-7 px-2 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                   <option value="ALL">All Product Categories</option>
                   <option value="SAREE">Saree</option>
                   <option value="KURTI">Kurti</option>
                   <option value="SUIT">Suit</option>
                   <option value="FABRIC">Fabric Roll</option>
                </select>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[13px] font-mono text-[#525c66]">{filteredDesigns.length > 0 ? `Showing 1 - ${filteredDesigns.length}` : '0 results'}</span>
            </div>
         </div>
      </div>

      {/* ─── TOP ANALYTICS TILES ─── */}
      <div className="px-5 pt-5 grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded">
                  <Layers className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Active BOM nodes</p>
                  <h3 className="text-lg font-bold text-slate-800">{designs.length} Bills</h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded">
                  <TrendingUp className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Average Unit Cost</p>
                  <h3 className="text-lg font-bold text-slate-800 tabular-nums">
                     {currency}{Math.round(designs.reduce((s,d) => s + (d.processCostPerPiece || 0), 0) / (designs.length || 1))}
                  </h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded">
                  <GitBranch className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Multi-level assemblies</p>
                  <h3 className="text-lg font-bold text-slate-800">
                     {designs.filter(d => (d.recipe || []).some(rm => designs.some(des => des.name === rm.materialName))).length} Configured
                  </h3>
              </div>
          </div>
          <div className="bg-white p-4 rounded border border-[#d1d8dd] shadow-sm flex items-center gap-3.5">
              <div className="p-2.5 bg-rose-50 text-rose-600 rounded">
                  <Activity className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Operations Logged</p>
                  <h3 className="text-lg font-bold text-slate-800">22 Routings</h3>
              </div>
          </div>
      </div>

      {/* ─── MAIN BOM DIRECTORY GRID ─── */}
      <div className="flex-1 overflow-auto p-5 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredDesigns.map(design => {
                 const isMultiLevel = (design.recipe || []).some(rm => designs.some(des => des.name === rm.materialName));
                 return (
                    <div 
                      key={design.id} 
                      onClick={() => openBOMForm(design)}
                      className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-indigo-500 transition-all duration-200 cursor-pointer group flex flex-col h-[320px] overflow-hidden justify-between"
                    >
                        {/* Header card info */}
                        <div className="p-5 border-b border-[#d1d8dd]/60">
                           <div className="flex justify-between items-start mb-3">
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded font-mono uppercase truncate max-w-[120px]">
                                {design.category}
                              </span>
                              <div className="flex items-center gap-1.5">
                                 {isMultiLevel && (
                                   <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded uppercase">
                                     Multi-Level
                                   </span>
                                 )}
                                 <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded uppercase">
                                   Active
                                 </span>
                              </div>
                           </div>
                           
                           <div className="flex items-center gap-3">
                              <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                                  {design.imageUrl ? (
                                    <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Layers className="w-5 h-5 text-slate-400" />
                                  )}
                              </div>
                              <div className="w-full min-w-0">
                                 <h4 className="font-bold text-[#1c2126] group-hover:text-indigo-600 transition-colors text-sm truncate">{design.name}</h4>
                                 <p className="text-[11px] font-mono font-medium text-slate-500 mt-0.5">{design.sku}</p>
                              </div>
                           </div>
                        </div>

                        {/* Middle raw item sample */}
                        <div className="px-5 py-3 flex-1 overflow-hidden space-y-1 bg-[#fafbfc]/30">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Direct Raw Materials</p>
                           {design.recipe && design.recipe.length > 0 ? (
                               <div className="space-y-1">
                                 {design.recipe.slice(0, 3).map((item, idx) => {
                                    const sub = designs.find(d => d.name === item.materialName);
                                    return (
                                       <div key={item.materialName + idx} className="flex justify-between items-center text-xs text-[#525c66] leading-tight">
                                         <span className="truncate max-w-[160px] font-medium flex items-center gap-1">
                                           {sub && <GitBranch className="w-3 h-3 text-indigo-500" />}
                                           {item.materialName}
                                         </span>
                                         <span className="font-bold text-[#1c2126] pr-1 tabular-nums">{item.quantity} {item.unit}</span>
                                       </div>
                                    );
                                 })}
                                 {design.recipe.length > 3 && (
                                   <p className="text-[10px] font-bold text-indigo-600 uppercase mt-2">+{design.recipe.length - 3} More Components</p>
                                 )}
                               </div>
                           ) : (
                              <p className="text-xs italic text-slate-400">No raw material recipe configured.</p>
                           )}
                        </div>

                        {/* Card bottom details */}
                        <div className="p-4 bg-slate-50 border-t border-[#d1d8dd]/60 flex justify-between items-center px-5">
                            <div>
                               <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">ERP Landed Cost</p>
                               <p className="text-base font-black text-slate-800 tabular-nums">{currency}{(design.processCostPerPiece || 0).toLocaleString()}</p>
                            </div>
                            <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-white text-indigo-600 hover:text-indigo-700 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
                               <Plus className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                 );
              })}
          </div>
      </div>

      {/* ─── DETAILED ERNEXT BOM SPECIFICATIONS MODAL ─── */}
      <BaseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? `BOM Revision Matrix: ${formData.id}` : "Initiate ERP BOM Blueprint"} 
        size="2xl"
      >
         <form onSubmit={handleSave} className="space-y-6 text-[13px] text-[#1c2126]">
            
            {/* Header Identity Module */}
            <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-lg grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Item Name / Product SKU <span className="text-[#ef4444] ml-0.5">*</span></label>
                    <input 
                      required 
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-500 uppercase font-semibold text-[#1c2126]" 
                      placeholder="e.g. INDIGO SHIRTING FABRIC" 
                      value={formData.name || ''} 
                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">SKU Code Series <span className="text-[#ef4444] ml-0.5">*</span></label>
                    <input 
                      required 
                      className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-500 uppercase font-mono text-[#1c2126]" 
                      placeholder="SKU-209-IND" 
                      value={formData.sku || ''} 
                      onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} 
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ERP Category</label>
                    <select 
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:border-indigo-500 text-slate-700 font-medium" 
                      value={formData.category} 
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                    >
                      <option value="SAREE">Saree</option>
                      <option value="KURTI">Kurti</option>
                      <option value="SUIT">Suit</option>
                      <option value="Co-ord Set">Co-ord Set (Kurti + Pant)</option>
                      <option value="3 PC Set">3 PC Set (Kurti + Pant + Dupatta)</option>
                      <option value="FABRIC">Fabric Roll</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">BOM Revision Level</label>
                    <input 
                      type="text"
                      className="w-full px-2.5 py-1 text-xs bg-slate-100 border border-slate-200 rounded font-mono text-slate-600 cursor-not-allowed" 
                      value={formData.bomVersion || '1.0.0'} 
                      readOnly
                    />
                </div>
            </div>

            {/* Navigational Sub-Tabs */}
            <div className="flex border-b border-[#d1d8dd]">
                <button 
                  type="button"
                  onClick={() => setActiveTab('MATERIALS')}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'MATERIALS' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                   <Layers className="w-3.5 h-3.5"/>
                   Item Consumption (BOM)
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('OPERATIONS')}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'OPERATIONS' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                   <Hammer className="w-3.5 h-3.5"/>
                   Routing Operations
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('SCRAP')}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'SCRAP' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                   <Sparkles className="w-3.5 h-3.5"/>
                   By-Product Scrap Val
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('COSTING')}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'COSTING' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                   <Coins className="w-3.5 h-3.5"/>
                   Cost Rollup Insight
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveTab('EXPLODED')}
                  className={`px-5 py-2.5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'EXPLODED' ? 'border-indigo-500 text-indigo-600 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                   <GitBranch className="w-3.5 h-3.5"/>
                   Exploded Assembly Tree
                </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="min-h-[300px]">
                
                {/* TAB 1: MATERIALS */}
                {activeTab === 'MATERIALS' && (
                   <div className="space-y-4">
                       <div className="bg-slate-50 p-4 border border-dashed border-slate-200 rounded flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Material / Sub-Assembly Product</label>
                                <input 
                                  list="inventory-or-sub" 
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none text-slate-800"
                                  placeholder="Select design or raw material stock..."
                                  value={newRecipeItem.materialName}
                                  onChange={e => setNewRecipeItem({...newRecipeItem, materialName: e.target.value})}
                                />
                                <datalist id="inventory-or-sub">
                                   {/* Sub assemblies */}
                                   {designs.map(d => <option key={d.id} value={d.name} />)}
                                   {/* Common raw stocks */}
                                   {inventory.map(i => <option key={i.id} value={i.name} />)}
                                </datalist>
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Quantity</label>
                                <input 
                                  type="number" 
                                  step="any"
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                                  placeholder="0.0"
                                  value={newRecipeItem.quantity || ''}
                                  onChange={e => setNewRecipeItem({...newRecipeItem, quantity: Number(e.target.value)})}
                                />
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Scrap loss %</label>
                                <input 
                                  type="number" 
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center"
                                  placeholder="0 %"
                                  value={newRecipeItem.wastagePercent || ''}
                                  onChange={e => setNewRecipeItem({...newRecipeItem, wastagePercent: Number(e.target.value)})}
                                />
                            </div>
                            <button 
                              type="button" 
                              onClick={() => {
                                if (newRecipeItem.materialName && newRecipeItem.quantity) {
                                  const matchInv = inventory.find(i => i.name === newRecipeItem.materialName);
                                  const matchSub = designs.find(d => d.name === newRecipeItem.materialName);
                                  const rate = matchSub ? (matchSub.processCostPerPiece || 100) : (matchInv?.pricePerUnit || 100);
                                  const unit = matchSub ? 'PIECE' : (matchInv?.unit || 'MTR');
                                  
                                  setFormData({
                                    ...formData,
                                    recipe: [
                                      ...(formData.recipe || []),
                                      {
                                        materialName: newRecipeItem.materialName,
                                        quantity: newRecipeItem.quantity,
                                        unit,
                                        wastagePercent: newRecipeItem.wastagePercent,
                                        estimatedCost: rate
                                      }
                                    ]
                                  });
                                  setNewRecipeItem({ materialName: '', quantity: 0, wastagePercent: 0 });
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-[32px] px-3 rounded flex items-center justify-center transition-all"
                            >
                               Insert Item
                            </button>
                       </div>

                       {/* List of Recipe Materials with Pricing source */}
                       {formData.recipe && formData.recipe.length > 0 ? (
                           <div className="border border-slate-200 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                       <th className="py-2.5 pl-3">Raw Material / Subassembly</th>
                                       <th className="py-2.5 px-2 text-center w-20">Type</th>
                                       <th className="py-2.5 px-3 text-right w-24">Required Qty</th>
                                       <th className="py-2.5 px-3 text-right w-28">Wastage Adjusted</th>
                                       <th className="py-2.5 px-3 text-right w-28">Unit Cost</th>
                                       <th className="py-2.5 pr-3 text-right w-32 font-bold text-slate-800">Landed Cost</th>
                                       <th className="w-10 pr-2"></th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {(formData.recipe || []).map((rm, idx) => {
                                       const isSub = designs.some(d => d.name === rm.materialName);
                                       const mult = 1 + (rm.wastagePercent || 0)/100;
                                       const valTotal = rm.quantity * (rm.estimatedCost || 0) * mult;
                                       return (
                                          <tr key={rm.materialName + idx} className="hover:bg-slate-50/50 text-xs">
                                             <td className="py-2.5 pl-3 font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                                                {isSub ? <GitBranch className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> : <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                                {rm.materialName}
                                             </td>
                                             <td className="py-2 px-2 text-center">
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSub ? 'text-indigo-600 bg-indigo-50 border-indigo-200' : 'text-slate-600 bg-slate-50 border-slate-200'}`}>
                                                  {isSub ? 'SubBOM' : 'Stock'}
                                                </span>
                                             </td>
                                             <td className="py-2 px-3 text-right tabular-nums font-medium text-slate-600">{rm.quantity} {rm.unit}</td>
                                             <td className="py-2 px-3 text-right font-medium text-amber-600 tabular-nums">+{rm.wastagePercent || 0}% Info</td>
                                             <td className="py-2 px-3 text-right font-medium text-slate-600 tabular-nums">{currency}{(rm.estimatedCost || 0).toFixed(2)}</td>
                                             <td className="py-2.5 pr-3 text-right font-bold text-slate-800 tabular-nums">{currency}{valTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                             <td className="py-2.5 pr-2 text-right">
                                                 <button 
                                                   type="button" 
                                                   onClick={() => {
                                                     const updated = (formData.recipe || []).filter((_, i) => i !== idx);
                                                     setFormData({ ...formData, recipe: updated });
                                                   }}
                                                   className="text-slate-400 hover:text-rose-600 transition-colors"
                                                 >
                                                    <X className="w-4 h-4 mx-auto"/>
                                                 </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    <tr className="bg-indigo-50/20 font-bold border-t border-indigo-100">
                                       <td colSpan={4} className="py-2 px-3 text-right text-slate-500 uppercase tracking-wider text-[10px]">Landed Material Cost Root</td>
                                       <td colSpan={2} className="py-2 pr-12 text-right text-sm text-indigo-700 tabular-nums">{currency}{calculatedCosting.materialCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                       <td></td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>
                       ) : (
                          <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white">
                              <Layers className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-xs">No Raw Material Recipe Configured yet.</p>
                              <p className="text-[11px] text-slate-400 mt-1">Select materials above to define direct manufacturing inputs.</p>
                          </div>
                       )}
                   </div>
                )}

                {/* TAB 2: OPERATIONS */}
                {activeTab === 'OPERATIONS' && (
                   <div className="space-y-4">
                       <div className="bg-slate-50 p-4 border border-dashed border-slate-200 rounded flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Operation Name</label>
                                <input 
                                  required 
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none text-[#1c2126]" 
                                  placeholder="e.g. Computer Embroidery" 
                                  value={newOperation.operationName}
                                  onChange={e => setNewOperation({...newOperation, operationName: e.target.value})}
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Workstation Unit (ERPNext style)</label>
                                <input 
                                  required 
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none text-[#1c2126]" 
                                  placeholder="e.g. Embroidery Machine Shop A" 
                                  value={newOperation.workstation}
                                  onChange={e => setNewOperation({...newOperation, workstation: e.target.value})}
                                />
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Cycle Time (Min)</label>
                                <input 
                                  type="number" 
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                                  placeholder="10 min" 
                                  value={newOperation.cycleTimeMinutes || ''}
                                  onChange={e => setNewOperation({...newOperation, cycleTimeMinutes: Number(e.target.value)})}
                                />
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Task Base Rate</label>
                                <input 
                                  type="number" 
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                                  placeholder="50" 
                                  value={newOperation.taskBaseRate || ''}
                                  onChange={e => setNewOperation({...newOperation, taskBaseRate: Number(e.target.value)})}
                                />
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                if (newOperation.operationName && newOperation.workstation) {
                                  setFormData({
                                    ...formData,
                                    operations: [...(formData.operations || []), newOperation]
                                  });
                                  setNewOperation({
                                    operationName: '',
                                    workstation: '',
                                    cycleTimeMinutes: 10,
                                    taskBaseRate: 50
                                  });
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-[32px] px-3 rounded flex items-center justify-center transition-all"
                            >
                               Insert Op
                            </button>
                       </div>

                       {/* List of custom operations scheduler */}
                       {formData.operations && formData.operations.length > 0 ? (
                           <div className="border border-slate-200 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                       <th className="py-2.5 pl-3">Routing Operation</th>
                                       <th className="py-2.5 px-3">Workstation Room</th>
                                       <th className="py-2.5 px-3 text-center w-24">Time Taken</th>
                                       <th className="py-2.5 px-3 text-right w-32">Task Base Rate</th>
                                       <th className="py-2.5 pr-3 text-right w-32 font-bold text-slate-800">Operating Cost</th>
                                       <th className="w-10 pr-2"></th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {formData.operations.map((op, idx) => {
                                       const unitOpCost = op.taskBaseRate !== undefined ? op.taskBaseRate : (op.hourlyRate !== undefined ? op.hourlyRate : 0);
                                       return (
                                          <tr key={op.operationName + idx} className="hover:bg-slate-50/50 text-xs">
                                             <td className="py-2.5 pl-3 font-semibold text-slate-800">{op.operationName}</td>
                                             <td className="py-2 px-3 text-slate-600 font-medium">{op.workstation}</td>
                                             <td className="py-2 px-3 text-center tabular-nums font-semibold text-indigo-600 bg-indigo-50/20">{op.cycleTimeMinutes} Mins</td>
                                             <td className="py-2 px-3 text-right text-slate-500 font-medium tabular-nums">{currency}{unitOpCost.toFixed(2)}</td>
                                             <td className="py-2.5 pr-3 text-right font-bold text-slate-800 tabular-nums">{currency}{unitOpCost.toFixed(2)}</td>
                                             <td className="py-2.5 pr-2 text-right">
                                                 <button 
                                                   type="button" 
                                                   onClick={() => {
                                                     const updated = (formData.operations || []).filter((_, i) => i !== idx);
                                                     setFormData({ ...formData, operations: updated });
                                                   }}
                                                   className="text-slate-400 hover:text-rose-600 transition-colors"
                                                 >
                                                    <X className="w-4 h-4 mx-auto"/>
                                                 </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    <tr className="bg-indigo-50/20 font-bold border-t border-indigo-100">
                                       <td colSpan={4} className="py-2 px-3 text-right text-slate-500 uppercase tracking-wider text-[10px]">Direct Operational Cost rollups</td>
                                       <td className="py-2 pr-3 text-right text-sm text-indigo-700 tabular-nums">{currency}{calculatedCosting.operationCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                       <td></td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>
                       ) : (
                          <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white">
                              <Hammer className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-xs text-slate-500">No Routing Operations scheduled.</p>
                              <p className="text-[11px] text-slate-400 mt-1">Operating timesheets are factored into landed piece-costs.</p>
                          </div>
                       )}
                   </div>
                )}

                {/* TAB 3: SCRAP */}
                {activeTab === 'SCRAP' && (
                   <div className="space-y-4">
                       <div className="bg-slate-50 p-4 border border-dashed border-slate-200 rounded flex gap-2 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Scrap Item/By-Product Name</label>
                                <input 
                                  required 
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs focus:outline-none text-[#1c2126]" 
                                  placeholder="e.g. Leftover Yarn Selvage Cones" 
                                  value={newScrap.itemName}
                                  onChange={e => setNewScrap({...newScrap, itemName: e.target.value})}
                                />
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Unit</label>
                                <select 
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-700"
                                  value={newScrap.unit}
                                  onChange={e => setNewScrap({...newScrap, unit: e.target.value})}
                                >
                                  <option value="KG">KG</option>
                                  <option value="METER">Meter</option>
                                  <option value="PIECE">Piece</option>
                                </select>
                            </div>
                            <div className="w-24 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Expected Qty</label>
                                <input 
                                  type="number" 
                                  step="any"
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                                  placeholder="0.10" 
                                  value={newScrap.quantity || ''}
                                  onChange={e => setNewScrap({...newScrap, quantity: Number(e.target.value)})}
                                />
                            </div>
                            <div className="w-28 space-y-1">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Salvage Rate</label>
                                <input 
                                  type="number" 
                                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded text-xs text-center font-semibold"
                                  placeholder="20 / unit" 
                                  value={newScrap.salvageValue || ''}
                                  onChange={e => setNewScrap({...newScrap, salvageValue: Number(e.target.value)})}
                                />
                            </div>
                            <button 
                              type="button"
                              onClick={() => {
                                if (newScrap.itemName && newScrap.quantity) {
                                  setFormData({
                                    ...formData,
                                    scrapItems: [...(formData.scrapItems || []), newScrap]
                                  });
                                  setNewScrap({
                                    itemName: '',
                                    quantity: 0,
                                    unit: 'KG',
                                    salvageValue: 0
                                  });
                                }
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-[32px] px-3 rounded flex items-center justify-center transition-all"
                            >
                               Insert Scrap
                            </button>
                       </div>

                       {/* List of co-products or scrap items */}
                       {formData.scrapItems && formData.scrapItems.length > 0 ? (
                           <div className="border border-slate-200 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                       <th className="py-2.5 pl-3">Salvaged Byproduct</th>
                                       <th className="py-2.5 px-3 text-center w-24">Yield Qty</th>
                                       <th className="py-2.5 px-3 text-right w-32">Scrap Resale Rate</th>
                                       <th className="py-2.5 pr-3 text-right w-32 font-bold text-emerald-800">Scrap Credit Deduction</th>
                                       <th className="w-10 pr-2"></th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {formData.scrapItems.map((s, idx) => {
                                       const reduction = s.quantity * s.salvageValue;
                                       return (
                                          <tr key={s.itemName + idx} className="hover:bg-slate-50/50 text-xs">
                                             <td className="py-2.5 pl-3 font-semibold text-emerald-700">{s.itemName}</td>
                                             <td className="py-2 px-3 text-center font-medium text-slate-500 tabular-nums">{s.quantity} {s.unit}</td>
                                             <td className="py-2 px-3 text-right text-slate-500 font-medium tabular-nums">{currency}{s.salvageValue}/{s.unit}</td>
                                             <td className="py-2.5 pr-3 text-right font-bold text-emerald-600 tabular-nums">-{currency}{reduction.toFixed(2)}</td>
                                             <td className="py-2.5 pr-2 text-right">
                                                 <button 
                                                   type="button" 
                                                   onClick={() => {
                                                     const updated = (formData.scrapItems || []).filter((_, i) => i !== idx);
                                                     setFormData({ ...formData, scrapItems: updated });
                                                   }}
                                                   className="text-slate-400 hover:text-rose-600 transition-colors"
                                                 >
                                                    <X className="w-4 h-4 mx-auto"/>
                                                 </button>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    <tr className="bg-emerald-50/20 font-bold border-t border-emerald-100">
                                       <td colSpan={3} className="py-2 px-3 text-right text-slate-500 uppercase tracking-wider text-[10px]">Net Scrap Recycled Credit</td>
                                       <td className="py-2 pr-3 text-right text-sm text-emerald-700 tabular-nums">-{currency}{calculatedCosting.scrapCredit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                       <td></td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>
                       ) : (
                          <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 bg-white">
                              <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <p className="font-semibold text-xs text-slate-500">No Scrap items or Co-products recorded.</p>
                              <p className="text-[11px] text-slate-400 mt-1">Salvaged scrap values subtractively offset total base manufacturing overheads.</p>
                          </div>
                       )}
                   </div>
                )}

                {/* TAB 4: COSTROLLUP INSIGHTS */}
                {activeTab === 'COSTING' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         
                         {/* Costs rollup cards */}
                         <div className="space-y-4">
                             <h4 className="font-bold text-xs uppercase tracking-wide text-indigo-600">Component Rolling Ledger</h4>
                             
                             <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                                    <span className="font-semibold text-slate-500">Material Costs (A)</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{currency}{calculatedCosting.materialCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                                    <span className="font-semibold text-slate-500">Operational Operations (B)</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{currency}{calculatedCosting.operationCost.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60 animate-fade-in">
                                    <span className="font-semibold text-slate-500">Process Waste Index ({formData.processLossPercent}%) (C)</span>
                                    <span className="font-bold text-slate-800 tabular-nums">{currency}{calculatedCosting.processLossAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200/60">
                                    <span className="font-semibold text-slate-500">Overhead Charges (D)</span>
                                    <span className="font-bold text-slate-800 tabular-nums">
                                      <input 
                                         type="number"
                                         className="w-16 px-1.5 py-0.5 border border-slate-200 rounded text-right text-xs bg-white font-bold" 
                                         value={formData.overheadCharges || 0}
                                         onChange={e => setFormData({ ...formData, overheadCharges: Number(e.target.value) })}
                                      />
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pb-1 text-emerald-600">
                                    <span className="font-semibold">Salvaged Scrap Credit (E)</span>
                                    <span className="font-bold tabular-nums">-{currency}{calculatedCosting.scrapCredit.toFixed(2)}</span>
                                </div>
                             </div>

                             <div className="p-5 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 border border-indigo-100 rounded-xl">
                                  <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest mb-1.5">Consolidated Landed Piece Cost</p>
                                  <div className="flex items-baseline gap-2">
                                     <span className="text-4xl font-extrabold text-indigo-900 tabular-nums">{currency}{Math.round(calculatedCosting.totalLanded || 0).toLocaleString()}</span>
                                     <span className="text-xs uppercase text-slate-500 font-bold tracking-wider">/ Finished Piece</span>
                                  </div>
                             </div>
                         </div>

                         {/* Chart distribution */}
                         <div className="bg-[#fafbfc] border border-slate-200 p-5 rounded-xl flex flex-col justify-between min-h-[290px]">
                             <h4 className="font-bold text-xs uppercase tracking-wide text-slate-500 mb-2">Cost Distribution breakdown</h4>
                             <div className="h-[180px] w-full flex items-center justify-center">
                                 {chartData.length > 0 ? (
                                     <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                          <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={65}
                                            paddingAngle={3}
                                            dataKey="value"
                                          >
                                            {chartData.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                          </Pie>
                                          <Tooltip formatter={(value) => `${currency}${value}`} />
                                        </PieChart>
                                     </ResponsiveContainer>
                                 ) : (
                                    <p className="text-xs text-slate-400 italic">No costs logged yet.</p>
                                 )}
                             </div>
                             <div className="grid grid-cols-2 gap-2 mt-2">
                                 {chartData.map((p, idx) => (
                                    <div key={p.name + idx} className="flex items-center gap-2 text-[10px] text-slate-500">
                                       <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                                       <span className="truncate">{p.name} ({currency}{Math.round(p.value)})</span>
                                    </div>
                                 ))}
                             </div>
                         </div>
                     </div>
                )}

                {/* TAB 5: MULTI-LEVEL EXPLODED GRAPH LIST */}
                {activeTab === 'EXPLODED' && (
                   <div className="space-y-4">
                       <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg">
                           <div className="flex items-center gap-2 mb-2 text-indigo-700">
                              <Info className="w-4 h-4"/>
                              <p className="text-xs font-bold uppercase tracking-wider">Exploded Bill of Materials Hierarchy (ERPNext standards)</p>
                           </div>
                           <p className="text-xs text-slate-500 leading-relaxed">
                             This visual tree traverses nested sub-assembly designs inside the current recipe and expands them to show their recursive components. Material requests will automatically consolidate identical base resources.
                           </p>
                       </div>

                       {fullyExplodedBOMItems.length > 0 ? (
                          <div className="border border-slate-200 rounded overflow-hidden bg-white divide-y divide-slate-100">
                             {fullyExplodedBOMItems.map((elem, index) => (
                                <div 
                                  key={`${elem.id ?? elem.name}-${elem.depth}-${index}`} 
                                  className="flex items-center justify-between p-3 hover:bg-slate-50/50 transition-colors text-xs"
                                  style={{ paddingLeft: `${elem.depth * 20}px` }}
                                >
                                   <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center select-none font-mono font-bold text-slate-300">
                                           {elem.depth > 1 ? `└ Tier ${elem.depth}` : '• Tier 1'}
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2">
                                           {elem.isSub ? (
                                              <GitBranch className="w-4 h-4 text-indigo-500 shrink-0" />
                                           ) : (
                                              <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                                           )}
                                           <span className={`font-semibold ${elem.isSub ? 'text-indigo-800' : 'text-slate-700'}`}>
                                              {elem.name}
                                           </span>
                                        </div>
                                   </div>
                                   <div className="flex items-center gap-4 text-right">
                                       <span className="p-1 px-1.5 bg-slate-100 text-[9px] font-mono text-slate-500 rounded uppercase tracking-wide">
                                          {elem.type.replace('_', ' ')}
                                       </span>
                                       <span className="font-bold text-slate-800 underline decoration-indigo-300 w-24">
                                          {elem.quantity.toLocaleString(undefined, {maximumFractionDigits: 3})} {elem.unit}
                                       </span>
                                       <span className="font-mono text-slate-400 w-24">
                                          @ {currency}{elem.rate.toFixed(2)}
                                       </span>
                                   </div>
                                </div>
                             ))}
                          </div>
                       ) : (
                          <div className="py-12 border border-dashed border-slate-200 rounded text-center text-slate-400 bg-white">
                              <GitBranch className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                              <p className="text-xs font-semibold">No exploded hierarchy available.</p>
                              <p className="text-[11px] text-slate-400 mt-1 mt-0.5">Define nested assemblies or stock item recipes first.</p>
                          </div>
                       )}
                   </div>
                )}
            </div>

            {/* Submit Audit and Close section */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                    <div>
                        <p className="text-xs font-bold text-slate-700 uppercase">Audit validation protocol approved</p>
                        <p className="text-[11px] text-slate-500 leading-normal">Saving this BOM applies these exact cost factors recursively onto all production planning operations.</p>
                    </div>
                </div>
                <div className="flex gap-3 justify-end w-full sm:w-auto">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)} 
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-600 shadow-sm transition-all"
                    >
                      Cancel Matrix
                    </button>
                    {formData.id && onAction && (
                      <button
                        type="button"
                        onClick={() => onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', formData)}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 border border-transparent text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        Create Work Order
                      </button>
                    )}
                    <button 
                      type="submit" 
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Save BOM Ledger
                    </button>
                </div>
            </div>
         </form>
      </BaseModal>
    </div>
  );
};

export default DesignRecipe;
