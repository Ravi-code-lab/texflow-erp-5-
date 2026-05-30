import React from 'react';
import { 
  FileText, Layers, Users, History, 
  ArrowUpRight, Clock, CheckCircle2, AlertCircle, ShoppingCart
} from 'lucide-react';

interface WorkOrderConnectionsProps {
  salesOrderId: string;
  hasGeneratedMR: boolean;
  stockEntries: any[];
  onGenerateMR: () => void;
  currency: string;
  qty: number;
  productName: string;
  timelineEvents: any[];
  activePane: 'SO' | 'MR' | 'STE' | 'JC' | 'TIMELINE' | null;
  setActivePane: (p: 'SO' | 'MR' | 'STE' | 'JC' | 'TIMELINE' | null) => void;
  karigars: any[];
  karigarAssignments: Record<number, string>;
  operationsCount: number;
}

export const WorkOrderConnections: React.FC<WorkOrderConnectionsProps> = ({
  salesOrderId,
  hasGeneratedMR,
  stockEntries,
  onGenerateMR,
  currency,
  qty,
  productName,
  timelineEvents,
  activePane,
  setActivePane,
  karigars,
  karigarAssignments,
  operationsCount
}) => {
  return (
    <div className="space-y-4 font-sans text-xs">
      
      {/* CONNECTIONS BADGES BOARD */}
      <div className="bg-white border border-slate-200 rounded p-4 shadow-xs">
        <h5 className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mb-3">
          ERPNext Connected Documents
        </h5>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Sales Order Connection Badge */}
          <button
            type="button"
            onClick={() => setActivePane(activePane === 'SO' ? null : 'SO')}
            className={`p-2.5 rounded border text-left flex items-start justify-between transition-all ${
              activePane === 'SO' 
                ? 'border-indigo-600 bg-indigo-50/40 font-bold' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Sales Order</span>
              <span className="text-slate-700 font-bold truncate block max-w-[80px]">
                {salesOrderId || 'Direct SO'}
              </span>
            </div>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] select-none font-bold px-1.5 py-0.2 rounded-full self-center">
              1
            </span>
          </button>

          {/* Material Request Connection Badge */}
          <button
            type="button"
            onClick={() => setActivePane(activePane === 'MR' ? null : 'MR')}
            className={`p-2.5 rounded border text-left flex items-start justify-between transition-all ${
              activePane === 'MR' 
                ? 'border-indigo-600 bg-indigo-50/40 font-bold' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Material Req</span>
              <span className="text-slate-700 font-bold truncate block max-w-[80px]">Requisitions</span>
            </div>
            <span className={`text-[10px] select-none font-bold px-1.5 py-0.2 rounded-full self-center ${
              hasGeneratedMR ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {hasGeneratedMR ? '1' : '0'}
            </span>
          </button>

          {/* Stock Entries Connection Badge */}
          <button
            type="button"
            onClick={() => setActivePane(activePane === 'STE' ? null : 'STE')}
            className={`p-2.5 rounded border text-left flex items-start justify-between transition-all ${
              activePane === 'STE' 
                ? 'border-indigo-600 bg-indigo-50/40 font-bold' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Stock Entry</span>
              <span className="text-slate-700 font-bold truncate block max-w-[80px]">Vouchers</span>
            </div>
            <span className="bg-slate-100 text-slate-700 text-[10px] select-none font-bold px-1.5 py-0.2 rounded-full self-center">
              {stockEntries.length}
            </span>
          </button>

          {/* Job Cards Connection Badge */}
          <button
            type="button"
            onClick={() => setActivePane(activePane === 'JC' ? null : 'JC')}
            className={`p-2.5 rounded border text-left flex items-start justify-between transition-all ${
              activePane === 'JC' 
                ? 'border-indigo-600 bg-indigo-50/40 font-bold' 
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">Job Cards</span>
              <span className="text-slate-700 font-bold truncate block max-w-[80px]">Workstations</span>
            </div>
            <span className="bg-slate-100 text-slate-700 text-[10px] select-none font-bold px-1.5 py-0.2 rounded-full self-center font-mono">
              {operationsCount}
            </span>
          </button>
        </div>

        {/* Timeline trigger badge */}
        <button
          onClick={() => setActivePane(activePane === 'TIMELINE' ? null : 'TIMELINE')}
          className={`w-full mt-2.5 py-1.5 border hover:bg-zinc-50 rounded flex items-center justify-center gap-1.5 font-bold transition-all text-slate-600 text-[11px] ${
            activePane === 'TIMELINE' ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-200'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          {activePane === 'TIMELINE' ? 'Close Logs Feed' : 'View Audit History logs'}
        </button>
      </div>

      {/* DETAILED LEDGER CARD DRAWER ON SELECTING BADGE */}
      {activePane !== null && (
        <div className="bg-slate-800 text-slate-100 rounded-lg border border-slate-700 p-4 shadow-md space-y-3 animate-slideIn">
          <div className="border-b border-slate-700 pb-2 flex items-center justify-between">
            <span className="font-extrabold uppercase text-[9px] text-indigo-400 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Connection Dashboard Drawer
            </span>
            <button onClick={() => setActivePane(null)} className="text-slate-400 hover:text-white font-black">X</button>
          </div>

          {/* SALES ORDER DETAILED LOOKUP */}
          {activePane === 'SO' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                <span>Reference Document: {salesOrderId || 'SO-2026-003'}</span>
              </div>
              <p className="text-[10.5px] text-slate-300 leading-normal font-semibold">
                This manufacturing work order is associated with B2B wholesale client batch <strong>{salesOrderId || 'SO-2026-003'}</strong>. Shipping destination is flagged for premium double-layered retail packaging.
              </p>
              <div className="bg-slate-900/50 p-2.5 rounded border border-slate-700 space-y-1.5 font-mono text-[10px] text-slate-300">
                <div className="flex justify-between"><span>Client:</span> <span className="text-white font-bold">Standard Textiles Corp</span></div>
                <div className="flex justify-between"><span>Value Commitment:</span> <span className="text-emerald-400 font-bold">{currency}98,400.00</span></div>
                <div className="flex justify-between"><span>Lead Status:</span> <span className="text-indigo-400 font-bold">Dispatched (Direct Transfer)</span></div>
              </div>
            </div>
          )}

          {/* MATERIAL REQUEST REQUISITIONS */}
          {activePane === 'MR' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>DocRef: MR-2026-0001 (Sourcing)</span>
              </div>
              {hasGeneratedMR ? (
                <div className="space-y-2">
                  <div className="bg-emerald-950/40 text-emerald-300 p-2 rounded border border-emerald-900 flex items-center gap-1.5 text-[10.5px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> REQUISITION APPROVED BY LEDGER
                  </div>
                  <p className="text-[10.5px] text-slate-300 leading-normal">
                    The deficit yarn cones and fabric meters were fully purchased from our Tiruppur hosiery vendors. Stock balance matches allocation limits.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-red-950/40 text-red-300 p-2 rounded border border-red-900 flex items-center gap-1.5 text-[10.5px]">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400" /> STOCKS DEFICIENT IN SOURCE
                  </div>
                  <p className="text-[10.5px] text-slate-300">
                    Deficiencies exist in fabric lot balance. Choose to trigger a virtual requisition to replenishment.
                  </p>
                  <button
                    type="button"
                    onClick={onGenerateMR}
                    className="w-full h-7 bg-indigo-600 hover:bg-indigo-700 font-bold text-white rounded transition-colors text-[10px] uppercase.tracking-wider"
                  >
                    Resolve shortfalls: purchase
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STOCK ENTRIES LOG VOUCHERS LIST */}
          {activePane === 'STE' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>Simulated Stock Vouchers ({stockEntries.length})</span>
              </div>
              <p className="text-[10.5px] text-slate-300">
                ERP link of historical asset relocation vouchers registered against this work order:
              </p>
              <div className="space-y-1.5 font-mono text-[10px]">
                {stockEntries.map((ste) => (
                  <div key={ste.id} className="bg-slate-900/40 border border-slate-700 p-2 rounded flex flex-col gap-1 text-slate-300">
                    <div className="flex justify-between font-bold text-white">
                      <span>{ste.id}</span>
                      <span className="text-emerald-400 text-[8px] uppercase">{ste.status}</span>
                    </div>
                    <p className="text-[9px] text-slate-400">{ste.type}</p>
                    <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-400 text-[9px]">
                      <span>Source: {ste.sourceWarehouse.split(' - ')[0]}</span>
                      <span>Target: {ste.targetWarehouse.split(' - ')[0]}</span>
                    </div>
                  </div>
                ))}
                {stockEntries.length === 0 && (
                  <p className="text-slate-500 italic text-[10px]">No transfers recorded yet. Approving Material Transfer will spawn STE-M01.</p>
                )}
              </div>
            </div>
          )}

          {/* JOB CARDS & KARIGAR STATUS */}
          {activePane === 'JC' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold">
                <Users className="w-4 h-4 text-violet-400" />
                <span>Job Card Assignees Summary</span>
              </div>
              <p className="text-[10.5px] text-slate-300">
                Active workstations registered for this product assembly line are linked to the following Karigar accounts:
              </p>
              <div className="space-y-1.5 font-sans">
                {karigars.length > 0 ? (
                  Array.from({ length: operationsCount }).map((_, idx) => {
                    const kid = karigarAssignments[idx];
                    const karigar = karigars.find(k => k.id === kid);
                    return (
                      <div key={idx} className="flex justify-between items-center bg-slate-900/30 p-2 rounded border border-slate-700/60 text-[10.5px]">
                        <span className="font-mono text-indigo-300">Operation {idx+1}</span>
                        <div className="flex items-center gap-1 text-slate-200">
                          {karigar ? (
                            <>
                              <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-bold uppercase">{karigar.name.slice(0,2)}</div>
                              <span className="font-bold">{karigar.name}</span>
                            </>
                          ) : (
                            <span className="text-slate-500 italic">Unassigned (queue pool)</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-slate-500 italic font-medium leading-normal">
                     No Karigar records registered on workspace. Workstations will run on generic local labor lines.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TIMELINE EVENT TRACE */}
          {activePane === 'TIMELINE' && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-white font-bold mb-1">
                <History className="w-4 h-4 text-pink-400 animate-spin-slow" />
                <span>Audit Trail Logs Trail ({timelineEvents.length})</span>
              </div>
              <div className="space-y-2 max-h-[220px] overflow-auto pr-1">
                {timelineEvents.map((ev) => (
                  <div key={ev.id} className="border-l-2 border-slate-600 pl-2.5 py-0.5 space-y-0.5 relative text-[10.5px]">
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-slate-500"></div>
                    <div className="flex justify-between text-slate-400 text-[9px] font-mono">
                      <span>{ev.timestamp}</span>
                      <span className="uppercase text-[8px] font-bold text-slate-500">{ev.type}</span>
                    </div>
                    <h6 className="font-bold text-white text-[11px]">{ev.title}</h6>
                    <p className="text-slate-300 leading-tight">{ev.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
