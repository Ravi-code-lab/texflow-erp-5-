
import React, { useState, useMemo } from 'react';
import { PurchaseOrder } from '../types';
import { Undo2, Plus, Search, AlertTriangle, Printer, Trash2, Calendar } from 'lucide-react';
import BaseModal from './BaseModal';

interface PurchaseReturnProps {
  purchaseOrders: PurchaseOrder[];
  onAddReturn: (poId: string, reason: string) => void;
  currency?: string;
}

const PurchaseReturn: React.FC<PurchaseReturnProps> = ({ 
  purchaseOrders, onAddReturn, currency = '₹' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<string>('');
  const [reason, setReason] = useState('');

  const returnedPos = useMemo(() => purchaseOrders.filter(po => po.status === 'CANCELLED'), [purchaseOrders]);
  const availablePos = useMemo(() => purchaseOrders.filter(po => po.status === 'RECEIVED'), [purchaseOrders]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !reason) return;
    onAddReturn(selectedPO, reason);
    setIsModalOpen(false);
    setSelectedPO('');
    setReason('');
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 -m-8 p-8 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex justify-between items-center shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20"><Undo2 className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Purchase Returns</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Debit Note Protocol</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2">
           <Plus className="w-4 h-4" /> Log Debit Note
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {returnedPos.length > 0 ? returnedPos.map(po => (
           <div key={po.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest text-white bg-rose-500">
                RETURNED
              </div>
              <div className="flex justify-between items-start mb-4">
                 <span className="text-[10px] font-mono text-rose-500 font-black uppercase">#{po.id}</span>
                 <AlertTriangle className="w-4 h-4 text-rose-400"/>
              </div>
              <h4 className="font-black text-slate-800 dark:text-white uppercase mb-2 truncate">{po.supplierName}</h4>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Debit Magnitude</p>
                <p className="text-xl font-black text-rose-600 tabular-nums">{currency}{po.totalAmount.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Calendar className="w-3.5 h-3.5"/> {po.date}
                 </div>
                 <button className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"><Printer className="w-4 h-4"/></button>
              </div>
           </div>
         )) : (
            <div className="col-span-full py-20 flex flex-col items-center justify-center grayscale opacity-30 text-slate-400">
                <Undo2 className="w-16 h-16 mb-4"/>
                <p className="text-xs font-black uppercase tracking-[0.4em]">No return nodes detected</p>
            </div>
         )}
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize Debit Note Protocol" size="lg">
          <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Source Purchase ID (PO#)</label>
                    <select 
                      required 
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:border-rose-500"
                      value={selectedPO}
                      onChange={e => setSelectedPO(e.target.value)}
                    >
                        <option value="">Select Received PO...</option>
                        {availablePos.map(po => <option key={po.id} value={po.id}>{po.id} - {po.supplierName} ({currency}{po.totalAmount})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Reason for Return (Defect Node)</label>
                    <textarea 
                      required
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 outline-none focus:border-rose-500" 
                      rows={3}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. Fabric Damage, Shade Variation, Shortage in Batch..."
                    />
                  </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Abort</button>
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Authorize Defect Node</button>
              </div>
          </form>
      </BaseModal>
    </div>
  );
};

export default PurchaseReturn;
