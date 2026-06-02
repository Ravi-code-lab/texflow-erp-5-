import React, { useState } from 'react';
import { Clock, Plus, Trash2 } from 'lucide-react';

interface TimesheetProps {
  timesheets: any[];
  team: any[];
  projects: any[];
  tasks: any[];
  onAdd: (timesheet: any) => void;
  onUpdate: (timesheet: any) => void;
  onDelete: (timesheet: any) => void;
}

export default function Timesheet({ timesheets, team, projects, tasks, onAdd, onDelete, onUpdate }: TimesheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [employee, setEmployee] = useState(team[0]?.name || '');
  const [project, setProject] = useState(projects[0]?.name || 'Factory Operations');
  const [hours, setHours] = useState(8);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || hours <= 0) return;

    onAdd({
      id: `TS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
      employeeName: employee,
      projectName: project,
      hours: Number(hours),
      activityDate: new Date().toISOString().split('T')[0],
      remarks: remarks || 'General shift duty',
      status: 'SUBMITTED'
    });
    setIsOpen(false);
    setRemarks('');
  };

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-indigo-500" />
            Timesheet & Labor Worklogs
          </h3>
          <p className="text-xs text-slate-400">Map employee task hours against ongoing projects and estimate karigar costs.</p>
        </div>
        <button
          onClick={() => {
            setEmployee(team[0]?.name || '');
            setProject(projects[0]?.name || 'Factory Operations');
            setHours(8);
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Log Shift hours
        </button>
      </div>

      {timesheets.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No active timesheets recorded.</p>
          <p className="text-xs text-slate-400">Log employee daily timesheets to audit labor metrics dynamically.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-850">
                <th className="p-3">Timesheet ID</th>
                <th className="p-3">Staff / Employee Name</th>
                <th className="p-3">Project Scope</th>
                <th className="p-3 text-right">Log Date</th>
                <th className="p-3 text-right">Worked Hours</th>
                <th className="p-3">Activity Description</th>
                <th className="p-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs font-semibold">
              {timesheets.map(ts => (
                <tr key={ts.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                  <td className="p-3 font-mono text-slate-800 dark:text-white font-bold">{ts.id}</td>
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-200">{ts.employeeName}</td>
                  <td className="p-3 text-slate-500">{ts.projectName}</td>
                  <td className="p-3 text-right font-mono text-slate-450">{ts.activityDate}</td>
                  <td className="p-3 text-right font-mono text-slate-805 font-bold tabular-nums">{ts.hours} hrs</td>
                  <td className="p-3 text-slate-500 italic font-medium truncate max-w-xs">{ts.remarks}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => onDelete(ts)} className="p-1 text-slate-400 hover:text-rose-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-805 dark:text-white flex items-center gap-1.5">
              <Clock className="w-4.5 h-4.5 text-indigo-500" /> Log Labor Shift Time
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Employee</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={employee}
                  onChange={e => setEmployee(e.target.value)}
                >
                  {team.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Project / Workshop Line</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={project}
                  onChange={e => setProject(e.target.value)}
                >
                  <option value="Factory Floor Operations">Factory Floor Operations</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Hours Logged</label>
                <input
                  role="textbox"
                  type="number"
                  min="1"
                  max="24"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold font-mono"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value))}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Remarks / Shift Duty Statement</label>
                <input
                  role="textbox"
                  placeholder="e.g. Completed winding active yarn onto warp rollers."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs">
                Submit Timesheet
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
