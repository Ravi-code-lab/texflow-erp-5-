import React from 'react';

interface WorkOrderStockModalsProps {
  isOpen: boolean;
  mode: string | null;
  onClose: () => void;
  formData?: any;
  batchRequirements?: any[];
  currency?: string;
  onTransferSubmit?: (customItems: Record<string, number>, date: string) => void;
  onManufactureSubmit?: (completeQty: number, scrapWeight: number, date: string) => void;
}

export const WorkOrderStockModals: React.FC<WorkOrderStockModalsProps> = ({
  isOpen, mode, onClose, currency = '₹', onTransferSubmit, onManufactureSubmit
}) => {
  const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [qty, setQty] = React.useState(0);
  const [scrap, setScrap] = React.useState(0);

  if (!isOpen || !mode) return null;

  const handleSubmit = () => {
    if (mode === 'transfer') {
      onTransferSubmit?.({}, date);
    } else if (mode === 'manufacture') {
      onManufactureSubmit?.(qty, scrap, date);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-semibold text-slate-800 mb-4">
          {mode === 'transfer' ? 'Stock Transfer' : 'Manufacture Entry'}
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {mode === 'manufacture' && (
            <>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Complete Qty</label>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Scrap Weight (kg)</label>
                <input
                  type="number"
                  value={scrap}
                  onChange={(e) => setScrap(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          )}
        </div>
        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};
