
import React, { useState, useMemo } from 'react';
import { InventoryItem, MaterialType, Unit } from '../types';
import { 
  Plus, Search, Edit2, Package, 
  MapPin, AlertTriangle, Download, 
  LayoutGrid, List, Trash2, Database,
  TrendingUp, Hash, ArrowUpRight, Boxes, IndianRupee, Tag, X, Check
} from 'lucide-react';
import BaseModal from './BaseModal';

interface OpeningStockProps {
  items: InventoryItem[];
  onAdd: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete?: (id: string) => void;
  currency?: string;
}

const OpeningStock: React.FC<OpeningStockProps> = ({ 
  items, onAdd, onUpdate, onDelete, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const [formData, setFormData] = useState<Partial<InventoryItem>>({ 
    type: MaterialType.FABRIC, quantity: 0, minStockLevel: 0, pricePerUnit: 0, 
    unit: 'METER', taxRate: 5, location: 'MAIN GODOWN', tags: []
  });

  // Extract unique tags from all inventory items
  const allAvailableTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredItems = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (items || []).filter(i => {
      const iName = (i.name || '').toLowerCase();
      const iId = (i.id || '').toLowerCase();
      const iLoc = (i.location || '').toLowerCase();
      const searchMatch = iName.includes(searchLower) || iId.includes(searchLower) || iLoc.includes(searchLower);
      const tabMatch = activeTab === 'ALL' || i.type === activeTab;
      const tagMatch = selectedTags.length === 0 || selectedTags.every(t => (i.tags || []).includes(t));
      return searchMatch && tabMatch && tagMatch;
    });
  }, [items, filter, activeTab, selectedTags]);

  const stats = useMemo(() => {
    const totalValuation = items.reduce((sum, i) => sum + (i.quantity * i.pricePerUnit), 0);
    const lowStock = items.filter(i => i.quantity <= i.minStockLevel).length;
    return { totalValuation, lowStock };
  }, [items]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const item = { 
      ...formData, 
      id: editingId || `INV-${Date.now().toString().slice(-6)}`,
      updatedAt: new Date().toISOString() 
    } as InventoryItem;

    if (editingId) onUpdate(item);
    else onAdd(item);
    
    setIsModalOpen(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setFormData(item);
    setIsModalOpen(true);
  };

  const addTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
        e.preventDefault();
        const newTag = tagInput.trim().toUpperCase();
        if (!formData.tags?.includes(newTag)) {
            setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), newTag] }));
        }
        setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags?.filter(t => t !== tag) }));
  };

  return (
    <div className="space-y-6 h-full flex flex-col bg-[#f8fafc] dark:bg-slate-950 -m-8 p-8 animate-fade-in font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 dark:bg-slate-700 rounded-lg text-white">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Stock Registry</h2>
            <p className="text-xs text-slate-500 font-medium">Opening balance and Godown inventory master</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4"/> Export
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ type: MaterialType.FABRIC, quantity: 0, minStockLevel: 0, pricePerUnit: 0, unit: 'METER', taxRate: 5, location: 'MAIN GODOWN', tags: [] });
              setIsModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-lg">
                  <Database className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Inventory Value</p>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{currency}{stats.totalValuation.toLocaleString()}</h3>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
                  <AlertTriangle className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Low Stock</p>
                  <h3 className={`text-lg font-bold tabular-nums ${stats.lowStock > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.lowStock} Alerts</h3>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                  <Boxes className="w-5 h-5"/>
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total SKUs</p>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{items.length}</h3>
              </div>
          </div>
      </div>

      {/* Main Workspace */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden flex-1">
          
          <div className="px-6 border-b border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex justify-between items-center">
                <div className="flex gap-8 overflow-x-auto no-scrollbar">
                    {['ALL', 'FABRIC', 'YARN', 'ACCESSORY', 'DYE'].map(t => (
                        <button 
                            key={t} 
                            onClick={() => setActiveTab(t)} 
                            className={`py-4 px-1 text-xs font-bold border-b-2 transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List className="w-4 h-4"/></button>
                    <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4"/></button>
                </div>
              </div>

              {/* Tag Selection Cloud */}
              {allAvailableTags.length > 0 && (
                <div className="flex items-center gap-3 py-3 overflow-x-auto no-scrollbar border-t border-slate-100 dark:border-slate-800">
                    <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="flex gap-2">
                        {allAvailableTags.map(tag => (
                            <button 
                                key={tag} 
                                onClick={() => toggleTagFilter(tag)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                    {selectedTags.length > 0 && (
                        <button onClick={() => setSelectedTags([])} className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline ml-2">Clear</button>
                    )}
                </div>
              )}
          </div>

          <div className="p-3 border-b flex items-center gap-3">
              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-9 pr-4 py-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20" 
                    placeholder="Search by SKU or Name..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)}
                  />
              </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {viewMode === 'LIST' ? (
                  <table className="w-full text-left border-collapse text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                          <tr>
                              <th className="p-4">Material Artifact</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Location</th>
                              <th className="p-4 text-right">Magnitude</th>
                              <th className="p-4 text-right">Rate</th>
                              <th className="p-4 text-right">Valuation</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredItems.map(item => (
                              <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                  <td className="p-4">
                                      <p className="font-bold text-slate-700 dark:text-white uppercase truncate">{item.name}</p>
                                      <p className="text-[10px] font-mono text-slate-400 tracking-tighter">#{item.id}</p>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase w-fit">{item.type}</span>
                                        <div className="flex flex-wrap gap-1">
                                            {item.tags?.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-[8px] font-black text-indigo-400 uppercase">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                  </td>
                                  <td className="p-4 font-medium text-slate-500 uppercase text-xs">{item.location}</td>
                                  <td className="p-4 text-right font-bold text-slate-700 dark:text-slate-300 tabular-nums">{item.quantity} {item.unit}</td>
                                  <td className="p-4 text-right text-slate-500 tabular-nums">{currency}{item.pricePerUnit}</td>
                                  <td className="p-4 text-right font-black text-slate-900 dark:text-white tabular-nums">{currency}{(item.quantity * item.pricePerUnit).toLocaleString()}</td>
                                  <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button onClick={() => handleEdit(item)} className="p-1.5 text-slate-400 hover:text-indigo-600 border rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                                          <button onClick={() => onDelete?.(item.id)} className="p-1.5 text-slate-400 hover:text-red-600 border rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                                      </div>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                      {filteredItems.map(item => (
                          <div 
                              key={item.id} 
                              onClick={() => handleEdit(item)}
                              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 cursor-pointer group"
                          >
                              <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                      <h4 className="font-bold text-slate-800 dark:text-white uppercase truncate text-sm">{item.name}</h4>
                                      <p className="text-[10px] font-mono text-slate-400">ID: {item.id}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${item.quantity <= item.minStockLevel ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                      {item.quantity <= item.minStockLevel ? 'Critical' : item.type}
                                  </span>
                              </div>

                              {/* Tags Pills */}
                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {item.tags.map(t => (
                                        <span key={t} className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/20 text-[8px] font-black text-indigo-600 dark:text-indigo-400 uppercase border border-indigo-100 dark:border-indigo-800">{t}</span>
                                    ))}
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Quantity</p>
                                      <p className="font-black text-slate-800 dark:text-white tabular-nums">{item.quantity} {item.unit}</p>
                                  </div>
                                  <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                      <p className="text-[9px] text-slate-400 uppercase font-bold mb-0.5">Valuation</p>
                                      <p className="font-black text-indigo-600 tabular-nums">{currency}{(item.quantity * item.pricePerUnit).toLocaleString()}</p>
                                  </div>
                              </div>

                              <div className="mt-auto flex justify-between items-center text-[10px] font-medium text-slate-400 uppercase tracking-widest pt-2 border-t border-slate-50 dark:border-slate-800">
                                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.location}</span>
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                      <Edit2 className="w-3.5 h-3.5 text-indigo-500"/>
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500"/>
                                  </span>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>

      {/* Entry Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Stock Item" : "Register Opening Stock"} size="lg">
          <form onSubmit={handleSave} className="space-y-6 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Description</label>
                      <input required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold uppercase bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} placeholder="e.g. COTTON 40S COMBED YARN" />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Initial Quantity</label>
                    <input type="number" required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none" value={formData.quantity || ''} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase Rate ({currency})</label>
                    <input type="number" required className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none" value={formData.pricePerUnit || ''} onChange={e => setFormData({...formData, pricePerUnit: Number(e.target.value)})} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                    <select className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                        <option value="FABRIC">Fabric</option>
                        <option value="YARN">Yarn</option>
                        <option value="ACCESSORY">Trims / Accessory</option>
                        <option value="DYE">Dyes / Chemicals</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Unit</label>
                    <select className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 font-bold" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value as any})}>
                        <option value="METER">Meter</option>
                        <option value="KG">Kilogram</option>
                        <option value="PIECE">Piece</option>
                        <option value="BOX">Box</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Warehouse Location</label>
                    <input className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-bold uppercase bg-white dark:bg-slate-800" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Alert Level</label>
                    <input type="number" className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800" value={formData.minStockLevel || ''} onChange={e => setFormData({...formData, minStockLevel: Number(e.target.value)})} />
                  </div>
              </div>

              {/* Tags Management */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-2"><Tag className="w-3.5 h-3.5"/> Material Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags?.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-100 dark:border-indigo-800/50">
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-rose-500"><X className="w-3 h-3"/></button>
                        </span>
                    ))}
                </div>
                <input 
                    className="w-full border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-sm font-medium bg-slate-50 dark:bg-slate-900 outline-none focus:ring-1 focus:ring-indigo-500 shadow-inner" 
                    placeholder="Type a tag and press Enter..." 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                />
              </div>

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 z-[110] rounded-b-xl shadow-lg px-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 transition-colors uppercase">Cancel</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase flex items-center gap-2">
                    <Check className="w-4 h-4"/> Commit Stock
                </button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default OpeningStock;
