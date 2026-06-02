import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember, UserRole, ShiftType } from '../types';
import { 
  Users, Search, Plus, Phone, Mail, MapPin, 
  Trash2, UserCircle, 
  LayoutGrid, List, Download, Camera, 
  Briefcase, Calendar, Check, X,
  Clock, IndianRupee, Filter, Loader2,
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight
} from 'lucide-react';
import { commitImage } from '../utils/imageUtils';
import ListPage, { ColumnDef, TagFilter, BulkAction, StatusBadge } from './ListPage';

interface EmployeesProps {
  team: TeamMember[];
  onAdd: (m: TeamMember) => void;
  onUpdate: (m: TeamMember) => void;
  onDelete: (id: string) => void;
  currency?: string;
}

const Employees: React.FC<EmployeesProps> = ({ team = [], onAdd, onUpdate, onDelete, currency = '₹' }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<TeamMember>>({ 
    name: '', status: 'ACTIVE', role: 'WORKER', department: 'GENERAL', 
    dailyWage: 0, defaultShift: 'GENERAL'
  });

  const filteredTeam = useMemo(() => {
    return (team || []).filter(m => {
      const search = filter.toLowerCase();
      const name = (m.name || '').toLowerCase();
      const dept = (m.department || '').toLowerCase();
      const id = (m.id || '').toLowerCase();
      return name.includes(search) || dept.includes(search) || id.includes(search);
    });
  }, [team, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    const member = { 
      ...formData, 
      id: formData.id || `EMP-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as TeamMember;
    
    if (formData.id) onUpdate(member);
    else onAdd(member);
    
    setViewMode('LIST');
    setFormData({ name: '', status: 'ACTIVE', role: 'WORKER', department: 'GENERAL', dailyWage: 0, defaultShift: 'GENERAL' });
  };

  const openForm = (m?: TeamMember) => {
    if (m) {
       setFormData(m);
    } else {
       setFormData({ name: '', status: 'ACTIVE', role: 'WORKER', department: 'GENERAL', dailyWage: 0, defaultShift: 'GENERAL' });
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

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      ADMIN: 'text-[#ef4444] bg-[#fef2f2] border-[#fecaca]',
      MANAGER: 'text-[#8b5cf6] bg-[#f5f3ff] border-[#ddd6fe]',
      ACCOUNTANT: 'text-[#f59e0b] bg-[#fffbeb] border-[#fde68a]',
      SALES: 'text-[#10b981] bg-[#ecfdf5] border-[#a7f3d0]',
      WORKER: 'text-[#525c66] bg-[#f4f5f6] border-[#d1d8dd]'
    };
    const c = colors[role] || colors.WORKER;
    return <span className={`px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide border ${c}`}>{role === 'ADMIN' ? 'Admin' : role === 'MANAGER' ? 'Manager' : role === 'ACCOUNTANT' ? 'Accountant' : role === 'SALES' ? 'Sales' : 'Worker'}</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Active</span>
    if (status === 'INACTIVE') return <span className="bg-[#fef2f2] text-[#ef4444] border border-[#fecaca] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Inactive</span>
    return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">On Leave</span>
  };

  return (
    <div className="flex flex-col h-full font-sans antialiased -mx-4 -my-5 lg:-m-6 overflow-hidden">
       {viewMode === 'LIST' ? (() => {
          const empCols: ColumnDef<TeamMember>[] = [
            { key: 'name',       label: 'Employee Name', width: 220, render: r => (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase shrink-0">
                    {r.name?.charAt(0)}
                  </span>
                  {r.name}
                </span>
              ), sortValue: r => r.name },
            { key: 'status',     label: 'Status',        width: 110, render: r => <StatusBadge status={r.status || 'ACTIVE'} /> },
            { key: 'department', label: 'Department',    width: 160, render: r => r.department || 'General', sortValue: r => r.department || '' },
            { key: 'role',       label: 'Role',          width: 120, render: r => <StatusBadge status={r.role} />, sortValue: r => r.role },
            { key: 'defaultShift', label: 'Shift',       width: 100, render: r => r.defaultShift || '—', defaultHidden: true },
            { key: 'joiningDate',  label: 'Joined',      width: 110, render: r => r.joiningDate || '—', sortValue: r => r.joiningDate || '', defaultHidden: true },
            { key: 'dailyWage',  label: 'Daily Wage',               render: (r, cur) => `${cur}${(r.dailyWage || 0).toLocaleString()} / Day`, sortValue: r => r.dailyWage || 0, align: 'right' },
          ];
          const empTags: TagFilter[] = [
            { key: 'active',   label: 'Active',   match: r => r.status === 'ACTIVE' },
            { key: 'inactive', label: 'Inactive', match: r => r.status === 'INACTIVE' },
            { key: 'on_leave', label: 'On leave', match: r => r.status === 'ON_LEAVE' },
          ];
          const empBulk: BulkAction[] = [
            { key: 'delete', label: 'Delete', icon: Trash2, danger: true, onClick: ids => ids.forEach(id => onDelete(id)) },
          ];
          return (
            <ListPage<TeamMember>
              doctype="Employee"
              rows={team}
              columns={empCols}
              onRowClick={m => openForm(m)}
              onNew={() => openForm()}
              newLabel="New Employee"
              searchFields={['id', 'name', 'department', 'email', 'phone']}
              tagFilters={empTags}
              bulkActions={empBulk}
              currency={currency}
              emptyIcon={Users}
              emptyMessage="No employees found"
            />
          );
        })() : (
          <div className="flex flex-col h-full animate-fade-in">
             {/* ─── FORM HEADER ─── */}
             <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                     </button>
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight truncate max-w-lg">
                        {formData.id ? formData.name : 'New Employee'}
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
                     <button onClick={handleSave} disabled={isUploading} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50 disabled:opacity-50">
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                     </button>
                  </div>
               </div>

               {formData.id && (
                  <div className="flex justify-between items-center mt-3 h-8 text-[13px]">
                     <div className="flex items-center gap-4 text-[#1c2126] font-medium">
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Details</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Attendance</a>
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Payroll</a>
                     </div>
                     <div className="flex items-center gap-1">
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Print</button>
                           <button className="text-[#525c66] hover:text-[#1c2126] font-semibold px-2 py-1 rounded hover:bg-[#f4f5f6] transition-colors">Menu</button>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Identity Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Identity</h4>
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
                                     <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleFileUpload} disabled={isUploading} />
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
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-xs text-[#525c66]">Contact Number</label>
                                        <input 
                                          value={formData.phone || ''} 
                                          onChange={e => setFormData({...formData, phone: e.target.value})}
                                          className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                          placeholder="+91"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    <div className="space-y-1.5 flex flex-col">
                                        <label className="text-xs text-[#525c66]">Status</label>
                                        <div className="relative">
                                           <select 
                                              value={formData.status || 'ACTIVE'} 
                                              onChange={e => setFormData({...formData, status: e.target.value as any})}
                                              className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                           >
                                               <option value="ACTIVE">Active</option>
                                               <option value="INACTIVE">Inactive</option>
                                               <option value="ON_LEAVE">On Leave</option>
                                           </select>
                                           <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                        </div>
                                    </div>
                                </div>
                             </div>
                         </div>
                     </div>

                     {/* Job Details Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Employment Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Department</label>
                                    <input 
                                      value={formData.department || ''} 
                                      onChange={e => setFormData({...formData, department: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                      placeholder="e.g. STITCHING"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Role / Designation</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.role || 'WORKER'} 
                                          onChange={e => setFormData({...formData, role: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="WORKER">Production Worker</option>
                                           <option value="MANAGER">Unit Manager</option>
                                           <option value="ACCOUNTANT">Accountant</option>
                                           <option value="SALES">Sales Agent</option>
                                           <option value="ADMIN">Administrator</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Default Shift</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.defaultShift || 'GENERAL'} 
                                          onChange={e => setFormData({...formData, defaultShift: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="GENERAL">General (09:00 - 18:00)</option>
                                           <option value="MORNING">Morning (06:00 - 14:00)</option>
                                           <option value="EVENING">Evening (14:00 - 22:00)</option>
                                           <option value="NIGHT">Night (22:00 - 06:00)</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>
                     
                     {/* Salary Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Salary Details</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Daily Wage Structure</label>
                                    <input 
                                      type="number"
                                      value={formData.dailyWage || ''} 
                                      onChange={e => setFormData({...formData, dailyWage: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                      placeholder={`e.g. ${currency}500`}
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

export default Employees;
