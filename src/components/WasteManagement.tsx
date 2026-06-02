import React, { useState } from 'react';
import { Recycle, Plus, AlertTriangle, TrendingDown, ArrowDownRight, Printer } from 'lucide-react';
import { WasteLog } from '../types';

export default function WasteManagement({ wasteLogs, onAdd, onUpdate }: { wasteLogs: WasteLog[], onAdd: any, onUpdate: any }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<WasteLog>>({
     date: new Date().toISOString().split('T')[0],
     process: 'Cutting',
     item: '',
     inputQty: 0,
     wasteQty: 0,
     reason: '',
     value: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setShowModal(false);
  };


  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Recycle className="w-8 h-8 text-emerald-500" />
            Waste & Shrinkage Tracker
          </h2>
          <p className="text-slate-500 font-medium mt-1">Monitor manufacturing scrap, process loss, and salvage recovery</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-5 h-5" /> Log Waste Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowDownRight className="w-4 h-4"/> Average Shrinkage</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">2.8%</div>
           <p className="text-xs text-emerald-500 font-bold mt-2">↓ 0.4% from last month</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><Recycle className="w-4 h-4"/> Total Scrap (KG)</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">65.0</div>
           <p className="text-xs text-rose-500 font-bold mt-2">↑ 12 KG over threshold</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><TrendingDown className="w-4 h-4"/> Salvage Recovery</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">₹ 5,300</div>
           <p className="text-xs text-slate-500 font-bold mt-2">From scrap sales this week</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
           <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">Recent Waste Logs</h3>
           <button className="text-slate-400 hover:text-slate-600"><Printer className="w-4 h-4" /></button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Record ID</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Date</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Process Node</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Material</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Waste Rate</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Reason</th>
            </tr>
          </thead>
          <tbody>
            {wasteLogs.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No waste logs recorded yet.</td></tr>
            ) : wasteLogs.map((log, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 text-sm">
                <td className="p-4 font-bold text-slate-800 dark:text-white">{log.id?.slice(0,8) || `WR-${i}`}</td>
                <td className="p-4 text-slate-500 font-medium">{log.date}</td>
                <td className="p-4">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-xs font-bold">{log.process}</span>
                </td>
                <td className="p-4 font-medium text-slate-700 dark:text-slate-300">{log.item}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                     <span className="font-bold text-rose-500">{log.wasteQty} kg</span>
                     <span className="text-xs text-slate-400">({((log.wasteQty / (log.inputQty || 1))*100).toFixed(1)}%)</span>
                  </div>
                </td>
                <td className="p-4">
                   <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      {log.reason && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                      {log.reason}
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
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">Log Waste Record</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Process Node</label>
                         <input type="text" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.process} onChange={e => setFormData({...formData, process: e.target.value})} placeholder="e.g. Cutting" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Material/Item</label>
                         <input type="text" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.item} onChange={e => setFormData({...formData, item: e.target.value})} />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Input Qty (KG)</label>
                             <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.inputQty || 0} onChange={e => setFormData({...formData, inputQty: Number(e.target.value)})} />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Waste Qty (KG)</label>
                             <input type="number" required className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.wasteQty || 0} onChange={e => setFormData({...formData, wasteQty: Number(e.target.value)})} />
                         </div>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Notes</label>
                         <input type="text" className="w-full border rounded-lg p-2.5 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.reason || ''} onChange={e => setFormData({...formData, reason: e.target.value})} placeholder="End Bit Shrinkage" />
                     </div>
                     <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                         <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
                         <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm">Save Log</button>
                     </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
}
