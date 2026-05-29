
import React, { useState, useMemo } from 'react';
import { Transaction, Customer, Supplier, BaseEntity } from '../types';
import { 
  FileText, Plus, Search, Printer, Trash2, ArrowUpRight, 
  ArrowDownLeft, History, CheckCircle2, ShieldCheck, 
  Banknote, Calendar, User, Tag, Scale, AlertTriangle,
  Download, Filter, ChevronRight
} from 'lucide-react';
import BaseModal from './BaseModal';

interface CreditDebitNotesProps {
  type: 'CREDIT' | 'DEBIT';
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onAddNote: (note: Transaction) => void;
  currency?: string;
}

const CreditDebitNotes: React.FC<CreditDebitNotesProps> = ({ 
  type, transactions, customers, suppliers, onAddNote, currency = '₹' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: type === 'CREDIT' ? 'EXPENSE' : 'INCOME', // Credit Note reduces receivable (Expense-like for cash flow), Debit Note reduces payable
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN',
    paymentMethod: 'ADJUSTMENT',
    description: ''
  });

  const filteredNotes = useMemo(() => {
    const searchLower = filter.toLowerCase();
    const subType = type === 'CREDIT' ? 'CREDIT_NOTE' : 'DEBIT_NOTE';
    
    return transactions.filter(t => 
      t.subType === subType && 
      (t.description.toLowerCase().includes(searchLower) || (t.referenceId || '').includes(searchLower))
    );
  }, [transactions, type, filter]);

  const stats = useMemo(() => {
    const total = filteredNotes.reduce((s, n) => s + n.amount, 0);
    return { total, count: filteredNotes.length };
  }, [filteredNotes]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.referenceId) return;

    const note: Transaction = {
      ...formData,
      id: `${type === 'CREDIT' ? 'CN' : 'DN'}-${Date.now()}`,
      subType: type === 'CREDIT' ? 'CREDIT_NOTE' : 'DEBIT_NOTE',
      updatedAt: new Date().toISOString()
    } as Transaction;

    onAddNote(note);
    setIsModalOpen(false);
    setFormData({
      type: type === 'CREDIT' ? 'EXPENSE' : 'INCOME',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: type === 'CREDIT' ? 'SALES_RETURN' : 'PURCHASE_RETURN',
      paymentMethod: 'ADJUSTMENT',
      description: ''
    });
  };

  const getAccountName = (id: string) => {
    if (type === 'CREDIT') return customers.find(c => c.id === id)?.name || 'Unknown Client';
    return suppliers.find(s => s.id === id)?.name || 'Unknown Supplier';
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc] dark:bg-slate-950 -m-8 p-8 animate-fade-in font-sans">
      
      {/* Header Matrix */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-white shadow-lg ${type === 'CREDIT' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}>
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              {type === 'CREDIT' ? 'Credit Note Hub' : 'Debit Note Hub'}
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {type === 'CREDIT' ? 'Sales Adjustments & Returns' : 'Purchase Adjustments & Returns'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner"
              placeholder="Search note shards..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className={`${type === 'CREDIT' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'} text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all`}
          >
             Initialize Note
          </button>
        </div>
      </div>

      {/* Analytics Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
              <div className={`p-3 rounded-xl ${type === 'CREDIT' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                  <Scale className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Aggregate Adjustment</p>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{currency}{stats.total.toLocaleString()}</h3>
              </div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                  <FileText className="w-6 h-6"/>
              </div>
              <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Active Note Shards</p>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{stats.count} Committed</h3>
              </div>
          </div>
      </div>

      {/* Note Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex-1 overflow-hidden flex flex-col">
          <table className="w-full text-left border-collapse">
              <thead className="bg-[#fafafa] dark:bg-slate-950 text-slate-500 font-black uppercase text-[9px] tracking-widest border-b dark:border-slate-800 sticky top-0 z-10">
                  <tr>
                      <th className="p-5">Note Identifier</th>
                      <th className="p-5">Counter-Party</th>
                      <th className="p-5">Entry Date</th>
                      <th className="p-5">Reasoning Protocol</th>
                      <th className="p-5 text-right">Adjustment Magnitude</th>
                      <th className="p-5 text-right">Action Hub</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredNotes.map(note => (
                      <tr key={note.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all h-16 group">
                          <td className="p-5">
                              <span className={`font-mono font-black uppercase text-xs ${type === 'CREDIT' ? 'text-rose-600' : 'text-amber-600'}`}>
                                  #{note.id}
                              </span>
                          </td>
                          <td className="p-5">
                              <p className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-tight">{getAccountName(note.referenceId || '')}</p>
                              <span className="text-[9px] font-mono text-slate-400 uppercase">ID: {note.referenceId}</span>
                          </td>
                          <td className="p-5">
                              <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
                                  <Calendar className="w-3.5 h-3.5"/> {note.date}
                              </div>
                          </td>
                          <td className="p-5">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase border dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 truncate max-w-[200px] inline-block">
                                  {note.description}
                              </span>
                          </td>
                          <td className="p-5 text-right font-black text-slate-900 dark:text-white tabular-nums">
                              {currency}{note.amount.toLocaleString()}
                          </td>
                          <td className="p-5 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                  <button className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg border dark:border-slate-700 transition-colors shadow-sm"><Printer className="w-4 h-4"/></button>
                                  <button className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg border dark:border-slate-700 transition-colors shadow-sm"><Download className="w-4 h-4"/></button>
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredNotes.length === 0 && (
                      <tr>
                          <td colSpan={6} className="p-20 text-center opacity-20 grayscale">
                              <FileText className="w-16 h-16 mx-auto mb-4"/>
                              <p className="text-[10px] font-black uppercase tracking-[0.4em]">Historical Registry Empty</p>
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
      </div>

      {/* Note Creation Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Initialize ${type === 'CREDIT' ? 'Credit' : 'Debit'} Note Protocol`} size="lg">
          <form onSubmit={handleSave} className="space-y-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Target Account Node</label>
                      <select 
                        required 
                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 shadow-inner"
                        value={formData.referenceId || ''}
                        onChange={e => setFormData({...formData, referenceId: e.target.value})}
                      >
                          <option value="">Select Party Registry...</option>
                          {type === 'CREDIT' 
                            ? customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                            : suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                          }
                      </select>
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Note Date</label>
                      <input 
                        type="date" 
                        required 
                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" 
                        value={formData.date} 
                        onChange={e => setFormData({...formData, date: e.target.value})} 
                      />
                  </div>

                  <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Adjustment Magnitude ({currency})</label>
                      <input 
                        type="number" 
                        required 
                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-lg font-black tabular-nums bg-slate-950 text-rose-500 outline-none shadow-xl" 
                        value={formData.amount || ''} 
                        onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                        placeholder="0.00"
                      />
                  </div>

                  <div className="md:col-span-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Adjustment Particulars / Reason</label>
                      <textarea 
                        required
                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" 
                        rows={3}
                        value={formData.description} 
                        onChange={e => setFormData({...formData, description: e.target.value})}
                        placeholder="e.g. Rate Difference, Fabric Damage Return, Excess Booking adjustment..."
                      />
                  </div>
              </div>

              <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0"/>
                  <p className="text-[9px] font-bold text-indigo-800 dark:text-indigo-300 uppercase leading-relaxed">
                    Committing this note will immediately adjust the linked Party Ledger. This protocol is immutable once finalized in the audit log.
                  </p>
              </div>

              <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Abort</button>
                  <button type="submit" className={`flex-1 ${type === 'CREDIT' ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'} text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2`}>
                      <CheckCircle2 className="w-4 h-4"/> Commit Node
                  </button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default CreditDebitNotes;
