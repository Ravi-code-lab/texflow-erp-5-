import React, { useState, useMemo } from 'react';
import {
  Building,
  MapPin,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowLeft,
  Save,
  Trash2,
  List,
  ChevronLeft,
  ChevronRight,
  Check,
  Folder,
  File,
  ChevronDown,
} from "lucide-react";
import { Warehouse } from '../types';
import { toast } from "../utils/toast";

interface OfficesProps {
  warehouses: Warehouse[];
  onAdd: (warehouse: Warehouse) => void;
  onUpdate: (warehouse: Warehouse) => void;
  onDelete: (id: string) => void;
}

const Offices: React.FC<OfficesProps> = ({ warehouses, onAdd, onUpdate, onDelete }) => {
  const [viewMode, setViewMode] = useState<'TREE' | 'LIST' | 'FORM'>('TREE');
  const [filter, setFilter] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['ALL_WAREHOUSES']));
  
  const [formData, setFormData] = useState<Partial<Warehouse>>({ 
    type: 'Store', status: 'ACTIVE', isGroup: false
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedNodes);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedNodes(newSet);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (formData.id) {
      onUpdate(formData as Warehouse);
    } else {
      onAdd({ ...formData, id: `WH-${Date.now()}` } as Warehouse);
    }
    setViewMode('TREE');
  };

  const openForm = (w?: Warehouse, parentId?: string) => {
     if(w) {
         setFormData(w);
     } else {
         setFormData({ type: 'Store', status: 'ACTIVE', isGroup: false, parentWarehouse: parentId || '' });
     }
     setViewMode('FORM');
  };

  const handleDelete = (id: string) => {
      // Check if it has children
      const children = warehouses.filter(w => w.parentWarehouse === id);
      if (children.length > 0) {
          toast.error('Cannot delete a warehouse group that contains child warehouses.');
          return;
      }
      onDelete(id);
      setViewMode('TREE');
  };

  const renderTree = (parentId?: string, depth = 0) => {
      const nodes = warehouses.filter(w => (parentId ? w.parentWarehouse === parentId : !w.parentWarehouse));
      
      return nodes.map(node => {
          const hasChildren = warehouses.some(w => w.parentWarehouse === node.id);
          const isExpanded = expandedNodes.has(node.id) || depth < 2; // Auto expand first few depths
          
          return (
              <div key={node.id} className="flex flex-col">
                  <div 
                     className="flex items-center group px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-colors"
                     style={{ paddingLeft: `${depth * 28 + 16}px` }}
                     onClick={() => openForm(node)}
                  >
                      <div className="w-6 flex justify-center mr-1" onClick={(e) => hasChildren && toggleExpand(node.id, e)}>
                          {hasChildren ? (
                             isExpanded ? <ChevronDown className="w-4 h-4 text-slate-500 hover:text-indigo-600 transition-colors" /> : <ChevronRight className="w-4 h-4 text-slate-500 hover:text-indigo-600 transition-colors" />
                          ) : (
                             node.isGroup ? <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" /> : <span className="w-4" />
                          )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                          {node.isGroup ? <Folder className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> : <File className="w-4 h-4 text-slate-400 dark:text-slate-500" />}
                          <span className={`${node.isGroup ? 'font-bold tracking-tight text-slate-800 dark:text-slate-200' : 'font-medium text-slate-700 dark:text-slate-300'} text-[13px] uppercase`}>{node.name}</span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
                           <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">{node.type}</span>
                           {node.isGroup && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); openForm(undefined, node.id); }}
                                 className="text-[10px] font-bold tracking-widest uppercase text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                               >
                                  Add Child
                               </button>
                           )}
                      </div>
                  </div>
                  {isExpanded && hasChildren && (
                      <div className="flex flex-col border-l border-slate-100/50 dark:border-slate-800/50 ml-6">
                          {renderTree(node.id, depth + 1)}
                      </div>
                  )}
              </div>
          );
      });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
       {viewMode === 'TREE' && (
           <div className="flex flex-col h-full animate-fade-in">
             <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20">
                <div className="flex justify-between items-center h-8">
                   <div className="flex items-center gap-3">
                      <Building className="w-5 h-5 text-indigo-600" />
                      <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Warehouse Tree</h2>
                   </div>
                   <div className="flex items-center gap-2">
                      <button onClick={() => openForm()} className="h-8 px-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-sm transition-all">
                         <Plus className="w-4 h-4" />
                         NEW WAREHOUSE
                      </button>
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-auto p-6 pb-16">
                <div className="bg-white dark:bg-slate-900 border md:max-w-4xl border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col py-2 min-h-[400px]">
                   {warehouses.length === 0 ? (
                       <div className="px-4 py-16 flex flex-col items-center justify-center flex-1">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                               <Building className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                           </div>
                           <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-6 uppercase tracking-widest">No warehouses configured</p>
                           <button onClick={() => {
                               const root: any = { id: `WH-ROOT`, name: 'All Warehouses', isGroup: true, type: 'Virtual', status: 'ACTIVE' };
                               onAdd(root as Warehouse);
                           }} className="h-9 px-5 flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-500 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold shadow-sm transition-all">
                               <Plus className="w-4 h-4" /> INITIALIZE ROOT WAREHOUSE
                           </button>
                       </div>
                   ) : (
                       renderTree()
                   )}
                </div>
             </div>
           </div>
       )}
       
       {viewMode === 'FORM' && (
          <div className="flex flex-col h-full animate-fade-in shadow-lg">
             <div className="flex-none bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('TREE')} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight truncate max-w-lg">
                        {formData.id ? formData.name : 'New Warehouse'}
                     </span>
                     {formData.id && (
                        <span className={`px-2 py-0.5 mx-2 rounded text-[10px] font-bold tracking-widest uppercase border ${formData.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                            {formData.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                        </span>
                     )}
                  </div>
                  <div className="flex items-center gap-3">
                     {formData.id && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleDelete(formData.id!); }} 
                            className="h-8 px-4 flex items-center gap-2 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:hover:border-rose-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            DELETE
                         </button>
                     )}
                     <button onClick={handleSave} className="h-8 px-5 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 border border-transparent text-white rounded-lg text-xs font-bold shadow-md transition-all">
                        <Check className="w-4 h-4" />
                        SAVE
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-6 pb-20 flex justify-center">
                 <form id="wh-form" onSubmit={handleSave} className="w-full max-w-3xl space-y-6">
                     <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm p-8 text-sm">
                         <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                             <h4 className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">Store Configuration</h4>
                             <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest cursor-pointer select-none group">
                                 <input type="checkbox" checked={formData.isGroup || false} onChange={e => setFormData({...formData, isGroup: e.target.checked})} className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-50 dark:bg-slate-800 transition-colors" />
                                 <span className="group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">Is Group Node</span>
                             </label>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                            <div className="space-y-6">
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Warehouse Name <span className="text-rose-500">*</span></label>
                                    <input 
                                      required
                                      value={formData.name || ''} 
                                      onChange={e => setFormData({...formData, name: e.target.value})}
                                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-white font-bold"
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Parent Warehouse Node</label>
                                    <select 
                                       value={formData.parentWarehouse || ''} 
                                       onChange={e => setFormData({...formData, parentWarehouse: e.target.value})}
                                       className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-200 uppercase text-xs"
                                    >
                                        <option value="">-- NO PARENT (ROOT NODE) --</option>
                                        {warehouses.filter(w => w.isGroup && w.id !== formData.id).map(w => (
                                            <option key={w.id} value={w.id}>{w.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Role Type</label>
                                    <select 
                                       value={formData.type || 'Store'} 
                                       onChange={e => setFormData({...formData, type: e.target.value as any})}
                                       className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-200 uppercase text-xs"
                                    >
                                        <option value="Store">STORE</option>
                                        <option value="Manufacturing">MANUFACTURING</option>
                                        <option value="Transit">TRANSIT</option>
                                        <option value="Virtual">VIRTUAL</option>
                                        <option value="Storage">STORAGE GODOWN</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Warehouse Manager</label>
                                    <input 
                                      value={formData.manager || ''} 
                                      onChange={e => setFormData({...formData, manager: e.target.value})}
                                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-bold"
                                      placeholder="e.g. KARAN MEHTA"
                                    />
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Operational Status</label>
                                    <select 
                                       value={formData.status || 'ACTIVE'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-bold text-slate-800 dark:text-slate-200 uppercase text-xs"
                                    >
                                        <option value="ACTIVE">ENABLED (ACTIVE)</option>
                                        <option value="INACTIVE">DISABLED (INACTIVE)</option>
                                    </select>
                                </div>
                                <div className="space-y-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Physical Address Line</label>
                                    <textarea 
                                      value={formData.address || ''} 
                                      onChange={e => setFormData({...formData, address: e.target.value})}
                                      rows={2}
                                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 dark:text-slate-200 font-medium font-mono text-xs"
                                    />
                                </div>
                            </div>
                         </div>
                     </div>
                     <button type="submit" form="wh-form" className="hidden">Submit hidden</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Offices;
