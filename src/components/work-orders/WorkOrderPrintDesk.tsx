/**
 * WorkOrderPrintDesk.tsx
 *
 * Printable Work Order Job Card — shows all routing operations,
 * fabric consumption data synced from FabricConsumption module,
 * size breakup, and a karigar sign-off table.
 */

import React, { useRef } from 'react';
import { Printer, Package, Scissors, Calendar, Hash, User, CheckSquare, Layers } from 'lucide-react';
import type { ProductionJob, Karigar, GarmentWorkOrderOperation } from '../../types';

interface WorkOrderPrintDeskProps {
  job: Partial<ProductionJob>;
  karigars?: Karigar[];
  companyName?: string;
  currency?: string;
  [key: string]: any;
}

function formatDate(d?: string) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
}

export const WorkOrderPrintDesk: React.FC<WorkOrderPrintDeskProps> = ({
  job, karigars = [], companyName = 'TexFlow ERP', currency = '₹',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const style = document.createElement('style');
    style.id = '__wo-print-style';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #wo-print-target, #wo-print-target * { visibility: visible !important; }
        #wo-print-target { position: absolute; left: 0; top: 0; width: 100%; }
        @page { size: A4; margin: 12mm; }
      }
    `;
    document.head.appendChild(style);
    try { window.print(); }
    finally { document.head.removeChild(style); }
  };

  const ops: GarmentWorkOrderOperation[] = job.operations || [];
  const sizeWise: Record<string, number> = job.sizeWise || {};
  const cd = (job as any).customData || {};

  // Fabric data — pulled from customData (synced by FabricConsumption module)
  const fabricIssued  = cd.fabricIssuedMeters ? `${parseFloat(cd.fabricIssuedMeters).toFixed(2)} MTR` : '—';
  const fabricWaste   = cd.wasteKg ? `${parseFloat(cd.wasteKg).toFixed(2)} MTR` : '—';
  const wastePct      = cd.wastePct ? `${parseFloat(cd.wastePct).toFixed(1)}%` : '—';
  const fabricLot     = job.fabricLot || cd.fabricLot || '—';

  const completedOps  = ops.filter(o => (o.status || '').toUpperCase() === 'COMPLETED').length;
  const totalOps      = ops.length;
  const pctDone       = totalOps > 0 ? Math.round((completedOps / totalOps) * 100) : job.progress || 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center gap-2">
          <Printer className="w-4 h-4" /> Work Order Print Desk
        </h4>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold uppercase hover:opacity-90 transition-opacity"
        >
          <Printer className="w-3.5 h-3.5" /> Print Job Card
        </button>
      </div>

      {/* ── Printable area ── */}
      <div id="wo-print-target" ref={printRef} className="p-6 space-y-5 text-slate-800 dark:text-slate-200">

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-800 dark:border-slate-300 pb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{companyName}</p>
            <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">WORK ORDER JOB CARD</h1>
          </div>
          <div className="text-right">
            <p className="font-mono font-black text-slate-900 dark:text-white text-lg">{job.batchNo || job.id}</p>
            <p className="text-xs text-slate-500 mt-0.5">Printed: {formatDate(new Date().toISOString())}</p>
          </div>
        </div>

        {/* Primary info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Package,  label: 'Product',      val: job.productName },
            { icon: Hash,     label: 'Style Code',   val: job.styleCode || '—' },
            { icon: Scissors, label: 'Quantity',     val: `${job.quantity} pcs` },
            { icon: Calendar, label: 'Start Date',   val: formatDate(job.startDate) },
            { icon: Calendar, label: 'Deadline',     val: formatDate(job.deadline) },
            { icon: Package,  label: 'Status',       val: job.status },
            { icon: Package,  label: 'Priority',     val: job.priority },
            { icon: Package,  label: 'Progress',     val: `${pctDone}% (${completedOps}/${totalOps} ops)` },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-slate-400" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              </div>
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{val}</p>
            </div>
          ))}
        </div>

        {/* Fabric consumption block */}
        <div className="border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400 mb-3 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Fabric Consumption
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Fabric Lot',    val: fabricLot },
              { label: 'Issued (MTR)',  val: fabricIssued },
              { label: 'Wastage (MTR)', val: fabricWaste },
              { label: 'Wastage %',     val: wastePct },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">{label}</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
          {cd.fabricIssuedMeters ? null : (
            <p className="text-[10px] text-teal-500 mt-2 italic">
              ⚠ Fabric not yet issued. Use Fabric Consumption module to issue fabric against this Work Order.
            </p>
          )}
        </div>

        {/* Size breakup */}
        {Object.keys(sizeWise).length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Size Breakup</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sizeWise).map(([sz, qty]) => (
                <div key={sz} className="border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-center min-w-[56px]">
                  <p className="text-[9px] font-black text-slate-400 uppercase">{sz}</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{qty}</p>
                </div>
              ))}
              <div className="border-2 border-slate-800 dark:border-slate-300 rounded-lg px-3 py-2 text-center min-w-[56px]">
                <p className="text-[9px] font-black text-slate-400 uppercase">Total</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{Object.values(sizeWise).reduce((a, b) => a + b, 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Routing operations table */}
        {ops.length > 0 && (
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" /> Routing Operations ({completedOps}/{totalOps} completed)
            </h3>
            <table className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 dark:bg-slate-800 text-[9px] uppercase tracking-wider font-black text-slate-500">
                <tr>
                  {['#', 'Operation', 'Dept / Stage', 'Type', 'Planned Hrs', 'Assigned To', 'Status', 'Sign-off'].map(h => (
                    <th key={h} className="px-3 py-2 text-left border-b border-slate-200 dark:border-slate-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {ops.map((op, idx) => {
                  const karigar = karigars.find(k => k.id === op.assignedTo);
                  const statusColor =
                    op.status?.toUpperCase() === 'COMPLETED'   ? 'text-emerald-700 bg-emerald-50' :
                    op.status?.toUpperCase() === 'IN_PROGRESS' ? 'text-indigo-700 bg-indigo-50' :
                    op.status?.toUpperCase() === 'SKIPPED'     ? 'text-slate-400 bg-slate-50' :
                    'text-slate-500 bg-slate-50';
                  return (
                    <tr key={op.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-800 dark:text-slate-100">{op.name}</td>
                      <td className="px-3 py-2.5 text-slate-500">{op.stage || op.workstationType || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${op.processType === 'JOB_WORK' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {op.processType === 'JOB_WORK' ? 'Job Work' : 'In-House'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono">{op.plannedHours ?? '—'}</td>
                      <td className="px-3 py-2.5 flex items-center gap-1">
                        {karigar ? (
                          <>
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{karigar.name}</span>
                          </>
                        ) : (
                          <span className="text-slate-300">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded ${statusColor}`}>
                          {op.status || 'PENDING'}
                        </span>
                      </td>
                      {/* Sign-off box for physical print */}
                      <td className="px-3 py-2.5">
                        <div className="w-20 h-6 border border-slate-300 dark:border-slate-600 rounded" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Sign-off footer */}
        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700 print:mt-8">
          {['Production Manager', 'Quality Control', 'Dispatch / Store'].map(role => (
            <div key={role} className="text-center">
              <div className="h-10 border-b border-slate-400 dark:border-slate-500 mb-1" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{role}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
