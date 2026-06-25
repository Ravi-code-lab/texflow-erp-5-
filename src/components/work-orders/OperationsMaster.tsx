import React, { useState, useEffect } from "react";
import {
  Plus, Trash2, Save, X, Edit2, Search, ChevronRight,
  Settings2, Clock, CheckCircle, AlertCircle, Package
} from "lucide-react";

export const OPERATIONS_STORAGE_KEY = "OPERATIONS_MASTER";

export interface Operation {
  id: string;
  name: string;
  stage: string;
  department: string;
  processType: "IN_HOUSE" | "JOB_WORK";
  workstationType: string;
  plannedHours: number;
  qualityCheckpoint: boolean;
  description: string;
  isActive: boolean;
}

const STAGES = [
  { id: "FABRIC_INSPECTION", label: "Fabric Inspection", dept: "Fabric Inspection" },
  { id: "SHRINKAGE_TEST",    label: "Shrinkage Test",    dept: "Fabric Inspection" },
  { id: "SPREADING",         label: "Spreading",         dept: "Cutting" },
  { id: "MARKER_MAKING",     label: "Marker Making",     dept: "Cutting" },
  { id: "CUTTING",           label: "Cutting",            dept: "Cutting" },
  { id: "FUSING",            label: "Fusing",             dept: "Cutting" },
  { id: "NUMBERING",         label: "Numbering",          dept: "Cutting" },
  { id: "DYEING",            label: "Dyeing",             dept: "Dyeing" },
  { id: "BLEACHING",         label: "Bleaching",          dept: "Dyeing" },
  { id: "FABRIC_PRINTING",   label: "Fabric Printing",   dept: "Printing" },
  { id: "DIGITAL_PRINT",     label: "Digital Print",     dept: "Printing" },
  { id: "SCREEN_PRINTING",   label: "Screen Printing",   dept: "Printing" },
  { id: "BLOCK_PRINT",       label: "Block Print",        dept: "Printing" },
  { id: "EMBROIDERY_FABRIC", label: "Embroidery (Fabric)", dept: "Embroidery" },
  { id: "EMBROIDERY_GARMENT","label": "Embroidery (Garment)", dept: "Embroidery" },
  { id: "HAND_WORK",         label: "Hand Work",          dept: "Hand Work" },
  { id: "PATCH_WORK",        label: "Patch Work",         dept: "Hand Work" },
  { id: "STONE_WORK",        label: "Stone Work",         dept: "Hand Work" },
  { id: "LACE_ATTACH",       label: "Lace Attach",        dept: "Hand Work" },
  { id: "STITCHING",         label: "Stitching",          dept: "Stitching" },
  { id: "OVER_LOCKING",      label: "Over Locking",       dept: "Stitching" },
  { id: "BUTTON_HOLE",       label: "Button Hole",        dept: "Stitching" },
  { id: "LINING_ATTACH",     label: "Lining Attach",      dept: "Stitching" },
  { id: "ZIPPER_ATTACH",     label: "Zipper Attach",      dept: "Stitching" },
  { id: "ELASTIC_ATTACH",    label: "Elastic Attach",     dept: "Stitching" },
  { id: "BARTACKING",        label: "Bartacking",         dept: "Stitching" },
  { id: "WASHING",           label: "Washing",            dept: "Washing" },
  { id: "ACID_WASH",         label: "Acid Wash",          dept: "Washing" },
  { id: "ENZYME_WASH",       label: "Enzyme Wash",        dept: "Washing" },
  { id: "FINISHING",         label: "Finishing",          dept: "Finishing" },
  { id: "THREAD_CUTTING",    label: "Thread Cutting",     dept: "Finishing" },
  { id: "IRONING",           label: "Ironing",            dept: "Finishing" },
  { id: "STAIN_REMOVAL",     label: "Stain Removal",      dept: "Finishing" },
  { id: "TAGGING",           label: "Tagging",            dept: "Finishing" },
  { id: "QC_CHECK",          label: "QC Check",           dept: "QC Check" },
  { id: "INLINE_QC",         label: "Inline QC",          dept: "QC Check" },
  { id: "FINAL_QC",          label: "Final QC",           dept: "QC Check" },
  { id: "PACKING",           label: "Packing",            dept: "Packing" },
  { id: "FOLDING_PACKING",   label: "Folding & Packing",  dept: "Packing" },
  { id: "CARTON_PACKING",    label: "Carton Packing",     dept: "Packing" },
  { id: "DISPATCH",          label: "Dispatch",           dept: "Dispatch" },
];

