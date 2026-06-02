import React, { useState } from 'react';
import { Truck, Plus, FileText, ArrowUpRight, ArrowDownLeft, ShieldCheck, Printer } from 'lucide-react';
import { GatePass } from '../types';

export default function GatePassSystem({ gatePasses, onAdd, onUpdate }: { gatePasses: GatePass[], onAdd: any, onUpdate: any }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<GatePass>>({
     type: 'RETURNABLE',
     date: new Date().toISOString().split('T')[0],
     items: [{ itemName: '', qty: 1, unit: 'PCS', purpose: '' }]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
       ...formData,
       number: `GP-${Date.now().toString().slice(-4)}`,
       status: 'ISSUED'
    });
    setShowModal(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-amber-500" />
            Gate Pass System (RGP/NRGP)
          </h2>
          <p className="text-slate-500 font-medium mt-1">Control and log all materials entering or leaving the factory premises</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center gap-2">
          <Plus className="w-5 h-5" /> Generate Gate Pass
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpRight className="w-4 h-4"/> Active Returnables</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">{gatePasses.filter(g => g.type === 'RETURNABLE' && g.status !== 'RETURNED').length}</div>
           <p className="text-xs text-amber-500 font-bold mt-2">Material with Job-Workers</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowDownLeft className="w-4 h-4"/> Inward Logs Today</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">{gatePasses.filter(g => g.type === 'INWARD' && g.date.startsWith(new Date().toISOString().split('T')[0])).length}</div>
           <p className="text-xs text-emerald-500 font-bold mt-2">Receipts across gates</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
           <div className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Non-Returnable Issued</div>
           <div className="text-3xl font-black text-slate-800 dark:text-white">{gatePasses.filter(g => g.type === 'NON_RETURNABLE').length}</div>
           <p className="text-xs text-slate-500 font-bold mt-2">Sold Goods & Consumption</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
           <h3 className="font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-slate-400">Security Gate Logbook</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase tracking-widest text-slate-500">
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">GP ID</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Date</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Type</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Party / Vendor</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Vehicle / Driver</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800">Status</th>
              <th className="p-4 font-bold border-b border-slate-200 dark:border-slate-800 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gatePasses.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500">No gate passes recorded yet.</td></tr>
            ) : gatePasses.map((gp, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-100 dark:border-slate-800/50 last:border-0 text-sm">
                <td className="p-4 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" /> {gp.number}
                </td>
                <td className="p-4 text-slate-500 font-medium">{gp.date}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold ${
                      gp.type === 'RETURNABLE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                      gp.type === 'INWARD' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' :
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                  }`}>{gp.type}</span>
                </td>
                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{gp.partyName || '-'}</td>
                <td className="p-4">
                  <div className="font-bold text-slate-700 dark:text-slate-300">{gp.vehicleNo || '-'}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{gp.driverName}</div>
                </td>
                <td className="p-4">
                   {gp.status === 'RETURNED' ? (
                       <span className="font-bold text-emerald-500">RETURNED</span>
                   ) : (
                       <span className="font-bold text-slate-500">{gp.status || 'ISSUED'}</span>
                   )}
                </td>
                <td className="p-4 text-right">
                   {gp.type === 'RETURNABLE' && gp.status !== 'RETURNED' && (
                       <button onClick={() => onUpdate({ ...gp, status: 'RETURNED' })} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 mr-3">Mark Returned</button>
                   )}
                   <button className="text-slate-400 hover:text-slate-600"><Printer className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up">
                 <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white">Create Gate Pass</h3>
                     <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
                 </div>
                 <form onSubmit={handleSubmit} className="p-6 space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pass Type</label>
                             <select className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                                 <option value="RETURNABLE">RGP - Returnable</option>
                                 <option value="NON_RETURNABLE">NRGP - Non-Returnable</option>
                                 <option value="INWARD">INWARD - Gate Entry</option>
                             </select>
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                             <input type="date" required className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Party / Job-Worker Name</label>
                             <input type="text" required className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.partyName || ''} onChange={e => setFormData({...formData, partyName: e.target.value})} placeholder="E.g., Star Dyers" />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reference Doc (Challan/Inv No)</label>
                             <input type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.referenceId || ''} onChange={e => setFormData({...formData, referenceId: e.target.value})} placeholder="CH-001" />
                         </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehicle No</label>
                             <input type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.vehicleNo || ''} onChange={e => setFormData({...formData, vehicleNo: e.target.value})} placeholder="MH-04-1234" />
                         </div>
                         <div>
                             <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Driver Name / Phone</label>
                             <input type="text" className="w-full border rounded-lg p-2.5 text-sm font-bold bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={formData.driverName || ''} onChange={e => setFormData({...formData, driverName: e.target.value})} placeholder="Raju - 9876543210" />
                         </div>
                     </div>
                     
                     <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Material Details</label>
                         {(formData.items || []).map((item, idx) => (
                             <div key={idx} className="flex items-center gap-2 mb-2">
                                 <input type="text" placeholder="Item Name/Desc" required className="flex-1 border rounded p-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={item.itemName} onChange={e => { const newItems = [...(formData.items||[])]; newItems[idx].itemName = e.target.value; setFormData({...formData, items: newItems}) }} />
                                 <input type="number" placeholder="Qty" required className="w-20 border rounded p-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={item.qty} onChange={e => { const newItems = [...(formData.items||[])]; newItems[idx].qty = Number(e.target.value); setFormData({...formData, items: newItems}) }} />
                                 <input type="text" placeholder="Unit" required className="w-16 border rounded p-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={item.unit} onChange={e => { const newItems = [...(formData.items||[])]; newItems[idx].unit = e.target.value; setFormData({...formData, items: newItems}) }} />
                                 <input type="text" placeholder="Purpose" className="flex-1 border rounded p-2 text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800" value={item.purpose || ''} onChange={e => { const newItems = [...(formData.items||[])]; newItems[idx].purpose = e.target.value; setFormData({...formData, items: newItems}) }} />
                             </div>
                         ))}
                     </div>

                     <div className="flex justify-end gap-3 pt-4">
                         <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800">Cancel</button>
                         <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2">
                            Generate
                         </button>
                     </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
}
