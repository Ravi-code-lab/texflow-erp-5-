import React, { useState, useMemo } from 'react';
import { 
  Building, MapPin, Plus, Search, Filter, 
  MoreHorizontal, ArrowLeft, Save, Trash2, List,
  ChevronLeft, ChevronRight, Check
} from 'lucide-react';

interface OfficeNode {
  id: string;
  name: string;
  type: 'OFFICE' | 'GODOWN' | 'FACTORY';
  manager: string;
  address: string;
  capacity?: number;
  utilization?: number;
  status?: 'ACTIVE' | 'INACTIVE';
  tags?: string;
}

const Offices: React.FC = () => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [offices, setOffices] = useState<OfficeNode[]>([
    { id: '1', name: 'ROOT ADMINISTRATIVE HUB', type: 'OFFICE', manager: 'ADITYA SHARMA', address: 'B-BLOCK, RING ROAD, SURAT', capacity: 100, utilization: 45, status: 'ACTIVE' },
    { id: '2', name: 'SOUTH FABRIC REPOSITORY', type: 'GODOWN', manager: 'RAMESH BHAI', address: 'UDHNA GIDC, SURAT', capacity: 5000, utilization: 82, status: 'ACTIVE' },
    { id: '3', name: 'UNIT A - WEAVING CLUSTER', type: 'FACTORY', manager: 'SURESH VERMA', address: 'SACHIN GIDC, SURAT', capacity: 200, utilization: 65, status: 'ACTIVE' }
  ]);

  const [formData, setFormData] = useState<Partial<OfficeNode>>({ 
    type: 'GODOWN', status: 'ACTIVE', utilization: 0, capacity: 0 
  });

  const filteredOffices = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (offices || []).filter(o => 
      (o.name || '').toLowerCase().includes(searchLower) || 
      (o.manager || '').toLowerCase().includes(searchLower) ||
      (o.address || '').toLowerCase().includes(searchLower)
    );
  }, [offices, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    if (formData.id) {
      setOffices(offices.map(o => o.id === formData.id ? { ...formData } as OfficeNode : o));
    } else {
      setOffices([...offices, { ...formData, id: Date.now().toString() } as OfficeNode]);
    }
    setViewMode('LIST');
  };

  const openForm = (o?: OfficeNode) => {
     if(o) {
         setFormData(o);
     } else {
         setFormData({ type: 'GODOWN', status: 'ACTIVE', utilization: 0, capacity: 0 });
     }
     setViewMode('FORM');
  };

  const handleDelete = (id: string) => {
      setOffices(offices.filter(o => o.id !== id));
      setViewMode('LIST');
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Warehouse / Location</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredOffices.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Warehouse
                     </button>
                  </div>
               </div>
               
               {/* ─── FILTER BAR ─── */}
               <div className="flex justify-between items-center mt-3 h-8">
                  <div className="flex items-center gap-2">
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button className="h-7 px-2.5 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        <Filter className="w-3.5 h-3.5" /> Filter
                      </button>
                      <div className="relative">
                         <input
                            type="text"
                            placeholder="Name or Address"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredOffices.length > 0 ? `1 of ${filteredOffices.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── LIST BODY ─── */}
            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[800px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Warehouse Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Type</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Manager</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="flex-1 min-w-0"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Address</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredOffices.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <Building className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No warehouses found.</p>
                        </div>
                     )}
                     {filteredOffices.map((office) => (
                        <div key={office.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(office)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(office.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(office.id);
                                   else newSet.delete(office.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-64 pr-4 truncate">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {office.name}
                               </a>
                           </div>
                           <div className="w-32 text-[#525c66]">{office.type}</div>
                           <div className="w-48 text-[#1c2126] pr-4 truncate">{office.manager}</div>
                           <div className="w-32">
                               <span className={`px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide border ${office.status === 'ACTIVE' ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' : 'bg-[#f4f5f6] text-[#525c66] border-[#d1d8dd]'}`}>
                                  {office.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                               </span>
                           </div>
                           <div className="flex-1 truncate text-[#525c66]">{office.address}</div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
       ) : (
          <div className="flex flex-col h-full animate-fade-in">
             {/* ─── FORM HEADER ─── */}
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        {formData.id ? formData.name : 'New Warehouse'}
                     </span>
                     {formData.id && (
                        <span className={`px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide border ${formData.status === 'ACTIVE' ? 'bg-[#ecfdf5] text-[#10b981] border-[#a7f3d0]' : 'bg-[#f4f5f6] text-[#525c66] border-[#d1d8dd]'}`}>
                            {formData.status === 'ACTIVE' ? 'Enabled' : 'Disabled'}
                        </span>
                     )}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleDelete(formData.id!); }} 
                            className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                         </button>
                     )}
                     <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm">
                        Cancel
                     </button>
                     <button onClick={handleSave} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Save className="w-3.5 h-3.5" />
                        Save
                     </button>
                  </div>
               </div>
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Location Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Warehouse Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      value={formData.name || ''} 
                                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Manager</label>
                                    <input 
                                      value={formData.manager || ''} 
                                      onChange={e => setFormData({...formData, manager: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Utilization %</label>
                                    <input 
                                      type="number"
                                      value={formData.utilization || 0} 
                                      onChange={e => setFormData({...formData, utilization: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Type</label>
                                    <select 
                                       value={formData.type || 'GODOWN'} 
                                       onChange={e => setFormData({...formData, type: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    >
                                        <option value="GODOWN">Godown / Rep</option>
                                        <option value="OFFICE">Office</option>
                                        <option value="FACTORY">Factory</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Status</label>
                                    <select 
                                       value={formData.status || 'ACTIVE'} 
                                       onChange={e => setFormData({...formData, status: e.target.value as any})}
                                       className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                    >
                                        <option value="ACTIVE">Enabled</option>
                                        <option value="INACTIVE">Disabled</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Address</label>
                                    <textarea 
                                      value={formData.address || ''} 
                                      onChange={e => setFormData({...formData, address: e.target.value})}
                                      rows={2}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                         </div>
                     </div>

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Offices;
