import React, { useState } from 'react';
import { HelpCircle, Plus, Eye, Trash2, ShieldCheck, Mail } from 'lucide-react';

interface SupportTicketsProps {
  tickets: any[];
  customers: any[];
  onAdd: (ticket: any) => void;
  onUpdate: (ticket: any) => void;
  onDelete: (ticket: any) => void;
}

export default function SupportTickets({ tickets, customers, onAdd, onUpdate, onDelete }: SupportTicketsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [customer, setCustomer] = useState(customers[0]?.name || '');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;

    onAdd({
      id: `TKT-${Date.now().toString().slice(-4)}`,
      customerName: customer || 'Anonymous Client',
      subject,
      priority,
      status: 'OPEN',
      date: new Date().toISOString().split('T')[0],
      description
    });
    setIsOpen(false);
    setSubject('');
    setDescription('');
  };

  const handleToggleStatus = (ticket: any) => {
    const nextStatus = ticket.status === 'OPEN' || ticket.status === 'IN_PROGRESS'
      ? 'RESOLVED'
      : 'OPEN';
    onUpdate({ ...ticket, status: nextStatus });
  };

  return (
    <div className="space-y-4 animate-fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            CRM Support & Client Quality Tickets
          </h3>
          <p className="text-xs text-slate-400">Handle queries regarding fabric defects, lot delays, or customized dispatch requests.</p>
        </div>
        <button
          onClick={() => {
            setCustomer(customers[0]?.name || '');
            setPriority('MEDIUM');
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Open Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/30">
          <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No support tickets active.</p>
          <p className="text-xs text-slate-400">All fabric deliveries and agent dispatches are validated as perfect.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800/80 bg-slate-50/10 dark:bg-slate-950/20 hover:border-slate-300 transition-colors flex justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 rounded">
                    {t.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Date: {t.date}</span>
                  <span className="font-bold text-slate-500 block">Customer: {t.customerName}</span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-150 text-sm mt-1.5">{t.subject}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.description || 'No detailed issue statement logged.'}</p>
                
                <div className="flex gap-4 text-[10px] mt-3.5">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                    t.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                    t.priority === 'HIGH' ? 'bg-rose-50 text-rose-700' :
                    t.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    Priority: {t.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                    t.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleToggleStatus(t)}
                  className="px-2.5 py-1 border border-slate-200 text-slate-500 hover:text-slate-800 rounded text-[10px] font-bold uppercase transition"
                >
                  {t.status === 'OPEN' || t.status === 'IN_PROGRESS' ? 'Resolve' : 'Re-open'}
                </button>
                <button
                  onClick={() => onDelete(t.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-805 dark:text-white flex items-center gap-1.5">
              <HelpCircle className="w-4.5 h-4.5 text-indigo-500" /> Log Customer Case / Ticket
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Customer / Agent</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={customer}
                  onChange={e => setCustomer(e.target.value)}
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Subject Title</label>
                <input
                  role="textbox"
                  type="text"
                  required
                  placeholder="e.g. Lot #1823 has weaving slubs"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Ticket Urgency</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Normal Processing</option>
                  <option value="HIGH">High Urgency / Defect Alert</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Detailed Description</label>
                <textarea
                  className="w-full p-2 h-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-xs font-medium"
                  placeholder="Describe the complaint details and requested remedy..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs">
                File Ticket Case
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
