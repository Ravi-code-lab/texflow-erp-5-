
import React, { useState } from 'react';
import { Machine, MaintenanceRecord } from '../types';
import { Wrench, Plus, AlertCircle, CheckCircle2, History, Calendar, Settings, Power, Trash2 } from 'lucide-react';
import BaseModal from './BaseModal';

interface AssetsProps {
  machines: Machine[];
  maintenance: MaintenanceRecord[];
  onAddMachine: (machine: Machine) => void;
  onUpdateMachine: (machine: Machine) => void;
  onDeleteMachine: (id: string) => void;
  onAddMaintenance: (record: MaintenanceRecord) => void;
  currency?: string;
}

const Assets: React.FC<AssetsProps> = ({ machines, maintenance, onAddMachine, onUpdateMachine, onDeleteMachine, onAddMaintenance, currency = '₹' }) => {
  const [activeTab, setActiveTab] = useState<'MACHINES' | 'LOGS'>('MACHINES');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  
  const [formData, setFormData] = useState<Partial<Machine>>({});
  const [serviceData, setServiceData] = useState<Partial<MaintenanceRecord>>({ type: 'ROUTINE', cost: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING': return 'bg-green-100 text-green-700 border-green-200';
      case 'STOPPED': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'MAINTENANCE': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const openModal = (machine?: Machine) => {
    if (machine) {
      setFormData({ ...machine });
    } else {
      setFormData({
        status: 'RUNNING',
        type: 'LOOM',
        purchaseDate: new Date().toISOString().split('T')[0],
        nextServiceDate: new Date().toISOString().split('T')[0]
      });
    }
    setIsModalOpen(true);
  };

  const openServiceModal = (machine: Machine) => {
    setSelectedMachine(machine);
    setServiceData({
      machineId: machine.id,
      date: new Date().toISOString().split('T')[0],
      type: 'ROUTINE',
      cost: 0,
      description: ''
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const machine: Machine = {
      id: formData.id || `MAC-${Date.now().toString().slice(-4)}`,
      ...formData
    } as Machine;

    if (formData.id) {
        onUpdateMachine(machine);
    } else {
        onAddMachine(machine);
    }
    setIsModalOpen(false);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMachine) {
      // Add Maintenance Record
      onAddMaintenance({
        id: `MAINT-${Date.now()}`,
        ...serviceData
      } as MaintenanceRecord);

      // Update Machine dates
      const nextDate = new Date(serviceData.date!);
      nextDate.setMonth(nextDate.getMonth() + 3); // Default 3 month cycle

      onUpdateMachine({
        ...selectedMachine,
        lastServiceDate: serviceData.date!,
        nextServiceDate: nextDate.toISOString().split('T')[0],
        status: 'RUNNING' // Assume running after service
      });

      setIsServiceModalOpen(false);
    }
  };

  const toggleStatus = (m: Machine) => {
    const newStatus = m.status === 'RUNNING' ? 'STOPPED' : 'RUNNING';
    onUpdateMachine({ ...m, status: newStatus });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to remove this machine permanently?')) {
        onDeleteMachine(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-indigo-600" />
            Asset Management
          </h2>
          <p className="text-xs text-slate-500 mt-1">Machine Health, Downtime & Maintenance Logs</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button onClick={() => setActiveTab('MACHINES')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'MACHINES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Machines</button>
           <button onClick={() => setActiveTab('LOGS')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'LOGS' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>History Logs</button>
        </div>

        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Machine
        </button>
      </div>

      {activeTab === 'MACHINES' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {machines.map(machine => {
             const daysToService = Math.ceil((new Date(machine.nextServiceDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
             const isDue = daysToService <= 7;

             return (
               <div key={machine.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all group relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${machine.status === 'RUNNING' ? 'bg-green-500' : machine.status === 'MAINTENANCE' ? 'bg-red-500' : 'bg-slate-400'}`}></div>
                  
                  {/* Delete Button - Now Always Visible */}
                  <button 
                    onClick={(e) => handleDelete(machine.id, e)}
                    className="absolute top-3 right-3 p-2 bg-white text-slate-400 hover:text-red-600 rounded-lg border border-slate-200 shadow-sm hover:bg-red-50 transition-colors z-20 cursor-pointer"
                    title="Remove Machine"
                    type="button"
                  >
                      <Trash2 className="w-4 h-4"/>
                  </button>

                  <div className="pl-3">
                     <div className="flex justify-between items-start mb-3">
                        <div onClick={() => openModal(machine)} className="cursor-pointer hover:text-indigo-600">
                           <h3 className="font-bold text-slate-800 text-lg">{machine.name}</h3>
                           <p className="text-xs text-slate-500 font-mono">{machine.model} • {machine.id}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold border uppercase ${getStatusColor(machine.status)}`}>
                           {machine.status}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                           <p className="text-xs text-slate-400 mb-1">Last Service</p>
                           <p className="font-medium text-slate-700 flex items-center gap-1"><History className="w-3 h-3"/> {machine.lastServiceDate}</p>
                        </div>
                        <div className={`p-2 rounded border ${isDue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                           <p className={`text-xs mb-1 ${isDue ? 'text-red-500 font-bold' : 'text-slate-400'}`}>Next Due</p>
                           <p className={`font-medium flex items-center gap-1 ${isDue ? 'text-red-700' : 'text-slate-700'}`}>
                              <Calendar className="w-3 h-3"/> {machine.nextServiceDate}
                           </p>
                        </div>
                     </div>

                     <div className="flex gap-2 pt-2 border-t border-slate-100">
                        <button 
                           onClick={() => toggleStatus(machine)}
                           className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                              machine.status === 'RUNNING' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                           }`}
                        >
                           <Power className="w-3 h-3" />
                           {machine.status === 'RUNNING' ? 'STOP' : 'START'}
                        </button>
                        <button 
                           onClick={() => openServiceModal(machine)}
                           className="flex-1 bg-indigo-50 text-indigo-600 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                        >
                           <Settings className="w-3 h-3" /> SERVICE
                        </button>
                     </div>
                  </div>
               </div>
             );
           })}
        </div>
      )}

      {activeTab === 'LOGS' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-3 font-semibold">Date</th>
                     <th className="px-6 py-3 font-semibold">Machine</th>
                     <th className="px-6 py-3 font-semibold">Type</th>
                     <th className="px-6 py-3 font-semibold">Description</th>
                     <th className="px-6 py-3 font-semibold">Technician</th>
                     <th className="px-6 py-3 font-semibold text-right">Cost</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {maintenance.map(rec => (
                     <tr key={rec.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-slate-500">{rec.date}</td>
                        <td className="px-6 py-4 font-medium text-slate-800">{machines.find(m => m.id === rec.machineId)?.name || rec.machineId}</td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-1 rounded-full text-xs font-bold ${rec.type === 'BREAKDOWN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                              {rec.type}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{rec.description}</td>
                        <td className="px-6 py-4 text-slate-600">{rec.performedBy}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{currency}{(rec.cost || 0).toLocaleString()}</td>
                     </tr>
                  ))}
                  {maintenance.length === 0 && (
                     <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic">No maintenance history available.</td></tr>
                  )}
               </tbody>
            </table>
         </div>
      )}

      {/* Add/Edit Machine Modal */}
      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add/Edit Machine Asset">
         <form onSubmit={handleSaveMachine} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Machine Name</label><input required className="w-full border rounded p-2" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-sm font-medium mb-1">Model / Serial</label><input className="w-full border rounded p-2" value={formData.model || ''} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
               <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="w-full border rounded p-2" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                     <option value="LOOM">Loom</option>
                     <option value="STITCHING">Stitching</option>
                     <option value="CUTTING">Cutting</option>
                     <option value="FINISHING">Finishing</option>
                     <option value="OTHER">Other</option>
                  </select>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-sm font-medium mb-1">Purchase Date</label><input type="date" className="w-full border rounded p-2" value={formData.purchaseDate || ''} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} /></div>
               <div><label className="block text-sm font-medium mb-1">Next Service Due</label><input type="date" className="w-full border rounded p-2" value={formData.nextServiceDate || ''} onChange={e => setFormData({...formData, nextServiceDate: e.target.value})} /></div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Save Asset</button>
         </form>
      </BaseModal>

      {/* Service Record Modal */}
      <BaseModal isOpen={isServiceModalOpen} onClose={() => setIsServiceModalOpen(false)} title={`Log Service: ${selectedMachine?.name}`}>
         <form onSubmit={handleSaveService} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select className="w-full border rounded p-2" value={serviceData.type} onChange={e => setServiceData({...serviceData, type: e.target.value as any})}>
                     <option value="ROUTINE">Routine Maintenance</option>
                     <option value="BREAKDOWN">Breakdown Repair</option>
                     <option value="REPAIR">Part Replacement</option>
                  </select>
               </div>
               <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" required className="w-full border rounded p-2" value={serviceData.date || ''} onChange={e => setServiceData({...serviceData, date: e.target.value})} /></div>
            </div>
            <div>
               <label className="block text-sm font-medium mb-1">Description / Parts Used</label>
               <textarea required rows={3} className="w-full border rounded p-2" value={serviceData.description || ''} onChange={e => setServiceData({...serviceData, description: e.target.value})} placeholder="e.g. Changed Oil, Replaced Sensor X" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="block text-sm font-medium mb-1">Cost ({currency})</label><input type="number" className="w-full border rounded p-2" value={serviceData.cost || ''} onChange={e => setServiceData({...serviceData, cost: Number(e.target.value)})} /></div>
               <div><label className="block text-sm font-medium mb-1">Technician Name</label><input className="w-full border rounded p-2" value={serviceData.performedBy || ''} onChange={e => setServiceData({...serviceData, performedBy: e.target.value})} /></div>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded hover:bg-indigo-700">Log Maintenance</button>
         </form>
      </BaseModal>
    </div>
  );
};

export default Assets;
