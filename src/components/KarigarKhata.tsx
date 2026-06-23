
import React, { useState, useMemo } from 'react';
import { Karigar, KarigarLedgerEntry } from '../types';
import { 
  Search, Plus, User, Printer, History, 
  ChevronRight, MoreHorizontal, ArrowUpRight, 
  ArrowDownLeft, Calculator, FileText, BadgeCheck,
  CreditCard, Wallet, Banknote, Calendar, Filter
} from 'lucide-react';
import BaseModal from './BaseModal';

interface KarigarKhataProps {
  karigars: Karigar[];
  onUpdateKarigar: (k: Karigar) => void;
  currency?: string;
}

const KarigarKhata: React.FC<KarigarKhataProps> = ({ karigars, onUpdateKarigar, currency = '₹' }) => {
  const [filter, setFilter] = useState('');
  const [selectedKarigar, setSelectedKarigar] = useState<Karigar | null>(null);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  
  const [txnData, setTxnData] = useState<Partial<KarigarLedgerEntry>>({
    type: 'WORK_RECEIVED',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    rate: 0,
    amount: 0,
    description: ''
  });

  const filteredKarigars = useMemo(() => {
    const q = filter.toLowerCase();
    return karigars.filter(k => 
      k.name?.toLowerCase()?.includes(q) || 
      k.skill?.toLowerCase()?.includes(q)
    );
  }, [karigars, filter]);

  const globalStats = useMemo(() => {
    const toPay = karigars.filter(k => k.balance > 0).reduce((s, k) => s + k.balance, 0);
    const advances = karigars.filter(k => k.balance < 0).reduce((s, k) => s + Math.abs(k.balance), 0);
    return { toPay, advances };
  }, [karigars]);

  const handlePostTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKarigar) return;

    const amount = txnData.type === 'WORK_RECEIVED' 
      ? (txnData.quantity || 0) * (txnData.rate || 0) 
      : (txnData.amount || 0);

    const newEntry: KarigarLedgerEntry = {
      id: `TXN-${Date.now()}`,
      date: txnData.date!,
      type: txnData.type!,
      description: txnData.description || (txnData.type === 'WORK_RECEIVED' ? `Received ${txnData.quantity} pieces` : 'Manual payment settlement'),
      amount,
      quantity: txnData.quantity,
      rate: txnData.rate,
      updatedAt: new Date().toISOString()
    };

    const newBalance = (selectedKarigar.balance || 0) + (txnData.type === 'WORK_RECEIVED' ? amount : -amount);
    
    const updatedKarigar = {
      ...selectedKarigar,
      balance: newBalance,
      ledger: [newEntry, ...(selectedKarigar.ledger || [])]
    };

    onUpdateKarigar(updatedKarigar);
    setSelectedKarigar(updatedKarigar);
    setIsTxnModalOpen(false);
    setTxnData({ type: 'WORK_RECEIVED', date: new Date().toISOString().split('T')[0], quantity: 1, rate: 0, amount: 0, description: '' });
  };

  return (
    <div className="flex flex-col h-full bg-[#f6f6f7] dark:bg-slate-950 -mx-4 -my-5 px-4 py-5 lg:-m-6 lg:p-6 animate-fade-in font-sans">
      
      {/* Shopify Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <span>Finance</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 dark:text-white">Karigar Settlements</span>
          </nav>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Settlements</h2>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
             <Printer className="w-4 h-4" /> Export records
           </button>
           <button onClick={() => setIsTxnModalOpen(true)} disabled={!selectedKarigar} className="bg-slate-900 dark:bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50">
             Create payout
           </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Outstanding Liability</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{currency}{globalStats.toPay.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Advances</p>
              <h3 className="text-2xl font-bold text-indigo-600">{currency}{globalStats.advances.toLocaleString()}</h3>
          </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all"
                    placeholder="Search karigars..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
              </div>
              <button className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2">
                <Filter className="w-4 h-4"/> Filter
              </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fcfcfc] dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold text-xs border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-3">Artisan</th>
                          <th className="px-6 py-3">Skill</th>
                          <th className="px-6 py-3 text-right">Credit (Work)</th>
                          <th className="px-6 py-3 text-right">Debit (Paid)</th>
                          <th className="px-6 py-3 text-right">Net Balance</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {filteredKarigars.map(k => (
                          <tr 
                            key={k.id} 
                            onClick={() => setSelectedKarigar(k)}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group ${selectedKarigar?.id === k.id ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
                          >
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                          {k.name.charAt(0)}
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{k.name}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-tight">{k.skill}</td>
                              <td className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                                  {currency}{k.ledger?.filter(e => e.type === 'WORK_RECEIVED').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 tabular-nums">
                                  {currency}{k.ledger?.filter(e => e.type === 'PAYMENT_GIVEN').reduce((s, e) => s + e.amount, 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <span className={`text-sm font-bold tabular-nums ${k.balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-indigo-600'}`}>
                                      {currency}{Math.abs(k.balance).toLocaleString()}
                                      <span className="text-[10px] ml-1 uppercase opacity-60 font-medium">{k.balance >= 0 ? 'due' : 'adv'}</span>
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Ledger View Overlay */}
      {selectedKarigar && (
          <div className="mt-6 animate-slide-up">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#fcfcfc] dark:bg-slate-950">
                      <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-400" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Transaction History for {selectedKarigar.name}</h4>
                      </div>
                      <button onClick={() => setSelectedKarigar(null)} className="text-xs font-bold text-indigo-600 hover:underline">Close ledger</button>
                  </div>
                  <div className="max-h-96 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-sm">
                          <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-slate-50/50 dark:bg-slate-950/50">
                              <tr>
                                  <th className="px-6 py-3">Date</th>
                                  <th className="px-6 py-3">Description</th>
                                  <th className="px-6 py-3 text-right">Credit</th>
                                  <th className="px-6 py-3 text-right">Debit</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                              {selectedKarigar.ledger?.map((entry, idx) => (
                                  <tr key={entry.id || `${entry.date}-${entry.type}-${String(entry.amount)}-${idx}`} className="hover:bg-slate-50/30">
                                      <td className="px-6 py-3 text-xs text-slate-500 font-mono">{entry.date}</td>
                                      <td className="px-6 py-3">
                                          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">{entry.description}</p>
                                          {entry.type === 'WORK_RECEIVED' && (
                                              <p className="text-[10px] text-slate-400">{entry.quantity} pieces @ {currency}{entry.rate}</p>
                                          )}
                                      </td>
                                      <td className="px-6 py-3 text-right font-bold text-emerald-600 tabular-nums">
                                          {entry.type === 'WORK_RECEIVED' ? `${currency}${entry.amount.toLocaleString()}` : '—'}
                                      </td>
                                      <td className="px-6 py-3 text-right font-bold text-rose-600 tabular-nums">
                                          {entry.type === 'PAYMENT_GIVEN' ? `${currency}${entry.amount.toLocaleString()}` : '—'}
                                      </td>
                                  </tr>
                              ))}
                              {(!selectedKarigar.ledger || selectedKarigar.ledger.length === 0) && (
                                  <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">No historical transactions found for this node.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* Settlement Modal */}
      <BaseModal isOpen={isTxnModalOpen} onClose={() => setIsTxnModalOpen(false)} title="Create payout or record work" size="lg">
          <form onSubmit={handlePostTxn} className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button 
                        type="button" 
                        onClick={() => setTxnData({...txnData, type: 'WORK_RECEIVED'})}
                        className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${txnData.type === 'WORK_RECEIVED' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Receive work
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTxnData({...txnData, type: 'PAYMENT_GIVEN'})}
                        className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${txnData.type === 'PAYMENT_GIVEN' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Give payment
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Transaction date</label>
                          <input type="date" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950" value={txnData.date} onChange={e => setTxnData({...txnData, date: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Target artisan</label>
                          <div className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm font-bold uppercase text-slate-600">
                              {selectedKarigar?.name}
                          </div>
                      </div>
                  </div>

                  {txnData.type === 'WORK_RECEIVED' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-50 dark:border-slate-800 pt-4">
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity (pcs)</label>
                              <input type="number" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950 font-bold" value={txnData.quantity || ''} onChange={e => setTxnData({...txnData, quantity: Number(e.target.value)})} />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Rate per piece</label>
                              <input type="number" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950 font-bold" value={txnData.rate || ''} onChange={e => setTxnData({...txnData, rate: Number(e.target.value)})} />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Total credit</label>
                              <div className="w-full bg-slate-900 text-emerald-400 rounded-lg p-2.5 text-sm font-black tabular-nums border border-slate-800">
                                  {currency}{((txnData.quantity || 0) * (txnData.rate || 0)).toLocaleString()}
                              </div>
                          </div>
                      </div>
                  ) : (
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Payment amount ({currency})</label>
                          <input type="number" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-lg font-black bg-white dark:bg-slate-950 text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500/20" value={txnData.amount || ''} onChange={e => setTxnData({...txnData, amount: Number(e.target.value)})} placeholder="0.00" />
                      </div>
                  )}

                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Notes / Description</label>
                      <textarea required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-indigo-500/20" rows={2} value={txnData.description} onChange={e => setTxnData({...txnData, description: e.target.value})} placeholder="e.g. Advanced payment for Diwali week" />
                  </div>
              </div>

              <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsTxnModalOpen(false)} className="px-6 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="bg-slate-900 dark:bg-indigo-600 text-white px-10 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase tracking-widest">Post transaction</button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default KarigarKhata;
