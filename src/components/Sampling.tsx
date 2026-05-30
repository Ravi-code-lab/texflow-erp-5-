
import React, { useState, useMemo } from 'react';
import { SampleRequest, Design, Karigar, Customer } from '../types';
import { 
  FlaskRound, Plus, Search, Scissors, Truck, 
  CheckCircle, XCircle, Clock, ArrowRight, Printer, 
  Box, History, LayoutGrid, List, MoreVertical,
  Edit2, Trash2, Download, Package, Check,
  Target, FlaskConical, RefreshCcw, CheckCircle2
} from 'lucide-react';
import BaseModal from './BaseModal';

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
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  const [formData, setFormData] = useState<Partial<SampleRequest>>({
    status: 'REQUESTED',
    requestDate: new Date().toISOString().split('T')[0],
    version: 1,
    sampleCost: 0
  });

  const filteredSamples = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return samples.filter(s => {
      const matchesSearch = s.designName.toLowerCase().includes(searchLower) || 
                          (s.customerName || '').toLowerCase().includes(searchLower);
      const isCompleted = ['APPROVED', 'REJECTED'].includes(s.status);
      if (activeTab === 'ACTIVE') return matchesSearch && !isCompleted;
      if (activeTab === 'COMPLETED') return matchesSearch && isCompleted;
      return matchesSearch;
    });
  }, [samples, filter, activeTab]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const sample = {
      ...formData,
      id: editingId || `SMP-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as SampleRequest;

    if (editingId) onUpdate(sample);
    else onAdd(sample);
    
    setIsModalOpen(false);
  };

  const promoteStage = (e: React.MouseEvent, sample: SampleRequest) => {
    e.stopPropagation();
    const currentIdx = STAGES.findIndex(s => s.id === sample.status);
    if (currentIdx < STAGES.length - 1) {
      const nextStatus = STAGES[currentIdx + 1].id as SampleRequest['status'];
      onUpdate({ ...sample, status: nextStatus });
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Summary Matrix */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><FlaskRound className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Total Shards</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{samples.length}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl"><RefreshCcw className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">In-Prod</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{samples.filter(s => s.status === 'DEVELOPING').length}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><CheckCircle2 className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Approved</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{samples.filter(s => s.status === 'APPROVED').length}</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl"><XCircle className="w-5 h-5"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Rejected</p><h3 className="text-lg font-black text-slate-800 dark:text-white tabular-nums">{samples.filter(s => s.status === 'REJECTED').length}</h3></div>
          </div>
      </div>

      {/* Standard Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Sample Protocol Hub</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage design prototypes and client iterations</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ status: 'REQUESTED', requestDate: new Date().toISOString().split('T')[0], version: 1 });
            setIsModalOpen(true);
          }} 
          className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
           <Plus className="w-4 h-4" /> New Prototype Shard
        </button>
      </div>

      {/* Main Workspace Area */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    {[
                        { id: 'ACTIVE', label: 'Active Matrix' },
                        { id: 'COMPLETED', label: 'Archive' }
                    ].map(t => (
                      <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-sm group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500" />
                    <input className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none shadow-inner dark:text-white" placeholder="Search protocol identity..." value={filter} onChange={e => setFilter(e.target.value)} />
                </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredSamples.length > 0 ? filteredSamples.map(sample => {
                      const stage = STAGES.find(s => s.id === sample.status) || STAGES[0];
                      const design = designs.find(d => d.id === sample.designId || d.name === sample.designName);
                      const imageUrl = sample.imageUrl || design?.imageUrl;
                      return (
                          <div key={sample.id} onClick={() => { setEditingId(sample.id); setFormData(sample); setIsModalOpen(true); }} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all group cursor-pointer flex flex-col gap-4 border-t-4 border-t-indigo-600 relative overflow-hidden">
                              <div className="flex justify-between items-start">
                                  <span className="text-[9px] font-mono text-slate-400 font-black uppercase tracking-widest">SHARD #{sample.id}</span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border dark:border-slate-700 ${stage.bg} ${stage.color} dark:bg-slate-900/50`}>{stage.label}</span>
                              </div>
                              
                              {imageUrl && (
                                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                                  <img src={imageUrl} alt={sample.designName} className="w-full h-full object-cover transition-transform group-hover:scale-105" referrerPolicy="no-referrer" />
                                </div>
                              )}

                              <div>
                                  <h4 className="font-black text-slate-800 dark:text-white uppercase truncate text-sm leading-tight mb-1">{sample.designName || design?.name || 'Unknown Design'}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TO: {sample.customerName || customers.find(c => c.id === sample.customerId)?.name || 'INTERNAL PROTOCOL'}</p>
                              </div>

                              <div className="mt-auto pt-4 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                      <Clock className="w-3.5 h-3.5 text-indigo-400"/> {sample.requestDate}
                                  </div>
                                  <button onClick={(e) => promoteStage(e, sample)} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-sm border dark:border-indigo-800/30"><ArrowRight className="w-4 h-4"/></button>
                              </div>
                          </div>
                      );
                  }) : (
                    <div className="col-span-full py-32 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-inner">
                            <FlaskConical className="w-10 h-10 text-slate-300 animate-pulse"/>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">Empty Protocol Cluster</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No prototype shards detected in current matrix</p>
                        </div>
                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                        >
                            Initialize First Protocol &rarr;
                        </button>
                    </div>
                  )}
              </div>
          </div>
      </div>

      {/* Protocol Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modify Prototype Shard" : "Initialize Prototype Protocol"} size="lg">
         <form onSubmit={handleSave} className="space-y-6 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    {formData.imageUrl && (
                      <div className="w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-inner mb-4">
                        <img src={formData.imageUrl} alt="Reference" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Design Catalog Node</label>
                    <input 
                      list="design-list" 
                      required 
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" 
                      value={formData.designName || ''} 
                      onChange={e => {
                        const design = designs.find(d => d.name === e.target.value.toUpperCase());
                        setFormData({...formData, designName: e.target.value.toUpperCase(), designId: design?.id, imageUrl: design?.imageUrl});
                      }} 
                      placeholder="SKU IDENTITY" 
                    />
                    <datalist id="design-list">{designs.map(d => <option key={d.id} value={d.name}/>)}</datalist>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Artisan Linkage</label>
                    <select className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-black uppercase bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.artisanId} onChange={e => setFormData({...formData, artisanId: e.target.value})}>
                        <option value="">Link Karigar Node...</option>
                        {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Target Client Node</label>
                    <input list="cust-list" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.customerName || ''} onChange={e => setFormData({...formData, customerName: e.target.value.toUpperCase()})} placeholder="PROSPECT NAME" />
                    <datalist id="cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Iteration Version</label>
                    <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-black bg-white dark:bg-slate-900 outline-none tabular-nums" value={formData.version} onChange={e => setFormData({...formData, version: Number(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Request Date</label>
                    <input type="date" required className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-900 outline-none" value={formData.requestDate} onChange={e => setFormData({...formData, requestDate: e.target.value})} />
                </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-[1.5rem] border border-white/5 flex items-center justify-between shadow-xl">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20"><Target className="w-5 h-5"/></div>
                  <div>
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Protocol Priority</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Tier 1 Development Shard</p>
                  </div>
               </div>
               <select className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-[9px] font-black text-white uppercase tracking-widest" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  {STAGES.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.label}</option>)}
               </select>
            </div>

            <div className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Discard</button>
                    <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Commit Prototype</button>
                </div>
                {editingId && onAction && formData.status === 'APPROVED' && (
                    <div className="flex gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                        <button type="button" onClick={() => { onAction('CONVERT_TO_WORK_ORDER_FROM_SAMPLE', formData); setIsModalOpen(false); }} className="flex-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:hover:bg-emerald-900/50 active:scale-95 transition-all flex items-center justify-center gap-2"><Scissors className="w-4 h-4"/> Convert to Work Order</button>
                    </div>
                )}
            </div>
         </form>
      </BaseModal>
    </div>
  );
};

export default Sampling;
