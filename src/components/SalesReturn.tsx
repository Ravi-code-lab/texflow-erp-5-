
import React, { useState, useMemo } from 'react';
import { Order, Customer } from '../types';
import { 
  Plus, Undo2, Calendar, Printer, Box, Check, X, AlertTriangle
} from 'lucide-react';
import BaseModal from './BaseModal';

interface SalesReturnProps {
  orders: Order[];
  customers: Customer[];
  onAddReturn: (order: Order) => void;
  currency?: string;
}

const SalesReturn: React.FC<SalesReturnProps> = ({ 
  orders, customers, onAddReturn, currency = '₹' 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Order>>({
    customerName: '',
    totalAmount: 0,
    status: 'RETURNED',
    paymentStatus: 'REFUND_PENDING',
    items: []
  });

  const returns = useMemo(() => orders.filter(o => o.status === 'RETURNED' || o.id.startsWith('RET')), [orders]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.totalAmount) return;

    const returnOrder: Order = {
      ...formData,
      id: `RET-${Date.now().toString().slice(-6)}`,
      orderDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    } as Order;

    onAddReturn(returnOrder);
    setIsModalOpen(false);
    setFormData({ customerName: '', totalAmount: 0, status: 'RETURNED', paymentStatus: 'REFUND_PENDING', items: [] });
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 -m-8 p-8 animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex justify-between items-center shadow-sm mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-500 rounded-2xl text-white shadow-lg shadow-rose-500/20"><Undo2 className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Sales Returns</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inward Credit Nodes</p>
          </div>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all">
           <Plus className="w-4 h-4" /> Log Return Node
        </button>
      </div>

      <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {returns.map(ret => (
           <div key={ret.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1.5 rounded-bl-2xl text-[9px] font-black uppercase tracking-widest text-white bg-rose-500">
                {ret.paymentStatus}
              </div>
              <div className="flex justify-between items-start mb-4">
                 <span className="text-[10px] font-mono text-rose-500 font-black uppercase">#{ret.id}</span>
                 <AlertTriangle className="w-4 h-4 text-rose-400"/>
              </div>
              <h4 className="font-black text-slate-800 dark:text-white uppercase mb-2 truncate">{ret.customerName}</h4>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Value Inward</p>
                <p className="text-xl font-black text-rose-600 tabular-nums">{currency}{ret.totalAmount.toLocaleString()}</p>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                    <Calendar className="w-3 h-3"/> {ret.orderDate}
                 </div>
                 <div className="flex gap-2">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Printer className="w-4 h-4"/></button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Box className="w-4 h-4"/></button>
                 </div>
              </div>
           </div>
         ))}
         {returns.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center grayscale opacity-30 text-slate-400">
                <Undo2 className="w-16 h-16 mb-4"/>
                <p className="text-xs font-black uppercase tracking-[0.4em]">No return nodes detected</p>
            </div>
         )}
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Initialize Inward Return Node" size="lg">
         <form onSubmit={handleSave} className="space-y-6">
             <div className="space-y-4">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Origin Node (Party)</label>
                    <select 
                      required 
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950 focus:border-rose-500"
                      value={formData.customerName}
                      onChange={e => setFormData({...formData, customerName: e.target.value})}
                    >
                        <option value="">Select Customer...</option>
                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Return Magnitude ({currency})</label>
                        <input 
                          type="number" 
                          required 
                          className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-lg font-black tabular-nums bg-slate-950 text-rose-500 outline-none shadow-xl" 
                          value={formData.totalAmount || ''} 
                          onChange={e => setFormData({...formData, totalAmount: Number(e.target.value)})} 
                          placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Return Status</label>
                        <select 
                          className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-bold uppercase outline-none bg-slate-50/50 dark:bg-slate-950"
                          value={formData.paymentStatus}
                          onChange={e => setFormData({...formData, paymentStatus: e.target.value})}
                        >
                            <option value="REFUND_PENDING">Refund Pending</option>
                            <option value="REFUNDED">Refunded</option>
                            <option value="CREDIT_ADJUSTED">Credit Adjusted</option>
                        </select>
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest px-1">Reason for Return</label>
                    <textarea 
                      className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-sm font-medium bg-white dark:bg-slate-900 outline-none focus:border-rose-500" 
                      rows={3}
                      placeholder="e.g. Fabric damage, wrong color, excess quantity..."
                    />
                 </div>
             </div>
             
             <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 border hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Abort</button>
                <button type="submit" className="flex-1 bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Authorize Inward Node</button>
             </div>
         </form>
      </BaseModal>
    </div>
  );
};

export default SalesReturn;
