import React, { useMemo } from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertTriangle, TrendingDown } from 'lucide-react';

interface SmartPurchaseProps {
  production: any[];
  designs: any[];
  inventory: any[];
  currency?: string;
}

export default function SmartPurchase({ production = [], designs = [], inventory = [], currency = '₹' }: SmartPurchaseProps) {
  // Simple smart estimation of shortages based on current active production jobs
  const purchaseSuggestions = useMemo(() => {
    const neededMap: Record<string, number> = {};

    production.forEach(job => {
      if (job.status !== 'READY' && job.status !== 'FINISHED') {
        const design = designs.find(d => d.name.toUpperCase() === job.productName.toUpperCase());
        if (design && design.recipe) {
          design.recipe.forEach((r: any) => {
            const qtyNeeded = (r.quantity || 1) * (job.quantity || 1);
            neededMap[r.materialName.toUpperCase()] = (neededMap[r.materialName.toUpperCase()] || 0) + qtyNeeded;
          });
        }
      }
    });

    return Object.entries(neededMap).map(([matKey, neededQty]) => {
      const invItem = inventory.find(i => i.name.toUpperCase() === matKey);
      const available = invItem?.quantity || 0;
      const minStock = invItem?.minStockLevel || 0;
      const deficit = Math.max(0, neededQty - available);

      return {
        name: invItem?.name || matKey,
        needed: neededQty,
        available,
        minStock,
        deficit,
        buySuggestion: deficit > 0 ? deficit : available < minStock ? minStock - available : 0
      };
    }).filter(item => item.buySuggestion > 0);
  }, [production, designs, inventory]);

  return (
    <div className="bg-indigo-50/40 dark:bg-slate-900 border border-indigo-100 dark:border-slate-800 rounded-xl p-4.5 space-y-3">
      <div className="flex justify-between items-center pb-2 border-b border-indigo-100 dark:border-slate-800">
        <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
          AI Smart Purchase Advisory
        </h4>
        <span className="px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-750 dark:text-indigo-400 border border-indigo-200/50 uppercase">
          Dynamic Insight
        </span>
      </div>

      {purchaseSuggestions.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-450 space-y-1">
          <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
          <p className="font-bold text-slate-650 dark:text-slate-300">Adequate Material Buffer</p>
          <p>Current active production queues have sufficient raw materials allocated.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Shortages detected across manufacturing jobs</p>
          <div className="space-y-2">
            {purchaseSuggestions.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-indigo-100/40 dark:border-slate-800 bg-white dark:bg-slate-950 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold text-slate-800 dark:text-white">{item.name}</span>
                  <div className="flex gap-3 text-[10px] text-slate-400 mt-1 font-mono">
                    <span>In Stock: {Math.round(item.available)}</span>
                    <span>Safety Min: {Math.round(item.minStock)}</span>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] text-rose-500 uppercase font-black tracking-wider flex items-center gap-0.5">
                    <TrendingDown className="w-3 h-3" /> Shortage
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-200 font-mono text-xs mt-0.5">
                    Order {Math.round(item.buySuggestion)} units
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
