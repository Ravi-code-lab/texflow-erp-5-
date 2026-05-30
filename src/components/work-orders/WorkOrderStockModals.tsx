import React, { useState, useEffect } from 'react';
import { X, Check, ArrowRight, AlertCircle, Layers } from 'lucide-react';

interface WorkOrderStockModalsProps {
  isOpen: boolean;
  mode: 'TRANSFER' | 'MANUFACTURE' | null;
  onClose: () => void;
  formData: any;
  batchRequirements: any[];
  currency: string;
  onTransferSubmit: (items: Record<string, number>, date: string) => void;
  onManufactureSubmit: (qty: number, scrap: number, date: string) => void;
}

export const WorkOrderStockModals: React.FC<WorkOrderStockModalsProps> = ({
  isOpen,
  mode,
  onClose,
  formData,
  batchRequirements,
  currency,
  onTransferSubmit,
  onManufactureSubmit
}) => {
  const [steDate, setSteDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferQtys, setTransferQtys] = useState<Record<string, number>>({});
  const [completeQty, setCompleteQty] = useState<number>(0);
  const [scrapWeight, setScrapWeight] = useState<number>(1.2);

  useEffect(() => {
    if (formData) {
      // Prefill transfer quantities to standard required quantities
      const initial: Record<string, number> = {};
      batchRequirements.forEach(r => {
        initial[r.materialName] = r.totalRequired;
      });
      setTransferQtys(initial);

      // Prefill completed pieces to remaining quantity
      const rem = (formData.quantity || 120) - (formData.producedQty || 0);
      setCompleteQty(Math.max(1, rem));
      setScrapWeight(parseFloat(((rem) * 0.035).toFixed(2)));
    }
  }, [formData, batchRequirements, isOpen]);

  if (!isOpen || !mode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fadeIn">
        
        {/* Modal Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-black uppercase font-mono tracking-widest leading-none">
              DocType: Stock Entry
            </span>
            <h3 className="font-extrabold text-[#1c2126] text-sm">
              {mode === 'TRANSFER'
                ? `Material Transfer for Manufacture (WIP Issue)`
                : `Manufacture Reciept Entry (Production Finish)`}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {mode === 'TRANSFER' ? (
            <div className="space-y-4">
              <div className="bg-blue-50/50 p-3.5 rounded border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800 font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">ERPNext Stock Instruction:</p>
                  <p>
                    This transaction issues inventory ledger stock from source warehouses into WIP. Under the Standard Cost Account, raw components will stand committed to <strong>{formData.wipWarehouse}</strong>.
                  </p>
                </div>
              </div>

              {/* Form Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Posting Date (Voucher Journal)</label>
                  <input
                    type="date"
                    value={steDate}
                    onChange={e => setSteDate(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Associated Work Order ID</label>
                  <input
                    type="text"
                    disabled
                    value={formData.id || 'Draft'}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-slate-400 rounded cursor-not-allowed font-mono font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Source Store Warehouse</label>
                  <input
                    type="text"
                    disabled
                    value={formData.sourceWarehouse}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-slate-400 rounded cursor-not-allowed text-[11.5px]"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <span className="text-slate-400 text-xs self-center py-1">➔➔ Transferring Sourcing To ➔➔</span>
                  <input
                    type="text"
                    disabled
                    value={formData.wipWarehouse}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-slate-400 rounded cursor-not-allowed text-[11.5px] font-bold"
                  />
                </div>
              </div>

              {/* Item Tables */}
              <div>
                <h4 className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-2">
                  Line Items (Component Sourced Quantities)
                </h4>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 text-right">Standard Required</th>
                        <th className="py-2.5 px-3 text-right">Transfer Quantity</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {batchRequirements.map((req, i) => (
                        <tr key={i} className="hover:bg-slate-50/40">
                          <td className="py-2.5 px-3 font-bold text-slate-800">{req.materialName}</td>
                          <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">{req.totalRequired.toLocaleString()}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min={0.1}
                              step="any"
                              value={transferQtys[req.materialName] || ''}
                              onChange={e => setTransferQtys({
                                ...transferQtys,
                                [req.materialName]: parseFloat(e.target.value) || 0
                              })}
                              className="w-24 h-7 text-right border border-slate-300 rounded font-bold px-2 tabular-nums"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-center text-[10px] text-slate-400 uppercase font-bold font-mono">
                            {req.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-3.5 rounded border border-emerald-100 flex items-start gap-2.5 text-xs text-emerald-800 font-medium leading-relaxed font-sans">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Manufacture Receipt Posting:</p>
                  <p>
                    Submit this entry to authorize finishing assembly. This increases finished goods inventory balance in <strong>{formData.targetWarehouse}</strong> and "backflushes" materials out of WIP shopfloor.
                  </p>
                </div>
              </div>

              {/* Form Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Posting Date</label>
                  <input
                    type="date"
                    value={steDate}
                    onChange={e => setSteDate(e.target.value)}
                    className="w-full h-8 px-2 border border-slate-300 rounded focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Target Finished Goods Warehouse</label>
                  <input
                    type="text"
                    disabled
                    value={formData.targetWarehouse}
                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 text-slate-400 rounded cursor-not-allowed  text-[11.5px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase font-bold">Qty to Manufacture / Record (PCS) <span className="text-[#ef4444]">*</span></label>
                  <input
                    type="number"
                    min={1}
                    max={(formData.quantity || 120) - (formData.producedQty || 0)}
                    value={completeQty}
                    onChange={e => {
                      const q = parseInt(e.target.value) || 0;
                      setCompleteQty(q);
                      setScrapWeight(parseFloat((q * 0.035).toFixed(2)));
                    }}
                    className="w-full h-8 px-2 border border-slate-300 rounded focus:outline-none font-bold text-slate-900 focus:border-indigo-500 tabular-nums"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-0.5 font-medium">
                    <span>Target Ordered: {formData.quantity}</span>
                    <span>Already Recorded: {formData.producedQty || 0}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 text-[11px] uppercase">Textile Thread/Fabric Scrap Weight (KG)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={scrapWeight}
                      onChange={e => setScrapWeight(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 pl-2 pr-10 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 tabular-nums"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase pointer-events-none">
                      KG Waste
                    </span>
                  </div>
                </div>
              </div>

              {/* Backflush preview */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded">
                <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" /> Automatic Inventory Backflush Matrix
                </h5>
                <p className="text-[10px] text-slate-400 mb-3 leading-tight">
                  Based on complete pieces ({completeQty} PCS), the following raw ingredient loads will be automatically written off from WIP {formData.wipWarehouse}:
                </p>
                <div className="divide-y divide-slate-100 text-xs text-slate-600 space-y-1.5 max-h-[140px] overflow-auto">
                  {batchRequirements.map((r, idx) => {
                    const ratio = completeQty / (formData.quantity || 1);
                    const estDeducted = parseFloat((r.totalRequired * ratio).toFixed(2));
                    return (
                      <div key={idx} className="flex justify-between items-center py-1">
                        <span className="font-bold text-slate-700">{r.materialName}</span>
                        <span className="font-mono text-zinc-500 tracking-tight">
                           -{estDeducted.toLocaleString()} {r.unit}
                        </span>
                      </div>
                    );
                  })}
                  {batchRequirements.length === 0 && (
                     <p className="text-[10.5px] text-slate-400">Standard cotton fabric lot: -{completeQty * 0.4} METER, matching thread cones: -{completeQty * 0.1} CONE.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-100 font-bold transition-all"
          >
            Cancel
          </button>
          {mode === 'TRANSFER' ? (
            <button
              onClick={() => onTransferSubmit(transferQtys, steDate)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Submit Stock Entry
            </button>
          ) : (
            <button
              onClick={() => onManufactureSubmit(completeQty, scrapWeight, steDate)}
              disabled={completeQty <= 0}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Post Finished Goods & Backflush
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
