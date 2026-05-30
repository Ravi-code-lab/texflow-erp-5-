import React, { useState, useMemo } from 'react';
import { ProductionJob, Design, Machine, Karigar } from '../types';
import { 
  Users, Search, Plus, Filter, 
  MoreHorizontal, ArrowLeft, Save, ChevronLeft, ChevronRight,
  List, ShieldCheck, Camera, X, Check, Trash2, Settings
} from 'lucide-react';

interface ProductionJobsProps {
  jobs: ProductionJob[];
  designs: Design[];
  machines: Machine[];
  karigars?: Karigar[];
  onUpdateJob: (job: ProductionJob) => void;
  onAddJob: (job: ProductionJob) => void;
  onDeleteJob?: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const STAGES = [
  { id: 'CUTTING', label: 'Cutting' },
  { id: 'STITCHING', label: 'Stitching' },
  { id: 'FINISHING', label: 'Finishing' },
  { id: 'READY', label: 'Ready' }
];

const ProductionJobs: React.FC<ProductionJobsProps> = ({ 
  jobs, designs, machines, karigars = [], onUpdateJob, onAddJob, onDeleteJob, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  
  const [formData, setJobForm] = useState<Partial<ProductionJob>>({ 
    status: 'CUTTING', quantity: 0, progress: 0, priority: 'NORMAL', assignedMachine: '',
    deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  });

  const filteredJobs = useMemo(() => {
    const searchLower = (filter || '').toLowerCase();
    return (jobs || []).filter(j => {
      const jId = (j.id || '').toLowerCase();
      const pName = (j.productName || '').toLowerCase();
      return jId.includes(searchLower) || pName.includes(searchLower);
    });
  }, [jobs, filter]);

  // Design selection logic for batch requirement projection
  const selectedDesign = useMemo(() => designs.find(d => d.name === formData.productName), [formData.productName, designs]);
  const batchRequirements = useMemo(() => {
      if (!selectedDesign || !formData.quantity) return [];
      return (selectedDesign.recipe || []).map(r => ({
          ...r,
          totalRequired: r.quantity * (formData.quantity || 0)
      }));
  }, [selectedDesign, formData.quantity]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName || !formData.quantity) return;

    const jobData: ProductionJob = {
      id: formData.id || `JOB-${Date.now().toString().slice(-4)}`,
      productName: formData.productName!,
      quantity: formData.quantity!,
      status: formData.status || 'CUTTING',
      startDate: formData.startDate || new Date().toISOString().split('T')[0],
      deadline: formData.deadline || '',
      priority: formData.priority as any || 'NORMAL',
      progress: formData.progress || 25,
      assignedMachine: formData.assignedMachine,
      updatedAt: new Date().toISOString()
    };

    if (formData.id) onUpdateJob(jobData);
    else onAddJob(jobData);
    
    setViewMode('LIST');
  };

  const openForm = (j?: ProductionJob) => {
    if (j) {
       setJobForm(j);
    } else {
       setJobForm({ status: 'CUTTING', quantity: 0, progress: 0, priority: 'NORMAL', deadline: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0] });
    }
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'READY') return <span className="bg-[#ecfdf5] text-[#10b981] border border-[#a7f3d0] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Ready</span>
    if (status === 'CUTTING') return <span className="bg-[#fffbeb] text-[#f59e0b] border border-[#fde68a] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Cutting</span>
    if (status === 'STITCHING') return <span className="bg-[#eff6ff] text-[#3b82f6] border border-[#bfdbfe] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Stitching</span>
    return <span className="bg-[#f3e8ff] text-[#a855f7] border border-[#e9d5ff] px-2 py-[2px] rounded-md text-[11px] font-semibold tracking-wide">Finishing</span>
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden">
       {viewMode === 'LIST' ? (
          <div className="flex flex-col h-full animate-fade-in">
            {/* ─── LIST HEADER ─── */}
            <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
               <div className="flex justify-between items-center h-8">
                  <div className="flex items-center gap-3">
                     <span className="text-xl text-[#1c2126] font-bold font-sans tracking-tight">Work Order</span>
                     <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{filteredJobs.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-offset-1 focus:ring-[#2490ef]/50">
                        <Plus className="w-4 h-4" />
                        Add Work Order
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
                            placeholder="Search by ID or Product"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]"
                         />
                         <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[13px] text-[#525c66]">{filteredJobs.length > 0 ? `1 of ${filteredJobs.length}` : '0 of 0'}</span>
                     <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd]"><ChevronLeft className="w-4 h-4"/></button>
                        <button className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126]"><ChevronRight className="w-4 h-4"/></button>
                     </div>
                  </div>
               </div>
            </div>

            {/* ─── LIST BODY ─── */}
            <div className="flex-1 overflow-auto p-5 pb-10">
               <div className="bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col min-w-[900px]">
                  {/* Table Header */}
                  <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-xs text-[#525c66] select-none rounded-t">
                     <div className="w-10 flex">
                        <input type="checkbox" className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"/>
                     </div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Job ID</span></div>
                     <div className="w-64"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Product Name</span></div>
                     <div className="w-32"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Stage</span></div>
                     <div className="w-48"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Progress</span></div>
                     <div className="flex-1 min-w-0 pl-10 text-right"><span className="cursor-pointer hover:text-[#1c2126] transition-colors">Magnitude</span></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#d1d8dd]/60">
                     {filteredJobs.length === 0 && (
                        <div className="px-4 py-12 flex flex-col items-center justify-center text-[#525c66]">
                           <List className="w-8 h-8 text-[#d1d8dd] mb-3" />
                           <p className="text-[13px]">No production jobs found.</p>
                        </div>
                     )}
                     {filteredJobs.map((job) => (
                        <div key={job.id} className="group flex items-center px-4 py-[9px] hover:bg-[#f4f5f6] transition-colors cursor-pointer text-[13px]" onClick={() => openForm(job)}>
                           <div className="w-10" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={checkedIds.has(job.id)}
                                onChange={(e) => {
                                   const newSet = new Set(checkedIds);
                                   if(e.target.checked) newSet.add(job.id);
                                   else newSet.delete(job.id);
                                   setCheckedIds(newSet);
                                }}
                                className="rounded-sm border-[#d1d8dd] text-[#2490ef] focus:ring-[#2490ef] bg-white w-3.5 h-3.5 cursor-pointer"
                              />
                           </div>
                           <div className="w-32 pr-2 font-medium">
                               <a className="font-semibold text-[#1c2126] group-hover:underline cursor-pointer select-none">
                                 {job.id}
                              </a>
                           </div>
                           <div className="w-64 pr-4 truncate text-[#1c2126] font-medium">{job.productName}</div>
                           <div className="w-32">{getStatusBadge(job.status)}</div>
                           <div className="w-48 pr-4">
                               <div className="flex items-center gap-2">
                                  <div className="h-1.5 flex-1 bg-[#d1d8dd] rounded-full overflow-hidden">
                                     <div className="h-full bg-[#10b981]" style={{width: `${job.progress}%`}}></div>
                                  </div>
                                  <span className="text-xs text-[#525c66]">{job.progress}%</span>
                               </div>
                           </div>
                           <div className="flex-1 pl-10 text-right pr-4 text-[#1c2126] tabular-nums font-medium">{job.quantity} PCS</div>
                           <div className="w-16 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={(e) => { e.stopPropagation(); openForm(job); }} className="text-[#525c66] hover:text-[#1c2126]"><Settings className="w-4 h-4"/></button>
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
                        {formData.id ? formData.id : 'New Production Job'}
                     </span>
                     {formData.id && getStatusBadge(formData.status || 'CUTTING')}
                  </div>
                  <div className="flex items-center gap-2">
                     {formData.id && onDeleteJob && (
                         <button 
                            type="button"
                            onClick={(e) => { e.preventDefault(); onDeleteJob(formData.id!); setViewMode('LIST'); }} 
                            className="h-7 px-3 flex items-center gap-1.5 bg-white hover:bg-[#fef2f2] hover:text-[#ef4444] border border-[#d1d8dd] hover:border-[#ef4444] rounded text-[13px] font-medium text-[#1c2126] transition-colors shadow-sm"
                         >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                         </button>
                     )}
                     {formData.id && onAction && (
                       <>
                         <button type="button" onClick={() => onAction('CONVERT_TO_JOB_CARD', formData)} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Job Card
                         </button>
                         <button type="button" onClick={() => onAction('CONVERT_TO_MATERIAL_REQUEST', { ...formData, recipe: batchRequirements })} className="h-7 px-3 flex items-center gap-1.5 bg-[#f4f5f6] hover:bg-[#e2e6ea] border border-[#d1d8dd] text-[#1c2126] rounded text-[13px] font-medium shadow-sm transition-all focus:ring-2 focus:ring-[#2490ef]/50">
                            Create Material Request
                         </button>
                       </>
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
                           <a className="hover:underline cursor-pointer opacity-80 border-b-2 border-transparent hover:border-[#1c2126] pb-1 transition-all">Materials</a>
                     </div>
                  </div>
               )}
             </div>

             {/* ─── FORM BODY ─── */}
             <div className="flex-1 overflow-auto p-5 pb-16 flex justify-center">
                 <form onSubmit={handleSave} className="w-full max-w-[850px] space-y-4">
                     
                     {/* Specifications Card */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Item to Manufacture</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Item to Manufacture (BOM) <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <div className="relative">
                                       <select 
                                          required
                                          value={formData.productName || ''} 
                                          onChange={e => setJobForm({...formData, productName: e.target.value})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="">Select BOM...</option>
                                           {designs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Qty to Manufacture (PCS) <span className="text-[#ef4444] ml-0.5">*</span></label>
                                    <input 
                                      type="number"
                                      required
                                      value={formData.quantity || ''} 
                                      onChange={e => setJobForm({...formData, quantity: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] tabular-nums"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Planned Start Date</label>
                                    <input 
                                      type="date"
                                      value={formData.startDate || ''} 
                                      onChange={e => setJobForm({...formData, startDate: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Expected Delivery Date</label>
                                    <input 
                                      type="date"
                                      value={formData.deadline || ''} 
                                      onChange={e => setJobForm({...formData, deadline: e.target.value})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Priority</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.priority || 'NORMAL'} 
                                          onChange={e => setJobForm({...formData, priority: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="LOW">Low</option>
                                           <option value="NORMAL">Normal</option>
                                           <option value="HIGH">High</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                         
                         {/* Size-wise Breakdown */}
                          <div className="mt-6 border-t border-[#d1d8dd] pt-5">
                             <h5 className="text-xs font-bold text-[#525c66] mb-3 uppercase tracking-wider">Size-wise Breakdown</h5>
                             <div className="flex gap-3">
                                {['S', 'M', 'L', 'XL', 'XXL'].map(size => (
                                   <div key={size} className="flex-1 flex flex-col space-y-1">
                                      <label className="text-[11px] text-[#525c66] text-center font-bold">{size}</label>
                                      <input 
                                         type="number" 
                                         placeholder="0"
                                         value={formData.sizeWise?.[size] || ''}
                                         onChange={e => setJobForm({
                                           ...formData, 
                                           sizeWise: { ...(formData.sizeWise || {}), [size]: Number(e.target.value) }
                                         })}
                                         className="w-full px-2 py-1 bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] text-center tabular-nums"
                                      />
                                   </div>
                                ))}
                             </div>
                             <p className="text-[10px] text-[#8d99a6] mt-2 text-right">Sum of sizes should match Total Qty.</p>
                          </div>
                      </div>

                      {/* Infrastructure Linkages */}
                     <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                         <h4 className="font-semibold text-sm mb-5 text-[#1c2126] border-b border-[#d1d8dd] pb-2">Infrastructure & State</h4>
                         <div className="grid grid-cols-2 gap-x-16 gap-y-6">
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Protocol Stage</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.status || 'CUTTING'} 
                                          onChange={e => setJobForm({...formData, status: e.target.value as any})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] font-medium appearance-none"
                                       >
                                           <option value="CUTTING">Cutting</option>
                                           <option value="STITCHING">Stitching</option>
                                           <option value="FINISHING">Finishing</option>
                                           <option value="READY">Ready</option>
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Convergence Progress (%)</label>
                                    <input 
                                      type="number"
                                      min="0" max="100"
                                      value={formData.progress || 0} 
                                      onChange={e => setJobForm({...formData, progress: Number(e.target.value)})}
                                      className="w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Machine Cluster Assignment</label>
                                    <div className="relative">
                                       <select 
                                          value={formData.assignedMachine || ''} 
                                          onChange={e => setJobForm({...formData, assignedMachine: e.target.value})}
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="">Auto-Assign...</option>
                                           {machines.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                                <div className="space-y-1.5 flex flex-col">
                                    <label className="text-xs text-[#525c66]">Primary Karigar Node</label>
                                    <div className="relative">
                                       <select 
                                          className="w-full px-2.5 py-[6px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] transition-all text-[#1c2126] appearance-none"
                                       >
                                           <option value="">Link Personnel Node...</option>
                                           {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                       </select>
                                       <ChevronRight className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90"/>
                                    </div>
                                </div>
                            </div>
                         </div>
                     </div>
                     
                     {/* Material Projection */}
                     {batchRequirements.length > 0 && (
                          <div className="bg-[#f0f4f8] border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                             <h4 className="font-semibold text-sm mb-4 text-[#1c2126]">Required Items (From BOM)</h4>
                             <table className="w-full text-left border-collapse">
                                <thead>
                                   <tr className="bg-white text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Material</th>
                                      <th className="py-2 px-3 font-medium text-right">Unit Avg</th>
                                      <th className="py-2 pr-3 font-medium text-right">Total Required</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {batchRequirements.map((req, i) => (
                                      <tr key={i} className="border-b border-[#d1d8dd]/50 hover:bg-white/50">
                                         <td className="py-2 pl-3 font-semibold text-[#1c2126]">{req.materialName}</td>
                                         <td className="py-2 px-3 text-right text-[#525c66]">{req.quantity} {req.unit}</td>
                                         <td className="py-2 pr-3 text-right font-bold text-[#2490ef]">{req.totalRequired.toLocaleString()} {req.unit}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                      )}

                     {/* Operations Projection */}
                     {selectedDesign?.laborCosts && Object.entries(selectedDesign.laborCosts).filter(([_, cost]) => cost > 0).length > 0 && (
                          <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 text-[13px]">
                             <h4 className="font-semibold text-sm mb-4 text-[#1c2126]">Operations (Routing)</h4>
                             <table className="w-full text-left border-collapse">
                                <thead>
                                   <tr className="bg-white text-xs text-[#525c66] border-y border-[#d1d8dd]">
                                      <th className="py-2 pl-3 font-medium">Operation</th>
                                      <th className="py-2 px-3 font-medium text-right">Workstation</th>
                                      <th className="py-2 pr-3 font-medium text-right">Est. Operating Cost</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {Object.entries(selectedDesign.laborCosts || {}).filter(([_, cost]) => (cost as number) > 0).map(([operation, cost], i) => (
                                      <tr key={i} className="border-b border-[#d1d8dd] hover:bg-slate-50">
                                         <td className="py-2 pl-3 font-semibold text-[#1c2126] capitalize">{operation}</td>
                                         <td className="py-2 px-3 text-right text-[#525c66] capitalize">{operation} Station</td>
                                         <td className="py-2 pr-3 text-right font-medium text-[#1c2126]">₹{(cost as number * (formData.quantity || 1)).toLocaleString()}</td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                      )}

                     <button type="submit" className="hidden">Submit</button>
                 </form>
             </div>
          </div>
       )}
    </div>
  );
};
export default ProductionJobs;
