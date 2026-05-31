import React from 'react';

interface WorkOrderPrintDeskProps {
  [key: string]: any;
}

export const WorkOrderPrintDesk: React.FC<WorkOrderPrintDeskProps> = (props) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h4 className="font-semibold text-slate-700 text-sm mb-3">Print Desk</h4>
      <p className="text-slate-400 text-xs">No print formats configured.</p>
    </div>
  );
};
