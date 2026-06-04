import React, { useState } from 'react';
import { ArrowLeftRight, Plus, Eye, Trash2, ShieldAlert, Package } from 'lucide-react';

interface StockTransferProps {
  inventory: any[];
  transfers: any[];
  warehouses?: any[];
  onAdd: (transfer: any) => void;
  onUpdate: (transfer: any) => void;
  onDelete: (transfer: any) => void;
}

export default function StockTransfer({ inventory, transfers, warehouses = [], onAdd, onDelete }: StockTransferProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [material, setMaterial] = useState('');
  const [qty, setQty] = useState(0);
  const defaultSource = warehouses.length > 0 ? warehouses[0]?.name || 'Central Warehouse' : 'Central Warehouse';
  const defaultDest = warehouses.length > 1 ? warehouses[1]?.name || 'Production Floor' : 'Production Floor';
  const [source, setSource] = useState(defaultSource);
  const [dest, setDest] = useState(defaultDest);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!material || qty <= 0) return;

    onAdd({
      id: `TRF-${Date.now().toString().slice(-4)}`,
      materialName: material,
      quantity: Number(qty),
      sourceWarehouse: source,
      destinationWarehouse: dest,
      transferDate: new Date().toISOString().split('T')[0],
      status: 'COMPLETED'
    });
    setIsOpen(false);
    setMaterial('');
    setQty(0);
  };

  return (
    <div className="space-y-4 animate-fade-in bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <ArrowLeftRight className="w-5 h-5 text-indigo-500" />
            Inter-Warehouse Stock Transfers
          </h3>
          <p className="text-xs text-slate-400">Transfer processed lots or primary yarn between distinct inventory lockers.</p>
        </div>
        <button
          onClick={() => {
            setMaterial(inventory[0]?.name || '');
            setQty(10);
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Trigger Transfer
        </button>
      </div>

      {transfers.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <ArrowLeftRight className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No stock transfers logged.</p>
          <p className="text-xs text-slate-400">Warehouse dispatches will register here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200/50 dark:border-slate-850">
                <th className="p-3">Ref ID</th>
                <th className="p-3">Material Name</th>
                <th className="p-3 text-right">Transfer Qty</th>
                <th className="p-3">Source Location</th>
                <th className="p-3">Destination</th>
                <th className="p-3">Transfer Date</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Delete</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs">
              {transfers.map(trf => (
                <tr key={trf.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                  <td className="p-3 font-mono font-bold text-slate-800 dark:text-white">{trf.id}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const inv = inventory.find((i: any) => i.name === trf.materialName);
                        return inv?.imageUrl
                          ? <img src={inv.imageUrl} alt="" className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0" referrerPolicy="no-referrer" />
                          : <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-slate-400" /></div>;
                      })()}
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{trf.materialName}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-705 dark:text-slate-300">{trf.quantity}</td>
                  <td className="p-3 text-slate-450">{trf.sourceWarehouse}</td>
                  <td className="p-3 text-slate-450">{trf.destinationWarehouse}</td>
                  <td className="p-3 text-slate-500 font-mono">{trf.transferDate}</td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/25 border border-emerald-300/30 font-bold uppercase">
                      {trf.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => onDelete(trf)} className="p-1 text-slate-350 hover:text-rose-600 transition">
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
              <ArrowLeftRight className="w-4.5 h-4.5 text-indigo-500" /> Trigger Stock Transfer
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Select Material</label>
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

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Transfer Quantity</label>
                <input
                  role="textbox"
                  type="number"
                  min="1"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none font-bold font-mono"
                  value={qty}
                  onChange={e => setQty(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Source Location</label>
                  {warehouses.length > 0 ? (
                    <select
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      value={source}
                      onChange={e => setSource(e.target.value)}
                    >
                      {warehouses.map((w: any) => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      role="textbox"
                      type="text"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      value={source}
                      onChange={e => setSource(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Destination</label>
                  {warehouses.length > 0 ? (
                    <select
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      value={dest}
                      onChange={e => setDest(e.target.value)}
                    >
                      {warehouses.map((w: any) => (
                        <option key={w.id} value={w.name}>{w.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      role="textbox"
                      type="text"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                      value={dest}
                      onChange={e => setDest(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)} 
                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs"
              >
                Confirm Dispatch
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
