import React from 'react';

type ConnectionPane = 'SO' | 'MR' | 'STE' | 'JC' | 'TIMELINE' | null;

interface WorkOrderConnectionsProps {
  salesOrderId: string;
  hasGeneratedMR: boolean;
  stockEntries: any[];
  onGenerateMR: () => void;
  currency: string;
  qty: number;
  productName: string;
  timelineEvents: any[];
  activePane: ConnectionPane;
  setActivePane: React.Dispatch<React.SetStateAction<ConnectionPane>>;
  karigars?: any[];
  karigarAssignments?: any[] | Record<number, string>;
  operationsCount?: number;
}

export const WorkOrderConnections: React.FC<WorkOrderConnectionsProps> = ({
  salesOrderId, hasGeneratedMR, onGenerateMR, currency,
  qty, productName, timelineEvents, activePane, setActivePane,
  operationsCount = 0
}) => {
  const panes: Array<{ id: ConnectionPane; label: string }> = [
    { id: 'SO', label: 'Sales Order' },
    { id: 'MR', label: 'Material Req' },
    { id: 'STE', label: 'Stock Entries' },
    { id: 'JC', label: 'Job Cards' },
    { id: 'TIMELINE', label: 'Timeline' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {panes.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePane(activePane === p.id ? null : p.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activePane === p.id
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-4">
        {activePane === 'SO' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Sales Order</span>
              <span className="font-mono text-blue-600">{salesOrderId || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Product</span>
              <span className="font-medium">{productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Quantity</span>
              <span className="font-medium">{qty}</span>
            </div>
          </div>
        )}
        {activePane === 'MR' && (
          <div className="text-sm">
            {hasGeneratedMR ? (
              <p className="text-green-600 font-medium">✓ Material request generated</p>
            ) : (
              <button
                onClick={onGenerateMR}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Generate Material Request
              </button>
            )}
          </div>
        )}
        {activePane === 'TIMELINE' && (
          <div className="space-y-2">
            {timelineEvents.length > 0 ? timelineEvents.slice(0, 8).map((evt: any, i: number) => (
              <div key={i} className="flex gap-2 text-xs text-slate-600">
                <span className="text-slate-400 shrink-0">{evt.date || ''}</span>
                <span>{evt.label || evt.title || ''}</span>
              </div>
            )) : <p className="text-slate-400 text-xs">No timeline events yet.</p>}
          </div>
        )}
        {(activePane === 'STE' || activePane === 'JC') && (
          <p className="text-slate-400 text-xs">No entries yet.</p>
        )}
        {activePane === null && (
          <p className="text-slate-400 text-xs">Select a pane above to view connections.</p>
        )}
      </div>
    </div>
  );
};
