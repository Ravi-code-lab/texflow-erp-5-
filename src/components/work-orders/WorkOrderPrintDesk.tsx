import React, { useState } from 'react';
import { Printer, FileText, Tag, Download, Copy, CheckCircle2, Scissors } from 'lucide-react';

interface WorkOrderPrintDeskProps {
  workOrderId?: string;
  productName?: string;
  quantity?: number;
  styleCode?: string;
  deadline?: string;
  operations?: any[];
}

export const WorkOrderPrintDesk: React.FC<WorkOrderPrintDeskProps> = ({
  workOrderId = '—',
  productName = '—',
  quantity = 0,
  styleCode,
  deadline,
  operations = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [printFormat, setPrintFormat] = useState<'JOB_CARD' | 'JOB_SLIP' | 'BUNDLE_TAG'>('JOB_CARD');

  const handleCopyRef = () => {
    navigator.clipboard.writeText(workOrderId).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const formats = [
    { id: 'JOB_CARD' as const, label: 'Job Card', icon: <FileText className="w-3.5 h-3.5" />, desc: 'Full work order with operations & BOM' },
    { id: 'JOB_SLIP' as const, label: 'Job Slip', icon: <Scissors className="w-3.5 h-3.5" />, desc: 'Per-operation slip for floor workers' },
    { id: 'BUNDLE_TAG' as const, label: 'Bundle Tag', icon: <Tag className="w-3.5 h-3.5" />, desc: 'Print QR tags for cut bundles' },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
      <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
        <Printer className="w-4 h-4 text-slate-500" /> Print Desk
      </h4>

      {/* Format selector */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Print Format</p>
        {formats.map(f => (
          <button
            key={f.id}
            onClick={() => setPrintFormat(f.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${printFormat === f.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
          >
            <span className={`mt-0.5 ${printFormat === f.id ? 'text-indigo-600' : 'text-slate-400'}`}>{f.icon}</span>
            <div>
              <p className={`text-xs font-bold ${printFormat === f.id ? 'text-indigo-700' : 'text-slate-700'}`}>{f.label}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{f.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Preview Summary */}
      <div className="bg-slate-50 rounded-lg border border-dashed border-slate-200 p-3 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Print Preview</p>
        {[
          ['Work Order', workOrderId],
          ['Product', productName],
          ['Quantity', `${quantity} PCS`],
          ...(styleCode ? [['Style Code', styleCode]] : []),
          ...(deadline ? [['Deadline', deadline]] : []),
          ...(printFormat === 'JOB_CARD' ? [['Operations', `${operations.length} steps`]] : []),
        ].map(([label, val], i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-slate-400 font-medium">{label}</span>
            <span className="text-slate-700 font-bold font-mono">{val}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => window.print()}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Print
        </button>
        <button
          onClick={handleCopyRef}
          className={`px-3 py-2 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy ID'}
        </button>
      </div>
    </div>
  );
};
