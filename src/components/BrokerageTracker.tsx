import React, { useState } from 'react';
import { Banknote, Plus, Wallet, FileText, ArrowUpRight } from 'lucide-react';
import { BrokerageLog } from '../types';

export default function BrokerageTracker({ brokerLogs, onAdd, onUpdate }: { brokerLogs: BrokerageLog[], onAdd: any, onUpdate: any }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<BrokerageLog>>({
     date: new Date().toISOString().split('T')[0],
     agent: '',
     refDoc: '',
     amount: 0,
     commissionPct: 2.0,
     payout: 0,
     status: 'UNPAID'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowModal(false);
  };

  const totalOutstanding = brokerLogs.filter(l => l.status === 'UNPAID').reduce((sum, l) => sum + (l.payout || 0), 0);
  const totalPaid = brokerLogs.filter(l => l.status === 'PAID').reduce((sum, l) => sum + (l.payout || 0), 0);
  const outstandingCount = brokerLogs.filter(l => l.status === 'UNPAID').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Banknote className="w-8 h-8 text-indigo-500" />
            Brokerage & Commission
          </h2>
          <p className="text-slate-500 font-medium mt-1">Track agent commissions, ledger summaries, and payouts</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-5 h-5" /> Record Payout
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Wallet className="w-4 h-4"/> Outstanding Commission</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">₹ {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
           <p className="text-xs text-rose-500 font-bold mt-2">{outstandingCount} pending settlement</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Banknote className="w-4 h-4"/> Paid YTD</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">₹ {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
           <p className="text-xs text-emerald-500 font-bold mt-2">Commission cleared</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight className="w-4 h-4"/> Top Agent</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">Rahul Mehta</div>
           <p className="text-xs text-indigo-500 font-bold mt-2">Generated ₹ 2.05L volume</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
           <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">Commission Ledger</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Ref ID</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Agent</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Doc Ref</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Volume</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Commission</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {brokerLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No brokerage logs recorded.</td></tr>
            ) : brokerLogs.map((log, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 text-sm">
                <td className="p-4 font-bold text-slate-800 dark:text-white">{log.id?.slice(0, 8) || `BRK-${i}`}</td>
                <td className="p-4 font-bold text-indigo-600 dark:text-indigo-400">{log.agent}</td>
                <td className="p-4">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500"><FileText className="w-3.5 h-3.5"/> {log.refDoc}</span>
                </td>
                <td className="p-4 text-right font-medium text-slate-700 dark:text-slate-300">₹ {(log.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="p-4 text-right">
                  <div className="font-black text-emerald-600">₹ {(log.payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div className="text-[10px] font-bold text-slate-400">@ {log.commissionPct}%</div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {log.status === 'PAID' ? (
                       <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded text-xs font-bold">PAID</span>
                    ) : (
                       <div className="flex items-center gap-2">
                         <span className="bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400 px-2 py-1 rounded text-xs font-bold">UNPAID</span>
                         <button onClick={() => onUpdate({ ...log, status: 'PAID' })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">Settle</button>
                       </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">Record Commission</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Agent Name</label>
                         <input type="text" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.agent} onChange={e => setFormData({...formData, agent: e.target.value})} placeholder="e.g. Rahul Mehta" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference Doc / Invoice No</label>
                         <input type="text" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.refDoc} onChange={e => setFormData({...formData, refDoc: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Deal Volume (₹)</label>
                             <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.amount || ''} onChange={e => {
                                 const amount = Number(e.target.value);
                                 setFormData({...formData, amount, payout: (amount * (formData.commissionPct || 0)) / 100});
                             }} />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Commission %</label>
                             <input type="number" step="0.1" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.commissionPct || ''} onChange={e => {
                                 const pct = Number(e.target.value);
                                 setFormData({...formData, commissionPct: pct, payout: ((formData.amount || 0) * pct) / 100});
                             }} />
                         </div>
                     </div>
                     <div className="flex justify-between items-center bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                         <span className="font-bold text-indigo-800 dark:text-indigo-300">Calculated Payout:</span>
                         <span className="font-black text-xl text-indigo-600 dark:text-indigo-400">₹ {(formData.payout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                     </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                         <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
                         <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm">Save Record</button>
                     </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
}
