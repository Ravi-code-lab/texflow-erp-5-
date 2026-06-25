import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Save, X, Edit2, Search, ChevronRight,
  GitBranch, GripVertical, Copy, CheckCircle, ArrowDown, Package
} from "lucide-react";
import { STAGE_MAP, StageId } from "../pipelineWiring";
import { OPERATIONS_STORAGE_KEY, Operation } from "./OperationsMaster";

export const ROUTING_STORAGE_KEY = "ROUTING_TEMPLATES";

export interface RoutingOperation {
  id: string;
  name: string;
  stage: string;
  processType: "IN_HOUSE" | "JOB_WORK";
  workstationType: string;
  plannedHours: number;
  qualityCheckpoint: boolean;
}

export interface RoutingTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  operations: RoutingOperation[];
  createdAt: string;
  updatedAt: string;
}

export const PROCESS_STAGES = [
  { id: "CUTTING",   label: "Cutting",   color: "blue",    icon: "✂️" },
  { id: "JOBWORK",   label: "Jobwork",   color: "purple",  icon: "🤝" },
  { id: "STITCHING", label: "Stitching", color: "indigo",  icon: "🧵" },
  { id: "FINISHING", label: "Finishing", color: "pink",    icon: "✨" },
  { id: "READY",     label: "Ready",     color: "emerald", icon: "✅" },
] as const;

const PROCESS_META_BY_ID: Record<string, { label: string; color: string; icon: string; bg: string; border: string }> =
  PROCESS_STAGES.reduce((acc, s) => {
    acc[s.id] = { label: s.label, color: `text-${s.color}-600`, bg: `bg-${s.color}-50`, border: `border-${s.color}-200`, icon: s.icon };
    return acc;
  }, {} as Record<string, { label: string; color: string; icon: string; bg: string; border: string }>);

export function getProcessMeta(process: string): { label: string; color: string; icon: string; bg: string; border: string } {
  const key = (process || "").toUpperCase();
  if (PROCESS_META_BY_ID[key]) return PROCESS_META_BY_ID[key];
  const pipelineStage = STAGE_MAP.get(process as StageId);
  if (pipelineStage) {
    const c = pipelineStage.accentColor || "slate";
    return { label: pipelineStage.label, color: `text-${c}-600`, bg: `bg-${c}-50`, border: `border-${c}-200`, icon: pipelineStage.icon || "⚙️" };
  }
  return { label: process || "—", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: "⚙️" };
}

