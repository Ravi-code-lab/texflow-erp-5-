
import React, { useState, useMemo } from 'react';
// Removed non-existent JobWorkMaterial from the import list below
import { JobWork, JobWorkItem, JobWorkSuppliedItem, Design, InventoryItem, Unit } from '../types';
import { 
  Truck, ArrowRight, Printer, Search, Plus, 
  FlaskConical, PenTool, Sparkles, LayoutGrid, List, 
  Target, Gauge, Clock, Receipt, Check, Trash2, Download,
  Package, Info, Zap, ShieldCheck, BadgeCheck, Box, X,
  ArrowDownLeft, Scale, FlaskRound, Scissors, ArrowUpRight
} from 'lucide-react';
import BaseModal from './BaseModal';
import ProductImageThumb, { resolveProductImage } from './ProductImageThumb';

interface JobWorkProps {
  jobs: JobWork[];
  designs?: Design[];
  inventory?: InventoryItem[];
  onAdd: (job: JobWork) => void;
  onUpdate?: (job: JobWork) => void; 
  onDelete?: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const PROCESS_NODES = [
  { id: 'DYEING', label: 'Dyeing & Bleach', icon: FlaskConical, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-950/20', border: 'border-indigo-100' },
  { id: 'PRINTING', label: 'Rotary/Digital/Block', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100' },
  { id: 'EMBROIDERY', label: 'Schiffli/Machine/Hand', icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', border: 'border-pink-100' },
  { id: 'HANDWORK', label: 'Zardosi/Aari/Bead', icon: Target, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', border: 'border-rose-100' },
  { id: 'WASHING', label: 'Washing/Dry Clean', icon: FlaskRound, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/20', border: 'border-cyan-100' },
  { id: 'CUTTING', label: 'Cutting Unit', icon: Scissors, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-100' },
  { id: 'STITCHING', label: 'Stitching Unit', icon: PenTool, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-100' },
  { id: 'FINISHING', label: 'Finishing & Pressing', icon: BadgeCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100' },
  { id: 'PACKING', label: 'Packing & Labeling', icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-100' }
];

const JobWorkComp: React.FC<JobWorkProps> = ({ 
  jobs, designs = [], inventory = [], onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('GRID');
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<JobWork>>({ 
    process: 'DYEING', status: 'ISSUED', items: [], suppliedItems: [], paymentStatus: 'UNPAID',
    issueDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });
  
  const [itemInput, setItemInput] = useState<Partial<JobWorkItem>>({ description: '', issuedQuantity: 0, receivedQuantity: 0, rate: 0, unit: Unit.METER });
  const [suppliedItemInput, setSuppliedItemInput] = useState<Partial<JobWorkSuppliedItem>>({ productName: '', quantity: 0, unit: 'METER' });

  // Logic to calculate material consumption shards
  const calculateConsumption = (issued: number, received: number) => {
    const wastage = issued - received;
    const ratio = issued > 0 ? (received / issued) * 100 : 0;
    return { wastage, ratio };
  };

  const filteredJobs = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (jobs || []).filter(j => {
      const challanNum = (j.challanNumber || '').toLowerCase();
      const vName = (j.vendorName || '').toLowerCase();
      const searchMatch = challanNum.includes(searchLower) || vName.includes(searchLower);
      const tabMatch = activeTab === 'ALL' || j.status === activeTab;
      return searchMatch && tabMatch;
    });
  }, [jobs, filter, activeTab]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendorName || !formData.items?.length) return;

    const totalCost = (formData.items || []).reduce((sum, item) => sum + (item.receivedQuantity * item.rate), 0);
    const jobData: JobWork = {
      id: editingId || `JW-${Date.now()}`,
      challanNumber: formData.challanNumber || `CH-${Date.now().toString().slice(-4)}`,
      vendorName: formData.vendorName!,
      process: formData.process!,
      issueDate: formData.issueDate!,
      expectedDate: formData.expectedDate!,
      status: formData.status || 'ISSUED',
      items: formData.items || [],
      totalCost,
      paymentStatus: formData.paymentStatus || 'UNPAID',
      updatedAt: new Date().toISOString()
    };

    if (editingId) onUpdate?.(jobData);
    else onAdd(jobData);
    
    setIsModalOpen(false);
  };

  const addItem = () => {
    if(itemInput.description) {
        setFormData(prev => ({ 
            ...prev, 
            items: [...(prev.items || []), { 
                ...itemInput, 
                quantity: itemInput.issuedQuantity || 0,
                wastagePercent: 0,
                rejectedQuantity: 0, 
                receiptHistory: [] 
            } as JobWorkItem] 
        }));
        setItemInput({ description: '', issuedQuantity: 0, receivedQuantity: 0, rate: 0, unit: Unit.METER });
    }
  };

  const removeItem = (idx: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(idx, 1);
    setFormData({ ...formData, items: updated });
  };

  const addSuppliedItem = () => {
      if(suppliedItemInput.productName && suppliedItemInput.quantity && suppliedItemInput.quantity > 0) {
          setFormData(prev => ({
              ...prev,
              suppliedItems: [...(prev.suppliedItems || []), { ...suppliedItemInput } as JobWorkSuppliedItem]
          }));
          setSuppliedItemInput({ productName: '', quantity: 0, unit: 'METER' });
      }
  };

  const removeSuppliedItem = (idx: number) => {
      const updated = [...(formData.suppliedItems || [])];
      updated.splice(idx, 1);
      setFormData({ ...formData, suppliedItems: updated });
  };

  return (
    <div className="space-y-6 h-full flex flex-col bg-[#f0f2f5] dark:bg-slate-950 -m-8 p-8 animate-fade-in">
      
      {/* Nexus Style Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Subcontracting Orders</h2>
          <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-bold">External Vendor Operations & Subcontracting Reconciliation</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
            <Scale className="w-4 h-4"/> Reconciliation Hub
          </button>
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ 
                process: 'DYEING', status: 'ISSUED', items: [], paymentStatus: 'UNPAID',
                issueDate: new Date().toISOString().split('T')[0],
                expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
              });
              setIsModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> New Subcontract Order
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden flex-1">
          <div className="px-6 border-b border-slate-100 dark:border-slate-800 bg-[#fafafa] dark:bg-slate-900/50">
              <div className="flex gap-8 overflow-x-auto no-scrollbar">
                  {['ALL', 'ISSUED', 'RECEIVED', 'CANCELLED'].map(t => (
                      <button 
                        key={t} 
                        onClick={() => setActiveTab(t)} 
                        className={`py-4 px-1 text-xs font-bold border-b-2 transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                      >
                        {t}
                      </button>
                  ))}
              </div>
          </div>

          <div className="p-3 border-b flex items-center gap-3 bg-white dark:bg-slate-900">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border">
                  <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><List className="w-4 h-4"/></button>
                  <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4"/></button>
              </div>

              <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20" 
                    placeholder="Search Challan / Vendor..." 
                    value={filter} 
                    onChange={e => setFilter(e.target.value)}
                  />
              </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              {viewMode === 'LIST' ? (
                  <table className="w-full text-left border-collapse">
                      <thead className="bg-[#fafafa] dark:bg-slate-950 text-slate-500 font-bold border-b text-[10px] uppercase tracking-wider sticky top-0 z-10">
                          <tr>
                              <th className="p-4 w-12 text-center">Node</th>
                              <th className="p-4">Vendor Entity</th>
                              <th className="p-4">Process</th>
                              <th className="p-4 text-right">Issued</th>
                              <th className="p-4 text-right">Received</th>
                              <th className="p-4 text-center">Yield %</th>
                              <th className="p-4 text-right">Actions</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredJobs.map(job => {
                             const totalIssued = job.items.reduce((s,i)=>s+i.issuedQuantity, 0);
                             const totalRecv = job.items.reduce((s,i)=>s+i.receivedQuantity, 0);
                             const yieldRatio = totalIssued > 0 ? (totalRecv / totalIssued) * 100 : 0;
                             
                             const firstItemDescription = job.items[0]?.description;
                             const imageUrl = resolveProductImage(firstItemDescription, designs, inventory);
                             const processNode = PROCESS_NODES.find(n => n.id === job.process);

                             return (
                                <tr key={job.id} onClick={() => { setEditingId(job.id); setFormData(job); setIsModalOpen(true); }} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer group transition-all h-16">
                                    <td className="p-3 text-center">
                                        <div className={`w-10 h-10 rounded-lg ${processNode?.bg || 'bg-indigo-50 dark:bg-indigo-900/20'} flex items-center justify-center overflow-hidden border ${processNode?.border || 'border-slate-200 dark:border-slate-700'}`}>
                                            {imageUrl ? (
                                              <img src={imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              processNode ? <processNode.icon className={`w-5 h-5 ${processNode.color}`} /> : <FlaskRound className="w-5 h-5 text-indigo-500" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">

                                        <p className="font-bold text-slate-700 dark:text-white uppercase text-sm">{job.vendorName}</p>
                                        <span className="text-[10px] font-mono text-slate-400">#{job.challanNumber}</span>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border bg-slate-50 dark:bg-slate-800 text-indigo-600">
                                            {job.process}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-black text-slate-700 dark:text-slate-300 tabular-nums">
                                        {totalIssued} {job.items[0]?.unit}
                                    </td>
                                    <td className="p-4 text-right font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                                        {totalRecv} {job.items[0]?.unit}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-[10px] font-black ${yieldRatio < 95 ? 'text-rose-500' : 'text-emerald-600'}`}>{yieldRatio.toFixed(1)}%</span>
                                            <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${yieldRatio < 95 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{width:`${yieldRatio}%`}}></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                            <button className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"><Printer className="w-4 h-4"/></button>
                                        </div>
                                    </td>
                                </tr>
                             );
                          })}
                      </tbody>
                  </table>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                      {filteredJobs.map(job => {
                          const totalIssued = job.items.reduce((s,i)=>s+i.issuedQuantity, 0);
                          const totalRecv = job.items.reduce((s,i)=>s+i.receivedQuantity, 0);
                          const yieldRatio = totalIssued > 0 ? (totalRecv / totalIssued) * 100 : 0;
                          
                          const firstItemDescription = job.items[0]?.description;
                          const imageUrl = resolveProductImage(firstItemDescription, designs, inventory);

                          return (
                            <div 
                                key={job.id} 
                                onClick={() => { setEditingId(job.id); setFormData(job); setIsModalOpen(true); }}
                                className="bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all group flex flex-col h-[380px] cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-4">
                                   <div>
                                      <p className={`text-[10px] font-black uppercase tracking-widest ${PROCESS_NODES.find(n => n.id === job.process)?.color || 'text-indigo-500'}`}>{PROCESS_NODES.find(n => n.id === job.process)?.label || job.process}</p>
                                      <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase truncate mt-1">{job.vendorName}</h3>
                                   </div>
                                   <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${job.status === 'ISSUED' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>{job.status}</div>
                                </div>
                                
                                {imageUrl && (
                                  <div className="w-full aspect-video rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 mb-4 bg-slate-50 dark:bg-slate-950">
                                     <img src={imageUrl} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                                  </div>
                                )}

                                <div className="flex-1 flex flex-col justify-center items-center gap-2">
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Material Yield</p>
                                   <div className="relative w-24 h-24 flex items-center justify-center">
                                      <svg className="w-full h-full transform -rotate-90">
                                         <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                         <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * yieldRatio) / 100} className={`${yieldRatio < 95 ? 'text-rose-500' : 'text-emerald-500'} transition-all duration-1000`} />
                                      </svg>
                                      <span className="absolute text-sm font-black dark:text-white">{yieldRatio.toFixed(0)}%</span>
                                   </div>
                                </div>

                                <div className="pt-4 border-t flex justify-between items-end mt-auto">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Recv/Issue</span>
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 tabular-nums">{totalRecv}/{totalIssued}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">Status</span>
                                        <span className="text-[10px] font-black text-indigo-600 uppercase">#{job.challanNumber}</span>
                                    </div>
                                </div>
                            </div>
                          );
                      })}
                  </div>
              )}
          </div>
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? `Reconciliation: ${formData.challanNumber}` : "Initialize Reconciliation Challan"} size="xl">
          <div className="flex flex-col lg:flex-row gap-8 pb-24">
              
              <div className="flex-1 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest px-1">Vendor Partner Node</label>
                          <input required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500" value={formData.vendorName || ''} onChange={e => setFormData({...formData, vendorName: e.target.value.toUpperCase()})} placeholder="E.G. SURAT PRINTING WORKS" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest px-1">Authorized Ingress (Issue)</label>
                        <input type="date" required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-slate-50/50 dark:bg-slate-950 outline-none" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest px-1">Target Egress (Expected)</label>
                        <input type="date" required className="w-full border dark:border-slate-700 rounded-xl p-3 text-sm font-bold bg-slate-50/50 dark:bg-slate-950 outline-none" value={formData.expectedDate} onChange={e => setFormData({...formData, expectedDate: e.target.value})} />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Supplied Items */}
                      <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner flex flex-col">
                          <h4 className="text-[10px] font-black tracking-widest text-slate-500 uppercase border-b pb-2 mb-3 flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5"/> Supplied Materials (BOM)</h4>
                          <div className="grid grid-cols-12 gap-1.5 mb-3">
                              <input className="col-span-6 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 outline-none" placeholder="RM/Fabric SKU..." value={suppliedItemInput.productName} onChange={e => setSuppliedItemInput({...suppliedItemInput, productName: e.target.value})} />
                              <input type="number" className="col-span-3 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-center bg-white dark:bg-slate-900 outline-none" placeholder="Qty" value={suppliedItemInput.quantity || ''} onChange={e => setSuppliedItemInput({...suppliedItemInput, quantity: Number(e.target.value)})} />
                              <button type="button" onClick={addSuppliedItem} className="col-span-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold tracking-wider hover:bg-slate-300 transition-colors uppercase">Add</button>
                          </div>
                          <div className="space-y-1.5 overflow-y-auto max-h-[200px] flex-1">
                              {formData.suppliedItems?.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                                      <div className="font-bold text-slate-700 dark:text-slate-300 uppercase">{item.productName}</div>
                                      <div className="flex items-center gap-3">
                                          <div className="font-mono text-slate-500">{item.quantity} {item.unit}</div>
                                          <button type="button" onClick={() => removeSuppliedItem(i)} className="text-red-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* Received Items */}
                      <div className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner flex flex-col">
                          <h4 className="text-[10px] font-black tracking-widest text-indigo-600 uppercase border-b pb-2 mb-3 flex items-center gap-1.5"><ArrowDownLeft className="w-3.5 h-3.5"/> Expected/Received</h4>
                          <div className="grid grid-cols-12 gap-1.5 mb-3">
                              <input className="col-span-5 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs bg-white dark:bg-slate-900 outline-none" placeholder="Finished SKU..." value={itemInput.description} onChange={e => setItemInput({...itemInput, description: e.target.value})} />
                              <input type="number" className="col-span-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-center bg-white dark:bg-slate-900 outline-none" placeholder="Exp Qty" value={itemInput.issuedQuantity || ''} onChange={e => setItemInput({...itemInput, issuedQuantity: Number(e.target.value)})} />
                              <input type="number" className="col-span-3 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-center bg-white dark:bg-slate-900 outline-none" placeholder="Recv Qty" value={itemInput.receivedQuantity || ''} onChange={e => setItemInput({...itemInput, receivedQuantity: Number(e.target.value)})} />
                              <input type="number" className="col-span-2 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-center bg-white dark:bg-slate-900 outline-none" placeholder="Rate" value={itemInput.rate || ''} onChange={e => setItemInput({...itemInput, rate: Number(e.target.value)})} />
                              <button type="button" onClick={addItem} className="col-span-12 mt-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg p-2 text-[10px] font-bold tracking-wider hover:bg-indigo-200 transition-colors uppercase">Add to matrix</button>
                          </div>
                          
                          <div className="space-y-1.5 overflow-y-auto max-h-[168px] flex-1">
                              {formData.items?.map((item, i) => (
                                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800 shadow-sm relative group overflow-hidden">
                                     <div className="absolute top-0 left-0 bottom-0 w-1 bg-indigo-500"></div>
                                      <div className="ml-2">
                                          <div className="font-black text-slate-800 dark:text-slate-100 uppercase text-[10px]">{item.description}</div>
                                          <div className="text-[9px] font-bold text-slate-400 mt-0.5">{currency}{item.rate} / {item.unit}</div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                          <div className="text-right flex flex-col items-end">
                                             <div className="text-[8px] font-bold text-slate-400 uppercase">Recv/Exp</div>
                                             <div className="font-mono text-[11px] font-black"><span className={item.receivedQuantity < item.issuedQuantity ? 'text-amber-500' : 'text-emerald-500'}>{item.receivedQuantity}</span><span className="text-slate-300">/</span><span className="text-slate-600">{item.issuedQuantity}</span></div>
                                          </div>
                                          <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-500 p-1"><X className="w-3.5 h-3.5"/></button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>

              <div className="w-full lg:w-72 space-y-6 shrink-0">
                  <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden border border-white/5">
                      <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Scale className="w-32 h-32 text-indigo-400"/></div>
                      <div className="relative z-10">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Integrity Status</p>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 mb-6">
                            <ShieldCheck className="w-5 h-5 text-emerald-400"/>
                            <div>
                                <p className="text-[10px] font-black text-white uppercase">Variance Locked</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Protocol: High-Yield</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-center border-t border-white/10 pt-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregate Cost</span>
                              <span className="text-lg font-black text-white tabular-nums">{currency}{formData.totalCost?.toLocaleString() || 0}</span>
                           </div>
                        </div>
                      </div>
                  </div>

                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2"><Scissors className="w-3.5 h-3.5 text-indigo-500"/> Process Chain</h4>
                      <select className="w-full border rounded-lg p-2 text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-950 outline-none" value={formData.process} onChange={e => setFormData({...formData, process: e.target.value})}>
                          {PROCESS_NODES.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                      </select>

                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2 mt-4">Job Status</h4>
                      <select className="w-full border rounded-lg p-2 text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-950 outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                          <option value="ISSUED">Issued (In Transit)</option>
                          <option value="IN_PROGRESS">In Progress (Vendor)</option>
                          <option value="COMPLETED">Completed/Ready</option>
                          <option value="BILLED">Billed</option>
                          <option value="CANCELLED">Cancelled</option>
                      </select>

                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-2 mt-4">Payment Status</h4>
                      <select className="w-full border rounded-lg p-2 text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-950 outline-none" value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})}>
                          <option value="UNPAID">Unpaid</option>
                          <option value="PARTIAL">Partially Paid</option>
                          <option value="PAID">Paid in Full</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-[110] rounded-b-xl shadow-lg px-10">
             <button onClick={() => { if(formData.id && confirm('Terminate this challan shard?')) onDelete?.(formData.id!); setIsModalOpen(false); }} className="text-[10px] font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-lg transition-all uppercase tracking-widest">Delete Challan</button>
             <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
                <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                    <Check className="w-4 h-4"/> Commit Shard
                </button>
                {editingId && onAction && formData.status === 'COMPLETED' && (
                    <button type="button" onClick={() => { onAction('CONVERT_TO_PURCHASE_RECEIPT', formData); setIsModalOpen(false); }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2">
                        <Check className="w-4 h-4"/> Inward Materials
                    </button>
                )}
             </div>
          </div>
      </BaseModal>
    </div>
  );
};

export default JobWorkComp;
