import React, { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Machine } from '../types';
import BaseModal from './BaseModal';

interface WorkstationsProps {
  workstations: Machine[];
  onAdd: (m: Machine) => void;
  onUpdate: (m: Machine) => void;
  onDelete: (m: Machine) => void;
}

const Workstations: React.FC<WorkstationsProps> = ({ workstations, onAdd, onUpdate, onDelete }) => {
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Machine>>({});

  const filtered = workstations.filter(w => 
    w.name.toLowerCase().includes(filter.toLowerCase()) || 
    w.type.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.type) return;
    
    const ws = { 
      ...formData, 
      id: formData.id || `WS-${Date.now().toString().slice(-4)}`,
      status: formData.status || 'ACTIVE',
      purchaseDate: formData.purchaseDate || new Date().toISOString().split('T')[0],
      nextServiceDate: formData.nextServiceDate || new Date().toISOString().split('T')[0]
    } as Machine;
    
    if (formData.id) onUpdate(ws);
    else onAdd(ws);
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
         <div className="flex justify-between items-center h-8">
            <div className="flex items-center gap-3">
               <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Workstations</span>
               <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => { setFormData({}); setIsModalOpen(true); }} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                  <Plus className="w-4 h-4" />
                  Add Workstation
               </button>
            </div>
         </div>
         <div className="flex justify-between items-center mt-3 h-8">
            <div className="flex items-center gap-2">
                <div className="relative">
                   <input
                      type="text"
                      placeholder="Search Workstations..."
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                      className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                   />
                   <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                </div>
            </div>
         </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
         <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[700px]">
            <div className="grid grid-cols-6 gap-4 p-3 border-b border-[#d1d8dd] bg-[#fdfdfd] text-xs font-bold text-[#525c66] uppercase tracking-wider">
               <div className="col-span-2">Workstation Name</div>
               <div>Type</div>
               <div>Capacity</div>
               <div>Hourly Cost (₹)</div>
               <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-[#d1d8dd]">
               {filtered.map(ws => (
                 <div key={ws.id} className="grid grid-cols-6 gap-4 p-3 items-center text-[13px] text-[#1c2126] hover:bg-[#f8f9fa] transition-colors cursor-pointer">
                   <div className="col-span-2 font-medium">{ws.name}</div>
                   <div>{ws.type}</div>
                   <div>{ws.capacity || 'N/A'}</div>
                   <div className="tabular-nums font-medium">{ws.hourlyCost ? `₹${ws.hourlyCost}` : 'N/A'}</div>
                   <div className="flex justify-end gap-2 text-right">
                     <button onClick={() => { setFormData(ws); setIsModalOpen(true); }} className="text-[#2490ef] hover:underline">Edit</button>
                     <button onClick={() => onDelete(ws)} className="text-[#ef4444] hover:underline">Delete</button>
                   </div>
                 </div>
               ))}
               {filtered.length === 0 && (
                 <div className="p-8 text-center text-[#525c66] text-sm">No workstations found</div>
               )}
            </div>
         </div>
      </div>

      <BaseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={formData.id ? 'Edit Workstation' : 'New Workstation'}>
        <form onSubmit={handleSave} className="space-y-4">
           <div className="space-y-1.5 flex flex-col">
              <label className="text-xs text-[#525c66]">Workstation Name <span className="text-[#ef4444]">*</span></label>
              <input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
           </div>
           <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Operation Type <span className="text-[#ef4444]">*</span></label>
                <select required value={formData.type || ''} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]">
                   <option value="">Select...</option>
                   <option value="Cutting">Cutting</option>
                   <option value="Stitching">Stitching</option>
                   <option value="Washing">Washing</option>
                   <option value="Packaging">Packaging</option>
                   <option value="Quality">Quality Control</option>
                   <option value="Other">Other</option>
                </select>
             </div>
             <div className="space-y-1.5 flex flex-col">
                <label className="text-xs text-[#525c66]">Capacity (e.g., 500 pcs/day)</label>
                <input value={formData.capacity || ''} onChange={e => setFormData({...formData, capacity: e.target.value})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
             </div>
           </div>
           <div className="space-y-1.5 flex flex-col">
              <label className="text-xs text-[#525c66]">Estimated Hourly Cost (₹)</label>
              <input type="number" value={formData.hourlyCost || ''} onChange={e => setFormData({...formData, hourlyCost: Number(e.target.value)})} className="w-full px-2.5 py-1.5 bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]" />
           </div>
           <div className="pt-4 flex justify-end gap-2">
             <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium hover:bg-slate-50 transition-colors">Cancel</button>
             <button type="submit" className="px-4 py-2 bg-[#2490ef] text-white rounded text-[13px] font-medium hover:bg-[#2081d6] shadow-sm transition-colors">Save Workstation</button>
           </div>
        </form>
      </BaseModal>
    </div>
  );
};

export default Workstations;
