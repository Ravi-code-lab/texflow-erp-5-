import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleLogEntry } from '../types';
import { 
  Search, Plus, Car, Filter, 
  MapPin, Wrench, MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  Trash2, Fuel
} from 'lucide-react';

interface VehiclesProps {
  vehicles: Vehicle[];
  onAdd: (v: Vehicle) => void;
  onUpdate: (v: Vehicle) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const Vehicles: React.FC<VehiclesProps> = ({ 
  vehicles, onAdd, onUpdate, onDelete, currency = '₹'
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    status: 'ACTIVE', logs: []
  });

  const [newLog, setNewLog] = useState<VehicleLogEntry>({ date: new Date().toISOString().split('T')[0], odometer: 0, fuelAdded: 0, fuelCost: 0, notes: '' });

  const filtered = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (vehicles || []).filter(o => 
      (o.registrationNumber || '').toLowerCase().includes(searchLower) ||
      (o.make || '').toLowerCase().includes(searchLower) ||
      (o.model || '').toLowerCase().includes(searchLower)
    );
  }, [vehicles, filter]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.registrationNumber) return;

    const oData = {
      ...formData,
      id: formData.id || `VEH-${Date.now().toString().slice(-4)}`,
    } as Vehicle;

    if (formData.id) onUpdate(oData);
    else onAdd(oData);
    
    setViewMode('LIST');
  };

  const openForm = (o?: Vehicle) => {
    if (o) {
       setFormData(o);
    } else {
       setFormData({
         status: 'ACTIVE', logs: []
       });
    }
    setViewMode('FORM');
  };

  const handleAddLog = () => {
    if(newLog.date) {
      setFormData({
        ...formData,
        logs: [...(formData.logs || []), { ...newLog }]
      });
      setNewLog({ date: new Date().toISOString().split('T')[0], odometer: 0, fuelAdded: 0, fuelCost: 0, notes: '' });
    }
  };

  const removeLog = (idx: number) => {
    const logs = [...(formData.logs || [])];
    logs.splice(idx, 1);
    setFormData({ ...formData, logs });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Active</span>
    if (status === 'MAINTENANCE') return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Maintenance</span>
    return <span className="bg-[#f3f4f6] text-[#6b7280] border border-[#d1d5db] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">{status}</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Vehicles</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" /> Add Vehicle
                     </button>
                  </div>
               </div>
               
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <div className="relative">
                         <input type="text" placeholder="Search Vehicles..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filtered.length > 0 ? `1 of ${filtered.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.length === 0 && (
                     <div className="col-span-full px-4 py-12 flex flex-col items-center justify-center text-[#525c66] bg-white border border-[#d1d8dd] rounded shadow-sm">
                        <Car className="w-8 h-8 text-[#d1d8dd] mb-3" />
                        <p className="text-[13px]">No vehicles found.</p>
                     </div>
                  )}
                  {filtered.map((v) => {
                     const totalFuel = (v.logs || []).reduce((acc, log) => acc + (log.fuelCost || 0), 0);
                     return (
                     <div key={v.id} onClick={() => openForm(v)} className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-[#2490ef]/50 hover:shadow transition-all cursor-pointer">
                         <div className="p-4 flex flex-col h-full border-b border-[#d1d8dd]/50">
                             <div className="flex justify-between items-start mb-2">
                                <div className="flex bg-[#f4f5f6] border border-[#d1d8dd] rounded items-center justify-center p-2 mb-2">
                                    <Car className="w-6 h-6 text-[#1c2126]"/>
                                </div>
                                {getStatusBadge(v.status)}
                             </div>
                             <h4 className="font-semibold text-lg text-[#1c2126]">{v.registrationNumber}</h4>
                             <p className="text-[13px] text-[#525c66] font-medium">{v.make} {v.model}</p>
                             
                             <div className="mt-4 flex gap-4 text-[12px]">
                                 <div className="flex items-center gap-1.5 text-[#525c66]">
                                    <Fuel className="w-4 h-4 text-[#8d99a6]"/>
                                    {currency}{totalFuel.toLocaleString()}
                                 </div>
                                 <div className="flex items-center gap-1.5 text-[#525c66]">
                                    <span className="font-medium">Driver:</span>
                                    {v.assignedDriver || 'None'}
                                 </div>
                             </div>
                         </div>
                     </div>
                  )})}
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors"><ArrowLeft className="w-4 h-4" /></button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">{formData.registrationNumber ? formData.registrationNumber : 'New Vehicle'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={handleCreate} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all">
                        <Save className="w-3.5 h-3.5" /> Save
                     </button>
                  </div>
               </div>
             </div>

             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleCreate} className="w-full max-w-[950px] space-y-4">
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Vehicle Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Registration No <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input required value={formData.registrationNumber || ''} onChange={e => setFormData({...formData, registrationNumber: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] uppercase" placeholder="GJ-01-AB-1234"/>
                                </div>
                                <div className="flex gap-4">
                                   <div className="space-y-1.5 flex flex-col flex-1">
                                       <label className="text-xs text-[#525c66]">Make</label>
                                       <input required value={formData.make || ''} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" placeholder="E.g., Tata, Eicher"/>
                                   </div>
                                   <div className="space-y-1.5 flex flex-col flex-1">
                                       <label className="text-xs text-[#525c66]">Model</label>
                                       <input required value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]" placeholder="E.g., Ace"/>
                                   </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Vehicle Type</label>
                                    <select required value={formData.type || 'TRUCK'} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="TRUCK">Truck</option>
                                       <option value="CAR">Car</option>
                                       <option value="VAN">Van</option>
                                       <option value="MOTORCYCLE">Motorcycle</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]">
                                       <option value="ACTIVE">Active</option>
                                       <option value="MAINTENANCE">Maintenance</option>
                                       <option value="SOLD">Sold</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Assigned Driver</label>
                                    <input value={formData.assignedDriver || ''} onChange={e => setFormData({...formData, assignedDriver: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]"/>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Insurance Expiry</label>
                                    <input type="date" value={formData.insuranceExpiry || ''} onChange={e => setFormData({...formData, insuranceExpiry: e.target.value})} className="w-full px-2.5 py-[5px] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef]"/>
                                </div>
                            </div>
                         </div>
                     </div>

                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Vehicle Logs (Fuel & Maintenance)</h4>
                         <div className="flex gap-2 mb-4 items-center">
                            <input type="date" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-32 focus:outline-none focus:border-[#2490ef]" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                            
                            <input type="number" step="0.1" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef]" placeholder="Odometer (km)" value={newLog.odometer || ''} onChange={e => setNewLog({...newLog, odometer: Number(e.target.value)})} />
                            
                            <input type="number" step="0.1" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef]" placeholder="Fuel Added (L)" value={newLog.fuelAdded || ''} onChange={e => setNewLog({...newLog, fuelAdded: Number(e.target.value)})} />
                            
                            <div className="relative">
                               <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6]">{currency}</span>
                               <input type="number" step="0.01" className="pl-7 pr-2.5 py-1.5 border border-[#d1d8dd] rounded w-28 focus:outline-none focus:border-[#2490ef]" placeholder="Cost" value={newLog.fuelCost || ''} onChange={e => setNewLog({...newLog, fuelCost: Number(e.target.value)})} />
                            </div>

                            <input type="text" className="px-2.5 py-1.5 border border-[#d1d8dd] rounded flex-1 focus:outline-none focus:border-[#2490ef]" placeholder="Notes (optional)..." value={newLog.notes || ''} onChange={e => setNewLog({...newLog, notes: e.target.value})}/>

                            <button type="button" onClick={handleAddLog} className="h-[30px] px-3 ml-2 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-xs font-semibold">Add Log</button>
                         </div>
                         
                         {formData.logs && formData.logs.length > 0 && (
                             <table className="w-full mt-4 text-left border-collapse">
                                <thead>
                                   <tr className="bg-[#f4f5f6] text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Date</th>
                                      <th className="py-2 px-3 font-medium text-right">Odometer</th>
                                      <th className="py-2 px-3 font-medium text-right">Fuel Added (L)</th>
                                      <th className="py-2 px-3 font-medium text-right">Cost</th>
                                      <th className="py-2 px-3 font-medium">Notes</th>
                                      <th className="py-2 pr-2 font-medium w-8"></th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {formData.logs.map((item, idx) => (
                                      <tr key={idx} className="border-b border-[#d1d8dd]/50 tabular-nums">
                                         <td className="py-2 pl-3 text-[#525c66]">{item.date}</td>
                                         <td className="py-2 px-3 text-right font-medium text-[#1c2126]">{item.odometer} km</td>
                                         <td className="py-2 px-3 text-right">{item.fuelAdded}</td>
                                         <td className="py-2 px-3 text-right">{currency}{item.fuelCost.toLocaleString()}</td>
                                         <td className="py-2 px-3 text-left text-[#525c66]">{item.notes}</td>
                                         <td className="py-2 pr-2 text-right">
                                            <button type="button" onClick={() => removeLog(idx)} className="text-[#ef4444] hover:text-[#dc2626]"><Trash2 className="w-3.5 h-3.5"/></button>
                                         </td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                         )}
                     </div>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Vehicles;
