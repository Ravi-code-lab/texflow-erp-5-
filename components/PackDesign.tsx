
import React, { useState, useMemo } from 'react';
import { Design, Pack, PackItem } from '../types';
import { 
  Archive, Plus, Search, Package, Edit2, 
  Trash2, List, LayoutGrid, Download, Printer,
  Check, X, Calculator, Box, Tag, Info
} from 'lucide-react';
import BaseModal from './BaseModal';

interface PackDesignProps {
  designs: Design[];
  packs?: Pack[];
  onAddPack?: (pack: Pack) => void;
  onUpdatePack?: (pack: Pack) => void;
  onDeletePack?: (id: string) => void;
  currency?: string;
}

const PackDesign: React.FC<PackDesignProps> = ({ 
  designs, packs = [], onAddPack, onUpdatePack, onDeletePack, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Pack>>({
    name: '', sku: '', designId: '', items: [], status: 'ACTIVE', weight: 0
  });

  const filteredPacks = useMemo(() => {
    return packs.filter(p => {
      const searchLower = filter.toLowerCase();
      const name = p.name || '';
      const sku = p.sku || '';
      const matchesSearch = name.toLowerCase().includes(searchLower) || sku.toLowerCase().includes(searchLower);
      const matchesTab = activeTab === 'ALL' || p.status === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [packs, filter, activeTab]);

  const handleDesignSelect = (designId: string) => {
    const design = designs.find(d => d.id === designId);
    if (!design) return;

    const packItems: PackItem[] = (design.variants || []).map(v => ({
      variantId: v.id,
      variantTitle: v.title,
      quantity: 1,
      rate: v.price || design.processCostPerPiece || 0
    }));

    setFormData({
      ...formData,
      designId: design.id,
      designName: design.name,
      sku: `${design.sku}-SET`,
      items: packItems
    });
  };

  const updateItemQuantity = (variantId: string, qty: number) => {
    const updatedItems = (formData.items || []).map(item => 
      item.variantId === variantId ? { ...item, quantity: Math.max(0, qty) } : item
    );
    setFormData({ ...formData, items: updatedItems });
  };

  const totals = useMemo(() => {
    const qty = (formData.items || []).reduce((sum, item) => sum + item.quantity, 0);
    const price = (formData.items || []).reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    return { qty, price };
  }, [formData.items]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.designId) return;

    const pack: Pack = {
      id: editingId || `PACK-${Date.now()}`,
      name: formData.name!,
      designId: formData.designId!,
      designName: formData.designName!,
      sku: formData.sku!,
      items: formData.items as PackItem[],
      totalQuantity: totals.qty,
      totalPrice: totals.price,
      weight: formData.weight,
      status: formData.status as 'ACTIVE' | 'ARCHIVED',
      updatedAt: new Date().toISOString()
    } as Pack;

    if (editingId && onUpdatePack) onUpdatePack(pack);
    else onAddPack?.(pack);
    
    setIsModalOpen(false);
  };

  const handleEdit = (pack: Pack) => {
    setEditingId(pack.id);
    setFormData(pack);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Standard Clean Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Set / Combo Manager</h2>
          <p className="text-xs text-slate-500 font-medium">Manage product bundles and assorted sets</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 border-slate-200 dark:border-slate-800 shadow-sm">
            <Download className="w-4 h-4"/> Export
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ name: '', sku: '', designId: '', items: [], status: 'ACTIVE' });
              setIsModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> New Pack
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          {/* Tabs & Controls */}
          <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    {['ALL', 'ACTIVE', 'ARCHIVED'].map(t => (
                      <button 
                        key={t}
                        onClick={() => setActiveTab(t)} 
                        className={`px-3 py-1 rounded text-xs font-bold transition-all uppercase ${activeTab === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                      >
                        {t}
                      </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20 w-48 sm:w-64 shadow-inner" 
                      placeholder="Search packs..." 
                      value={filter} 
                      onChange={e => setFilter(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List className="w-4 h-4"/></button>
                  <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4"/></button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {viewMode === 'LIST' ? (
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                        <tr>
                          <th className="p-4">Pack Name</th>
                          <th className="p-4">Base Design</th>
                          <th className="p-4">SKU</th>
                          <th className="p-4 text-center">Items</th>
                          <th className="p-4 text-right">Total Value</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPacks.map(pack => (
                            <tr key={pack.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => handleEdit(pack)}>
                                <td className="p-4 font-bold text-slate-800 dark:text-white uppercase truncate max-w-xs">{pack.name}</td>
                                <td className="p-4 font-medium text-slate-500 uppercase">{pack.designName}</td>
                                <td className="p-4 font-mono text-xs text-slate-400">#{pack.sku}</td>
                                <td className="p-4 text-center font-bold text-slate-700 dark:text-slate-300 tabular-nums">{pack.totalQuantity} Pcs</td>
                                <td className="p-4 text-right font-black text-emerald-600 tabular-nums">{currency}{pack.totalPrice.toLocaleString()}</td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={(e) => { e.stopPropagation(); handleEdit(pack); }} className="p-1.5 text-slate-400 hover:text-indigo-600 border rounded-lg transition-colors shadow-sm"><Edit2 className="w-4 h-4"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeletePack?.(pack.id); }} className="p-1.5 text-slate-400 hover:text-red-600 border rounded-lg transition-colors shadow-sm"><Trash2 className="w-4 h-4"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredPacks.length === 0 && (
                            <tr>
                                <td colSpan={6} className="p-20 text-center text-slate-400 italic">No combos found. Create your first set to get started.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                   {filteredPacks.map(pack => (
                      <div key={pack.id} onClick={() => handleEdit(pack)} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer">
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono text-slate-400">#{pack.sku}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${pack.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{pack.status}</span>
                         </div>
                         <h4 className="font-bold text-slate-800 dark:text-white uppercase truncate">{pack.name}</h4>
                         <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800 pt-3 mt-1">
                            <div>
                               <p className="text-[10px] text-slate-400 uppercase font-bold">{pack.totalQuantity} Pcs</p>
                               <p className="text-base font-black text-indigo-600 tabular-nums">{currency}{pack.totalPrice.toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{pack.designName}</span>
                         </div>
                      </div>
                   ))}
                   {filteredPacks.length === 0 && (
                       <div className="col-span-full py-20 text-center text-slate-400 italic">No combos found.</div>
                   )}
                </div>
              )}
          </div>
      </div>

      {/* Standard Pack Entry Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Pack Details" : "Create New Pack"} size="lg">
          <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pack Label / Name</label>
                      <input required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500 uppercase" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="e.g. SUMMER COMBO SET" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base Design</label>
                      <select required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none font-bold uppercase" value={formData.designId} onChange={e => handleDesignSelect(e.target.value)}>
                          <option value="">Select Catalog Design...</option>
                          {designs.map(d => <option key={d.id} value={d.id}>{d.name} ({d.sku})</option>)}
                      </select>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pack SKU Code</label>
                      <input required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 font-mono outline-none uppercase" value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value.toUpperCase()})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Est. Weight (kg)</label>
                      <input type="number" className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none tabular-nums" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
                  </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-950 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 uppercase">Constituent Items</div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 font-bold uppercase border-b border-slate-100 dark:border-slate-800">
                              <tr>
                                  <th className="p-3">Variant Shard</th>
                                  <th className="p-3 text-right">Individual Rate</th>
                                  <th className="p-3 text-center">Qty in Pack</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(formData.items || []).map((item, idx) => (
                                  <tr key={idx}>
                                      <td className="p-3 font-bold text-slate-700 dark:text-slate-300 uppercase">{item.variantTitle}</td>
                                      <td className="p-3 text-right font-medium text-slate-500 tabular-nums">{currency}{item.rate}</td>
                                      <td className="p-2 text-center">
                                          <input type="number" className="w-20 border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 text-center text-sm font-black bg-white dark:bg-slate-800" value={item.quantity} onChange={e => updateItemQuantity(item.variantId, Number(e.target.value))} />
                                      </td>
                                  </tr>
                              ))}
                              {(formData.items || []).length === 0 && (
                                  <tr><td colSpan={3} className="p-10 text-center text-slate-400 italic">Select a base design to load variants.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex justify-between items-center shadow-inner border border-slate-200 dark:border-slate-700">
                  <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Total Payload</p>
                      <h3 className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{totals.qty} Units</h3>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Set Valuation</p>
                      <h3 className="text-xl font-black text-emerald-600 tabular-nums">{currency}{totals.price.toLocaleString()}</h3>
                  </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase">Save Pack Spec</button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default PackDesign;
