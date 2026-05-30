import React, { useState, useMemo, useEffect } from 'react';
import { Design, InventoryItem, RecipeItem, GarmentRoutingTemplate } from '../types';
import { Palette, Plus, Search, FlaskRound, Trash2, Edit2, Zap, Calculator, Ruler, X, FlaskConical, Info } from 'lucide-react';
import BaseModal from './BaseModal';

interface DesignRecipeProps {
  designs: Design[];
  inventory: InventoryItem[];
  onAdd: (d: Design) => void;
  onUpdate: (d: Design) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const DesignRecipe: React.FC<DesignRecipeProps> = ({ 
  designs, inventory, onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Design>>({ 
    recipe: [], 
    status: 'ACTIVE',
    laborCosts: { cutting: 0, stitching: 0, embroidery: 0, washing: 0, finishing: 0, packing: 0 },
    processLossPercent: 2
  });
  const [newRecipeItem, setNewRecipeItem] = useState<Partial<RecipeItem>>({ materialName: '', quantity: 0, wastagePercent: 0 });
  const [routingTemplates, setRoutingTemplates] = useState<GarmentRoutingTemplate[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('texflow_garment_manufacturing_setup');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.routingTemplates)) setRoutingTemplates(parsed.routingTemplates);
      }
    } catch {
      setRoutingTemplates([]);
    }
  }, []);

  const filteredDesigns = useMemo(() => {
    return designs.filter(d => 
      d.name.toLowerCase().includes(filter.toLowerCase()) || 
      d.sku?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [designs, filter]);

  const calculatedCosting = useMemo(() => {
    const materialCost = (formData.recipe || []).reduce((acc, item) => {
        const material = inventory.find(i => i.name === item.materialName);
        const rate = material?.pricePerUnit || item.estimatedCost || 0;
        const wastageFactor = 1 + (item.wastagePercent || 0) / 100;
        return acc + (item.quantity * rate * wastageFactor);
    }, 0);

    const labor = formData.laborCosts || {};
    const totalProcesses = Object.values(labor).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    const subTotal = materialCost + totalProcesses;
    const processLossAmount = subTotal * ((formData.processLossPercent || 0) / 100);
    const totalLanded = subTotal + processLossAmount;

    return { materialCost, totalProcesses, totalLanded, processLossAmount };
  }, [formData.recipe, formData.laborCosts, formData.processLossPercent, inventory]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    const design = { 
      ...formData, 
      processCostPerPiece: calculatedCosting.totalLanded,
      id: editingId || `DES-${Date.now().toString().slice(-4)}`, 
      updatedAt: new Date().toISOString() 
    } as Design;
    if (editingId) onUpdate(design); else onAdd(design);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-shopify-bg dark:bg-slate-950">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-shopify-text dark:text-white">Bill of Materials (BOM)</h1>
          <p className="text-base text-slate-500">Technical consumption and routing operations for your products.</p>
        </div>
        <div className="flex gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              className="shopify-input w-full pl-11 py-2.5 text-base" 
              placeholder="Search SKU..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
            />
          </div>
          <button 
            onClick={() => { 
              setEditingId(null);
              setFormData({ 
                recipe: [], 
                status: 'ACTIVE',
                laborCosts: { cutting: 0, stitching: 0, embroidery: 0, washing: 0, finishing: 0, packing: 0 },
                processLossPercent: 2
              }); 
              setIsModalOpen(true); 
            }} 
            className="shopify-btn-primary flex items-center gap-2 px-6 py-2.5 text-base"
          >
             <Plus className="w-5 h-5" /> Create BOM
          </button>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredDesigns.map(design => (
           <div 
            key={design.id} 
            onClick={() => { setEditingId(design.id); setFormData(design); setIsModalOpen(true); }}
            className="shopify-card p-6 group cursor-pointer hover:border-shopify-primary transition-all flex flex-col h-full"
           >
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 overflow-hidden border border-slate-200 dark:border-slate-700">
                    {design.imageUrl ? (
                      <img src={design.imageUrl} alt={design.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <FlaskRound className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-shopify-text dark:text-white truncate text-base">{design.name}</h4>
                    <p className="text-sm text-slate-500">SKU: {design.sku || 'N/A'}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 uppercase border dark:border-slate-700">{design.category}</span>
              </div>

              {/* BOM Summary List */}
              <div className="flex-1 space-y-3 mb-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consumption Matrix</p>
                {design.recipe && design.recipe.length > 0 ? (
                  <div className="space-y-2">
                    {design.recipe.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm text-slate-600 dark:text-slate-400">
                        <span className="truncate max-w-[150px]">{item.materialName}</span>
                        <span className="tabular-nums font-medium">{item.quantity} {item.unit}</span>
                      </div>
                    ))}
                    {design.recipe.length > 3 && (
                      <p className="text-xs font-bold text-shopify-primary uppercase pt-1">+{design.recipe.length - 3} More Materials</p>
                    )}
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/50">
                    <p className="text-xs font-bold text-slate-400 uppercase">No BOM Defined</p>
                  </div>
                )}
              </div>

              {/* Footer Costing */}
              <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Landed Cost</p>
                    <p className="text-xl font-bold text-shopify-text dark:text-white tabular-nums">{currency}{design.processCostPerPiece?.toLocaleString()}</p>
                 </div>
                 <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-shopify-primary transition-colors"><Edit2 className="w-5 h-5"/></button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm('Delete recipe?')) onDelete(design.id); }} 
                      className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-5 h-5"/>
                    </button>
                 </div>
              </div>
           </div>
        ))}
      </div>

      {/* Modal Section */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit BOM" : "Create BOM"} size="xl">
         <form onSubmit={handleSave} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-5">
                  <h4 className="text-base font-bold text-shopify-text dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">Basic Information</h4>
                  <div className="space-y-5">
                    {formData.imageUrl && (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <img src={formData.imageUrl} alt="Design Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Design / SKU Name</label>
                      <input required className="shopify-input w-full py-2.5 text-base" placeholder="e.g. Summer Blossom Kurti" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Image URL</label>
                      <input className="shopify-input w-full py-2.5 text-base" placeholder="https://picsum.photos/seed/design/800/600" value={formData.imageUrl || ''} onChange={e => setFormData({...formData, imageUrl: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase mb-2">SKU Code</label>
                        <input required className="shopify-input w-full py-2.5 text-base" placeholder="SKU-001" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Category</label>
                        <select className="shopify-input w-full py-2.5 text-base" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                          <option value="SAREE">Saree</option>
                          <option value="KURTI">Kurti</option>
                          <option value="SUIT">Suit</option>
                          <option value="FABRIC">Fabric Roll</option>
                        </select>
                      </div>
                    </div>
                    {routingTemplates.length > 0 && (
                      <div>
                        <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Manufacturing Routing</label>
                        <select className="shopify-input w-full py-2.5 text-base" value={formData.routingTemplateId || ''} onChange={e => setFormData({...formData, routingTemplateId: e.target.value})}>
                          <option value="">Auto by category</option>
                          {routingTemplates.map(route => (
                            <option key={route.id} value={route.id}>{route.name} ({route.category})</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Specs */}
                <div className="space-y-5">
                  <h4 className="text-base font-bold text-shopify-text dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">Technical Specifications</h4>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Finished Width (")</label>
                      <input className="shopify-input w-full py-2.5 text-base" value={formData.finishedWidth || ''} onChange={e => setFormData({...formData, finishedWidth: e.target.value})} placeholder="44" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-500 uppercase mb-2">Finished GSM</label>
                      <input className="shopify-input w-full py-2.5 text-base" value={formData.finishedGsm || ''} onChange={e => setFormData({...formData, finishedGsm: e.target.value})} placeholder="180" />
                    </div>
                  </div>
                </div>
              </div>

              {/* BOM Section */}
              <div className="space-y-5">
                <h4 className="text-base font-bold text-shopify-text dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2.5">Material Consumption (BOM)</h4>
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input list="bom-materials-recipe" className="shopify-input w-full py-2.5 text-sm" placeholder="Material Name" value={newRecipeItem.materialName} onChange={e => setNewRecipeItem({...newRecipeItem, materialName: e.target.value})} />
                      <datalist id="bom-materials-recipe">{inventory.map(i => <option key={i.id} value={i.name} />)}</datalist>
                    </div>
                    <div className="w-28">
                      <input type="number" className="shopify-input w-full py-2.5 text-sm text-center" placeholder="Qty" value={newRecipeItem.quantity || ''} onChange={e => setNewRecipeItem({...newRecipeItem, quantity: Number(e.target.value)})} />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { 
                        if(newRecipeItem.materialName && newRecipeItem.quantity) { 
                          const mat = inventory.find(i=>i.name===newRecipeItem.materialName); 
                          setFormData(prev=>({...prev, recipe: [...(prev.recipe||[]), {materialName: newRecipeItem.materialName!, quantity: newRecipeItem.quantity!, unit: mat?.unit || 'MTR', wastagePercent: newRecipeItem.wastagePercent || 0, estimatedCost: mat?.pricePerUnit || 0}]})); 
                          setNewRecipeItem({materialName:'', quantity:0, wastagePercent:0}); 
                        } 
                      }} 
                      className="shopify-btn-primary px-5"
                    >
                      <Plus className="w-5 h-5"/>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                    {formData.recipe?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-950 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-shopify-text dark:text-slate-300 uppercase">{item.materialName}</p>
                          <p className="text-xs text-slate-500">{item.quantity} {item.unit} • <span className="text-rose-500">+{item.wastagePercent}% loss</span></p>
                        </div>
                        <div className="flex items-center gap-5">
                          <p className="text-sm font-bold text-shopify-text dark:text-slate-200 tabular-nums">{currency}{(item.quantity * (item.estimatedCost || 0) * (1 + (item.wastagePercent || 0)/100)).toFixed(2)}</p>
                          <button type="button" onClick={() => setFormData(prev => ({ ...prev, recipe: prev.recipe?.filter((_, i) => i !== idx) }))} className="text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Summary Matrix */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-8 border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="flex-1 flex flex-col sm:flex-row items-center gap-10">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Calculated Landed Cost</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-bold text-shopify-text dark:text-white tabular-nums">{currency}{Math.round(calculatedCosting.totalLanded).toLocaleString()}</span>
                      <span className="text-sm text-slate-500 uppercase font-bold">/ Piece</span>
                    </div>
                  </div>
                  <div className="flex gap-10 border-l border-slate-200 dark:border-slate-800 pl-10">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Material Base</p>
                      <p className="text-base font-bold text-slate-700 dark:text-slate-300">{currency}{Math.round(calculatedCosting.materialCost).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Process Loss</p>
                      <p className="text-base font-bold text-amber-600">{currency}{Math.round(calculatedCosting.processLossAmount).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-5 w-full flex-col md:flex-row md:w-auto">
                  <div className="flex gap-5 items-center w-full justify-between lg:justify-start flex-1">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 md:flex-none px-10 py-4 rounded-xl font-bold text-base bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white hover:bg-slate-50 transition-all">
                       Cancel
                     </button>
                     <button type="submit" className="flex-1 md:flex-none shopify-btn-primary px-12 py-4 text-base">
                       Save Recipe
                     </button>
                  </div>
                  {editingId && onAction && (
                     <div className="flex justify-end border-t border-slate-200 pt-4 md:pt-0 md:border-none w-full md:w-auto">
                        <button type="button" onClick={() => { onAction('CONVERT_TO_WORK_ORDER_FROM_RECIPE', formData); setIsModalOpen(false); }} className="w-full md:w-auto px-6 py-4 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-[14px] hover:bg-indigo-100 transition-all flex justify-center items-center gap-2">
                           Create Work Order
                        </button>
                     </div>
                  )}
                </div>
              </div>
            </div>
         </form>
      </BaseModal>
    </div>
  );
};

export default DesignRecipe;
