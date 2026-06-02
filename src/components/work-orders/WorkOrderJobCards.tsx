import React from 'react';

interface WorkOrderJobCardsProps {
  [key: string]: any;
}

export const WorkOrderJobCards: React.FC<WorkOrderJobCardsProps> = (props) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h4 className="font-semibold text-slate-700 text-sm mb-3">Job Cards</h4>
      <p className="text-slate-400 text-xs">No job cards yet.</p>
    </div>
  );
};
