import React, { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Package, Wrench, CircleDollarSign } from 'lucide-react';

interface WorkOrderFinancialsProps {
  operations?: any[];
  batchRequirements?: any[];
  quantity?: number;
  currency?: string;
  costingSummary?: { materialCost: number; laborCost: number; totalCost: number; costPerPiece: number };
}

export const WorkOrderFinancials: React.FC<WorkOrderFinancialsProps> = ({
  operations = [],
  batchRequirements = [],
  quantity = 0,
  currency = '₹',
  costingSummary,
}) => {
  const materialCost = costingSummary?.materialCost ?? batchRequirements.reduce((sum, r) => sum + (r.totalRequired ?? 0) * (r.estimatedCost ?? 50), 0);
  const laborCost = costingSummary?.laborCost ?? operations.reduce((sum, op) => sum + ((op.rate ?? 0) * (quantity || 1)), 0);
  const totalCost = costingSummary?.totalCost ?? (materialCost + laborCost);
  const costPerPiece = quantity > 0 ? totalCost / quantity : 0;

  const rows = [
    { label: 'Material Cost', icon: <Package className="w-3.5 h-3.5 text-blue-500" />, value: materialCost, color: 'text-blue-700' },
    { label: 'Labour / Operations', icon: <Wrench className="w-3.5 h-3.5 text-indigo-500" />, value: laborCost, color: 'text-indigo-700' },
    { label: 'Total Production Cost', icon: <CircleDollarSign className="w-3.5 h-3.5 text-slate-700" />, value: totalCost, color: 'text-slate-900', bold: true },
    { label: 'Cost Per Piece', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />, value: costPerPiece, color: 'text-emerald-700', bold: true },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
      <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-emerald-600" /> Cost Summary
      </h4>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className={`flex justify-between items-center py-2 ${i < rows.length - 1 ? 'border-b border-slate-100' : 'border-t-2 border-slate-200 pt-3 mt-1'}`}>
            <span className={`text-xs flex items-center gap-1.5 ${r.bold ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
              {r.icon} {r.label}
            </span>
            <span className={`text-xs font-black font-mono tabular-nums ${r.color}`}>
              {currency}{r.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </span>
          </div>
        ))}
      </div>
      {operations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Operations Breakdown</p>
          <div className="space-y-1.5">
            {operations.map((op, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-600 font-medium truncate max-w-[60%]">{op.name}</span>
                <span className="font-bold text-slate-700 font-mono tabular-nums">
                  {currency}{((op.rate ?? 0) * (quantity || 1)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
