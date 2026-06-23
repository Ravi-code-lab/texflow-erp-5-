import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Machine } from '../types';
import { 
  Plus, Edit2, Trash2, Settings, Zap, Clock, PenTool, 
  Search, ArrowLeft, Save, Activity, Cpu, Calendar, DollarSign
} from 'lucide-react';

interface WorkstationsProps {
  workstations: Machine[];
  onAdd: (machine: Machine) => void;
  onUpdate: (machine: Machine) => void;
  onDelete: (id: string) => void;
}

const emptyMachine = (): Machine => ({
  id: '',
  name: '',
  type: '',
  status: 'Active',
  purchaseDate: new Date().toISOString().split('T')[0],
  nextServiceDate: new Date().toISOString().split('T')[0],
  hourlyCost: 0,
});

const Workstations: React.FC<WorkstationsProps> = ({ workstations, onAdd, onUpdate, onDelete }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState<Machine>(emptyMachine());
  const [formTab, setFormTab] = useState<'GENERAL' | 'COSTING' | 'MAINTENANCE'>('GENERAL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = useMemo(() => 
    workstations.filter(m => 
      m.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      m.id?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
      (m.type && m.type?.toLowerCase()?.includes(searchQuery.toLowerCase()))
    ),
    [workstations, searchQuery]
  );

  const handleOpen = (machine?: Machine) => {
    if (machine) { 
      setEditing(machine); 
      setForm({ ...machine }); 
    } else { 
      setEditing(null); 
      setForm(emptyMachine()); 
    }
    setFormTab('GENERAL');
    setViewMode('FORM');
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const finalForm = {
      ...form,
      id: form.id || `WS-${uuidShort(12)}`
    };
    if (editing) onUpdate(finalForm);
    else onAdd(finalForm);
    setViewMode('LIST');
  };

  const statusColor = (s: string) =>
    s === 'Active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
    s === 'Maintenance' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
    'bg-rose-100 text-rose-700 border-rose-200';

  if (viewMode === 'FORM') {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setViewMode('LIST')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">
                {editing ? `Edit Workstation: ${editing.name}` : 'New Workstation'}
              </h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                Manufacturing Unit / Machine Center
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setViewMode('LIST')} className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200">
              Discard
            </button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>

        {/* Form Tabs */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-5 flex items-center gap-4">
          {[
            { id: 'GENERAL', label: 'General Info', icon: Settings },
            { id: 'COSTING', label: 'Operating Costs', icon: DollarSign },
            { id: 'MAINTENANCE', label: 'Maintenance Log', icon: PenTool },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFormTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 border-b-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                formTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5 pb-10">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            {formTab === 'GENERAL' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Workstation Name <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Cutting Table 1" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Workstation Type</label>
                  <input value={form.type || ''} onChange={e => setForm({...form, type: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Embroidery Machine" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Operating Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                    <option value="Active">Active</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Machine Model / Serial</label>
                  <input value={form.model || ''} onChange={e => setForm({...form, model: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. Juki DDL-8700" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Production Capacity / Batch Size</label>
                  <input value={form.capacity || ''} onChange={e => setForm({...form, capacity: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder="e.g. 500 pcs/day" />
                </div>
              </div>
            )}
            
            {formTab === 'COSTING' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="col-span-2 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/50 rounded-lg flex gap-3">
                  <Zap className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">Operating Costs per Hour</p>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-400/80 leading-relaxed">
                      Define the hourly cost of operating this machine. This rate is used to calculate routing costs and job card costing when assigning operations to this workstation.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Electricity & Consumables Cost (₹/hr)</label>
                  <input type="number" value={form.hourlyCost || ''} onChange={e => setForm({...form, hourlyCost: Number(e.target.value)})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:border-indigo-500 font-medium font-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Rent & Amortization (₹/hr)</label>
                  <input type="number" placeholder="0.00" className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium font-mono" />
                </div>
              </div>
            )}

            {formTab === 'MAINTENANCE' && (
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                 <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Purchase Date</label>
                  <input type="date" value={form.purchaseDate || ''} onChange={e => setForm({...form, purchaseDate: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">Next Service Date</label>
                  <input type="date" value={form.nextServiceDate || ''} onChange={e => setForm({...form, nextServiceDate: e.target.value})} className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-red-600 font-medium" />
                </div>
                <div className="col-span-2 border-t border-slate-100 dark:border-slate-800 pt-6">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Service Logs</h4>
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 border-dashed">
                     <p className="text-xs text-slate-500 font-medium">No service logs recorded yet.</p>
                     <button className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700">+ Add Log Entry</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 min-h-[500px]">
      <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
            Workstations / Machine Centers
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage manufacturing units and routing destinations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search workstations..."
              className="pl-9 pr-4 py-2 w-64 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button onClick={() => handleOpen()} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-colors">
            <Plus className="w-4 h-4" /> Add Workstation
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 border-dashed">
            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Cpu className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">No workstations found</h3>
            <p className="text-sm text-slate-500 mb-4">Add your first manufacturing unit to define routing maps.</p>
            <button onClick={() => handleOpen()} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              + Create Workstation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(m => (
              <div key={m.id} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800">
                      <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 dark:text-white text-sm leading-tight mb-1">{m.name}</h3>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">{m.id || 'N/A'} • {m.type || 'General Unit'}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border ${statusColor(m.status)}`}>
                    {m.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Operating Cost</p>
                     <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">₹{m.hourlyCost || '0.00'}<span className="text-[10px] font-medium text-slate-400 ml-1">/ hr</span></p>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Next Service</p>
                     <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                       <Calendar className="w-3 h-3 text-slate-400" />
                       {m.nextServiceDate || 'Not Set'}
                     </p>
                   </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <button onClick={() => handleOpen(m)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors hidden group-hover:block">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete(m.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors hidden group-hover:block">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Workstations;
