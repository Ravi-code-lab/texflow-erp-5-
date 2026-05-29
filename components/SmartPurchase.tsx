
import React, { useMemo } from 'react';
import { ProductionJob, Design, InventoryItem } from '../types';
import { ShoppingCart, Cpu, ArrowUpRight, Boxes, History } from 'lucide-react';

interface SmartPurchaseProps {
  production: ProductionJob[];
  designs: Design[];
  inventory: InventoryItem[];
}

const SmartPurchase: React.FC<SmartPurchaseProps> = ({ production, designs, inventory }) => {
  return (
    <div className="flex flex-col h-full -m-6">
      <div className="bg-white dark:bg-slate-900 border-b p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg"><Cpu className="w-6 h-6"/></div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight dark:text-white">Smart Purchase Order</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requirement Engineering Hub</p>
          </div>
        </div>
        <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Calculate Run-Rate</button>
      </div>

      <div className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 overflow-y-auto">
         <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-[2.5rem] border p-8 shadow-sm">
            <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-8 flex items-center gap-2"><Boxes className="w-4 h-4 text-amber-500"/> Material Shortfall Forecast</h3>
            <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border flex justify-between items-center group cursor-pointer hover:border-amber-400 transition-all">
                    <div>
                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase">Item Node #00{i}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pending Approval</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Required Magnitude</p>
                        <p className="text-base font-black text-amber-600">450 KG</p>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between border border-white/5">
            <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><ShoppingCart className="w-48 h-48"/></div>
            <div className="relative z-10">
               <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4">Replenishment Logic</p>
               <h2 className="text-3xl font-black uppercase tracking-tight leading-none mb-2">Automated Procurement</h2>
               <p className="text-[11px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">Nexus system monitors consumption patterns to suggest PO shards for vendor nodes.</p>
            </div>
            <button className="relative z-10 w-full py-4 bg-white text-slate-900 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Initialize Bulk PO</button>
         </div>
      </div>
    </div>
  );
};

export default SmartPurchase;