export const DEFAULT_ROUTING_TEMPLATES: RoutingTemplate[] = [
  {
    id: "ROUTE-KURTI-STD", name: "Kurti Standard Route", category: "Kurti",
    description: "Standard production flow for kurti with embroidery/print job work",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    operations: [
      { id:"OP-FABRIC-ISSUE",  name:"Fabric Inspection",          stage:"FABRIC_INSPECTION",  processType:"IN_HOUSE", workstationType:"Inspection Table",  plannedHours:2,  qualityCheckpoint:true },
      { id:"OP-CUTTING",       name:"Panel Cutting",               stage:"CUTTING",            processType:"IN_HOUSE", workstationType:"Cutting Machine",   plannedHours:4,  qualityCheckpoint:true },
      { id:"OP-EMBROIDERY",    name:"Embroidery / Print",          stage:"EMBROIDERY_GARMENT", processType:"JOB_WORK", workstationType:"Vendor",            plannedHours:24, qualityCheckpoint:true },
      { id:"OP-STITCHING",     name:"Stitching",                   stage:"STITCHING",          processType:"IN_HOUSE", workstationType:"Stitching Line",    plannedHours:8,  qualityCheckpoint:true },
      { id:"OP-FINISHING",     name:"Thread Cutting & Finishing",  stage:"FINISHING",          processType:"IN_HOUSE", workstationType:"Finishing Table",   plannedHours:3,  qualityCheckpoint:true },
      { id:"OP-PACKING",       name:"Pressing & Packing",          stage:"FOLDING_PACKING",    processType:"IN_HOUSE", workstationType:"Packing Table",     plannedHours:2,  qualityCheckpoint:false },
    ] },
  {
    id: "ROUTE-FABRIC-STD", name: "Fabric Processing Route", category: "Fabric",
    description: "Dyeing and printing flow for grey fabric",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    operations: [
      { id:"OP-GREY-ISSUE",  name:"Grey Fabric Inspection", stage:"FABRIC_INSPECTION", processType:"IN_HOUSE", workstationType:"Inspection Table",  plannedHours:1,  qualityCheckpoint:true },
      { id:"OP-DYEING",      name:"Dyeing",                 stage:"DYEING",            processType:"JOB_WORK", workstationType:"Dyeing Vendor",     plannedHours:48, qualityCheckpoint:true },
      { id:"OP-PRINTING",    name:"Printing",               stage:"FABRIC_PRINTING",   processType:"JOB_WORK", workstationType:"Printing Vendor",   plannedHours:24, qualityCheckpoint:true },
      { id:"OP-FABRIC-QC",   name:"Fabric QC & Folding",    stage:"FABRIC_INSPECTION", processType:"IN_HOUSE", workstationType:"Inspection Table",  plannedHours:4,  qualityCheckpoint:true },
    ] },
  {
    id: "ROUTE-SHIRT-STD", name: "Shirt / Top Standard Route", category: "Shirt",
    description: "Standard flow for formal/casual shirts with washing",
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    operations: [
      { id:"OP-S-INSPECT",  name:"Fabric Inspection",   stage:"FABRIC_INSPECTION", processType:"IN_HOUSE", workstationType:"Inspection Table",  plannedHours:1,  qualityCheckpoint:true },
      { id:"OP-S-FUSING",   name:"Fusing",              stage:"FUSING",            processType:"IN_HOUSE", workstationType:"Fusing Machine",    plannedHours:1,  qualityCheckpoint:false },
      { id:"OP-S-CUT",      name:"Panel Cutting",       stage:"CUTTING",           processType:"IN_HOUSE", workstationType:"Cutting Machine",   plannedHours:3,  qualityCheckpoint:true },
      { id:"OP-S-STITCH",   name:"Stitching",           stage:"STITCHING",         processType:"IN_HOUSE", workstationType:"Stitching Line",    plannedHours:10, qualityCheckpoint:true },
      { id:"OP-S-BUTTON",   name:"Button Hole & Attach",stage:"BUTTON_HOLE",       processType:"IN_HOUSE", workstationType:"Button M/C",        plannedHours:1,  qualityCheckpoint:false },
      { id:"OP-S-WASH",     name:"Washing",             stage:"WASHING",           processType:"JOB_WORK", workstationType:"Washing Vendor",    plannedHours:12, qualityCheckpoint:true },
      { id:"OP-S-IRON",     name:"Ironing",             stage:"IRONING",           processType:"IN_HOUSE", workstationType:"Steam Iron",        plannedHours:2,  qualityCheckpoint:false },
      { id:"OP-S-QC",       name:"Final QC",            stage:"FINAL_QC",          processType:"IN_HOUSE", workstationType:"QC Table",          plannedHours:1,  qualityCheckpoint:true },
      { id:"OP-S-PACK",     name:"Packing",             stage:"FOLDING_PACKING",   processType:"IN_HOUSE", workstationType:"Packing Table",     plannedHours:1,  qualityCheckpoint:false },
    ] },
];

const CATEGORIES = ["Kurti", "Shirt", "Trouser", "Saree", "Fabric", "Lehenga", "Dupatta", "Kids Wear", "Other"];
const ALL_STAGES = [
  "FABRIC_INSPECTION","SHRINKAGE_TEST","SPREADING","MARKER_MAKING","CUTTING","FUSING","NUMBERING",
  "DYEING","BLEACHING","FABRIC_PRINTING","DIGITAL_PRINT","SCREEN_PRINTING","BLOCK_PRINT",
  "EMBROIDERY_FABRIC","EMBROIDERY_GARMENT","HAND_WORK","PATCH_WORK","STONE_WORK","LACE_ATTACH",
  "STITCHING","OVER_LOCKING","BUTTON_HOLE","LINING_ATTACH","ZIPPER_ATTACH","ELASTIC_ATTACH","BARTACKING",
  "WASHING","ACID_WASH","ENZYME_WASH","FINISHING","THREAD_CUTTING","IRONING","STAIN_REMOVAL","TAGGING",
  "QC_CHECK","INLINE_QC","FINAL_QC","BUYER_QC","PACKING","FOLDING_PACKING","CARTON_PACKING","DISPATCH",
];

