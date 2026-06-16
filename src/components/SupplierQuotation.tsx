import React, { useState } from 'react';
import { uuidShort } from "../utils/uuid";
import { FileText, Plus, Eye, Trash2, Coins } from 'lucide-react';

interface SupplierQuotationProps {
  quotations: any[];
  suppliers: any[];
  inventory: any[];
  onAdd: (quotation: any) => void;
  onUpdate: (quotation: any) => void;
  onDelete: (quotation: any) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

export default function SupplierQuotation({ quotations, suppliers, inventory, onAdd, onDelete, onAction, currency = '₹' }: SupplierQuotationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [supplier, setSupplier] = useState(suppliers[0]?.name || '');
  const [material, setMaterial] = useState(inventory[0]?.name || '');
  const [rate, setRate] = useState(10);
  const [validDays, setValidDays] = useState(30);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !material || rate <= 0) return;

    onAdd({
      id: `SQ-${uuidShort(12)}`,
      supplierName: supplier,
      materialName: material,
      ratePerUnit: Number(rate),
      validityDays: Number(validDays),
      date: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED'
    });
    setIsOpen(false);
    setRate(10);
  };

  const handleConvertToPO = (qtn: any) => {
    if (onAction) {
      onAction('CONVERT_TO_PO', {
        supplierName: qtn.supplierName,
        items: [{ productName: qtn.materialName, quantity: 100, unitPrice: qtn.ratePerUnit }]
      });
    }
  };

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Coins className="w-5 h-5 text-indigo-550 text-indigo-500" />
            Supplier Quotations Comparison
          </h3>
          <p className="text-xs text-slate-401 text-slate-400">Log price structures submitted by raw yarn and material providers before purchasing.</p>
        </div>
        <button
          onClick={() => {
            setSupplier(suppliers[0]?.name || '');
            setMaterial(inventory[0]?.name || '');
            setRate(15);
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Quote
        </button>
      </div>

      {quotations.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-850 rounded-lg">
          <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No quotes submitted.</p>
          <p className="text-xs text-slate-400">Acquire quotations from partners to select cost-efficient lots.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-850">
                <th className="p-3">Reference</th>
                <th className="p-3">Partner Supplier</th>
                <th className="p-3">Raw Material</th>
                <th className="p-3 text-right">Offered Rate</th>
                <th className="p-3 text-center">Quote Validity</th>
                <th className="p-3 text-center">Create Document</th>
                <th className="p-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 font-semibold">
                  <td className="p-3 font-mono text-slate-800 dark:text-white font-bold">{q.id}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-200">{q.supplierName}</td>
                  <td className="p-3 text-slate-500">{q.materialName}</td>
                  <td className="p-3 text-right font-mono font-bold text-indigo-605">{currency}{q.ratePerUnit}/unit</td>
                  <td className="p-3 text-center text-slate-400 font-mono">{q.validityDays} days</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleConvertToPO(q)}
                      className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-[10px] font-bold transition cursor-pointer"
                    >
                      Make Purchase Order
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => onDelete(q)} className="p-1 text-slate-350 hover:text-rose-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 p-5 rounded-2xl shadow-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-805 dark:text-white flex items-center gap-1.5">
              <Coins className="w-4.5 h-4.5 text-indigo-500" /> Log Partner Price Quote
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Supplier</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={supplier}
                  onChange={e => setSupplier(e.target.value)}
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Target Material</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                >
                  {inventory.map(i => (
                    <option key={i.id} value={i.name}>{i.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Rate ({currency})</label>
                  <input
                    role="textbox"
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold"
                    value={rate}
                    onChange={e => setRate(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Validity (Days)</label>
                  <input
                    role="textbox"
                    type="number"
                    min="1"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                    value={validDays}
                    onChange={e => setValidDays(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs font-semibold">
                Submit Price Quote
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
