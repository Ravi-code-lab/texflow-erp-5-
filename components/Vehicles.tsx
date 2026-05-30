import React, { useState } from 'react';
import { Truck, Plus, Trash2, ShieldCheck, MapPin } from 'lucide-react';

interface VehiclesProps {
  vehicles: any[];
  onAdd: (vehicle: any) => void;
  onUpdate: (vehicle: any) => void;
  onDelete: (vehicle: any) => void;
  currency?: string;
}

export default function Vehicles({ vehicles, onAdd, onDelete, currency = '₹' }: VehiclesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [driver, setDriver] = useState('');
  const [status, setStatus] = useState('AVAILABLE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plate.trim() || !model.trim()) return;

    onAdd({
      id: `VEH-${Date.now().toString().slice(-4)}`,
      plateNumber: plate,
      vehicleModel: model,
      driverName: driver || 'Direct Pool Driver',
      status,
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    setIsOpen(false);
    setPlate('');
    setModel('');
    setDriver('');
  };

  return (
    <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm animate-fade-in">
      <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            <Truck className="w-5 h-5 text-indigo-500" />
            Dispatch Logistics & Fleet Registry
          </h3>
          <p className="text-xs text-slate-400">Track and assign delivery vans and driver configurations for raw roll shipments.</p>
        </div>
        <button
          onClick={() => {
            setStatus('AVAILABLE');
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Delivery Van
        </button>
      </div>

      {vehicles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
          <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-500">No active fleet vehicles registered.</p>
          <p className="text-xs text-slate-400">Initialize vehicles to track delivery dispatches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {vehicles.map(v => (
            <div key={v.id} className="p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/5 dark:bg-slate-950 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/45 px-1.5 rounded">
                    {v.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    v.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {v.status}
                  </span>
                </div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm mt-2">{v.vehicleModel}</h4>
                <p className="text-xs text-slate-500 font-mono font-black mt-1">Plate: {v.plateNumber}</p>
                
                <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-indigo-550" />
                  <span>Assigned Operator: <span className="font-bold text-slate-700 dark:text-slate-305">{v.driverName}</span></span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button onClick={() => onDelete(v)} className="p-1 text-slate-350 hover:text-rose-650 font-bold text-xs flex items-center gap-1 transition">
                  <Trash2 className="w-3.5 h-3.5" /> Discard Van
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs animate-fade-in">
          <form onSubmit={handleSubmit} className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-805 p-5 rounded-2xl shadow-2xl space-y-4">
            <h4 className="font-extrabold text-sm text-slate-805 dark:text-white flex items-center gap-1.5">
              <Truck className="w-4.5 h-4.5 text-indigo-500" /> Register Vehicle Spot
            </h4>

            <div className="space-y-3 font-medium text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Plate / Registration Number</label>
                <input
                  role="textbox"
                  type="text"
                  required
                  placeholder="e.g. MH-12-QC-3929"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={plate}
                  onChange={e => setPlate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Vehicle Model / Fleet Spec</label>
                <input
                  role="textbox"
                  type="text"
                  required
                  placeholder="e.g. TATA Ace delivery locker"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Assigned Driver</label>
                <input
                  role="textbox"
                  type="text"
                  placeholder="e.g. Ramesh Devgan"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={driver}
                  onChange={e => setDriver(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Dispatch Ready Status</label>
                <select
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg outline-none"
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                >
                  <option value="AVAILABLE">Available / Fleet Pool</option>
                  <option value="ON_DELIVERY">On Active Route Trip</option>
                  <option value="MAINTENANCE">Under Workshop Repair</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
              <button type="button" onClick={() => setIsOpen(false)} className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg font-bold text-slate-500 text-xs">
                Cancel
              </button>
              <button type="submit" className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs">
                Acquire Vehicle Slot
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
