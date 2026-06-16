import React, { useState } from 'react';
import { FileText, Printer, ShieldCheck, Download, Award } from 'lucide-react';
import ProductImageThumb from './ProductImageThumb';

interface TaxInvoiceProps {
  orders: any[];
  customers: any[];
  onAddChallan?: (challan: any) => void;
  onUpdateChallan?: (challan: any) => void;
  currency?: string;
  companyInfo?: any;
  inventory?: any[];
  designs?: any[];
  onAddInvoice?: (item: any) => void;
  pendingOrderId?: string;
  onClearPending?: () => void;
}


export default function TaxInvoice({ orders, customers, currency = '₹', companyInfo, designs = [], inventory = [], pendingOrderId, onClearPending }: TaxInvoiceProps) {
  const [selectedOrderId, setSelectedOrderId] = useState(pendingOrderId || orders[0]?.id || '');

  // Sync selectedOrderId when a new pending order is pushed (e.g. Convert To Invoice action)
  React.useEffect(() => {
    if (pendingOrderId) {
      setSelectedOrderId(pendingOrderId);
      onClearPending?.();
    }
  }, [pendingOrderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const order = orders.find(o => o.id === selectedOrderId) || orders[0];
  const customer = customers.find(c => c.name === order?.customerName);

  const subtotal = order?.totalAmount || 0;
  const igst = subtotal * 0.18; // Standard GST allocation
  const total = subtotal + igst;

  return (
    <div className="space-y-6 animate-fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <FileText className="w-5 h-5 text-indigo-500" />
            Tax Invoice & GST Registry
          </h3>
          <p className="text-xs text-slate-401 text-slate-400">Dispatch registered tax invoices and download standardized compliance slips.</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 whitespace-nowrap">Select Order Run:</span>
          <select
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none cursor-pointer"
            value={selectedOrderId}
            onChange={e => setSelectedOrderId(e.target.value)}
          >
            {orders.map(o => (
              <option key={o.id} value={o.id}>{o.id} - {o.customerName}</option>
            ))}
          </select>
        </div>
      </div>

      {!order ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No applicable orders found.</p>
          <p className="text-xs text-slate-400">Add an active Sales Order to generate an invoice.</p>
        </div>
      ) : (
        <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/10 dark:bg-slate-950/20 max-w-2xl mx-auto space-y-6">
          {/* Invoice Header */}
          <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-850">
            <div className="flex gap-4">
              {companyInfo?.logoUrl && (
                <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg p-1 shrink-0 flex items-center justify-center">
                  <img src={companyInfo.logoUrl} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1">
                  {!companyInfo?.logoUrl && <Award className="w-5 h-5 text-indigo-600" />}
                  <span className="text-md font-black tracking-tight text-slate-900 dark:text-white">
                    {companyInfo?.name || 'TexFlow ERP Pvt Ltd'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm whitespace-pre-wrap">
                  {companyInfo?.address || 'Phase 2 Textile District.'}
                  <br />GSTIN: {companyInfo?.gstin || '27AACCV1829D1Z5'}
                  {companyInfo?.phone && <> | Ph: {companyInfo.phone}</>}
                  {companyInfo?.email && <> | Email: {companyInfo.email}</>}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-2 py-0.5 rounded text-[9px] bg-indigo-50 text-indigo-700 font-bold uppercase border border-indigo-200/40">
                Original Slip
              </span>
              <h4 className="font-mono text-sm font-black text-slate-800 dark:text-white mt-1.5">INV-T-{order.id}</h4>
              <p className="text-[9px] text-slate-400 font-mono">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Client Specs */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Billed Customer:</span>
              <p className="font-bold text-slate-800 dark:text-indigo-300 text-sm mt-0.5">{order.customerName}</p>
              <p className="text-[10px] text-slate-450 mt-1 leading-relaxed">
                {customer?.address || 'Phase 4, Global Garment District, SEZ Block 2A.'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400">Logistics & Agent:</span>
              <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{order.agentName || 'Factory Direct'}</p>
              <p className="text-[10px] text-slate-450 mt-1">Due Date: {order.dueDate || 'Immediate'}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/20 font-bold text-slate-400 text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-850">
                  <th className="p-2.5 w-10"></th>
                  <th className="p-2.5">Item Description</th>
                  <th className="p-2.5 text-right w-20">Qty</th>
                  <th className="p-2.5 text-right w-24">Price/Unit</th>
                  <th className="p-2.5 text-right w-28">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                {(order.items || []).map((i: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-2">
                      <ProductImageThumb productName={i.productName} designs={designs} inventory={inventory} size="sm" />
                    </td>
                    <td className="p-2.5 font-bold text-slate-700 dark:text-slate-205">{i.productName}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{i.quantity}</td>
                    <td className="p-2.5 text-right font-mono tabular-nums">{currency}{Math.round(i.unitPrice).toLocaleString('en-IN')}</td>
                    <td className="p-2.5 text-right font-mono font-bold tabular-nums">{currency}{Math.round(i.quantity * i.unitPrice).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tax rollup */}
          <div className="flex justify-end pt-3">
            <div className="w-64 space-y-1.5 text-xs font-semibold text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal (Excl. Tax)</span>
                <span className="font-mono text-slate-700 dark:text-slate-200">{currency}{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>IGST GST (18%)</span>
                <span className="font-mono text-slate-705 dark:text-slate-200">{currency}{igst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white">
                <span>Total Due</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">{currency}{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Print Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex justify-between items-center text-[10px] text-slate-400">
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              <ShieldCheck className="w-4 h-4" /> Validated GST Compliant Ledger
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-755 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
