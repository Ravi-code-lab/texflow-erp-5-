import React from 'react';

interface WorkOrderFinancialsProps {
  [key: string]: any;
}

export const WorkOrderFinancials: React.FC<WorkOrderFinancialsProps> = (props) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h4 className="font-semibold text-slate-700 text-sm mb-3">Financials</h4>
      <p className="text-slate-400 text-xs">No financial data available.</p>
    </div>
  );
};
