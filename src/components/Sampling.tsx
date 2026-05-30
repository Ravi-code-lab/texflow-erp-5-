import React, { useState, useMemo, useEffect } from 'react';
import { SampleRequest, Design, Karigar, Customer, InventoryItem } from '../types';
import { 
  FlaskRound, Plus, Search, Scissors, Truck, 
  CheckCircle, XCircle, Clock, ArrowRight, Printer, 
  Box, History, LayoutGrid, List, MoreVertical,
  Edit2, Trash2, Download, Package, Check,
  Target, FlaskConical, RefreshCcw, CheckCircle2,
  Layers, ArrowLeft, Save, Coins, ClipboardList, Settings, MessageSquare, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import BaseModal from './BaseModal';

interface SamplingProps {
  samples: SampleRequest[];
  designs: Design[];
  karigars: Karigar[];
  customers: Customer[];
  inventory?: InventoryItem[]; // Adding backing inventory support if available
  onAdd: (sample: SampleRequest) => void;
  onUpdate: (sample: SampleRequest) => void;
  onDelete: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

const STAGES = [
  { id: 'REQUESTED', label: 'Requested', color: 'text-blue-600 border-blue-200 bg-blue-50', icon: Clock },
  { id: 'DEVELOPING', label: 'Developing (In-Prod)', color: 'text-amber-600 border-amber-200 bg-amber-50', icon: Scissors },
  { id: 'SENT', label: 'Dispatched (Sent)', color: 'text-purple-600 border-purple-200 bg-purple-50', icon: Truck },
  { id: 'APPROVED', label: 'Approved & Closed', color: 'text-emerald-600 border-emerald-200 bg-emerald-50', icon: CheckCircle },
  { id: 'REJECTED', label: 'Rejected', color: 'text-rose-600 border-rose-200 bg-rose-50', icon: XCircle }
];

const Sampling: React.FC<SamplingProps> = ({ 
  samples = [], designs = [], karigars = [], customers = [], inventory = [],
  onAdd, onUpdate, onDelete, onAction, currency = '₹' 
}) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'FORM'>('LIST');
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [formTab, setFormTab] = useState<'INFO' | 'MATERIALS' | 'SPECS' | 'FEEDBACK'>('INFO');
  
  // ERPNext sampling extended states
  const [formData, setFormData] = useState<Partial<SampleRequest> & {
    styleCode?: string;
    fabricStructure?: string;
    gsm?: number;
    dyeingLotRef?: string;
    materialsUsed?: Array<{ name: string; qty: number; unit: string; rate: number }>;
    measurements?: Array<{ parameter: string; targetValue: string; actualValue: string; variance: string }>;
    trialsHistory?: Array<{ trialNo: number; date: string; feedbackText: string; status: string }>;
  }>({
    status: 'REQUESTED',
    requestDate: new Date().toISOString().split('T')[0],
    version: 1,
    sampleCost: 1500,
    styleCode: 'STL-9922',
    fabricStructure: 'Single Jersey',
    gsm: 180,
    materialsUsed: [],
    measurements: [
      { parameter: 'Chest Width', targetValue: '54 cm', actualValue: '54 cm', variance: '0' },
      { parameter: 'Body Length', targetValue: '72 cm', actualValue: '71.5 cm', variance: '-0.5 cm' },
      { parameter: 'Sleeve Length', targetValue: '22 cm', actualValue: '22 cm', variance: '0' },
      { parameter: 'Collar Circumference', targetValue: '41 cm', actualValue: '41 cm', variance: '0' }
    ],
    trialsHistory: [
      { trialNo: 1, date: new Date().toISOString().split('T')[0], feedbackText: 'Initial fit prototype for approval', status: 'DEVELOPING' }
    ]
  });

  const filteredSamples = useMemo(() => {
    const searchLower = filter.toLowerCase();
    return samples.filter(s => {
      const matchesSearch = s.designName.toLowerCase().includes(searchLower) || 
                          (s.customerName || '').toLowerCase().includes(searchLower) ||
                          (s.id || '').toLowerCase().includes(searchLower);
      const isCompleted = ['APPROVED', 'REJECTED'].includes(s.status);
      if (activeTab === 'ACTIVE') return matchesSearch && !isCompleted;
      if (activeTab === 'COMPLETED') return matchesSearch && isCompleted;
      return matchesSearch;
    });
  }, [samples, filter, activeTab]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.designName) return;

    // Check if matching design exists to auto populate values
    const design = designs.find(d => d.name === formData.designName);

    const sample = {
      ...formData,
      designId: formData.designId || design?.id,
      imageUrl: formData.imageUrl || design?.imageUrl,
      id: formData.id || `SMP-${Date.now().toString().slice(-4)}`,
      updatedAt: new Date().toISOString()
    } as SampleRequest;

    if (formData.id) onUpdate(sample);
    else onAdd(sample);
    
    setViewMode('LIST');
  };

  const openForm = (s?: SampleRequest) => {
    if (s) {
      setFormData({
        ...s,
        styleCode: (s as any).styleCode || 'STL-9922',
        fabricStructure: (s as any).fabricStructure || 'Pique Cotton',
        gsm: (s as any).gsm || 220,
        materialsUsed: (s as any).materialsUsed || [
          { name: 'Slub Cotton Fabric Raw', qty: 1.5, unit: 'MTR', rate: 250 },
          { name: 'Tailoring Threads', qty: 1, unit: 'CONE', rate: 45 },
          { name: 'Woven Neck Labels', qty: 1, unit: 'PC', rate: 10 }
        ],
        measurements: (s as any).measurements || [
          { parameter: 'Chest Width', targetValue: '54 cm', actualValue: '54 cm', variance: '0' },
          { parameter: 'Body Length', targetValue: '72 cm', actualValue: '71.5 cm', variance: '-0.5 cm' },
          { parameter: 'Sleeve Length', targetValue: '22 cm', actualValue: '22 cm', variance: '0' },
          { parameter: 'Collar Circumference', targetValue: '41 cm', actualValue: '41 cm', variance: '0' }
        ],
        trialsHistory: (s as any).trialsHistory || [
          { trialNo: 1, date: s.requestDate, feedbackText: s.feedback || 'Proto development scheduled for review.', status: s.status }
        ]
      });
    } else {
      setFormData({
        status: 'REQUESTED',
        requestDate: new Date().toISOString().split('T')[0],
        version: 1,
        sampleCost: 1500,
        styleCode: `STL-${Math.floor(1000 + Math.random() * 9000)}`,
        fabricStructure: 'Kurti Linen Blend',
        gsm: 190,
        materialsUsed: [
          { name: 'Slub Cotton Fabric Raw', qty: 1.5, unit: 'MTR', rate: 250 }
        ],
        measurements: [
          { parameter: 'Chest Width', targetValue: '54 cm', actualValue: '54 cm', variance: '0' },
          { parameter: 'Body Length', targetValue: '72 cm', actualValue: '71.5 cm', variance: '-0.5 cm' }
        ],
        trialsHistory: []
      });
    }
    setFormTab('INFO');
    setViewMode('FORM');
  };

  const getStatusBadge = (status: string) => {
    const stage = STAGES.find(s => s.id === status) || STAGES[0];
    return (
       <span className={`px-2.5 py-[3px] rounded text-[11px] font-bold uppercase border whitespace-nowrap ${stage.color}`}>
          {stage.label}
       </span>
    );
  };

  // Live total sum rollup of materials used
  const calculatedMaterialLandedCost = useMemo(() => {
    return (formData.materialsUsed || []).reduce((acc, m) => acc + (m.qty * m.rate), 0);
  }, [formData.materialsUsed]);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 rounded-tl-xl overflow-hidden shadow-inner">
        
        {viewMode === 'LIST' ? (
           <div className="flex flex-col h-full col-span-full">
              
              {/* ─── COMMAND PANEL HEADER ─── */}
              <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20">
                 <div className="flex justify-between items-center h-8">
                    <div className="flex items-center gap-3">
                       <span className="text-xl text-[#1c2126] font-bold tracking-tight">Sampling & Prototypes Registry</span>
                       <span className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">Garment CAD/Merchandise Lab</span>
                       <span className="text-xs text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium">{samples.length} prototype designs</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => openForm()} className="h-7 px-3 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 border border-transparent text-white rounded text-[13px] font-medium shadow-sm transition-all shadow-sm active:scale-95">
                          <Plus className="w-4 h-4" />
                          Launch Prototype Request
                       </button>
                    </div>
                 </div>

                 {/* ─── FILTERS STRIP ─── */}
                 <div className="flex justify-between items-center mt-3 h-8">
                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-0.5 rounded border border-slate-200 overflow-hidden">
                            {[
                                { id: 'ACTIVE', label: 'Trial Runs' },
                                { id: 'COMPLETED', label: 'Approved Shards' },
                                { id: 'ALL', label: 'All Protocols' }
                            ].map(t => (
                              <button 
                                key={t.id} 
                                onClick={() => setActiveTab(t.id as any)} 
                                className={`px-3 py-0.5 rounded text-[11px] font-bold uppercase transition-all ${activeTab === t.id ? 'bg-white text-indigo-700 border border-slate-200/50 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                              >
                                 {t.label}
                              </button>
                            ))}
                        </div>

                        <div className="relative">
                           <input
                              type="text"
                              placeholder="Search Trial ID, Design, Customer..."
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                              className="h-7 w-[280px] pl-8 pr-3 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-indigo-500 transition-all placeholder-[#8d99a6]"
                           />
                           <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
                        </div>
                    </div>
                 </div>
              </div>

              {/* STAT MATRIX PANEL */}
              <div className="px-6 pt-5 grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
                  <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center gap-3.5">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded">
                         <FlaskRound className="w-5 h-5"/>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Total Prototypes</p>
                         <h3 className="text-lg font-black text-slate-800 tabular-nums">{samples.length} Blueprints</h3>
                      </div>
                  </div>
                  <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center gap-3.5">
                      <div className="p-2.5 bg-amber-50 text-amber-600 rounded">
                         <RefreshCcw className="w-5 h-5 animate-spin-slow"/>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Active Developing</p>
                         <h3 className="text-lg font-black text-slate-800 tabular-nums">{samples.filter(s => s.status === 'DEVELOPING').length} Tries</h3>
                      </div>
                  </div>
                  <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center gap-3.5">
                      <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded">
                         <CheckCircle2 className="w-5 h-5"/>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Approved for Prod</p>
                         <h3 className="text-lg font-black text-slate-800 tabular-nums">{samples.filter(s => s.status === 'APPROVED').length} Style Codes</h3>
                      </div>
                  </div>
                  <div className="bg-white p-4 border border-[#d1d8dd] rounded shadow-sm flex items-center gap-3.5">
                      <div className="p-2.5 bg-rose-50 text-rose-600 rounded">
                         <XCircle className="w-5 h-5"/>
                      </div>
                      <div>
                         <p className="text-[10px] text-[#525c66] uppercase font-bold tracking-wider">Rejected Trials</p>
                         <h3 className="text-lg font-black text-slate-800 tabular-nums">{samples.filter(s => s.status === 'REJECTED').length} Requests</h3>
                      </div>
                  </div>
              </div>

              {/* PROTO GRID CARDS */}
              <div className="flex-1 overflow-auto p-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredSamples.length > 0 ? (
                       filteredSamples.map(sample => {
                          const design = designs.find(d => d.id === sample.designId || d.name === sample.designName);
                          const imageUrl = sample.imageUrl || design?.imageUrl;
                          return (
                             <div 
                               key={sample.id} 
                               onClick={() => openForm(sample)}
                               className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-[#2490ef] transition-all duration-200 cursor-pointer group flex flex-col justify-between overflow-hidden h-[340px]"
                             >
                                <div className="p-4 flex-1">
                                   <div className="flex justify-between items-start mb-3">
                                      <span className="text-[10px] font-mono text-slate-400 font-bold">PROTO-ID: {sample.id}</span>
                                      {getStatusBadge(sample.status)}
                                   </div>

                                   <div className="flex gap-3 items-center">
                                      <div className="w-12 h-12 bg-slate-50 border rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                         {imageUrl ? (
                                            <img src={imageUrl} alt={sample.designName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                         ) : (
                                            <FlaskConical className="w-5 h-5 text-slate-400" />
                                         )}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                         <h4 className="font-extrabold text-[#1c2126] truncate text-[13.5px] group-hover:text-indigo-600 transition-colors">{sample.designName}</h4>
                                         <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 truncate">To: {sample.customerName || 'Prospect Partner'}</p>
                                      </div>
                                   </div>

                                   <div className="mt-4 space-y-1.5 bg-[#fafbfc] border rounded p-2.5">
                                      <div className="flex justify-between text-xs text-slate-500">
                                         <span>Artisan Lead:</span>
                                         <span className="font-bold text-slate-700">{karigars.find(k => k.id === sample.artisanId)?.name || 'Direct Factory'}</span>
                                      </div>
                                      <div className="flex justify-between text-xs text-slate-500">
                                         <span>Iteration Version:</span>
                                         <span className="font-mono font-black text-slate-800 bg-slate-100 px-1 py-0.2 rounded text-[10px]">VER-{sample.version || 1}</span>
                                      </div>
                                      {sample.courierName && (
                                         <div className="flex justify-between text-xs text-slate-500 truncate">
                                            <span>Courier:</span>
                                            <span className="font-bold text-indigo-600">{sample.courierName}</span>
                                         </div>
                                      )}
                                   </div>
                                </div>

                                <div className="p-3 bg-slate-50 border-t flex justify-between items-center px-4">
                                   <div className="flex items-center gap-1.5 text-[11px] text-[#525c66] font-bold">
                                      <Clock className="w-3.5 h-3.5 text-indigo-500"/> {sample.requestDate}
                                   </div>
                                   <div>
                                      <p className="text-[9px] font-bold text-slate-400 text-right uppercase">Sample cost (Landed)</p>
                                      <p className="text-xs font-black text-slate-800 tabular-nums">{currency}{(sample.sampleCost || 1200).toLocaleString()}</p>
                                   </div>
                                </div>
                             </div>
                          );
                       })
                    ) : (
                       <div className="col-span-full py-24 text-center bg-white border border-[#d1d8dd] rounded shadow-sm flex flex-col items-center">
                          <FlaskConical className="w-12 h-12 text-[#d1d8dd] mb-3 animate-bounce-slow" />
                          <p className="text-sm font-semibold text-slate-600">No trial prototypes active or archived matching query</p>
                          <button onClick={() => openForm()} className="mt-4 px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold shadow transition-all active:scale-95">Initialize First Sample</button>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        ) : (
           <div className="flex flex-col h-full bg-[#f4f5f6]">
              {/* ─── SAMPLE Blueprints details workspace ─── */}
              <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-4 sticky top-0 z-20 shadow-sm">
                 <div className="flex justify-between items-center h-8">
                    <div className="flex items-center gap-3">
                       <button onClick={() => setViewMode('LIST')} className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f5f6] text-[#525c66] transition-colors">
                          <ArrowLeft className="w-4 h-4" />
                       </button>
                       <span className="text-[16px] text-[#1c2126] font-bold tracking-tight">
                          {formData.id ? `Sample Blueprint Room: ${formData.id}` : 'Initialize CAD Sample Prototype'}
                       </span>
                       {formData.id && getStatusBadge(formData.status || 'REQUESTED')}
                    </div>

                    <div className="flex items-center gap-2">
                       {formData.id && onDelete && (
                          <button 
                            type="button" 
                            onClick={() => { onDelete(formData.id!); setViewMode('LIST'); }}
                            className="h-7 px-2.5 flex items-center bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded text-xs transition-all shadow-sm"
                          >
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       )}

                       {formData.id && onAction && formData.status === 'APPROVED' && (
                          <button 
                            type="button" 
                            onClick={() => { onAction('CONVERT_TO_WORK_ORDER_FROM_SAMPLE', formData); setViewMode('LIST'); }}
                            className="h-7 px-3 flex items-center bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold border border-transparent tracking-tight shadow-sm transition-all flex items-center gap-1.5"
                          >
                             <Scissors className="w-3.5 h-3.5" /> Promote to Production Work Order
                          </button>
                       )}

                       <button type="button" onClick={() => setViewMode('LIST')} className="h-7 px-3 text-xs bg-white border border-slate-200 rounded text-slate-700 hover:bg-slate-50 transition-colors">
                          Cancel
                       </button>

                       <button onClick={() => handleSave()} className="h-7 px-3.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all flex items-center gap-1.5 shadow-sm">
                          <Save className="w-3.5 h-3.5" /> Save Blueprint
                       </button>
                    </div>
                 </div>

                 {/* Workflow Progression Stevals */}
                 {formData.id && (
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-[10.5px]">
                       <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mr-2">Prototype State Matrix:</span>
                       {[
                         { st: 'REQUESTED', label: 'Requested' },
                         { st: 'DEVELOPING', label: 'Artisan Workshop' },
                         { st: 'SENT', label: 'Dispatched Courier' },
                         { st: 'APPROVED', label: 'Approved & Closed' }
                       ].map((step, i) => {
                          const isActive = formData.status === step.st;
                          const isDone = ['REQUESTED', 'DEVELOPING', 'SENT', 'APPROVED'].indexOf(formData.status || '') >= ['REQUESTED', 'DEVELOPING', 'SENT', 'APPROVED'].indexOf(step.st);
                          return (
                             <React.Fragment key={step.st}>
                                {i > 0 && <span className="text-slate-300">➔</span>}
                                <span className={`px-2 py-0.5 rounded border font-bold transition-all ${isActive ? 'bg-indigo-600 text-white border-indigo-600' : isDone ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                   {step.label}
                                </span>
                             </React.Fragment>
                          );
                       })}
                    </div>
                 )}
              </div>

              {/* TABS SELECT */}
              <div className="flex-none bg-white border-b overflow-hidden border-[#d1d8dd] px-6">
                 <div className="flex gap-2">
                    {[
                      { id: 'INFO', label: 'General Specifications', icon: Settings },
                      { id: 'MATERIALS', label: 'Sampling mini-BOM', icon: Layers },
                      { id: 'SPECS', label: 'Measurements Audit', icon: ClipboardList },
                      { id: 'FEEDBACK', label: 'Client Trial Feedback', icon: MessageSquare }
                    ].map(t => (
                       <button
                         key={t.id}
                         type="button"
                         onClick={() => setFormTab(t.id as any)}
                         className={`px-4 py-3 text-[12px] font-extrabold uppercase border-b-2 transition-all flex items-center gap-1.5 ${formTab === t.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/10' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                       >
                          <t.icon className="w-3.5 h-3.5" />
                          {t.label}
                       </button>
                    ))}
                 </div>
              </div>

              {/* TABS CONTAINER */}
              <div className="flex-1 overflow-auto p-6 flex justify-center pb-20">
                 <div className="w-full max-w-[950px] space-y-6">
                    
                    {/* TAB 1: INFO */}
                    {formTab === 'INFO' && (
                       <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                          
                          <div className="space-y-4">
                             <h4 className="font-extrabold text-[#1c2126] text-sm mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
                                <Info className="w-4 h-4 text-indigo-600" /> Basic Information Rules
                             </h4>
                             <div className="space-y-1">
                                <label className="text-xs text-[#525c66] font-bold">Design Reference SKU<span className="text-red-500 ml-0.5">*</span></label>
                                <div className="relative">
                                   <input 
                                     list="modal-design-list" 
                                     required 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 text-slate-800 font-semibold uppercase"
                                     value={formData.designName || ''} 
                                     onChange={e => {
                                        const design = designs.find(d => d.name === e.target.value.toUpperCase());
                                        setFormData({
                                          ...formData, 
                                          designName: e.target.value.toUpperCase(), 
                                          designId: design?.id, 
                                          imageUrl: design?.imageUrl,
                                        });
                                     }} 
                                     placeholder="e.g. kurti-blue-2025"
                                   />
                                   <datalist id="modal-design-list">{designs.map(d => <option key={d.id} value={d.name}/>)}</datalist>
                                </div>
                             </div>

                             <div className="space-y-1">
                                <label className="text-xs text-[#525c66] font-bold">Customer linkage</label>
                                <input 
                                  list="modal-cust-list" 
                                  className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 uppercase text-slate-800 font-semibold"
                                  value={formData.customerName || ''} 
                                  onChange={e => setFormData({...formData, customerName: e.target.value.toUpperCase()})}
                                  placeholder="Prospect Enterprise"
                                />
                                <datalist id="modal-cust-list">{customers.map(c => <option key={c.id} value={c.name}/>)}</datalist>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-1">
                                  <label className="text-xs text-[#525c66] font-bold">Artisan Assignment</label>
                                  <select 
                                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-indigo-500 text-slate-800"
                                    value={formData.artisanId || ''} 
                                    onChange={e => setFormData({...formData, artisanId: e.target.value})}
                                  >
                                     <option value="">Link Karigar...</option>
                                     {karigars.map(k => <option key={k.id} value={k.id}>{k.name} ({k.skill})</option>)}
                                  </select>
                               </div>
                               <div className="space-y-1">
                                  <label className="text-xs text-[#525c66] font-bold">Prototype Stage</label>
                                  <select 
                                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold outline-none focus:border-indigo-500 text-slate-800"
                                    value={formData.status || 'REQUESTED'} 
                                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                                  >
                                     {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                  </select>
                               </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">Style Code No</label>
                                   <input 
                                     type="text" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500" 
                                     value={formData.styleCode || ''}
                                     onChange={e => setFormData({ ...formData, styleCode: e.target.value })}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">Iteration Version No</label>
                                   <input 
                                     type="number" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 tabular-nums font-black" 
                                     value={formData.version || 1} 
                                     onChange={e => setFormData({...formData, version: Number(e.target.value)})}
                                   />
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">CAD Request Date</label>
                                   <input 
                                     type="date" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs font-bold outline-none text-[#1c2126]" 
                                     value={formData.requestDate || ''} 
                                     onChange={e => setFormData({...formData, requestDate: e.target.value})}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">Expected Dispatch Date</label>
                                   <input 
                                     type="date" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs font-bold outline-none text-[#1c2126]" 
                                     value={formData.expectedDate || ''} 
                                     onChange={e => setFormData({...formData, expectedDate: e.target.value})}
                                   />
                                </div>
                             </div>
                          </div>

                          {/* Technical & Preview Module */}
                          <div className="space-y-4">
                             <h4 className="font-extrabold text-[#1c2126] text-sm mb-4 border-b border-slate-50 pb-2 flex items-center gap-1">
                                <Package className="w-4 h-4 text-indigo-600" /> Technical Style Preview
                             </h4>
                             <div className="border border-slate-200 rounded-lg overflow-hidden shrink-0 aspect-video w-full bg-[#f4f5f6] flex items-center justify-center relative">
                                {formData.imageUrl ? (
                                   <img src={formData.imageUrl} alt="Reference Sketch" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                   <div className="text-center text-slate-400 text-xs">
                                      <FlaskConical className="w-10 h-10 mx-auto text-slate-300 mb-2"/>
                                      No Style Sketch Photo Uploaded for prototype.
                                   </div>
                                )}
                             </div>

                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">Fabric Structure</label>
                                   <input 
                                     type="text" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500" 
                                     placeholder="e.g. 100% Cotton French Terry"
                                     value={formData.fabricStructure || ''}
                                     onChange={e => setFormData({ ...formData, fabricStructure: e.target.value })}
                                   />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-xs text-[#525c66] font-bold">Yarn weight index (GSM)</label>
                                   <input 
                                     type="number" 
                                     className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-indigo-500 font-bold tabular-nums" 
                                     value={formData.gsm || ''}
                                     onChange={e => setFormData({ ...formData, gsm: Number(e.target.value) })}
                                   />
                                </div>
                             </div>
                          </div>
                       </div>
                    )}

                    {/* TAB 2: MATERIALS mini-BOM */}
                    {formTab === 'MATERIALS' && (
                       <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 space-y-6">
                           <div>
                              <h4 className="font-extrabold text-[#1c2126] text-sm flex items-center gap-1.5">
                                 <Layers className="w-4 h-4 text-indigo-600" /> Sampling Trial Resource Sheet (Mini BOM)
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-black">Specify direct inventory items consumed to craft this sample</p>
                           </div>

                           <div className="border border-slate-200 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                       <th className="py-2.5 pl-3">Raw Consumed Stock</th>
                                       <th className="py-2.5 px-3">Unit</th>
                                       <th className="py-2.5 px-3 text-right">Required Qty</th>
                                       <th className="py-2.5 px-3 text-right">Cost Rate</th>
                                       <th className="py-2.5 pr-4 text-right">Landed Cost</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                    {(formData.materialsUsed || []).map((m, idx) => (
                                       <tr key={idx} className="hover:bg-slate-50">
                                          <td className="py-2.5 pl-3 text-slate-850 font-bold">{m.name}</td>
                                          <td className="py-2.5 px-3 text-slate-500">{m.unit}</td>
                                          <td className="py-2.5 px-3 text-right tabular-nums">{m.qty}</td>
                                          <td className="py-2.5 px-3 text-right tabular-nums">{currency}{m.rate}</td>
                                          <td className="py-2.5 pr-4 text-right text-slate-800 font-bold tabular-nums">{currency}{(m.qty * m.rate).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                       </tr>
                                    ))}
                                    <tr className="bg-zinc-50 border-t border-slate-200/80 font-bold">
                                       <td colSpan={4} className="py-2 px-3 text-right uppercase tracking-wider text-[10px] text-slate-500">Sampling Direct Resource Cost:</td>
                                       <td className="py-2 pr-4 text-right text-sm text-indigo-700 tabular-nums">{currency}{calculatedMaterialLandedCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>

                           <div className="bg-[#f0f4f8]/50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                              <div className="flex gap-2 items-center">
                                 <Coins className="w-5 h-5 text-indigo-650" />
                                 <div>
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Consolidated Prototype Cost Sheets</p>
                                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">Estimated courier dispatch cost & labor rate rollups included</p>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <p className="text-[9px] uppercase font-bold text-slate-400">Total Capital Spent</p>
                                 <p className="text-lg font-mono font-black text-slate-850">{currency}{(calculatedMaterialLandedCost + (formData.courierCost || 350)).toLocaleString()}</p>
                              </div>
                           </div>
                       </div>
                    )}

                    {/* TAB 3: SPECS Measurement Checks */}
                    {formTab === 'SPECS' && (
                       <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 space-y-6">
                           <div>
                              <h4 className="font-extrabold text-[#1c2126] text-sm flex items-center gap-1.5">
                                 <ClipboardList className="w-4 h-4 text-indigo-600" /> Measurements Sheet & Specs Checkpoints
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-black">Audit target specifications against prototype measurements</p>
                           </div>

                           <div className="border border-slate-200 rounded overflow-hidden">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="bg-slate-50 text-[10px] text-slate-500 font-bold uppercase border-b border-slate-200">
                                       <th className="py-2.5 pl-3">Audit Parameter Item</th>
                                       <th className="py-2.5 px-3 text-center">CAD Spec Target</th>
                                       <th className="py-2.5 px-3 text-center">Actual Measured Shard</th>
                                       <th className="py-2.5 pr-4 text-right">Variance Deviation</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                                    {(formData.measurements || []).map((m, idx) => {
                                       const hasVariance = m.variance !== '0' && m.variance !== '';
                                       return (
                                          <tr key={idx} className="hover:bg-slate-50">
                                             <td className="py-3 pl-3 font-bold text-slate-800">{m.parameter}</td>
                                             <td className="py-3 px-3 text-center text-slate-600 font-bold font-mono bg-slate-50/50">{m.targetValue}</td>
                                             <td className="py-3 px-3 text-center">
                                                <input 
                                                  type="text" 
                                                  className="w-24 text-center border rounded px-1.5 py-0.5 text-xs bg-white text-slate-800 font-bold outline-none focus:border-indigo-500"
                                                  value={m.actualValue}
                                                  onChange={e => {
                                                     const updated = [...(formData.measurements || [])];
                                                     updated[idx].actualValue = e.target.value;
                                                     setFormData({ ...formData, measurements: updated });
                                                  }}
                                                />
                                             </td>
                                             <td className={`py-3 pr-4 text-right font-bold ${hasVariance ? 'text-amber-600' : 'text-emerald-600'}`}>{hasVariance ? m.variance : 'Tolerance Meet'}</td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                       </div>
                    )}

                    {/* TAB 4: FEEDBACK */}
                    {formTab === 'FEEDBACK' && (
                       <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-6 space-y-6">
                           <div>
                              <h4 className="font-extrabold text-[#1c2126] text-sm flex items-center gap-1.5">
                                 <MessageSquare className="w-4 h-4 text-indigo-600" /> Client Trials History & Iteration Logs
                              </h4>
                              <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-black">Store customer evaluation logs for size parameters and styling revisions</p>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-1">
                                 <label className="text-xs text-[#525c66] font-bold">Feedback Loop Comments</label>
                                 <textarea 
                                   className="w-full border border-slate-300 rounded-lg p-3 text-xs outline-none focus:border-indigo-500 text-slate-800"
                                   rows={4}
                                   placeholder="Enter feedback comments from customer review meeting..."
                                   value={formData.feedback || ''}
                                   onChange={e => setFormData({ ...formData, feedback: e.target.value })}
                                 />
                              </div>

                              <div className="grid grid-cols-3 gap-4">
                                 <div className="space-y-1">
                                    <label className="text-xs text-[#525c66] font-bold">Courier Name</label>
                                    <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold"
                                      placeholder="FedEx / DTDC"
                                      value={formData.courierName || ''}
                                      onChange={e => setFormData({ ...formData, courierName: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-xs text-[#525c66] font-bold">Courier Tracking ID</label>
                                    <input 
                                      type="text" 
                                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-indigo-600 font-mono font-bold outline-none focus:border-indigo-500"
                                      placeholder="TRK-90022"
                                      value={formData.trackingNumber || ''}
                                      onChange={e => setFormData({ ...formData, trackingNumber: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-1">
                                    <label className="text-xs text-[#525c66] font-bold">Courier Landed Cost</label>
                                    <input 
                                      type="number" 
                                      className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 font-bold outline-none focus:border-indigo-500 tabular-nums"
                                      placeholder="350"
                                      value={formData.courierCost || ''}
                                      onChange={e => setFormData({ ...formData, courierCost: Number(e.target.value) })}
                                    />
                                 </div>
                              </div>

                              <div className="bg-[#fcfdfd] border-t border-[#d1d8dd]/40 pt-5 space-y-3">
                                 <h5 className="text-xs font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                                    <History className="w-3.5 h-3.5 text-indigo-600" /> Historical Trial Runs Iteration Feed
                                 </h5>
                                 <div className="divide-y divide-slate-100">
                                    {(formData.trialsHistory || []).map((t, idx) => (
                                       <div key={idx} className="py-3 flex justify-between items-start text-xs hover:bg-slate-50/50 rounded p-2">
                                          <div>
                                             <div className="flex gap-2 items-center">
                                                <span className="font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 text-[10px]">TRIAL #{t.trialNo}</span>
                                                <span className="text-slate-400 font-bold font-mono text-[10px]">{t.date}</span>
                                             </div>
                                             <p className="text-slate-600 font-medium mt-1.5 pr-8 leading-relaxed">{t.feedbackText}</p>
                                          </div>
                                          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 rounded px-2 py-0.5 border border-amber-100">{t.status}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           </div>
                       </div>
                    )}
                 </div>
              </div>
           </div>
        )}
    </div>
  );
};

export default Sampling;
