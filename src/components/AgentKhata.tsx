
import React, { useState, useMemo } from 'react';
import { Agent, AgentLedgerEntry } from '../types';
import { 
  Search, Plus, User, Printer, History, 
  ChevronRight, MoreHorizontal, ArrowUpRight, 
  ArrowDownLeft, Calculator, FileText, BadgeCheck,
  CreditCard, Wallet, Banknote, Calendar, Filter,
  Percent, Briefcase
} from 'lucide-react';
import BaseModal from './BaseModal';

interface AgentKhataProps {
  agents: Agent[];
  onUpdateAgent: (a: Agent) => void;
  currency?: string;
}

const AgentKhata: React.FC<AgentKhataProps> = ({ agents, onUpdateAgent, currency = '₹' }) => {
  const [filter, setFilter] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  
  const [txnData, setTxnData] = useState<Partial<AgentLedgerEntry>>({
    type: 'PAYMENT_RECEIVED',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    description: ''
  });

  const filteredAgents = useMemo(() => {
    const q = filter.toLowerCase();
    return agents.filter(a => 
      a.name?.toLowerCase()?.includes(q) || 
      a.area?.toLowerCase()?.includes(q)
    );
  }, [agents, filter]);

  const globalStats = useMemo(() => {
    const toPay = agents.reduce((s, a) => s + (a.balance || 0), 0);
    return { toPay };
  }, [agents]);

  const handlePostTxn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent) return;

    const amount = txnData.amount || 0;
    
    const newEntry: AgentLedgerEntry = {
      id: `TXN-${Date.now()}`,
      date: txnData.date!,
      type: txnData.type!,
      description: txnData.description || (txnData.type === 'COMMISSION_EARNED' ? 'Commission earned from order' : 'Commission payout settlement'),
      amount,
      updatedAt: new Date().toISOString()
    };

    const newBalance = (selectedAgent.balance || 0) + (txnData.type === 'COMMISSION_EARNED' ? amount : -amount);
    
    const updatedAgent = {
      ...selectedAgent,
      balance: newBalance,
      ledger: [newEntry, ...(selectedAgent.ledger || [])]
    };

    onUpdateAgent(updatedAgent);
    setSelectedAgent(updatedAgent);
    setIsTxnModalOpen(false);
    setTxnData({ type: 'PAYMENT_RECEIVED', date: new Date().toISOString().split('T')[0], amount: 0, description: '' });
  };

  return (
    <div className="flex flex-col h-full bg-[#f6f6f7] dark:bg-slate-950 -mx-4 -my-5 px-4 py-5 lg:-m-6 lg:p-6 animate-fade-in font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-6">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-2">
            <span>Finance</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 dark:text-white">Agent Commissions</span>
          </nav>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Agent Ledger</h2>
        </div>
        
        <div className="flex items-center gap-3">
           <button className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
             <Printer className="w-4 h-4" /> Export records
           </button>
           <button onClick={() => setIsTxnModalOpen(true)} disabled={!selectedAgent} className="bg-slate-900 dark:bg-sky-600 text-white px-5 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50">
             Record Payout
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Commission Payable</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{currency}{globalStats.toPay.toLocaleString()}</h3>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Active Agents</p>
              <h3 className="text-2xl font-bold text-sky-600">{agents.length}</h3>
          </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500/10 transition-all"
                    placeholder="Search agents..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-[#fcfcfc] dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-semibold text-xs border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-3">Agent</th>
                          <th className="px-6 py-3">Area</th>
                          <th className="px-6 py-3 text-center">Rate</th>
                          <th className="px-6 py-3 text-right">Net Payable</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {filteredAgents.map(a => (
                          <tr 
                            key={a.id} 
                            onClick={() => setSelectedAgent(a)}
                            className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all cursor-pointer group ${selectedAgent?.id === a.id ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''}`}
                          >
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                                          {a.name.charAt(0)}
                                      </div>
                                      <span className="text-sm font-bold text-slate-900 dark:text-white uppercase">{a.name}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-xs font-medium text-slate-500 uppercase tracking-tight">{a.area}</td>
                              <td className="px-6 py-4 text-center">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100">
                                     <Percent className="w-3 h-3"/> {a.commissionRate || 2.0}%
                                  </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                  <span className={`text-sm font-bold tabular-nums ${a.balance && a.balance > 0 ? 'text-sky-600' : 'text-slate-400'}`}>
                                      {currency}{(a.balance || 0).toLocaleString()}
                                  </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {selectedAgent && (
          <div className="mt-6 animate-slide-up">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#fcfcfc] dark:bg-slate-950">
                      <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-400" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Transaction History for {selectedAgent.name}</h4>
                      </div>
                      <button onClick={() => setSelectedAgent(null)} className="text-xs font-bold text-sky-600 hover:underline">Close ledger</button>
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
                              {selectedAgent.ledger?.map((entry, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/30">
                                      <td className="px-6 py-3 text-xs text-slate-500 font-mono">{entry.date}</td>
                                      <td className="px-6 py-3">
                                          <p className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">{entry.description}</p>
                                      </td>
                                      <td className="px-6 py-3 text-right font-bold text-emerald-600 tabular-nums">
                                          {entry.type === 'COMMISSION_EARNED' ? `${currency}${entry.amount.toLocaleString()}` : '—'}
                                      </td>
                                      <td className="px-6 py-3 text-right font-bold text-rose-600 tabular-nums">
                                          {entry.type === 'PAYMENT_RECEIVED' ? `${currency}${entry.amount.toLocaleString()}` : '—'}
                                      </td>
                                  </tr>
                              ))}
                              {(!selectedAgent.ledger || selectedAgent.ledger.length === 0) && (
                                  <tr><td colSpan={4} className="p-12 text-center text-slate-400 italic">No historical transactions found for this agent.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      <BaseModal isOpen={isTxnModalOpen} onClose={() => setIsTxnModalOpen(false)} title="Record Commission Payout" size="md">
          <form onSubmit={handlePostTxn} className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button 
                        type="button" 
                        onClick={() => setTxnData({...txnData, type: 'COMMISSION_EARNED'})}
                        className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${txnData.type === 'COMMISSION_EARNED' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Earned
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setTxnData({...txnData, type: 'PAYMENT_RECEIVED'})}
                        className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all ${txnData.type === 'PAYMENT_RECEIVED' ? 'bg-white dark:bg-slate-700 text-sky-600 shadow-sm' : 'text-slate-500'}`}
                      >
                        Payout
                      </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Transaction date</label>
                          <input type="date" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 text-sm bg-white dark:bg-slate-950" value={txnData.date} onChange={e => setTxnData({...txnData, date: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Target Agent</label>
                          <div className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-lg p-2.5 text-sm font-bold uppercase text-slate-600">
                              {selectedAgent?.name}
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount ({currency})</label>
                      <input type="number" required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-lg font-black bg-white dark:bg-slate-950 text-sky-600 outline-none focus:ring-2 focus:ring-sky-500/20" value={txnData.amount || ''} onChange={e => setTxnData({...txnData, amount: Number(e.target.value)})} placeholder="0.00" />
                  </div>

                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Notes / Description</label>
                      <textarea required className="w-full border border-slate-300 dark:border-slate-800 rounded-lg p-3 text-sm bg-white dark:bg-slate-950 outline-none focus:ring-2 focus:ring-sky-500/20" rows={2} value={txnData.description} onChange={e => setTxnData({...txnData, description: e.target.value})} placeholder="e.g. Commission payout for March 2026" />
                  </div>
              </div>

              <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setIsTxnModalOpen(false)} className="px-6 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="bg-slate-900 dark:bg-sky-600 text-white px-10 py-2 rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 uppercase tracking-widest">Post transaction</button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default AgentKhata;