const DEPT_COLORS: Record<string, string> = {
  "Fabric Inspection": "bg-amber-100 text-amber-700 border-amber-200",
  "Cutting":  "bg-blue-100 text-blue-700 border-blue-200",
  "Dyeing":   "bg-purple-100 text-purple-700 border-purple-200",
  "Printing": "bg-orange-100 text-orange-700 border-orange-200",
  "Embroidery": "bg-pink-100 text-pink-700 border-pink-200",
  "Hand Work":  "bg-rose-100 text-rose-700 border-rose-200",
  "Stitching":  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Washing":    "bg-cyan-100 text-cyan-700 border-cyan-200",
  "Finishing":  "bg-teal-100 text-teal-700 border-teal-200",
  "QC Check":   "bg-green-100 text-green-700 border-green-200",
  "Packing":    "bg-violet-100 text-violet-700 border-violet-200",
  "Dispatch":   "bg-slate-100 text-slate-700 border-slate-200",
};

const DEFAULT_OPERATIONS: Operation[] = [
  { id:"OP-001", name:"Fabric Inspection",      stage:"FABRIC_INSPECTION", department:"Fabric Inspection", processType:"IN_HOUSE", workstationType:"Inspection Table", plannedHours:2,  qualityCheckpoint:true,  description:"Inspect incoming fabric for defects, GSM, shade variation", isActive:true },
  { id:"OP-002", name:"Shrinkage Test",          stage:"SHRINKAGE_TEST",    department:"Fabric Inspection", processType:"IN_HOUSE", workstationType:"Lab",              plannedHours:1,  qualityCheckpoint:true,  description:"Wash swatch and measure shrinkage %", isActive:true },
  { id:"OP-003", name:"Spreading",               stage:"SPREADING",         department:"Cutting",           processType:"IN_HOUSE", workstationType:"Cutting Table",    plannedHours:1,  qualityCheckpoint:false, description:"Spread fabric layers on cutting table", isActive:true },
  { id:"OP-004", name:"Marker Making",            stage:"MARKER_MAKING",     department:"Cutting",           processType:"IN_HOUSE", workstationType:"CAD Station",      plannedHours:2,  qualityCheckpoint:false, description:"Prepare marker for optimal fabric utilization", isActive:true },
  { id:"OP-005", name:"Panel Cutting",            stage:"CUTTING",           department:"Cutting",           processType:"IN_HOUSE", workstationType:"Cutting Machine",  plannedHours:4,  qualityCheckpoint:true,  description:"Cut fabric panels as per marker", isActive:true },
  { id:"OP-006", name:"Fusing",                   stage:"FUSING",            department:"Cutting",           processType:"IN_HOUSE", workstationType:"Fusing Machine",   plannedHours:1,  qualityCheckpoint:false, description:"Fuse interlining to collar/cuff/placket", isActive:true },
  { id:"OP-007", name:"Numbering / Bundling",     stage:"NUMBERING",         department:"Cutting",           processType:"IN_HOUSE", workstationType:"Cutting Table",    plannedHours:1,  qualityCheckpoint:false, description:"Number and bundle panels by size/colour", isActive:true },
  { id:"OP-008", name:"Dyeing",                   stage:"DYEING",            department:"Dyeing",            processType:"JOB_WORK", workstationType:"Dyeing Vendor",    plannedHours:48, qualityCheckpoint:true,  description:"Fabric dyeing as per shade card", isActive:true },
  { id:"OP-009", name:"Fabric Printing",          stage:"FABRIC_PRINTING",   department:"Printing",          processType:"JOB_WORK", workstationType:"Printing Vendor",  plannedHours:24, qualityCheckpoint:true,  description:"Screen / digital print on fabric", isActive:true },
  { id:"OP-010", name:"Embroidery (Fabric)",      stage:"EMBROIDERY_FABRIC", department:"Embroidery",        processType:"JOB_WORK", workstationType:"Vendor",           plannedHours:24, qualityCheckpoint:true,  description:"Embroidery on fabric before cutting", isActive:true },
  { id:"OP-011", name:"Stitching",                stage:"STITCHING",         department:"Stitching",         processType:"IN_HOUSE", workstationType:"Stitching Line",   plannedHours:8,  qualityCheckpoint:true,  description:"Main assembly stitching", isActive:true },
  { id:"OP-012", name:"Over Locking",             stage:"OVER_LOCKING",      department:"Stitching",         processType:"IN_HOUSE", workstationType:"Overlock Machine", plannedHours:2,  qualityCheckpoint:false, description:"Serge raw edges to prevent fraying", isActive:true },
  { id:"OP-013", name:"Button Hole",              stage:"BUTTON_HOLE",       department:"Stitching",         processType:"IN_HOUSE", workstationType:"Button Hole M/C",  plannedHours:1,  qualityCheckpoint:false, description:"Make button holes", isActive:true },
  { id:"OP-014", name:"Embroidery (Garment)",     stage:"EMBROIDERY_GARMENT",department:"Embroidery",        processType:"JOB_WORK", workstationType:"Vendor",           plannedHours:24, qualityCheckpoint:true,  description:"Embroidery on assembled garment", isActive:true },
  { id:"OP-015", name:"Hand Work",                stage:"HAND_WORK",         department:"Hand Work",         processType:"IN_HOUSE", workstationType:"Hand Work Table",  plannedHours:6,  qualityCheckpoint:false, description:"Sequence, stone, aari, mirror work", isActive:true },
  { id:"OP-016", name:"Washing",                  stage:"WASHING",           department:"Washing",           processType:"JOB_WORK", workstationType:"Washing Vendor",   plannedHours:12, qualityCheckpoint:true,  description:"Garment washing as per buyer spec", isActive:true },
  { id:"OP-017", name:"Thread Cutting",           stage:"THREAD_CUTTING",    department:"Finishing",         processType:"IN_HOUSE", workstationType:"Finishing Table",  plannedHours:2,  qualityCheckpoint:false, description:"Remove all loose threads", isActive:true },
  { id:"OP-018", name:"Ironing / Pressing",       stage:"IRONING",           department:"Finishing",         processType:"IN_HOUSE", workstationType:"Steam Iron",       plannedHours:3,  qualityCheckpoint:false, description:"Press garment to final shape", isActive:true },
  { id:"OP-019", name:"Tagging & Labelling",      stage:"TAGGING",           department:"Finishing",         processType:"IN_HOUSE", workstationType:"Tagging Station",  plannedHours:1,  qualityCheckpoint:false, description:"Attach price tags, care labels, size stickers", isActive:true },
  { id:"OP-020", name:"Inline QC",                stage:"INLINE_QC",         department:"QC Check",          processType:"IN_HOUSE", workstationType:"QC Table",         plannedHours:2,  qualityCheckpoint:true,  description:"In-line quality check during stitching", isActive:true },
  { id:"OP-021", name:"Final QC",                 stage:"FINAL_QC",          department:"QC Check",          processType:"IN_HOUSE", workstationType:"QC Table",         plannedHours:3,  qualityCheckpoint:true,  description:"Final quality check before packing", isActive:true },
  { id:"OP-022", name:"Folding & Packing",        stage:"FOLDING_PACKING",   department:"Packing",           processType:"IN_HOUSE", workstationType:"Packing Table",    plannedHours:2,  qualityCheckpoint:false, description:"Fold and pack in poly bag", isActive:true },
  { id:"OP-023", name:"Carton Packing",           stage:"CARTON_PACKING",    department:"Packing",           processType:"IN_HOUSE", workstationType:"Packing Area",     plannedHours:1,  qualityCheckpoint:false, description:"Pack into export cartons, label and seal", isActive:true },
  { id:"OP-024", name:"Dispatch",                 stage:"DISPATCH",          department:"Dispatch",          processType:"IN_HOUSE", workstationType:"Loading Bay",      plannedHours:1,  qualityCheckpoint:false, description:"Load and dispatch to buyer / transporter", isActive:true },
];

