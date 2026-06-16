import React, { useState, useMemo } from 'react';
import { uuidShort } from "../utils/uuid";
import { Karigar } from '../types';
import { 
  Users, Search, Plus, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, ShieldCheck, Camera, X, Check, Trash2, UserCircle
} from 'lucide-react';
import { commitImage } from '../utils/imageUtils';

interface KarigarsProps {
  karigars: Karigar[];
  onAdd: (k: Karigar) => void;
  onUpdate?: (k: Karigar) => void;
  onDelete?: (id: string) => void;
  currency?: string;
}

interface KarigarUI extends Karigar {
  status?: 'ACTIVE' | 'INACTIVE';
  phone?: string;
  efficiency?: number;
  profileImageUrl?: string;
  joinDate?: string;
}

const Karigars: React.FC<KarigarsProps> = ({ karigars, onAdd, onUpdate, onDelete, currency = '₹' }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  
  const [formData, setFormData] = useState<Partial<KarigarUI>>({ 
    name: '', skill: '', balance: 0, status: 'ACTIVE', efficiency: 85 
  });

  const filteredKarigars = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (karigars || []).filter(k => 
      (k.name || '').toLowerCase().includes(searchLower) || 
      (k.skill || '').toLowerCase().includes(searchLower)
    );
  }, [karigars, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const kData = { 
      ...formData, 
      id: formData.id || `KAR-${uuidShort(12)}`,
      updatedAt: new Date().toISOString()
    } as Karigar;
    
    if (formData.id && onUpdate) onUpdate(kData);
    else onAdd(kData);
    
    setViewMode('LIST');
    setFormData({ name: '', skill: '', balance: 0, status: 'ACTIVE', efficiency: 85 });
  };

  const openForm = (k?: KarigarUI) => {
    if (k) {
       setFormData(k);
    } else {
       setFormData({ name: '', skill: '', balance: 0, status: 'ACTIVE', efficiency: 85 });
    }
    setViewMode('FORM');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const resultUrl = await commitImage(file, 400);
        setFormData(prev => ({ ...prev, profileImageUrl: resultUrl }));
      } catch (err) {
        console.error("Profile photo commit failed:", err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'INACTIVE') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Inactive</span>
    return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Active</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Karigar</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredKarigars.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Karigar
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
                            placeholder="Name or Skill"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredKarigars.length > 0 ? `1 of ${filteredKarigars.length}` : '0 of 0'}</span>
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
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Karigar </span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Skill / Craft</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Status</span></div>
                     <div className="flex-1 min-w-0 pl-10 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Current Balance</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredKarigars.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <Users className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No karigars found.</p>
                        </div>
                     )}
                     {filteredKarigars.map((k: KarigarUI) => (
                        <div key={k.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(k)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(k.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(k.id);
                                   else newSet.delete(k.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-64 pr-4 truncate flex items-center gap-3">
                              <div className="w-6 h-6 rounded bg-[#f4f5f6] border border-[#d1d8dd] overflow-hidden flex items-center justify-center shrink-0">
                                  {k.profileImageUrl ? (
                                      <img src={k.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                      <UserCircle className="w-4 h-4 text-[#8d99a6]" />
                                  )}
                              </div>
                              <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {k.name}
                              </a>
                           </div>
                           <div className="w-48 truncate text-[#525c66]">{k.skill || '-'}</div>
                           <div className="w-32">{getStatusBadge(k.status || 'ACTIVE')}</div>
                           <div className={`flex-1 pl-10 truncate tabular-nums text-right font-medium pr-4 ${k.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                               {currency}{Math.abs(k.balance || 0).toLocaleString()} {k.balance >= 0 ? 'Cr' : 'Dr'}
                           </div>
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
                        {formData.id ? formData.name : 'New Karigar'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'ACTIVE')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onDelete && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDelete(formData.id!); setViewMode('LIST'); }} 
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

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Khata Ledgers</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Job Slips</a>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Identity Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Identity & Image</h4>
                         <div className="flex flex-col md:flex-row gap-8">
                             {/* Image Upload */}
                             <div className="w-32 flex flex-col gap-2 shrink-0">
                                 <label className="text-xs text-[#525c66]">Profile Image</label>
                                 <div className="w-32 h-32 rounded border border-[#d1d8dd] bg-[#fdfdfd] flex items-center justify-center relative overflow-hidden group">
                                     {formData.profileImageUrl ? (
                                         <img src={formData.profileImageUrl} className="w-full h-full object-cover" alt="Profile" />
                                     ) : (
                                         <UserCircle className="w-12 h-12 text-[#d1d8dd]" />
                                     )}
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none text-white font-medium text-xs">
                                         Upload
                                     </div>
                                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} />
                                 </div>
                             </div>
                             
                             <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-5">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-xs text-[#525c66]">Full Name <span className="text-[#ef4444] ml-0.5">*</span></label>
                                        <input 
                                          value={formData.name || ''} 
                                          onChange={e => setFormData({...formData, name: e.target.value})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col pt-3">
                                      <div className="flex items-center gap-2">
                                        <input type="checkbox" id="inactive" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] w-3.5 h-3.5 bg-white" 
                                            checked={formData.status === 'INACTIVE'}
                                            onChange={e => setFormData({...formData, status: e.target.checked ? 'INACTIVE' : 'ACTIVE'})}
                                        />
                                        <label htmlFor="inactive" className="text-[#1c2126] cursor-pointer font-medium">Is Inactive</label>
                                      </div>
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-xs text-[#525c66]">Primary Skill / Craft</label>
                                        <input 
                                          value={formData.skill || ''} 
                                          onChange={e => setFormData({...formData, skill: e.target.value})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-xs text-[#525c66]">Joining Date</label>
                                        <input 
                                          type="date"
                                          value={formData.joinDate || ''} 
                                          onChange={e => setFormData({...formData, joinDate: e.target.value})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                        />
                                    </div>
                                </div>
                             </div>
                         </div>
                     </div>

                     {/* Contact & Ledger Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Operations & Fiscal Protocol</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Mobile Phone</label>
                                    <input 
                                      value={formData.phone || ''} 
                                      onChange={e => setFormData({...formData, phone: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      placeholder="+91"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Yield Target % (Efficiency)</label>
                                    <input 
                                      type="number"
                                      value={formData.efficiency || ''} 
                                      onChange={e => setFormData({...formData, efficiency: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Opening Balance ({currency})</label>
                                    <input 
                                      type="number"
                                      value={formData.balance || ''} 
                                      onChange={e => setFormData({...formData, balance: Number(e.target.value)})}
                                      className={`w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all font-bold tabular-nums ${
                                          (formData.balance || 0) >= 0 ? "text-[#10b981]" : "text-[#ef4444]"
                                      }`}
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
export default Karigars;
