
import React, { useState, useMemo } from 'react';
import { SampleRequest, Design, Karigar, Customer } from '../types';
import { 
  FlaskRound, Plus, Search, Scissors, Truck, 
  CheckCircle, XCircle, Clock, ArrowRight, Printer, 
  Box, History, LayoutGrid, List, MoreVertical,
  Edit2, Trash2, Download, Package, Check,
  Target, FlaskConical, RefreshCcw, CheckCircle2, ChevronRight, FileArchive, Table as TableIcon
} from 'lucide-react';

interface SamplingProps {
  samples: SampleRequest[];
  designs: Design[];
  karigars: Karigar[];
  customers: Customer[];
  onAdd: (sample: SampleRequest) => void;
  onUpdate: (sample: SampleRequest) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const STAGES = [
  { id: 'REQUESTED', label: 'Requested', color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
  { id: 'DEVELOPING', label: 'In-Prod', color: 'text-amber-600', bg: 'bg-amber-50', icon: Scissors },
  { id: 'SENT', label: 'Dispatched', color: 'text-purple-600', bg: 'bg-purple-50', icon: Truck },
  { id: 'APPROVED', label: 'Approved', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
  { id: 'REJECTED', label: 'Rejected', color: 'text-rose-600', bg: 'bg-rose-50', icon: XCircle }
];

const Sampling: React.FC<SamplingProps> = ({ 
  samples = [], designs = [], karigars = [], customers = [],
  onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REQUESTED' | 'DEVELOPING' | 'SENT' | 'APPROVED' | 'REJECTED'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<SampleRequest>>({
    status: 'REQUESTED',
    requestDate: new Date().toISOString().split('T')[0],
    version: 1,
    sampleCost: 0
  });

  const filteredSamples = useMemo(() => {
    return samples.filter(s => {
      const searchLower = filter.toLowerCase();
      const matchesSearch = s.designName.toLowerCase().includes(searchLower) || 
                          (s.customerName || '').toLowerCase().includes(searchLower) ||
                          s.id.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [samples, filter, statusFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sample = {
      ...formData,
      id: editingId || `SMP-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as SampleRequest;

    if (editingId) onUpdate(sample);
    else onAdd(sample);
    
    setViewMode('LIST');
  };

  const openNewForm = () => {
    setEditingId(null);
    setFormData({ 
      status: 'REQUESTED', 
      requestDate: new Date().toISOString().split('T')[0], 
      version: 1,
      sampleCost: 0
    });
    setViewMode('FORM');
  };

  const openEditForm = (sample: SampleRequest) => {
    setEditingId(sample.id);
    setFormData(sample);
    setViewMode('FORM');
  };

  if (viewMode === 'FORM') {
      const selectedDesign = designs.find(d => d.id === formData.designId || d.name === formData.designName);
      const imageUrl = formData.imageUrl || selectedDesign?.imageUrl;

      return (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                          <button onClick={() => setViewMode('LIST')} className="hover:text-indigo-600 transition-colors">Samples</button>
                          <ChevronRight className="w-3 h-3" />
                          <span className="font-bold text-slate-700 dark:text-slate-300">{editingId ? editingId : 'New Sample'}</span>
                          {editingId && (
                            <>
                                <span className="mx-2 text-slate-300">|</span>
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">{formData.status}</span>
                            </>
                          )}
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{editingId ? formData.designName : 'New Sample Request'}</h2>
                  </div>
                  <div className="flex gap-2">
                       <button onClick={() => setViewMode('LIST')} className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors border-slate-200 dark:border-slate-800">Cancel</button>
                       <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"><Check className="w-4 h-4"/> Save</button>
                       {editingId && onAction && formData.status === 'APPROVED' && (
                           <button type="button" onClick={() => { onAction('CONVERT_TO_WORK_ORDER_FROM_SAMPLE', formData); setViewMode('LIST'); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"><Scissors className="w-4 h-4"/> Create Work Order</button>
                       )}
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex-1 overflow-y-auto custom-scrollbar p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                     <div className="md:col-span-3 space-y-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest border-b pb-2 mb-4">Sample Details</h3>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Design Name</label>
                                    <div className="w-2/3">
                                      <input 
                                        list="design-list" 
                                        required 
                                        className="w-full border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 font-bold" 
                                        value={formData.designName || ''} 
                                        onChange={e => {
                                          const design = designs.find(d => d.name === e.target.value.toUpperCase());
                                          setFormData({...formData, designName: e.target.value.toUpperCase(), designId: design?.id, imageUrl: design?.imageUrl});
                                        }} 
                                        placeholder="Select Design" 
                                      />
                                      <datalist id="design-list">{designs.map(d => <option key={d.id} value={d.name}/>)}</datalist>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Version</label>
                                    <input type="number" className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.version} onChange={e => setFormData({...formData, version: Number(e.target.value)})} />
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Status</label>
                                    <select className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500 font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                      {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest border-b pb-2 mb-4">Assignment & Customer</h3>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Customer</label>
                                    <div className="w-2/3">
                                      <input list="cust-list" className="w-full border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value.toUpperCase()})} placeholder="Select Customer" />
                                      <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Karigar</label>
                                    <select className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.artisanId} onChange={e => setFormData({...formData, artisanId: e.target.value})}>
                                        <option value="">Select Karigar</option>
                                        {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Request Date</label>
                                    <input type="date" required className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.requestDate} onChange={e => setFormData({...formData, requestDate: e.target.value})} />
                                </div>
                            </div>
                         </div>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-widest border-b pb-2 mb-4">Costing & Dispatch</h3>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Sample Cost</label>
                                    <div className="w-2/3 flex items-center bg-indigo-50 dark:bg-indigo-900/20 rounded p-2 border border-indigo-100 dark:border-indigo-800">
                                      <span className="text-indigo-600 font-bold mr-2">{currency}</span>
                                      <input type="number" className="w-full bg-transparent outline-none font-bold text-indigo-700 dark:text-indigo-400" value={formData.sampleCost || 0} onChange={e => setFormData({...formData, sampleCost: Number(e.target.value)})} />
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase">Dispatch Date</label>
                                    <input type="date" className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.sentDate || ''} onChange={e => setFormData({...formData, sentDate: e.target.value})} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-start">
                                    <label className="w-1/3 text-xs font-bold text-slate-500 uppercase pt-2">Notes</label>
                                    <textarea rows={3} className="w-2/3 border dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Remarks..." />
                                </div>
                            </div>
                         </div>
                     </div>
                     <div className="md:col-span-1">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-full">
                           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Reference Image</h3>
                           {imageUrl ? (
                             <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                               <img src={imageUrl} alt="Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                             </div>
                           ) : (
                             <div className="w-full aspect-square rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900">
                               <FlaskRound className="w-8 h-8 mb-2 opacity-50" />
                               <span className="text-[10px] uppercase font-bold text-center px-4">Link a design to view reference image</span>
                             </div>
                           )}
                           <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Internal Tags</p>
                              <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-500 uppercase">Sample</span>
                                {formData.customerName && <span className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-500 uppercase">Client</span>}
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Standard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Sampling</h2>
          <p className="text-xs text-slate-500 font-medium">Manage design prototypes and sample requests</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 border-slate-200 dark:border-slate-800">
            <Download className="w-4 h-4"/> Export
          </button>
          <button 
            onClick={openNewForm} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> Add Sample Request
          </button>
        </div>
      </div>

       {/* Summary Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Samples</p>
                <FlaskConical className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{samples.length}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">In-Prod</p>
                <RefreshCcw className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-amber-600 tabular-nums">{samples.filter(s => s.status === 'DEVELOPING').length}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Dispatched</p>
                <Truck className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-indigo-600 tabular-nums">{samples.filter(s => s.status === 'SENT').length}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Approved</p>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-emerald-600 tabular-nums">{samples.filter(s => s.status === 'APPROVED').length}</h3>
          </div>
      </div>

      {/* Main List Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setStatusFilter('ALL')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All</button>
                    <button onClick={() => setStatusFilter('REQUESTED')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'REQUESTED' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Requested</button>
                    <button onClick={() => setStatusFilter('DEVELOPING')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'DEVELOPING' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>In-Prod</button>
                    <button onClick={() => setStatusFilter('SENT')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${statusFilter === 'SENT' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Sent</button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20 w-48 sm:w-64" 
                      placeholder="Search Id, Design..." 
                      value={filter} 
                      onChange={e => setFilter(e.target.value)}
                    />
                </div>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                      <tr>
                        <th className="p-4">Sample Id</th>
                        <th className="p-4">Design & Iteration</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Dates</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredSamples.length === 0 ? (
                          <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-500">
                                  <div className="flex flex-col items-center justify-center gap-2">
                                      <FileArchive className="w-8 h-8 text-slate-300" />
                                      <p>No Samples found</p>
                                  </div>
                              </td>
                          </tr>
                      ) : filteredSamples.map(sample => {
                          const stage = STAGES.find(s => s.id === sample.status) || STAGES[0];
                          const design = designs.find(d => d.id === sample.designId || d.name === sample.designName);
                          return (
                          <tr key={sample.id} onClick={() => openEditForm(sample)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group">
                              <td className="p-4">
                                   <div className="font-bold text-indigo-600 hover:underline">{sample.id}</div>
                              </td>
                              <td className="p-4">
                                  <div className="flex items-center gap-3">
                                      {design?.imageUrl ? (
                                          <img src={design.imageUrl} className="w-8 h-8 rounded border object-cover" />
                                      ) : (
                                          <div className="w-8 h-8 rounded border bg-slate-50 flex items-center justify-center"><FlaskRound className="w-4 h-4 text-slate-300"/></div>
                                      )}
                                      <div>
                                          <div className="font-bold text-slate-700 dark:text-slate-300 uppercase">{sample.designName}</div>
                                          <div className="text-[10px] text-slate-400">Ver: {sample.version}</div>
                                      </div>
                                  </div>
                              </td>
                              <td className="p-4">
                                  <div className="font-medium text-slate-800 dark:text-slate-200">{sample.customerName || '-'}</div>
                              </td>
                              <td className="p-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${stage.bg} ${stage.color} border-${stage.color.split('-')[1]}-200`}>
                                      {stage.label}
                                  </span>
                              </td>
                              <td className="p-4 text-slate-500 text-xs">
                                  <div>Req: <span className="font-mono text-slate-600">{sample.requestDate}</span></div>
                                  {sample.sentDate && <div>Sent: <span className="font-mono text-slate-600">{sample.sentDate}</span></div>}
                              </td>
                          </tr>
                      )})}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
};

export default Sampling;