const EMPTY_OP: Partial<Operation> = {
  name:"", stage:"CUTTING", department:"Cutting", processType:"IN_HOUSE",
  workstationType:"", plannedHours:1, qualityCheckpoint:false,
  description:"", isActive:true,
};

function loadOps(): Operation[] {
  try {
    const raw = localStorage.getItem(OPERATIONS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_OPERATIONS;
}
function saveOps(ops: Operation[]) {
  localStorage.setItem(OPERATIONS_STORAGE_KEY, JSON.stringify(ops));
}

const inputCls = "w-full px-2.5 py-[5px] bg-[#fdfdfd] border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-[1px] focus:ring-[#2490ef] text-[13px] text-[#1c2126]";
const selectCls = inputCls + " appearance-none";

export default function OperationsMaster() {
  const [ops, setOps] = useState<Operation[]>(loadOps);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("ALL");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Operation>>(EMPTY_OP);
  const [showForm, setShowForm] = useState(false);

  const depts = Array.from(new Set(ops.map(o => o.department))).sort();

  const filtered = ops.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.stage.toLowerCase().includes(search.toLowerCase());
    const matchDept = filterDept === "ALL" || o.department === filterDept;
    return matchSearch && matchDept;
  });

  function openNew() {
    setForm({ ...EMPTY_OP });
    setEditId(null);
    setShowForm(true);
  }
  function openEdit(op: Operation) {
    setForm({ ...op });
    setEditId(op.id);
    setShowForm(true);
  }
  function closeForm() { setShowForm(false); setForm(EMPTY_OP); setEditId(null); }

  function handleSave() {
    if (!form.name?.trim()) return;
    let next: Operation[];
    if (editId) {
      next = ops.map(o => o.id === editId ? { ...o, ...form } as Operation : o);
    } else {
      const newOp: Operation = {
        ...EMPTY_OP, ...form,
        id: `OP-${String(ops.length + 1).padStart(3, "0")}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
      } as Operation;
      next = [...ops, newOp];
    }
    setOps(next); saveOps(next); closeForm();
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this operation?")) return;
    const next = ops.filter(o => o.id !== id);
    setOps(next); saveOps(next);
  }

  function toggleActive(id: string) {
    const next = ops.map(o => o.id === id ? { ...o, isActive: !o.isActive } : o);
    setOps(next); saveOps(next);
  }

  // auto-fill department when stage changes
  function handleStageChange(stageId: string) {
    const s = STAGES.find(s => s.id === stageId);
    setForm(prev => ({ ...prev, stage: stageId, department: s?.dept || prev.department }));
  }

  const statsCols = [
    { label:"Total", value: ops.length, color:"text-[#1c2126]" },
    { label:"Active", value: ops.filter(o=>o.isActive).length, color:"text-green-600" },
    { label:"In-House", value: ops.filter(o=>o.processType==="IN_HOUSE").length, color:"text-blue-600" },
    { label:"Job Work", value: ops.filter(o=>o.processType==="JOB_WORK").length, color:"text-orange-600" },
  ];

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#2490ef]/10 rounded-lg"><Settings2 className="w-5 h-5 text-[#2490ef]" /></div>
          <div>
            <h2 className="text-[15px] font-bold text-[#1c2126]">Operations Master</h2>
            <p className="text-[11px] text-[#8d99a6]">Define all manufacturing operations used in routing templates</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2490ef] text-white text-[12px] font-semibold rounded hover:bg-[#1a7fd4] transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Operation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {statsCols.map(s => (
          <div key={s.label} className="bg-white border border-[#d1d8dd] rounded p-3 text-center shadow-sm">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#8d99a6] mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8d99a6]" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search operations..." className="w-full pl-8 pr-3 py-[5px] bg-white border border-[#d1d8dd] rounded text-[13px] focus:outline-none focus:border-[#2490ef]" />
        </div>
        <div className="relative">
          <select value={filterDept} onChange={e=>setFilterDept(e.target.value)} className="pl-3 pr-7 py-[5px] bg-white border border-[#d1d8dd] rounded text-[13px] appearance-none focus:outline-none focus:border-[#2490ef] text-[#1c2126]">
            <option value="ALL">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#d1d8dd] rounded shadow-sm overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#f4f5f7] border-b border-[#d1d8dd]">
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">ID</th>
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">Operation Name</th>
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">Department</th>
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">Stage</th>
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">Type</th>
              <th className="text-left px-3 py-2.5 text-[#525c66] font-semibold">Workstation</th>
              <th className="text-right px-3 py-2.5 text-[#525c66] font-semibold">Hrs</th>
              <th className="text-center px-3 py-2.5 text-[#525c66] font-semibold">QC</th>
              <th className="text-center px-3 py-2.5 text-[#525c66] font-semibold">Status</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-10 text-[#8d99a6]">No operations found</td></tr>
            )}
            {filtered.map((op, i) => {
              const deptColor = DEPT_COLORS[op.department] || "bg-slate-100 text-slate-700 border-slate-200";
              return (
                <tr key={op.id} className={`border-b border-[#f0f1f3] hover:bg-[#f9fafb] transition-colors ${!op.isActive ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[#8d99a6]">{op.id}</td>
                  <td className="px-3 py-2.5 font-medium text-[#1c2126]">{op.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${deptColor}`}>{op.department}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[#525c66] font-mono text-[11px]">{op.stage}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${op.processType === "IN_HOUSE" ? "bg-blue-50 text-blue-700" : "bg-orange-50 text-orange-700"}`}>
                      {op.processType === "IN_HOUSE" ? "In-House" : "Job Work"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#525c66]">{op.workstationType}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-[#1c2126]">{op.plannedHours}</td>
                  <td className="px-3 py-2.5 text-center">{op.qualityCheckpoint ? <CheckCircle className="w-3.5 h-3.5 text-green-500 inline" /> : <span className="text-[#d1d8dd]">—</span>}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button onClick={() => toggleActive(op.id)} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${op.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {op.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(op)} className="p-1 text-[#8d99a6] hover:text-[#2490ef] hover:bg-[#2490ef]/10 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(op.id)} className="p-1 text-[#8d99a6] hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-2xl w-[640px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#d1d8dd]">
              <h3 className="font-bold text-[14px] text-[#1c2126]">{editId ? "Edit Operation" : "New Operation"}</h3>
              <button onClick={closeForm} className="p-1 hover:bg-[#f4f5f7] rounded"><X className="w-4 h-4 text-[#8d99a6]" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4 text-[13px]">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-[#525c66]">Operation Name *</label>
                <input value={form.name||""} onChange={e=>setForm(p=>({...p,name:e.target.value}))} className={inputCls} placeholder="e.g. Panel Cutting" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Stage</label>
                <div className="relative">
                  <select value={form.stage||"CUTTING"} onChange={e=>handleStageChange(e.target.value)} className={selectCls}>
                    {STAGES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Department</label>
                <input value={form.department||""} onChange={e=>setForm(p=>({...p,department:e.target.value}))} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Process Type</label>
                <div className="relative">
                  <select value={form.processType||"IN_HOUSE"} onChange={e=>setForm(p=>({...p,processType:e.target.value as any}))} className={selectCls}>
                    <option value="IN_HOUSE">In-House</option>
                    <option value="JOB_WORK">Job Work (Outsource)</option>
                  </select>
                  <ChevronRight className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] pointer-events-none rotate-90" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Workstation / Machine</label>
                <input value={form.workstationType||""} onChange={e=>setForm(p=>({...p,workstationType:e.target.value}))} className={inputCls} placeholder="e.g. Cutting Table" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-[#525c66]">Planned Hours</label>
                <input type="number" min="0" step="0.5" value={form.plannedHours||0} onChange={e=>setForm(p=>({...p,plannedHours:Number(e.target.value)}))} className={inputCls} />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-xs text-[#525c66]">Description</label>
                <textarea value={form.description||""} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className={inputCls + " resize-none"} rows={2} placeholder="Brief description of the operation" />
              </div>
              <div className="col-span-2 flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#1c2126]">
                  <input type="checkbox" checked={!!form.qualityCheckpoint} onChange={e=>setForm(p=>({...p,qualityCheckpoint:e.target.checked}))} className="w-4 h-4 accent-[#2490ef]" />
                  Quality Checkpoint
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-[13px] text-[#1c2126]">
                  <input type="checkbox" checked={!!form.isActive} onChange={e=>setForm(p=>({...p,isActive:e.target.checked}))} className="w-4 h-4 accent-[#2490ef]" />
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#d1d8dd]">
              <button onClick={closeForm} className="px-4 py-2 text-[13px] border border-[#d1d8dd] rounded text-[#525c66] hover:bg-[#f4f5f7]">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-[13px] bg-[#2490ef] text-white rounded font-semibold hover:bg-[#1a7fd4]">
                <Save className="w-3.5 h-3.5" /> Save Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
