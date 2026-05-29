
import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { 
  Landmark, Wallet, ArrowDownLeft, ArrowUpRight, Search, Plus, 
  Printer, Download, Filter, FileText, Check, X,
  TrendingUp, TrendingDown, History, CreditCard, Calendar,
  Table as TableIcon, LayoutGrid
} from 'lucide-react';
import BaseModal from './BaseModal';

interface CashBookProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  currency?: string;
}

const CashBook: React.FC<CashBookProps> = ({ 
  transactions, onAddTransaction, currency = '₹' 
}) => {
  const [filter, setFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | 'CASH' | 'BANK'>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'GRID'>('LIST');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'INCOME',
    paymentMethod: 'CASH',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: 'SALES',
    description: ''
  });

  // Business Logic
  const stats = useMemo(() => {
    const cashIn = transactions.filter(t => t.paymentMethod === 'CASH' && t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const cashOut = transactions.filter(t => t.paymentMethod === 'CASH' && t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const bankIn = transactions.filter(t => t.paymentMethod === 'BANK' && t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const bankOut = transactions.filter(t => t.paymentMethod === 'BANK' && t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    
    return {
      cashBalance: cashIn - cashOut,
      bankBalance: bankIn - bankOut,
      todayIn: transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && t.type === 'INCOME').reduce((s,t) => s + t.amount, 0),
      todayOut: transactions.filter(t => t.date === new Date().toISOString().split('T')[0] && t.type === 'EXPENSE').reduce((s,t) => s + t.amount, 0)
    };
  }, [transactions]);

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const searchLower = filter.toLowerCase();
      const description = t.description || '';
      const category = t.category || '';
      const matchesSearch = description.toLowerCase().includes(searchLower) || 
                          category.toLowerCase().includes(searchLower);
      const matchesMode = modeFilter === 'ALL' || t.paymentMethod === modeFilter;
      return matchesSearch && matchesMode;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter, modeFilter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    onAddTransaction({
      ...formData,
      id: `TXN-${Date.now()}`,
      updatedAt: new Date().toISOString()
    } as Transaction);
    
    setIsModalOpen(false);
    setFormData({ type: 'INCOME', paymentMethod: 'CASH', date: new Date().toISOString().split('T')[0], amount: 0, category: 'SALES', description: '' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in font-sans">
      
      {/* Standard Clean Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">Cash & Bank Ledger</h2>
          <p className="text-xs text-slate-500 font-medium">Standard industrial liquidity tracking</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border bg-white dark:bg-slate-900 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-2 border-slate-200 dark:border-slate-800">
            <Download className="w-4 h-4"/> Export
          </button>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2"
          >
             <Plus className="w-4 h-4" /> New Entry
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cash Balance</p>
                <Wallet className="w-4 h-4 text-indigo-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{currency}{stats.cashBalance.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Bank Balance</p>
                <Landmark className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{currency}{stats.bankBalance.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Total Receipts (Today)</p>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <h3 className="text-lg font-bold text-emerald-600 tabular-nums">{currency}{stats.todayIn.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <p className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">Total Payments (Today)</p>
                <TrendingDown className="w-4 h-4 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-rose-600 tabular-nums">{currency}{stats.todayOut.toLocaleString()}</h3>
          </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          {/* List Controls */}
          <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setModeFilter('ALL')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All</button>
                    <button onClick={() => setModeFilter('CASH')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'CASH' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Cash</button>
                    <button onClick={() => setModeFilter('BANK')} className={`px-3 py-1 rounded text-xs font-bold transition-all ${modeFilter === 'BANK' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Bank</button>
                </div>
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-800 border rounded-lg text-sm outline-none focus:ring-1 focus:ring-indigo-500/20 w-48 sm:w-64" 
                      placeholder="Search entries..." 
                      value={filter} 
                      onChange={e => setFilter(e.target.value)}
                    />
                </div>
              </div>
              
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                  <button onClick={() => setViewMode('LIST')} className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><TableIcon className="w-4 h-4"/></button>
                  <button onClick={() => setViewMode('GRID')} className={`p-1.5 rounded-md transition-all ${viewMode === 'GRID' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-400'}`}><LayoutGrid className="w-4 h-4"/></button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              {viewMode === 'LIST' ? (
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold border-b sticky top-0 z-10">
                        <tr>
                          <th className="p-4">Date</th>
                          <th className="p-4">Payment Mode</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Particulars</th>
                          <th className="p-4 text-right">Receipt (In)</th>
                          <th className="p-4 text-right">Payment (Out)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredTxns.map(txn => (
                            <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="p-4 font-mono text-xs text-slate-500 uppercase">{txn.date}</td>
                                <td className="p-4">
                                   <div className="flex items-center gap-2">
                                      {txn.paymentMethod === 'BANK' ? <Landmark className="w-3.5 h-3.5 text-indigo-500"/> : <Wallet className="w-3.5 h-3.5 text-slate-400"/>}
                                      <span className="text-xs font-bold uppercase">{txn.paymentMethod}</span>
                                   </div>
                                </td>
                                <td className="p-4"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">{txn.category}</span></td>
                                <td className="p-4 font-medium text-slate-700 dark:text-slate-300 truncate max-w-xs">{txn.description}</td>
                                <td className="p-4 text-right font-bold text-emerald-600">{txn.type === 'INCOME' ? `${currency}${txn.amount.toLocaleString()}` : '-'}</td>
                                <td className="p-4 text-right font-bold text-rose-500">{txn.type === 'EXPENSE' ? `${currency}${txn.amount.toLocaleString()}` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                   {filteredTxns.map(txn => (
                      <div key={txn.id} className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col gap-3">
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] font-mono text-slate-400">{txn.date}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${txn.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{txn.type}</span>
                         </div>
                         <h4 className="font-bold text-slate-800 dark:text-white uppercase truncate">{txn.description}</h4>
                         <div className="flex justify-between items-end border-t pt-3 mt-1">
                            <div>
                               <p className="text-[10px] text-slate-400 uppercase font-bold">{txn.paymentMethod}</p>
                               <p className={`text-base font-black ${txn.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>{currency}{txn.amount.toLocaleString()}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">{txn.category}</span>
                         </div>
                      </div>
                   ))}
                </div>
              )}
          </div>
      </div>

      {/* Simple Standard Entry Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Cash/Bank Entry" size="md">
          <form onSubmit={handleSave} className="space-y-5">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button type="button" onClick={() => setFormData({...formData, type: 'INCOME'})} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${formData.type === 'INCOME' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm' : 'text-slate-500'}`}>Receipt (In)</button>
                  <button type="button" onClick={() => setFormData({...formData, type: 'EXPENSE'})} className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${formData.type === 'EXPENSE' ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm' : 'text-slate-500'}`}>Payment (Out)</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Entry Date</label>
                      <input type="date" required className="w-full border dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
                      <select className="w-full border dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 font-bold outline-none" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                          <option value="CASH">Cash in Hand</option>
                          <option value="BANK">Bank Account</option>
                      </select>
                  </div>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount ({currency})</label>
                  <input type="number" required className="w-full border dark:border-slate-700 rounded-lg p-3 text-lg font-black bg-white dark:bg-slate-800 outline-none focus:ring-1 focus:ring-indigo-500" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} placeholder="0.00" />
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select className="w-full border dark:border-slate-700 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-800 outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="SALES">Product Sales</option>
                      <option value="PURCHASE">Stock Purchase</option>
                      <option value="SALARY">Staff Wages</option>
                      <option value="RENT">Godown Rent</option>
                      <option value="UTILITY">Electricity/Power</option>
                      <option value="OTHER">Other Expense/Income</option>
                  </select>
              </div>

              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Narration / Description</label>
                  <textarea required className="w-full border dark:border-slate-700 rounded-lg p-3 text-sm bg-white dark:bg-slate-800 outline-none" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Received from ABC Corp for Bill #102" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-2.5 rounded-lg text-sm font-bold text-slate-500 border hover:bg-slate-50 transition-colors uppercase">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase">Save Entry</button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default CashBook;
