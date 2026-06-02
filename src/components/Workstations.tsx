import React, { useState } from 'react';
import { Machine } from '../types';
import { Plus, Edit2, Trash2, Settings } from 'lucide-react';

interface WorkstationsProps {
  workstations: Machine[];
  onAdd: (machine: Machine) => void;
  onUpdate: (machine: Machine) => void;
  onDelete: (id: string) => void;
}

const emptyMachine = (): Machine => ({
  id: crypto.randomUUID(),
  name: '',
  type: '',
  status: 'Active',
  purchaseDate: new Date().toISOString().split('T')[0],
  nextServiceDate: new Date().toISOString().split('T')[0],
});

const Workstations: React.FC<WorkstationsProps> = ({ workstations, onAdd, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState<Machine>(emptyMachine());

  const handleOpen = (machine?: Machine) => {
    if (machine) { setEditing(machine); setForm({ ...machine }); }
    else { setEditing(null); setForm(emptyMachine()); }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) onUpdate(form);
    else onAdd(form);
    setShowForm(false);
  };

  const statusColor = (s: string) =>
    s === 'Active' ? 'bg-green-100 text-green-700' : s === 'Maintenance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <Settings size={20} className="text-indigo-500" /> Workstations
        </h2>
        <button onClick={() => handleOpen()} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Add Machine
        </button>
      </div>

      {workstations.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Settings size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">No workstations added yet.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workstations.map(m => (
          <div key={m.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-slate-800 dark:text-white">{m.name}</p>
                <p className="text-xs text-slate-500">{m.type}{m.model ? ` · ${m.model}` : ''}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(m.status)}`}>{m.status}</span>
            </div>
            {m.hourlyCost !== undefined && (
              <p className="text-xs text-slate-500 mb-1">Hourly cost: ₹{m.hourlyCost}</p>
            )}
            <p className="text-xs text-slate-400">Next service: {m.nextServiceDate}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleOpen(m)} className="flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                <Edit2 size={12} /> Edit
              </button>
              <button onClick={() => onDelete(m.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold mb-4 text-slate-800 dark:text-white">{editing ? 'Edit' : 'Add'} Workstation</h3>
            <div className="space-y-3">
              {(['name','type','model','status','purchaseDate','nextServiceDate'] as const).map(field => (
                <div key={field}>
                  <label className="text-xs text-slate-500 capitalize">{field.replace(/([A-Z])/g,' $1')}</label>
                  {field === 'status' ? (
                    <select value={form[field] as string} onChange={e => setForm({...form,[field]:e.target.value})}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white mt-0.5">
                      {['Active','Maintenance','Inactive'].map(s=><option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input type={field.includes('Date') ? 'date' : 'text'} value={(form[field] as string) ?? ''}
                      onChange={e => setForm({...form,[field]:e.target.value})}
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white mt-0.5" />
                  )}
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500">Hourly Cost (₹)</label>
                <input type="number" value={form.hourlyCost ?? ''} onChange={e => setForm({...form, hourlyCost: Number(e.target.value)})}
                  className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-white mt-0.5" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workstations;
