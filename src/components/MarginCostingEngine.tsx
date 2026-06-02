import React, { useState } from 'react';
import { Calculator, ArrowUpRight, TrendingUp, DollarSign, Activity, FileText, CheckCircle, Plus } from 'lucide-react';
import { MarginCosting } from '../types';

export default function MarginCostingEngine({ costings, onAdd, onUpdate }: { costings: MarginCosting[], onAdd: any, onUpdate: any }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<MarginCosting>>({
     design: '',
     baseCost: 0,
     totalOverhead: 0,
     totalCost: 0,
     salePrice: 0,
     marginPct: 0,
     status: 'PROFITABLE'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowModal(false);
  };

  const avgMargin = costings.length > 0 ? costings.reduce((sum, c) => sum + (c.marginPct || 0), 0) / costings.length : 0;
  const warningsCount = costings.filter(c => (c.marginPct || 0) < 35).length;
  const mostProfitable = costings.length > 0 ? costings.reduce((max, c) => (c.marginPct || 0) > (max.marginPct || 0) ? c : max, costings[0]) : null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Calculator className="w-8 h-8 text-emerald-500" />
            Real-Time Margin Costing Engine
          </h2>
          <p className="text-slate-500 font-medium mt-1">Live profitability tracking factoring in live yarn rates, job-work losses, and real labor costs</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-5 h-5" /> Live Simulation
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Average Margin</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">{avgMargin.toFixed(1)}%</div>
           <p className="text-xs text-emerald-500 font-bold mt-2">Across all simulations</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Min Margin Target</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">35.0%</div>
           <p className="text-xs text-slate-400 font-bold mt-2">Global baseline threshold</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight className="w-4 h-4"/> Most Profitable</div>
           <div className="text-lg font-black text-slate-800 dark:text-white truncate">{mostProfitable ? mostProfitable.design : '-'}</div>
           <p className="text-xs text-indigo-500 font-bold mt-2">{mostProfitable ? mostProfitable.marginPct?.toFixed(1) : '0'}% Net Margin</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 border-l-4 border-l-rose-500">
           <div className="text-rose-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-4 h-4"/> Margin Warnings</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">{warningsCount}</div>
           <p className="text-xs text-rose-500 font-bold mt-2">Products below threshold</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
           <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">Live Item Profitability</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Costing ID</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Product / Design</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Raw Material</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">JobWork/Overhead</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right text-rose-600">Total Cost</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right text-indigo-600">Sale Price</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right border-l border-slate-200 dark:border-slate-800">Live Margin %</th>
            </tr>
          </thead>
          <tbody>
            {costings.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No simulations recorded yet.</td></tr>
            ) : costings.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 text-sm">
                <td className="p-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> {c.id?.slice(0, 8) || `CST-${i}`}
                </td>
                <td className="p-4 text-slate-700 dark:text-slate-300 font-bold">{c.design}</td>
                <td className="p-4 text-right font-medium text-slate-500">₹{(c.baseCost || 0).toFixed(2)}</td>
                <td className="p-4 text-right font-medium text-slate-500">₹{(c.totalOverhead || 0).toFixed(2)}</td>
                <td className="p-4 text-right font-bold text-rose-600 dark:text-rose-400">₹{(c.totalCost || 0).toFixed(2)}</td>
                <td className="p-4 text-right font-black text-indigo-600 dark:text-indigo-400">₹{(c.salePrice || 0).toFixed(2)}</td>
                <td className="p-4 text-right border-l border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col items-end">
                       <span className={`font-black text-lg ${(c.marginPct || 0) >= 35 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {(c.marginPct || 0).toFixed(1)}%
                       </span>
                       {(c.marginPct || 0) >= 35 ? (
                           <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded leading-none flex items-center gap-1 mt-1"><CheckCircle className="w-3 h-3"/> HEALTHY</span>
                       ) : (
                           <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded leading-none mt-1">WARNING</span>
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
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">New Costing Simulation</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product / Design</label>
                         <input type="text" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.design} onChange={e => setFormData({...formData, design: e.target.value})} placeholder="e.g. Silk Kurti A-Line" />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base RM Cost (₹)</label>
                             <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.baseCost || ''} onChange={e => {
                                 const val = Number(e.target.value);
                                 const totalCost = val + (formData.totalOverhead || 0);
                                 const marginPct = formData.salePrice ? ((formData.salePrice - totalCost) / formData.salePrice) * 100 : 0;
                                 setFormData({...formData, baseCost: val, totalCost, marginPct});
                             }} />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Overhead/JobWork (₹)</label>
                             <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.totalOverhead || ''} onChange={e => {
                                 const val = Number(e.target.value);
                                 const totalCost = val + (formData.baseCost || 0);
                                 const marginPct = formData.salePrice ? ((formData.salePrice - totalCost) / formData.salePrice) * 100 : 0;
                                 setFormData({...formData, totalOverhead: val, totalCost, marginPct});
                             }} />
                         </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Sale Price (₹)</label>
                         <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.salePrice || ''} onChange={e => {
                             const val = Number(e.target.value);
                             const marginPct = val ? ((val - (formData.totalCost || 0)) / val) * 100 : 0;
                             setFormData({...formData, salePrice: val, marginPct});
                         }} />
                     </div>
                     
                     <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/30 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
                         <div>
                            <span className="font-bold text-emerald-800 dark:text-emerald-300 block text-xs uppercase">Simulated Margin</span>
                            <span className="text-xs text-emerald-600 block">Total cost: ₹{(formData.totalCost || 0).toFixed(2)}</span>
                         </div>
                         <span className="font-black text-2xl text-emerald-600 dark:text-emerald-400">{(formData.marginPct || 0).toFixed(1)}%</span>
                     </div>
                     
                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                         <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
                         <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm">Save Engine Log</button>
                     </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
}