function loadTemplates(): RoutingTemplate[] {
  try {
    const raw = localStorage.getItem(ROUTING_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_ROUTING_TEMPLATES;
}
function saveTemplates(t: RoutingTemplate[]) {
  localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(t));
}
function loadLibraryOps(): Operation[] {
  try {
    const raw = localStorage.getItem(OPERATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

const EMPTY_ROUTE_OP: Partial<RoutingOperation> = {
  name:"", stage:"CUTTING", processType:"IN_HOUSE", workstationType:"",
  plannedHours:1, qualityCheckpoint:false };

const inputCls = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] text-[13px] text-[#1c2126]";
const selectCls = inputCls + " appearance-none";

const STAGE_DEPT_COLOR: Record<string, string> = {
  FABRIC_INSPECTION:"bg-amber-100 text-amber-700", SHRINKAGE_TEST:"bg-amber-100 text-amber-700",
  SPREADING:"bg-blue-100 text-blue-700", MARKER_MAKING:"bg-blue-100 text-blue-700",
  CUTTING:"bg-blue-100 text-blue-700", FUSING:"bg-blue-100 text-blue-700", NUMBERING:"bg-blue-100 text-blue-700",
  DYEING:"bg-purple-100 text-purple-700", BLEACHING:"bg-purple-100 text-purple-700",
  FABRIC_PRINTING:"bg-orange-100 text-orange-700", DIGITAL_PRINT:"bg-orange-100 text-orange-700",
  SCREEN_PRINTING:"bg-orange-100 text-orange-700", BLOCK_PRINT:"bg-orange-100 text-orange-700",
  EMBROIDERY_FABRIC:"bg-pink-100 text-pink-700", EMBROIDERY_GARMENT:"bg-pink-100 text-pink-700",
  HAND_WORK:"bg-rose-100 text-rose-700", PATCH_WORK:"bg-rose-100 text-rose-700",
  STONE_WORK:"bg-rose-100 text-rose-700", LACE_ATTACH:"bg-rose-100 text-rose-700",
  STITCHING:"bg-indigo-100 text-indigo-700", OVER_LOCKING:"bg-indigo-100 text-indigo-700",
  BUTTON_HOLE:"bg-indigo-100 text-indigo-700", LINING_ATTACH:"bg-indigo-100 text-indigo-700",
  ZIPPER_ATTACH:"bg-indigo-100 text-indigo-700", ELASTIC_ATTACH:"bg-indigo-100 text-indigo-700",
  BARTACKING:"bg-indigo-100 text-indigo-700",
  WASHING:"bg-cyan-100 text-cyan-700", ACID_WASH:"bg-cyan-100 text-cyan-700", ENZYME_WASH:"bg-cyan-100 text-cyan-700",
  FINISHING:"bg-teal-100 text-teal-700", THREAD_CUTTING:"bg-teal-100 text-teal-700",
  IRONING:"bg-teal-100 text-teal-700", STAIN_REMOVAL:"bg-teal-100 text-teal-700", TAGGING:"bg-teal-100 text-teal-700",
  QC_CHECK:"bg-green-100 text-green-700", INLINE_QC:"bg-green-100 text-green-700",
  FINAL_QC:"bg-green-100 text-green-700", BUYER_QC:"bg-green-100 text-green-700",
  PACKING:"bg-violet-100 text-violet-700", FOLDING_PACKING:"bg-violet-100 text-violet-700",
  CARTON_PACKING:"bg-violet-100 text-violet-700", DISPATCH:"bg-slate-100 text-slate-700" };

export default function RoutingMaster() {
  const [templates, setTemplates] = useState<RoutingTemplate[]>(loadTemplates);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "editor">("list");
  const [editTemplate, setEditTemplate] = useState<RoutingTemplate | null>(null);
  const [showOpModal, setShowOpModal] = useState(false);
  const [opForm, setOpForm] = useState<Partial<RoutingOperation>>(EMPTY_ROUTE_OP);
  const [editOpIdx, setEditOpIdx] = useState<number | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const libraryOps = loadLibraryOps();

  const filtered = templates.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
  );

  function newTemplate() {
    const t: RoutingTemplate = {
      id: `ROUTE-${Date.now().toString(36).toUpperCase()}`,
      name:"", category:"Kurti", description:"", operations:[],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setEditTemplate(t);
    setView("editor");
  }

  function openEdit(t: RoutingTemplate) {
    setEditTemplate(JSON.parse(JSON.stringify(t)));
    setView("editor");
  }

  function duplicateTemplate(t: RoutingTemplate) {
    const copy: RoutingTemplate = {
      ...JSON.parse(JSON.stringify(t)),
      id: `ROUTE-${Date.now().toString(36).toUpperCase()}`,
      name: t.name + " (Copy)",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const next = [...templates, copy];
    setTemplates(next); saveTemplates(next);
  }

  function deleteTemplate(id: string) {
    if (!confirm("Delete this routing template?")) return;
    const next = templates.filter(t => t.id !== id);
    setTemplates(next); saveTemplates(next);
  }

  function saveTemplate() {
    if (!editTemplate || !editTemplate.name.trim()) return;
    const updated = { ...editTemplate, updatedAt: new Date().toISOString() };
    const exists = templates.find(t => t.id === updated.id);
    const next = exists ? templates.map(t => t.id === updated.id ? updated : t) : [...templates, updated];
    setTemplates(next); saveTemplates(next);
    setView("list");
  }

  function openAddOp() {
    setOpForm({ ...EMPTY_ROUTE_OP });
    setEditOpIdx(null);
    setShowOpModal(true);
  }

  function openEditOp(idx: number) {
    setOpForm({ ...editTemplate!.operations[idx] });
    setEditOpIdx(idx);
    setShowOpModal(true);
  }

  function saveOp() {
    if (!opForm.name?.trim() || !editTemplate) return;
    const op: RoutingOperation = {
      id: editOpIdx !== null ? editTemplate.operations[editOpIdx].id : `ROP-${Date.now().toString(36).toUpperCase()}`,
      name: opForm.name!, stage: opForm.stage!, processType: opForm.processType!,
      workstationType: opForm.workstationType!, plannedHours: opForm.plannedHours!,
      qualityCheckpoint: !!opForm.qualityCheckpoint };
    let ops = [...editTemplate.operations];
    if (editOpIdx !== null) ops[editOpIdx] = op;
    else ops.push(op);
    setEditTemplate({ ...editTemplate, operations: ops });
    setShowOpModal(false);
  }

  function removeOp(idx: number) {
    if (!editTemplate) return;
    const ops = editTemplate.operations.filter((_, i) => i !== idx);
    setEditTemplate({ ...editTemplate, operations: ops });
  }

  function moveOp(idx: number, dir: -1 | 1) {
    if (!editTemplate) return;
    const ops = [...editTemplate.operations];
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= ops.length) return;
    [ops[idx], ops[swapIdx]] = [ops[swapIdx], ops[idx]];
    setEditTemplate({ ...editTemplate, operations: ops });
  }

  function addFromLibrary(libOp: Operation) {
    if (!editTemplate) return;
    const op: RoutingOperation = {
      id: `ROP-${Date.now().toString(36).toUpperCase()}`,
      name: libOp.name, stage: libOp.stage, processType: libOp.processType,
      workstationType: libOp.workstationType, plannedHours: libOp.plannedHours,
      qualityCheckpoint: libOp.qualityCheckpoint };
    setEditTemplate({ ...editTemplate, operations: [...editTemplate.operations, op] });
  }

  const totalHours = (t: RoutingTemplate) => t.operations.reduce((s, o) => s + (o.plannedHours || 0), 0);

  if (view === "editor" && editTemplate) return (
    <div className="p-5 space-y-4">
      {/* Editor Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button onClick={() => setView("list")} className="p-1.5 hover:bg-[#f4f5f7] rounded text-[#8d99a6]"><X className="w-4 h-4" /></button>
          <div>
            <h2 className="text-[15px] font-bold text-[#1c2126]">{editTemplate.id.startsWith("ROUTE-") && !templates.find(t=>t.id===editTemplate.id) ? "New Template" : "Edit Template"}</h2>
            <p className="text-[11px] text-[#8d99a6]">Build the operation sequence for this route</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLibrary(!showLibrary)} className="px-3 py-2 text-[12px] border border-[#d1d8dd] rounded text-[#525c66] hover:bg-[#f4f5f7] font-semibold">
            📚 Add from Library
          </button>
          <button onClick={openAddOp} className="flex items-center gap-1.5 px-3 py-2 text-[12px] border border-[#2490ef] text-[#2490ef] rounded font-semibold hover:bg-[#2490ef]/5">
            <Plus className="w-3.5 h-3.5" /> Add Operation
          </button>
          <button onClick={saveTemplate} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2490ef] text-white text-[12px] font-semibold rounded hover:bg-[#1a7fd4]">
            <Save className="w-3.5 h-3.5" /> Save Template
          </button>
        </div>
      </div>

      {/* Template meta */}
      <div className="bg-white border border-[#d1d8dd] rounded shadow-sm p-5 grid grid-cols-3 gap-4 text-[13px]">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-[#525c66]">Template Name *</label>
          <input value={editTemplate.name} onChange={e=>setEditTemplate({...editTemplate, name:e.target.value})} className={inputCls} placeholder="e.g. Kurti Standard Route" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#525c66]">Category</label>
          <div className="relative">
            <select value={editTemplate.category} onChange={e=>setEditTemplate({...editTemplate, category:e.target.value})} className={selectCls}>
              {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
          </div>
        </div>
        <div className="col-span-3 space-y-1">
          <label className="text-xs text-[#525c66]">Description</label>
          <input value={editTemplate.description} onChange={e=>setEditTemplate({...editTemplate, description:e.target.value})} className={inputCls} placeholder="Brief description" />
        </div>
      </div>

      {/* Library panel */}
      {showLibrary && (
        <div className="bg-white border border-[#2490ef]/30 rounded shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold text-[#2490ef]">📚 Operations Library — click to add</h4>
            <button onClick={()=>setShowLibrary(false)} className="text-[#8d99a6] hover:text-[#1c2126]"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {libraryOps.filter(o=>o.isActive).map(o => (
              <button key={o.id} onClick={()=>addFromLibrary(o)}
                className="px-3 py-1.5 text-[11px] font-medium bg-[#f4f5f7] hover:bg-[#2490ef]/10 hover:text-[#2490ef] border border-[#d1d8dd] hover:border-[#2490ef]/30 rounded-full transition-colors text-[#525c66] flex items-center gap-1">
                <Plus className="w-3 h-3" /> {o.name}
              </button>
            ))}
            {libraryOps.length === 0 && <span className="text-[12px] text-[#8d99a6]">No operations in library. Add them in Operations Master first.</span>}
          </div>
        </div>
      )}

      {/* Operations sequence */}
      <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[#d1d8dd] bg-[#f4f5f7] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#525c66]">OPERATION SEQUENCE ({editTemplate.operations.length} steps)</span>
          <div className="flex gap-4 text-[11px] text-[#8d99a6]">
            <span>Total Hours: <strong className="text-[#1c2126]">{editTemplate.operations.reduce((s,o)=>s+(o.plannedHours||0),0)}h</strong></span>

          </div>
        </div>
        {editTemplate.operations.length === 0 && (
          <div className="py-12 text-center text-[#8d99a6] text-[13px]">
            No operations added yet. Click "Add Operation" or use the library.
          </div>
        )}
        <div className="divide-y divide-[#f0f1f3]">
          {editTemplate.operations.map((op, idx) => {
            const stageColor = STAGE_DEPT_COLOR[op.stage] || "bg-slate-100 text-slate-700";
            return (
              <div key={op.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafbfc] group">
                <div className="flex flex-col gap-0.5">
                  <button onClick={()=>moveOp(idx,-1)} disabled={idx===0} className="p-0.5 text-[#d1d8dd] hover:text-[#525c66] disabled:opacity-20"><ChevronRight className="w-3 h-3 -rotate-90" /></button>
                  <button onClick={()=>moveOp(idx,1)} disabled={idx===editTemplate.operations.length-1} className="p-0.5 text-[#d1d8dd] hover:text-[#525c66] disabled:opacity-20"><ChevronRight className="w-3 h-3 rotate-90" /></button>
                </div>
                <div className="w-6 h-6 rounded-full bg-[#2490ef]/10 text-[#2490ef] text-[11px] font-bold flex items-center justify-center shrink-0">{idx+1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-[#1c2126]">{op.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageColor}`}>{op.stage}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${op.processType==="IN_HOUSE"?"bg-blue-50 text-blue-700":"bg-orange-50 text-orange-700"}`}>{op.processType==="IN_HOUSE"?"In-House":"Job Work"}</span>
                    {op.qualityCheckpoint && <span className="flex items-center gap-1 text-[10px] text-green-600 font-semibold"><CheckCircle className="w-3 h-3" />QC</span>}
                  </div>
                  <div className="flex gap-4 mt-0.5 text-[11px] text-[#8d99a6]">
                    <span>{op.workstationType}</span>
                    <span>{op.plannedHours}h</span>

                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={()=>openEditOp(idx)} className="p-1.5 hover:bg-[#2490ef]/10 rounded text-[#8d99a6] hover:text-[#2490ef]"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={()=>removeOp(idx)} className="p-1.5 hover:bg-red-50 rounded text-[#8d99a6] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Op Modal */}
      {showOpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-2xl w-[520px]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#d1d8dd]">
              <h3 className="font-bold text-[14px] text-[#1c2126]">{editOpIdx!==null?"Edit Operation":"Add Operation"}</h3>
              <button onClick={()=>setShowOpModal(false)} className="p-1 hover:bg-[#f4f5f7] rounded"><X className="w-4 h-4 text-[#8d99a6]" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-[13px]">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-[#525c66]">Operation Name *</label>
                <input value={opForm.name||""} onChange={e=>setOpForm(p=>({...p,name:e.target.value}))} className={inputCls} placeholder="e.g. Panel Cutting" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Stage</label>
                <div className="relative">
                  <select value={opForm.stage||"CUTTING"} onChange={e=>setOpForm(p=>({...p,stage:e.target.value}))} className={selectCls}>
                    {ALL_STAGES.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Process Type</label>
                <div className="relative">
                  <select value={opForm.processType||"IN_HOUSE"} onChange={e=>setOpForm(p=>({...p,processType:e.target.value as any}))} className={selectCls}>
                    <option value="IN_HOUSE">In-House</option>
                    <option value="JOB_WORK">Job Work</option>
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Workstation</label>
                <input value={opForm.workstationType||""} onChange={e=>setOpForm(p=>({...p,workstationType:e.target.value}))} className={inputCls} placeholder="e.g. Cutting Table" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Planned Hours</label>
                <input type="number" min="0" step="0.5" value={opForm.plannedHours||0} onChange={e=>setOpForm(p=>({...p,plannedHours:Number(e.target.value)}))} className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#1c2126]">
                  <input type="checkbox" checked={!!opForm.qualityCheckpoint} onChange={e=>setOpForm(p=>({...p,qualityCheckpoint:e.target.checked}))} className="w-4 h-4 accent-[#2490ef]" />
                  Quality Checkpoint at this step
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#d1d8dd]">
              <button onClick={()=>setShowOpModal(false)} className="px-4 py-2 text-[13px] border border-[#d1d8dd] rounded text-[#525c66] hover:bg-[#f4f5f7]">Cancel</button>
              <button onClick={saveOp} className="flex items-center gap-1.5 px-4 py-2 text-[13px] bg-[#2490ef] text-white rounded font-semibold hover:bg-[#1a7fd4]">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // List view
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-violet-100 rounded-lg"><GitBranch className="w-5 h-5 text-violet-600" /></div>
          <div>
            <h2 className="text-[15px] font-bold text-[#1c2126]">Routing Master</h2>
            <p className="text-[11px] text-[#8d99a6]">Define production routes applied to Work Orders</p>
          </div>
        </div>
        <button onClick={newTemplate} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2490ef] text-white text-[12px] font-semibold rounded hover:bg-[#1a7fd4]">
          <Plus className="w-3.5 h-3.5" /> New Route
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-[#d1d8dd] rounded p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-[#1c2126]">{templates.length}</div>
          <div className="text-[11px] text-[#8d99a6]">Total Templates</div>
        </div>
        <div className="bg-white border border-[#d1d8dd] rounded p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{templates.filter(t=>t.operations.some(o=>o.processType==="IN_HOUSE")).length}</div>
          <div className="text-[11px] text-[#8d99a6]">With In-House Ops</div>
        </div>
        <div className="bg-white border border-[#d1d8dd] rounded p-3 text-center shadow-sm">
          <div className="text-2xl font-bold text-orange-600">{templates.filter(t=>t.operations.some(o=>o.processType==="JOB_WORK")).length}</div>
          <div className="text-[11px] text-[#8d99a6]">With Job Work</div>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6]" />
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search routes..." className="w-full pl-8 pr-3 py-[5px] bg-white border border-[#d1d8dd] rounded text-[13px] focus:outline-none focus:border-[#2490ef]" />
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(t => (
          <div key={t.id} className="bg-white border border-[#d1d8dd] rounded shadow-sm hover:border-[#2490ef]/40 transition-colors">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#f0f1f3]">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-violet-50 rounded"><GitBranch className="w-4 h-4 text-violet-600" /></div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#1c2126]">{t.name}</span>
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-semibold rounded-full border border-violet-200">{t.category}</span>
                  </div>
                  {t.description && <p className="text-[11px] text-[#8d99a6] mt-0.5">{t.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#8d99a6]">{t.operations.length} ops · {totalHours(t)}h planned</span>
                <button onClick={()=>openEdit(t)} className="p-1.5 hover:bg-[#2490ef]/10 rounded text-[#8d99a6] hover:text-[#2490ef]"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={()=>duplicateTemplate(t)} className="p-1.5 hover:bg-[#f4f5f7] rounded text-[#8d99a6] hover:text-[#525c66]"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={()=>deleteTemplate(t.id)} className="p-1.5 hover:bg-red-50 rounded text-[#8d99a6] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            {/* Operation pills */}
            <div className="px-4 py-3 flex flex-wrap items-center gap-1.5">
              {t.operations.map((op, i) => {
                const sc = STAGE_DEPT_COLOR[op.stage] || "bg-slate-100 text-slate-600";
                return (
                  <React.Fragment key={op.id}>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${sc} border border-current/20`}>
                      {op.qualityCheckpoint && <CheckCircle className="w-3 h-3" />}
                      {op.name}
                      <span className="opacity-60">· {op.plannedHours}h</span>
                    </div>
                    {i < t.operations.length-1 && <ArrowDown className="w-3 h-3 text-[#d1d8dd] rotate-[-90deg]" />}
                  </React.Fragment>
                );
              })}
              {t.operations.length === 0 && <span className="text-[12px] text-[#8d99a6] italic">No operations defined</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#8d99a6] text-[13px]">No routing templates found</div>
        )}
      </div>
    </div>
  );
}
