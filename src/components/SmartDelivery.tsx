
import React, { useMemo } from 'react';
import { Order } from '../types';
import { Truck, AlertTriangle, ArrowRight, Zap, Clock, ShieldCheck } from 'lucide-react';

interface SmartDeliveryProps {
  orders: Order[];
}

const SmartDelivery: React.FC<SmartDeliveryProps> = ({ orders }) => {
  const sortedOrders = useMemo(() => {
    return [...orders]
      .filter(o => o.status === 'PENDING')
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }, [orders]);

  return (
    <div className="flex flex-col h-full -m-6 bg-slate-50 dark:bg-slate-950">
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg"><Zap className="w-6 h-6 animate-pulse"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Smart Delivery Plan</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI-Prioritized Logistics Matrix</p>
          </div>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-xl border border-indigo-100 dark:border-indigo-800">
           <span className="text-[10px] font-black uppercase text-indigo-600">Critical Path Analysis Active</span>
        </div>
      </div>

      <div className="flex-1 p-8 space-y-6 overflow-y-auto">
        {sortedOrders.map((order, idx) => (
          <div key={order.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border p-6 flex items-center gap-8 shadow-sm group hover:border-indigo-400 transition-all">
             <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center font-black text-slate-300 text-2xl">0{idx+1}</div>
             <div className="flex-1">
                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Ranked Priority Node</p>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase truncate">{order.customerName}</h3>
                <div className="flex gap-4 mt-2">
                   <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Due: {order.dueDate || order.orderDate}</span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1"><Truck className="w-3 h-3"/> {order.items.length} SKUs</span>
                </div>
             </div>
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fiscal Impact</p>
                <h4 className="text-xl font-black text-slate-800 dark:text-white tabular-nums">₹{order.totalAmount.toLocaleString()}</h4>
             </div>
             <button className="p-4 bg-indigo-600 text-white rounded-2xl shadow-xl group-hover:scale-110 transition-transform active:scale-95"><ArrowRight className="w-6 h-6"/></button>
          </div>
        ))}
        {sortedOrders.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center grayscale opacity-20 border-2 border-dashed rounded-[3rem]">
                <ShieldCheck className="w-16 h-16 mb-4"/>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Logistics Pipeline Clear</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SmartDelivery;
