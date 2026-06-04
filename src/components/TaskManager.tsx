import React, { useState } from 'react';
import { CheckSquare, Plus, Trash2, ShieldAlert } from 'lucide-react';

interface TaskManagerProps {
  tasks: any[];
  team: any[];
  onAddTask: (task: any) => void;
  onUpdateTask: (id: any, updates: any) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskManager({ tasks, team, onAddTask, onUpdateTask, onDeleteTask }: TaskManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(team[0]?.name || '');
  const [priority, setPriority] = useState('NORMAL');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAddTask({
      id: `TSK-${Date.now().toString().slice(-4)}`,
      title,
      assignedTo: assignee || 'Shared Pool',
      priority,
      status: 'PENDING',
      date: new Date().toISOString().split('T')[0]
    });
    setIsOpen(false);
    setTitle('');
  };

  const handleToggleStatus = (t: any) => {
    onUpdateTask(t.id, {
      status: t.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'
    });
  };

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <CheckSquare className="w-5 h-5 text-indigo-505 text-indigo-500" />
            Internal Workstation Tasks & SLA Queue
          </h3>
          <p className="text-xs text-slate-401 text-slate-400">Distribute tasks to operators and craftsmen under strict manufacturing SLA terms.</p>
        </div>
        <button
          onClick={() => {
            setAssignee(team[0]?.name || '');
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Dispatch Task
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No active tasks logged.</p>
          <p className="text-xs text-slate-400">All workstation checks are operating smoothly.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map(t => (
            <div key={t.id} className="p-3 bg-slate-50/15 dark:bg-slate-950/20 rounded-xl border border-slate-150 dark:border-slate-800 flex justify-between items-center hover:border-slate-200 transition-colors">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(t)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                    t.status === 'COMPLETED' 
                      ? 'bg-indigo-600 border-indigo-600 text-white' 
                      : 'border-slate-300 hover:border-indigo-500 bg-white'
                  }`}
                >
                  {t.status === 'COMPLETED' && <span className="text-[10px] font-black">&#x2713;</span>}
                </button>
                <div>
                  <h4 className={`text-xs font-bold ${
                    t.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'
                  }`}>
                    {t.title}
                  </h4>
                  <div className="flex gap-4 text-[10px] mt-1 text-slate-400">
                    <span>Staff Assigned: <span className="font-bold text-slate-655 dark:text-slate-300">{t.assignedTo}</span></span>
                    <span>Date: {t.date}</span>
                    <span className={`font-bold uppercase ${t.priority === 'HIGH' ? 'text-rose-500' : 'text-slate-500'}`}>{t.priority}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDeleteTask(t.id)}
                className="p-1 hover:bg-slate-50 dark:hover:bg-slate-850 rounded text-slate-350 hover:text-rose-605 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-805 dark:text-white flex items-center gap-1.5">
              <CheckSquare className="w-4.5 h-4.5 text-indigo-500" /> Dispatch Intern Task
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Task description / Title</label>
                <input
                  role="textbox"
                  type="text"
                  required
                  placeholder="e.g. Audit warp roller weights in loom room C"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Assignee Staff</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={assignee}
                  onChange={e => setAssignee(e.target.value)}
                >
                  {team.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Task critical level</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="NORMAL">Normal SLA Priority</option>
                  <option value="HIGH">Critical / Inspection Halt</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs">
                Confirm Allocation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
