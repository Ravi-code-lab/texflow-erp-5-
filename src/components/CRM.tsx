
import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Lead, LeadActivity, SampleRequest, Design, Customer } from '../types';
import { 
  Plus, Search, User, CheckCircle2, 
  Calendar, Phone, Mail, Clock, Send, 
  Box, X, IndianRupee, History, Compass, 
  Target, TrendingUp, Trash2, ArrowRight,
  Filter, MoreVertical, Briefcase
} from 'lucide-react';
import BaseModal from './BaseModal';
import { toast, confirm } from '../utils/toast';

interface CRMProps {
  leads: Lead[];
  designs: Design[];
  onAddLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  onConvertToCustomer: (lead: Lead) => void;
  currency?: string;
}

const CRM: React.FC<CRMProps> = ({ 
  leads = [], designs = [], onAddLead, onUpdateLead, onDeleteLead, onConvertToCustomer, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'TIMELINE'>('PROFILE');

  const [formData, setFormData] = useState<Partial<Lead>>({
    status: 'NEW', priority: 'WARM', potentialValue: 0, activities: [], samples: []
  });

  const [newActivity, setNewActivity] = useState<Partial<LeadActivity>>({ type: 'NOTE', description: '' });

  const filteredLeads = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return leads.filter(l => {
      const companyName = l.companyName || '';
      const contactPerson = l.contactPerson || '';
      return companyName.toLowerCase().includes(searchLower) || 
             contactPerson.toLowerCase().includes(searchLower);
    });
  }, [leads, filter]);

  const stats = useMemo(() => {
    const active = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST').length;
    const pipelineValue = leads.reduce((sum, l) => sum + (l.potentialValue || 0), 0);
    return { active, pipelineValue };
  }, [leads]);

  const handleSaveLead = (e: React.FormEvent) => {
    e.preventDefault();
    const leadData = {
      ...formData,
      id: editingId || `LEAD-${uuidShort(12)}`,
      updatedAt: new Date().toISOString()
    } as Lead;

    if (editingId) onUpdateLead(leadData);
    else onAddLead(leadData);
    
    setIsModalOpen(false);
  };

  const addActivityNode = () => {
    if (!newActivity.description) return;
    const act: LeadActivity = {
      id: `ACT-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      type: newActivity.type || 'NOTE',
      description: newActivity.description,
      performedBy: 'Admin'
    };
    setFormData(prev => ({ ...prev, activities: [act, ...(prev.activities || [])] }));
    setNewActivity({ type: 'NOTE', description: '' });
  };

  const getPriorityColor = (p?: string) => {
    if (p === 'HOT') return 'text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800';
    if (p === 'WARM') return 'text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800';
    return 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800';
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Industrial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Lead Intelligence Hub</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Pipeline orchestration and conversion control</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({ status: 'NEW', priority: 'WARM', potentialValue: 0, activities: [], samples: [] });
              setIsModalOpen(true);
            }} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> New Prospect Node
          </button>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl"><Target className="w-6 h-6"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Pipeline</p><h3 className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{stats.active} Entities</h3></div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl"><TrendingUp className="w-6 h-6"/></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Forecast Magnitude</p><h3 className="text-xl font-black text-emerald-600 tabular-nums">{currency}{stats.pipelineValue.toLocaleString()}</h3></div>
          </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold outline-none shadow-inner" placeholder="Filter prospect matrix..." value={filter} onChange={e => setFilter(e.target.value)} />
              </div>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
              <div className="flex gap-6 pb-6 min-w-[1200px] h-full">
                  {[
                      { id: 'NEW', label: 'Discovery', icon: Compass },
                      { id: 'SAMPLING', label: 'Sampling', icon: Box },
                      { id: 'QUOTED', label: 'Proposal', icon: IndianRupee },
                      { id: 'WON', label: 'Converted', icon: CheckCircle2 }
                  ].map(col => {
                      const colLeads = filteredLeads.filter(l => l.status === col.id);
                      return (
                        <div key={col.id} className="w-80 flex flex-col gap-4">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-200/50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <col.icon className="w-4 h-4 text-slate-500"/>
                                    <h4 className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">{col.label}</h4>
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 tabular-nums">{colLeads.length}</span>
                            </div>
                            
                            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
                                {colLeads.map(lead => (
                                    <div key={lead.id} onClick={() => { setEditingId(lead.id); setFormData(lead); setIsModalOpen(true); }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden border-l-4 border-l-indigo-600">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${getPriorityColor(lead.priority)}`}>{lead.priority}</span>
                                            <span className="text-[9px] font-mono text-slate-400">#{lead.id}</span>
                                        </div>
                                        <h5 className="font-bold text-slate-800 dark:text-white uppercase truncate text-sm mb-0.5 leading-tight">{lead.companyName}</h5>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{lead.contactPerson}</p>
                                        
                                        <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800">
                                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 tabular-nums">
                                                <IndianRupee className="w-3 h-3"/> {(lead.potentialValue / 1000).toFixed(0)}k
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {lead.status !== 'WON' && (
                                                    <button onClick={(e) => { e.stopPropagation(); onConvertToCustomer(lead); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg shadow-sm" title="Convert to Master Customer"><CheckCircle2 className="w-3.5 h-3.5"/></button>
                                                )}
                                                <button onClick={async (e) => { e.stopPropagation(); if(await confirm({ title: 'Terminate this node?', confirmLabel: 'Delete' })) onDeleteLead(lead.id); }} className="p-1.5 text-slate-400 hover:text-red-600 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"><Trash2 className="w-3.5 h-3.5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {colLeads.length === 0 && (
                                    <div className="h-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center opacity-20 grayscale">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Column Idle</p>
                                    </div>
                                )}
                            </div>
                        </div>
                      );
                  })}
              </div>
          </div>
      </div>

      {/* Intelligence Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Modify Prospect Shard" : "Initialize Prospect Protocol"} size="xl">
          <div className="flex flex-col lg:flex-row gap-8 pb-20">
              <div className="flex-1 space-y-8">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                      <button type="button" onClick={() => setActiveTab('PROFILE')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'PROFILE' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Profile Matrix</button>
                      <button type="button" onClick={() => setActiveTab('TIMELINE')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TIMELINE' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Interaction Log</button>
                  </div>

                  {activeTab === 'PROFILE' ? (
                      <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Entity Label (Company Name)</label>
                              <input required className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-inner" value={formData.companyName || ''} onChange={e => setFormData({...formData, companyName: e.target.value.toUpperCase()})} placeholder="E.G. GLOBAL TEXTILE HUB" />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Point of Contact</label>
                              <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.contactPerson || ''} onChange={e => setFormData({...formData, contactPerson: e.target.value.toUpperCase()})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Contact Protocol (Phone)</label>
                              <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Protocol Priority</label>
                              <select className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value as any})}>
                                  <option value="HOT">HOT (IMMEDIATE)</option>
                                  <option value="WARM">WARM (PROBABLE)</option>
                                  <option value="COLD">COLD (FUTURE)</option>
                              </select>
                          </div>
                          <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Potential Yield ({currency})</label>
                              <input type="number" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-black tabular-nums bg-slate-900 text-emerald-400 outline-none shadow-xl" value={formData.potentialValue} onChange={e => setFormData({...formData, potentialValue: Number(e.target.value)})} />
                          </div>
                      </form>
                  ) : (
                      <div className="space-y-6">
                          <div className="flex gap-3 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border dark:border-slate-700">
                              <input className="flex-1 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold uppercase bg-white dark:bg-slate-950 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500" placeholder="Register node interaction..." value={newActivity.description} onChange={e => setNewActivity({...newActivity, description: e.target.value})} onKeyDown={e => e.key === 'Enter' && addActivityNode()} />
                              <button onClick={addActivityNode} className="p-3 bg-indigo-600 text-white rounded-xl active:scale-90 transition-all shadow-lg shadow-indigo-500/30"><Send className="w-5 h-5"/></button>
                          </div>
                          <div className="space-y-4 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                              {formData.activities?.map(act => (
                                  <div key={act.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm relative pl-8">
                                      <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-700"></div>
                                      <div className="absolute left-2 top-6 w-2.5 h-2.5 rounded-full bg-indigo-500 border-2 border-white dark:border-slate-900"></div>
                                      <div className="flex justify-between items-center mb-1">
                                          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em]">{act.type} • {act.date}</span>
                                      </div>
                                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase leading-relaxed">{act.description}</p>
                                  </div>
                              ))}
                              {(!formData.activities || formData.activities.length === 0) && (
                                <div className="py-20 text-center opacity-20 grayscale flex flex-col items-center gap-3">
                                    <History className="w-12 h-12"/>
                                    <p className="text-[10px] font-black uppercase tracking-widest">Temporal Log Empty</p>
                                </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <div className="w-full lg:w-72 shrink-0 space-y-6">
                  <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-white/5">
                      <div className="absolute top-0 right-0 p-4 opacity-5 rotate-12"><Briefcase className="w-32 h-32"/></div>
                      <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4 relative z-10">Integrity Matrix</p>
                      <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-3 mb-6 relative z-10 backdrop-blur-md">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400"/>
                          <div>
                              <p className="text-[10px] font-black text-white uppercase">Active Protocol</p>
                              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Shard ID Locked</p>
                          </div>
                      </div>
                      <select className="w-full bg-white/10 border border-white/10 rounded-xl p-3 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:ring-1 focus:ring-white/20 relative z-10" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                          <option value="NEW" className="bg-slate-900">DISCOVERY</option>
                          <option value="SAMPLING" className="bg-slate-900">SAMPLING</option>
                          <option value="QUOTED" className="bg-slate-900">PROPOSAL</option>
                          <option value="WON" className="bg-slate-900">CONVERTED</option>
                          <option value="LOST" className="bg-slate-900">TERMINATED</option>
                      </select>
                  </div>
              </div>
          </div>
          
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-[110] rounded-b-xl shadow-lg px-10">
             <button type="button" onClick={async () => { if(editingId && await confirm({ title: 'Terminate this prospect shard permanently?', confirmLabel: 'Delete' })) { onDeleteLead(editingId); setIsModalOpen(false); } }} className="text-[10px] font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg transition-all uppercase tracking-widest">Terminate Shard</button>
             <div className="flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors">Abort</button>
                <button onClick={handleSaveLead} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4"/> Commit Shard
                </button>
             </div>
          </div>
      </BaseModal>
    </div>
  );
};

export default CRM;
