import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { Info, TrendingUp, DollarSign } from 'lucide-react';

interface WorkOrderFinancialsProps {
  formData: any;
  currency: string;
  selectedDesign: any;
  operationsCount: number;
}

export const WorkOrderFinancials: React.FC<WorkOrderFinancialsProps> = ({
  formData,
  currency,
  selectedDesign,
  operationsCount
}) => {
  const quantity = formData.quantity || 120;
  const producedQty = formData.producedQty || 0;

  // Compute realistic business rollups
  const processCostPerPiece = selectedDesign?.processCostPerPiece || 150;
  const estimatedMaterialCost = quantity * (processCostPerPiece * 0.45);
  const estimatedLaborCost = quantity * (operationsCount * 25);
  const estimatedTotalCost = estimatedMaterialCost + estimatedLaborCost;

  const actualMaterialCost = formData.materialsIssued ? estimatedMaterialCost : 0;
  const actualLaborCost = Math.round((producedQty) * (operationsCount * 28)) || (formData.actualLaborCosts || 0);
  const actualTotalCost = actualMaterialCost + actualLaborCost;

  const costVariancesSummary = [
    {
      name: 'Estimates Budget',
      Material: Math.round(estimatedMaterialCost),
      Labor: Math.round(estimatedLaborCost),
    },
    {
      name: 'Actual WIP Costs',
      Material: Math.round(actualMaterialCost),
      Labor: Math.round(actualLaborCost),
    }
  ];

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-white border border-slate-200 rounded p-6 shadow-xs">
        <h4 className="font-extrabold text-[#1c2126] text-sm mb-4 border-b pb-2 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-600" />
          Financial General Ledger & Cost Variance
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Chart visualizer */}
          <div className="space-y-3">
            <h5 className="font-bold text-slate-500 uppercase tracking-wide text-[10px]">
              Actual vs Estimated Budget Stack (Ledger cost rollup)
            </h5>
            <div className="h-[220px] w-full border border-slate-100 p-2 rounded bg-slate-50/50">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costVariancesSummary} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#525c66" fontSize={11} tickLine={false} />
                  <YAxis stroke="#525c66" fontSize={11} />
                  <Tooltip />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Material" fill="#4f46e5" stackId="a" radius={[0, 0, 0, 0]} name="Material Sourced" />
                  <Bar dataKey="Labor" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} name="Labor Operations spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown parameters column */}
          <div className="flex flex-col justify-between">
            <div>
              <h5 className="font-bold text-slate-500 uppercase tracking-wide text-[10px] mb-3">
                Consolidated General Ledger Breakdown
              </h5>
              <table className="w-full text-xs font-semibold text-slate-700 leading-7">
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="text-slate-500">Material Cost Index (Estimated)</td>
                    <td className="text-right tabular-nums">{currency}{estimatedMaterialCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="text-slate-500">Labor Operation Routing Budget (Estimated)</td>
                    <td className="text-right tabular-nums">{currency}{estimatedLaborCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</td>
                  </tr>
                  <tr className="border-b border-slate-100 text-indigo-700">
                    <td className="font-extrabold uppercase text-[10px] text-indigo-505">Actual WIP Materials Sourced</td>
                    <td className="text-right font-bold tabular-nums">{currency}{actualMaterialCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</td>
                  </tr>
                  <tr className="border-b border-slate-100 text-amber-700">
                    <td className="font-extrabold uppercase text-[10px] text-amber-505">Actual Labor Routing Ledger</td>
                    <td className="text-right font-bold tabular-nums">{currency}{actualLaborCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</td>
                  </tr>
                  <tr className="border-t border-double border-slate-350 pt-2 font-black text-slate-900 text-[13px] hover:bg-slate-50">
                    <td>Total Actual Committed Overhead</td>
                    <td className="text-right tabular-nums">{currency}{actualTotalCost.toLocaleString(undefined, { maximumFractionDigits:0 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-indigo-50 border border-indigo-200/60 rounded p-4 font-semibold text-[11px] text-indigo-850 leading-relaxed mt-4">
              <div className="flex items-start gap-1.5 text-indigo-900 font-bold mb-1">
                <Info className="w-4 h-4 shrink-0" />
                <span>Standard Costing Rollup Method:</span>
              </div>
              <p className="font-medium text-[10.5px]">
                The standard-to-actual financial ledger compares materials checked out from stores ledger and raw timesheet records of workstation operations. Balance accounts post ledger adjustments upon final voucher submit.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
