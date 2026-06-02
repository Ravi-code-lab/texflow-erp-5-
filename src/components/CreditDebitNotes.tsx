import React, { useState } from 'react';
import { Transaction, Customer, Supplier } from '../types';
import { Plus, FileText, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

interface CreditDebitNotesProps {
  type: 'CREDIT' | 'DEBIT';
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddNote: (txn: Transaction) => void;
  currency?: string;
}

const CreditDebitNotes: React.FC<CreditDebitNotesProps> = ({
  type, transactions, customers, suppliers, onAddNote, currency = '₹'
}) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Transaction>>({
    type: type === 'CREDIT' ? 'CREDIT' : 'DEBIT',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: '',
    status: 'PENDING',
  });

  const notes = transactions.filter(t => t.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.description) return;
    const note = {
      ...form,
      id: `${type === 'CREDIT' ? 'CN' : 'DN'}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'Administrator',
      version: 1,
      deleted: false,
    } as Transaction;
    onAddNote(note);
    setShowForm(false);
    setForm({ type: form.type, date: new Date().toISOString().split('T')[0], amount: 0, description: '', status: 'PENDING' });
  };

  const Icon = type === 'CREDIT' ? ArrowDownCircle : ArrowUpCircle;
  const color = type === 'CREDIT' ? 'emerald' : 'rose';
  const label = type === 'CREDIT' ? 'Credit Note' : 'Debit Note';

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 text-${color}-600`} />
          <h2 className="text-lg font-bold text-slate-800">{label}s</h2>
          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{notes.length}</span>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={`flex items-center gap-1.5 bg-${color}-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-${color}-700 transition-colors`}
        >
          <Plus className="w-4 h-4" /> New {label}
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-bold text-slate-800 text-base">New {label}</h3>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Party</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.partyId || ''}
                onChange={e => setForm({ ...form, partyId: e.target.value })}
              >
                <option value="">Select party…</option>
                <optgroup label="Customers">
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
                <optgroup label="Suppliers">
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
              <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.date || ''} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Amount ({currency})</label>
              <input type="number" required min={0.01} step={0.01} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })} />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Reason / Description</label>
              <textarea required rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none"
                value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit"
                className={`px-4 py-2 text-sm rounded-lg bg-${color}-600 text-white font-medium hover:bg-${color}-700`}>
                Save {label}
              </button>
            </div>
          </form>
        </div>
      )}

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <FileText className="w-10 h-10 opacity-30" />
          <p className="text-sm">No {label.toLowerCase()}s yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">ID</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map(note => (
                <tr key={note.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{note.id}</td>
                  <td className="px-4 py-3 text-slate-700">{note.date}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{note.description}</td>
                  <td className={`px-4 py-3 text-right font-semibold text-${color}-700`}>
                    {currency}{note.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      note.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      note.status === 'APPROVED' ? `bg-${color}-100 text-${color}-700` :
                      'bg-slate-100 text-slate-600'
                    }`}>{note.status || 'PENDING'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CreditDebitNotes;
