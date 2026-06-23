/**
 * DeptTaskPage.tsx — Garment Manufacturing Edition v3
 *
 * NEW in this version (beyond the ERPNext upgrade in v2):
 *  1. Production Targets Panel  — Daily target vs actual pcs, % hit rate
 *  2. Efficiency Heatmap        — Worker × hour matrix, shows hot/cold hours
 *  3. SLA / TAT Tracking        — Per-job card: planned hrs, actual TAT, SLA breach flag
 *  4. Alteration Loop Tracker   — Tracks pieces that went back for rework from Finishing
 *  5. Size Breakup View         — Displays S/M/L/XL split per WO in dept
 *  6. Lot Splitting Panel       — Log how big lots are split across multiple karigars/machines
 *  7. Rework & Rejection Drill  — Breakdown of rejection by defect type per dept
 *  8. WIP Inventory (Gate Pass) — Pieces in / out count per dept for in-transit tracking
 *  9. SMV / Efficiency Monitor  — For Stitching: planned SMV vs actual, operator OEE %
 * 10. Vendor Challan Tracker    — Detailed challan log for Embroidery/Printing/Washing vendors
 */

import React, { useMemo, useState, useCallback } from "react";
import TaskBoard from "../TaskBoard";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";
import { computeBlockState, computePipelineProgress, opBelongsToDept as pipelineOpBelongsToDept } from "../pipelineWiring";
import { PipelineStrip, WORouteSummary } from "../PipelineStrip";
import {
  AlertTriangle,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  Package,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowRight,
  Zap,
  BarChart2,
  Eye,
  EyeOff,
  Info,
  LayoutGrid,
  List,
  Activity,
  ShieldCheck,
  Truck,
  CheckSquare,
  Filter,
  Download,
  Search,
  Edit3,
  Layers,
  XCircle,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Star,
  GitBranch,
  AlertCircle,
  Timer,
  Target,
  Award,
  ChevronRight,
  RotateCcw,
  Play,
  Pause,
  Check,
  Scissors,
  FileText,
  Hash,
  Flame,
  BarChart,
  Maximize2,
  ArrowLeft,
  Clipboard,
  Tag,
  Scale,
  Repeat,
  ArrowUpDown,
  Gauge,
  XOctagon,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeptMeta {
  icon: string;
  label: string;
  accent: string;
  hasVendor: boolean;
  vendorFields: string[];
  tips: string[];
  kpis: { label: string; formula: (ops: DeptOp[]) => string; icon: React.ElementType; color: string }[];
  rejectionTypes: string[];
  slaHours: number; // planned SLA per operation in hours
}

type DeptOp = {
  id: string;
  name: string;
  status: string;
  completedQuantity?: number;
  rejectedQuantity?: number;
  assignedTo?: string;
  startedAt?: string;
  completedAt?: string;
  customData?: Record<string, any>;
  woId: string;
  woProduct: string;
  woQty: number;
  woDeadline?: string;
  opIndex: number;
  priority?: string;
  dueDate?: string;
  subTasks?: any[];
  _blocked?: boolean;
  _blockedBy?: string;
};

// ─── Department Meta ─────────────────────────────────────────────────────────

const DEPT_META: Record<string, DeptMeta> = {
  Cutting: {
    icon: "✂️", label: "Cutting", accent: "rose", slaHours: 8,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Wrong Size", "Notch Error", "Fabric Defect", "Marker Error", "Short Pieces", "Grain Error"],
    tips: [
      "Check fabric grain before spreading layers",
      "Verify marker length vs. fabric roll",
      "Log waste (kg) per lot for costing",
    ],
    kpis: [
      { label: "Efficiency", formula: ops => { const c = ops.filter(o => norm(o) === "COMPLETED"); const t = c.reduce((s,o) => s + (o.completedQuantity||0),0); const total = ops.reduce((s,o) => s + (o.woQty||0),0); return total > 0 ? Math.round((t/total)*100)+"%" : "—"; }, icon: Target, color: "text-rose-600" },
      { label: "Bundles Out", formula: ops => { const b = ops.reduce((s,o)=>s+Number(o.customData?.bundlesOut||0),0); return b > 0 ? b + " bundles" : "—"; }, icon: Layers, color: "text-rose-500" },
      { label: "Waste (kg)", formula: ops => { const w = ops.reduce((s,o)=>s+Number(o.customData?.wasteKg||0),0); return w > 0 ? w.toFixed(1)+" kg" : "—"; }, icon: AlertCircle, color: "text-amber-600" },
      { label: "Tables Active", formula: ops => { const t = new Set(ops.filter(o => norm(o)==="IN_PROGRESS").map(o => o.customData?.tableNo).filter(Boolean)); return t.size + " tables"; }, icon: Layers, color: "text-rose-400" },
    ],
  },
  Stitching: {
    icon: "🧵", label: "Stitching", accent: "indigo", slaHours: 24,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Open Seam", "Stitch Skip", "Wrong Thread", "Uneven Hem", "Pucker", "Label Error", "Wrong Measurement"],
    tips: [
      "Set machine tension before each batch",
      "Log target/hr to track efficiency",
      "Separate sizes before issuing bundles",
    ],
    kpis: [
      { label: "Avg Target/Hr", formula: ops => { const vals = ops.map(o => Number(o.customData?.targetPerHr||0)).filter(v => v > 0); return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) + " pcs/hr" : "—"; }, icon: Zap, color: "text-indigo-600" },
      { label: "Machines Active", formula: ops => { const m = new Set(ops.filter(o => norm(o)==="IN_PROGRESS").map(o => o.customData?.machineNo).filter(Boolean)); return m.size + " machines"; }, icon: Activity, color: "text-indigo-500" },
      { label: "Avg SMV", formula: ops => { const v = ops.map(o => Number(o.customData?.smv||0)).filter(v=>v>0); return v.length > 0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+" min" : "—"; }, icon: Timer, color: "text-indigo-400" },
    ],
  },
  Embroidery: {
    icon: "🌸", label: "Embroidery", accent: "violet", slaHours: 72,
    hasVendor: true, vendorFields: ["vendor","sentQty","receivedQty"],
    rejectionTypes: ["Design Mismatch", "Colour Bleed", "Thread Pull", "Hole in Fabric", "Stitch Count Wrong", "Frame Mark"],
    tips: [
      "Confirm design & stitch count with vendor",
      "Track sent vs received qty per vendor",
      "Inspect sampling pieces before bulk run",
    ],
    kpis: [
      { label: "Out at Vendor", formula: ops => ops.reduce((s,o) => s + Math.max(0,(o.customData?.sentQty||0)-(o.customData?.receivedQty||0)),0) + " pcs", icon: Truck, color: "text-violet-600" },
      { label: "Avg Stitch Count", formula: ops => { const v = ops.map(o => Number(o.customData?.stitchCount||0)).filter(v=>v>0); return v.length > 0 ? Math.round(v.reduce((a,b)=>a+b,0)/v.length).toLocaleString()+" sts" : "—"; }, icon: Star, color: "text-violet-500" },
    ],
  },
  Printing: {
    icon: "🖨️", label: "Printing", accent: "amber", slaHours: 48,
    hasVendor: true, vendorFields: ["vendor"],
    rejectionTypes: ["Colour Mismatch", "Print Fade", "Registration Error", "Ink Bleed", "Incomplete Print", "Wrong Placement"],
    tips: [
      "Confirm colour proofs before bulk print",
      "Note ink lot for traceability",
      "Allow full drying time before packing",
    ],
    kpis: [
      { label: "Print Types", formula: ops => { const t = new Set(ops.map(o => o.customData?.printType).filter(Boolean)); return t.size + " types"; }, icon: BarChart2, color: "text-amber-600" },
      { label: "Avg Colours", formula: ops => { const v = ops.map(o => Number(o.customData?.colorCount||0)).filter(v=>v>0); return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(0)+" clrs" : "—"; }, icon: Star, color: "text-amber-500" },
      { label: "Avg Dry Time", formula: ops => { const v = ops.map(o => Number(o.customData?.dryTime||0)).filter(v=>v>0); return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+" hrs" : "—"; }, icon: Timer, color: "text-amber-400" },
      { label: "Avg Shrinkage", formula: ops => { const v = ops.map(o => { const mats = o.customData?.materialConsumptions || [{ fabricLength: o.customData?.fabricLength||0, foldLength: o.customData?.foldLength||0 }]; const issuedArea = mats.reduce((s: number, r: any) => { const len=Number(r.fabricLength||0); const fold=Number(r.foldLength||0)/100; return s+(fold>0?len*fold:len); }, 0); const recM=Number(o.customData?.receivedFabricMeters||0); const firstMat=mats[0]||{}; const recFold=Number(o.customData?.receivedFoldLength||firstMat.foldLength||0)/100; const recArea=recFold>0?recM*recFold:recM; if(issuedArea>0&&recArea>0) return ((issuedArea-recArea)/issuedArea*100); return null; }).filter((v): v is number => v !== null && v > 0); return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+"%" : "—"; }, icon: TrendingDown, color: "text-amber-300" },
    ],
  },
  Washing: {
    icon: "🫧", label: "Washing", accent: "cyan", slaHours: 36,
    hasVendor: true, vendorFields: ["vendor","sentQty","receivedQty"],
    rejectionTypes: ["Colour Bleed", "Shrinkage Excess", "Damage", "Shade Variation", "Pilling", "Stain"],
    tips: [
      "Log wash temperature and shrinkage %",
      "Match received qty to dispatch challan",
      "Check for colour bleeding before bulk",
    ],
    kpis: [
      { label: "Out at Vendor", formula: ops => ops.reduce((s,o) => s + Math.max(0,(o.customData?.sentQty||0)-(o.customData?.receivedQty||0)),0) + " pcs", icon: Truck, color: "text-cyan-600" },
      { label: "Avg Shrinkage", formula: ops => { const v = ops.map(o => { const s = Number(o.customData?.sentQty||0); const r = Number(o.customData?.receivedQty||0); if (s > 0 && r > 0) return ((s-r)/s*100); return Number(o.customData?.shrinkageLengthPct||o.customData?.shrinkage||0) || null; }).filter(v => v !== null && (v as number) > 0) as number[]; return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+"%" : "—"; }, icon: TrendingDown, color: "text-cyan-500" },
      { label: "Wash Types", formula: ops => { const t = new Set(ops.map(o => o.customData?.washType).filter(Boolean)); return t.size > 0 ? t.size + " types" : "—"; }, icon: Activity, color: "text-cyan-400" },
    ],
  },
  Finishing: {
    icon: "✨", label: "Finishing", accent: "emerald", slaHours: 16,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Ironing Mark", "Button Missing", "Label Wrong", "Measurement Off", "Thread Hanging", "Stain", "Damage"],
    tips: [
      "Steam press before attaching labels",
      "Log QC pass/fail count per WO",
      "Alteration pieces must loop back to stitching",
    ],
    kpis: [
      { label: "QC Pass Rate", formula: ops => { const pass = ops.reduce((s,o)=>s+(Number(o.customData?.qcPassQty||o.customData?.qcPass||0)),0); const fail = ops.reduce((s,o)=>s+(Number(o.customData?.qcFailQty||o.customData?.qcFail||0)),0); return (pass+fail)>0 ? Math.round((pass/(pass+fail))*100)+"%" : "—"; }, icon: ShieldCheck, color: "text-emerald-600" },
      { label: "For Alteration", formula: ops => ops.reduce((s,o)=>s+(Number(o.customData?.alterationQty||0)),0) + " pcs", icon: RotateCcw, color: "text-amber-600" },
      { label: "To Packing", formula: ops => ops.reduce((s,o)=>s+(Number(o.customData?.forwardedToPacking||o.completedQuantity||0)),0).toLocaleString() + " pcs", icon: Package, color: "text-sky-600" },
      { label: "Tagged", formula: ops => { const done = ops.filter(o => o.customData?.taggingDone).length; return done > 0 ? done + "/" + ops.length + " WOs" : "—"; }, icon: CheckSquare, color: "text-emerald-500" },
    ],
  },
  Packing: {
    icon: "📦", label: "Packing", accent: "sky", slaHours: 8,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Wrong Tag", "Barcode Error", "Wrong Size", "Packing Damage", "Label Error"],
    tips: [
      "Scan barcodes to verify before sealing",
      "Record carton numbers for dispatch",
      "Size-wise segregation before poly-bag",
    ],
    kpis: [
      { label: "Pcs Packed", formula: ops => ops.reduce((s,o)=>s+(Number(o.customData?.totalPacked||0)),0).toLocaleString() + " pcs", icon: Package, color: "text-sky-600" },
      { label: "Cartons", formula: ops => ops.reduce((s,o)=>s+(Number(o.customData?.totalCartons||0)),0) + " ctns", icon: CheckCircle2, color: "text-sky-500" },
      { label: "Scan Status", formula: ops => { const done = ops.filter(o => (o.customData?.barcodeScanned||"").includes("100%")).length; return done + "/" + ops.length + " WOs scanned"; }, icon: CheckSquare, color: "text-sky-400" },
    ],
  },

  // ── Fabric Inspection ─────────────────────────────────────────────────────
  "Fabric Inspection": {
    icon: "🔍", label: "Fabric Inspection", accent: "slate", slaHours: 4,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Shade Variation", "Width Short", "Weave Defect", "Hole / Tear", "Stain", "GSM Mismatch", "Wrong Article"],
    tips: [
      "Record roll numbers against GRN before inspection begins",
      "Use 4-point grading for export orders",
      "Log accepted meters immediately to update grey fabric stock",
    ],
    kpis: [
      { label: "Accepted Mtrs", formula: ops => ops.reduce((s,o)=>s+Number(o.customData?.acceptedMeters||0),0).toFixed(1) + " m", icon: CheckCircle2, color: "text-lime-600" },
      { label: "Defect Mtrs", formula: ops => ops.reduce((s,o)=>s+Number(o.customData?.defectMeters||0),0).toFixed(1) + " m", icon: AlertCircle, color: "text-rose-500" },
      { label: "Rolls In", formula: ops => { const r = ops.reduce((s,o)=>s+Number(o.customData?.rollCount||0),0); return r > 0 ? r + " rolls" : "—"; }, icon: Layers, color: "text-lime-500" },
      { label: "4-Pt Fails", formula: ops => { const f = ops.filter(o => Number(o.customData?.fourPointScore||0) > 40).length; return f > 0 ? f + " lots" : "✅ All pass"; }, icon: AlertCircle, color: "text-amber-600" },
    ],
  },

  // ── Dyeing ────────────────────────────────────────────────────────────────
  Dyeing: {
    icon: "🎨", label: "Dyeing", accent: "violet", slaHours: 48,
    hasVendor: true, vendorFields: ["vendor", "sentMeters", "receivedMeters"],
    rejectionTypes: ["Shade Mismatch", "Patchy Dyeing", "Colour Bleeding", "Shrinkage Excess", "Fabric Damage", "Wrong Colour"],
    tips: [
      "Always get shade approval from buyer before bulk dyeing",
      "Track sent vs received meters — log shrinkage accurately",
      "Note dye recipe reference for repeat orders",
    ],
    kpis: [
      { label: "Out at Dyer", formula: ops => { const out = ops.reduce((s,o) => s + Math.max(0, Number(o.customData?.sentMeters||0) - Number(o.customData?.receivedMeters||0)), 0); return out.toFixed(1) + " m"; }, icon: Truck, color: "text-pink-600" },
      { label: "Avg Shrinkage", formula: ops => { const v = ops.map(o => { const s = Number(o.customData?.sentMeters||0); const r = Number(o.customData?.receivedMeters||0); return s > 0 ? ((s-r)/s*100) : null; }).filter(v => v !== null) as number[]; return v.length > 0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+"%" : "—"; }, icon: TrendingDown, color: "text-pink-500" },
      { label: "Recipes Logged", formula: ops => { const n = ops.filter(o => o.customData?.dyeRecipeRef).length; return n > 0 ? n + "/" + ops.length : "—"; }, icon: Activity, color: "text-pink-400" },
    ],
  },

  // ── Hand Work ─────────────────────────────────────────────────────────────
  "Hand Work": {
    icon: "🤲", label: "Hand Work", accent: "amber", slaHours: 16,
    hasVendor: true, vendorFields: ["karigarName", "sentQty", "receivedQty"],
    rejectionTypes: ["Loose Embellishment", "Wrong Design", "Uneven Work", "Colour Bleed", "Missing Element", "Fabric Damage"],
    tips: [
      "Always issue materials (beads, mirrors, etc.) against a challan",
      "First piece approval is mandatory before bulk karigar dispatch",
      "Log rate/pc at issuance to auto-compute karigar payment",
    ],
    kpis: [
      { label: "Out at Karigar", formula: ops => ops.reduce((s,o) => s + Math.max(0, Number(o.customData?.sentQty||0) - Number(o.customData?.receivedQty||0)), 0) + " pcs", icon: Truck, color: "text-yellow-600" },
      { label: "Rejection %", formula: ops => { const rec = ops.reduce((s,o)=>s+Number(o.customData?.receivedQty||0),0); const rej = ops.reduce((s,o)=>s+Number(o.customData?.rejectedQty||0),0); return rec > 0 ? (rej/rec*100).toFixed(1)+"%" : "—"; }, icon: AlertCircle, color: "text-rose-500" },
      { label: "Payable (₹)", formula: ops => { const total = ops.reduce((s,o)=>{ const rate=Number(o.customData?.ratePerPc||0); const acc=Math.max(0,Number(o.customData?.receivedQty||0)-Number(o.customData?.rejectedQty||0)); return s+(rate*acc); },0); return total>0 ? "₹"+total.toLocaleString() : "—"; }, icon: Activity, color: "text-yellow-700" },
    ],
  },

  // ── QC Check ─────────────────────────────────────────────────────────────
  "QC Check": {
    icon: "🛡️", label: "QC Check", accent: "emerald", slaHours: 4,
    hasVendor: false, vendorFields: [],
    rejectionTypes: ["Stitching Skip", "Measurement Variation", "Colour Bleeding", "Broken Stitch", "Label Missing", "Embellishment Loose", "Soiling / Stain", "Pilling"],
    tips: [
      "100% inspection before shipment — log pass/fail per WO",
      "Tag alteration pieces clearly with defect type",
      "QC report must be signed before pieces move to packing",
    ],
    kpis: [
      { label: "Pass Rate", formula: ops => { const pass = ops.reduce((s,o)=>s+Number(o.customData?.passQty||0),0); const ins = ops.reduce((s,o)=>s+Number(o.customData?.inspectedQty||0),0); return ins > 0 ? Math.round(pass/ins*100)+"%" : "—"; }, icon: ShieldCheck, color: "text-teal-600" },
      { label: "For Alteration", formula: ops => ops.reduce((s,o)=>s+Number(o.customData?.alterationQty||0),0) + " pcs", icon: RotateCcw, color: "text-amber-600" },
      { label: "Hard Reject", formula: ops => ops.reduce((s,o)=>s+Number(o.customData?.failQty||0),0) + " pcs", icon: XCircle, color: "text-rose-500" },
    ],
  },
};

function getDefaultMeta(taskName: string): DeptMeta {
  return {
    icon: "🔧", label: taskName, accent: "slate", slaHours: 24,
    hasVendor: false, vendorFields: [], tips: [], kpis: [],
    rejectionTypes: ["Quality Issue", "Damage", "Wrong Spec"],
  };
}

// ─── Accent helpers ───────────────────────────────────────────────────────────

const ACCENT_MAP: Record<string, Record<string, string>> = {
  slate:   { bg: "bg-slate-50 dark:bg-slate-950/20",     border: "border-slate-200 dark:border-slate-700",   text: "text-slate-700 dark:text-slate-300",   badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",  btn: "bg-slate-600 hover:bg-slate-700 text-white",   ring: "ring-slate-300" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/20",       border: "border-rose-200 dark:border-rose-800",     text: "text-rose-700 dark:text-rose-300",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",  btn: "bg-rose-600 hover:bg-rose-700 text-white",     ring: "ring-rose-300" },
  indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/20",   border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700 text-white", ring: "ring-indigo-300" },
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/20",   border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", btn: "bg-violet-600 hover:bg-violet-700 text-white", ring: "ring-violet-300" },
  amber:   { bg: "bg-amber-50 dark:bg-amber-950/20",     border: "border-amber-200 dark:border-amber-800",   text: "text-amber-700 dark:text-amber-300",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",  btn: "bg-amber-600 hover:bg-amber-700 text-white",   ring: "ring-amber-300" },
  cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/20",       border: "border-cyan-200 dark:border-cyan-800",     text: "text-cyan-700 dark:text-cyan-300",     badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",    btn: "bg-cyan-600 hover:bg-cyan-700 text-white",     ring: "ring-cyan-300" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700 text-white", ring: "ring-emerald-300" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/20",         border: "border-sky-200 dark:border-sky-800",       text: "text-sky-700 dark:text-sky-300",       badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",      btn: "bg-sky-600 hover:bg-sky-700 text-white",       ring: "ring-sky-300" },
};

function ac(accent: string, v: "bg"|"border"|"text"|"badge"|"btn"|"ring") {
  return ACCENT_MAP[accent]?.[v] ?? ACCENT_MAP.slate[v];
}

// ─── Stage → Department mapping ───────────────────────────────────────────────

// opBelongsToDept delegates to pipelineWiring (single source of truth)
function opBelongsToDeptLocal(op: any, deptTabName: string): boolean {
  return pipelineOpBelongsToDept(op, deptTabName);
}

type NormState = "PENDING" | "IN_PROGRESS" | "COMPLETED";

function norm(op: DeptOp | { status: string }): NormState {
  const raw = (op.status || "PENDING");
  switch (raw) {
    case "Draft": case "Open": case "On Hold": case "Rejected": return "PENDING";
    case "Work In Progress": case "QC Review": return "IN_PROGRESS";
    case "Completed": return "COMPLETED";
  }
  switch (raw.toUpperCase()) {
    case "IN_PROGRESS": return "IN_PROGRESS";
    case "COMPLETED": return "COMPLETED";
    default: return "PENDING";
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
  inventory?: any[];
  onUpdateInventory?: (item: any) => void;
  onCreateGatePass?: (gp: any) => void;
}

type SubPage =
  | "job_board"
  | "analytics"
  | "timeline"
  | "vendor"
  | "quality"
  | "bulk"
  | "targets"
  | "smv"
  | "rework"
  | "wip";

interface SubPageDef {
  id: SubPage;
  label: string;
  icon: React.ElementType;
  badge?: (ops: DeptOp[]) => number | string | null;
  hidden?: boolean;
}

// ─── Shared StatPill ──────────────────────────────────────────────────────────

function StatPill({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5 font-semibold">{sub}</p>}
    </div>
  );
}

// ─── NEW: Production Targets Page ─────────────────────────────────────────────

function TargetsPage({ ops, karigars, accent, meta }: { ops: DeptOp[]; karigars: Karigar[]; accent: string; meta: DeptMeta }) {
  const [dailyTarget, setDailyTarget] = useState<number>(0);

  const donePcs = ops.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const totalPcs = ops.reduce((s, o) => s + (o.woQty || 0), 0);
  const rejPcs = ops.reduce((s, o) => s + (o.rejectedQuantity || 0), 0);
  const inProgressPcs = ops.filter(o => norm(o) === "IN_PROGRESS").reduce((s, o) => s + (o.woQty || 0), 0);

  const hitRate = dailyTarget > 0 ? Math.min(100, Math.round((donePcs / dailyTarget) * 100)) : 0;

  // SLA / TAT tracking
  const slaBreaches = ops.filter(op => {
    if (norm(op) === "COMPLETED") {
      if (!op.startedAt || !op.completedAt) return false;
      const tatHrs = (new Date(op.completedAt).getTime() - new Date(op.startedAt).getTime()) / 3600000;
      return tatHrs > meta.slaHours;
    }
    if (norm(op) === "IN_PROGRESS" && op.startedAt) {
      const elapsedHrs = (Date.now() - new Date(op.startedAt).getTime()) / 3600000;
      return elapsedHrs > meta.slaHours;
    }
    return false;
  });

  // Per-karigar output today
  const karigarOutput = useMemo(() => {
    const map: Record<string, { name: string; done: number; rej: number; jobs: number }> = {};
    for (const op of ops) {
      if (!op.assignedTo) continue;
      const k = karigars.find(k => k.id === op.assignedTo);
      if (!k) continue;
      if (!map[k.id]) map[k.id] = { name: k.name, done: 0, rej: 0, jobs: 0 };
      map[k.id].done += op.completedQuantity || 0;
      map[k.id].rej += op.rejectedQuantity || 0;
      map[k.id].jobs++;
    }
    return Object.values(map).sort((a, b) => b.done - a.done);
  }, [ops, karigars]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Daily target input */}
      <div className={`flex items-center gap-4 p-4 rounded-2xl border ${ac(accent, "bg")} ${ac(accent, "border")}`}>
        <Target className={`w-6 h-6 ${ac(accent, "text")} shrink-0`} />
        <div className="flex-1">
          <p className={`text-xs font-black ${ac(accent, "text")}`}>Daily Production Target</p>
          <p className="text-[10px] text-slate-500">Set the target pieces for today to track hit rate</p>
        </div>
        <input
          type="number"
          min={0}
          className="w-28 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-black text-right bg-white dark:bg-slate-900 outline-none focus:border-indigo-400"
          placeholder="0 pcs"
          value={dailyTarget || ""}
          onChange={e => setDailyTarget(Number(e.target.value))}
        />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Done Today", value: donePcs.toLocaleString(), sub: `of ${totalPcs.toLocaleString()} total`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
          { label: "Target Hit", value: dailyTarget > 0 ? `${hitRate}%` : "—", sub: dailyTarget > 0 ? `${donePcs} of ${dailyTarget} target` : "Set target above", icon: Target, color: hitRate >= 80 ? "text-emerald-600" : hitRate >= 50 ? "text-amber-600" : "text-rose-600", bg: hitRate >= 80 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" : "bg-amber-50 dark:bg-amber-950/20 border-amber-200" },
          { label: "In Pipeline", value: inProgressPcs.toLocaleString(), sub: "pieces in progress", icon: Activity, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800" },
          { label: "SLA Breaches", value: slaBreaches.length, sub: `>${meta.slaHours}hr TAT`, icon: AlertTriangle, color: slaBreaches.length > 0 ? "text-rose-600" : "text-slate-400", bg: slaBreaches.length > 0 ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200" : "bg-slate-50 dark:bg-slate-900 border-slate-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className={`text-2xl font-black tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Target progress bar */}
      {dailyTarget > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Production Progress</h3>
            <span className={`text-sm font-black ${hitRate >= 80 ? "text-emerald-600" : hitRate >= 50 ? "text-amber-600" : "text-rose-600"}`}>{hitRate}%</span>
          </div>
          <div className="relative h-6 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 flex items-center justify-end pr-2 ${hitRate >= 80 ? "bg-emerald-500" : hitRate >= 50 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${Math.max(hitRate, 2)}%` }}
            >
              {hitRate > 15 && <span className="text-[9px] font-black text-white">{donePcs} pcs</span>}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-semibold">
            <span>0</span>
            <span>Target: {dailyTarget} pcs</span>
          </div>
        </div>
      )}

      {/* SLA breach list */}
      {slaBreaches.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-rose-100 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/20 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h3 className="text-xs font-black uppercase tracking-widest text-rose-700 dark:text-rose-300">SLA Breaches ({slaBreaches.length})</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {slaBreaches.map(op => {
              const startedAt = op.startedAt ? new Date(op.startedAt) : null;
              const endAt = op.completedAt ? new Date(op.completedAt) : new Date();
              const tatHrs = startedAt ? ((endAt.getTime() - startedAt.getTime()) / 3600000).toFixed(1) : "—";
              return (
                <div key={`${op.woId}-${op.opIndex}`} className="flex items-center gap-3 px-5 py-3">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{op.woProduct}</p>
                    <p className="text-[10px] text-slate-500">{op.woId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-rose-600">{tatHrs} hrs</p>
                    <p className="text-[9px] text-slate-400">SLA: {meta.slaHours}hr</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-worker output */}
      {karigarOutput.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")} flex items-center gap-2`}>
              <Users className="w-4 h-4" /> Worker Output
            </h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {karigarOutput.map((k, i) => {
              const pct = dailyTarget > 0 && karigarOutput.length > 0
                ? Math.min(100, Math.round((k.done / (dailyTarget / karigarOutput.length)) * 100))
                : 0;
              return (
                <div key={k.name} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="w-6 text-center text-sm font-black text-slate-400">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${ac(accent, "badge")}`}>
                    {k.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{k.name}</p>
                    <p className="text-[10px] text-slate-400">{k.jobs} job cards</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{k.done.toLocaleString()} pcs</p>
                    {k.rej > 0 && <p className="text-[10px] text-rose-500">{k.rej} rejected</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NEW: SMV / Efficiency Monitor (Stitching-specific) ───────────────────────

function SMVPage({ ops, karigars, accent }: { ops: DeptOp[]; karigars: Karigar[]; accent: string }) {
  const stitchingOps = ops.filter(o => o.customData?.smv || o.customData?.targetPerHr || o.customData?.machineNo);

  const totalSMV = stitchingOps.reduce((s, o) => s + Number(o.customData?.smv || 0), 0);
  const avgSMV = stitchingOps.length > 0 ? (totalSMV / stitchingOps.length).toFixed(1) : "—";

  // OEE per karigar
  const oeeData = useMemo(() => {
    const map: Record<string, { name: string; targetHr: number; actualOutput: number; smv: number; jobs: number }> = {};
    for (const op of stitchingOps) {
      if (!op.assignedTo) continue;
      const k = karigars.find(k => k.id === op.assignedTo);
      if (!k) continue;
      if (!map[k.id]) map[k.id] = { name: k.name, targetHr: 0, actualOutput: 0, smv: 0, jobs: 0 };
      map[k.id].targetHr = Math.max(map[k.id].targetHr, Number(op.customData?.targetPerHr || 0));
      map[k.id].actualOutput += op.completedQuantity || 0;
      map[k.id].smv += Number(op.customData?.smv || 0);
      map[k.id].jobs++;
    }
    return Object.values(map).sort((a, b) => b.actualOutput - a.actualOutput);
  }, [stitchingOps, karigars]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Overview */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avg SMV", value: avgSMV + (avgSMV !== "—" ? " min" : ""), icon: Timer, color: "text-indigo-600" },
          { label: "Machines Active", value: new Set(ops.filter(o => norm(o) === "IN_PROGRESS").map(o => o.customData?.machineNo).filter(Boolean)).size, icon: Zap, color: "text-amber-600" },
          { label: "Total Workers", value: new Set(ops.filter(o => o.assignedTo).map(o => o.assignedTo)).size, icon: Users, color: "text-indigo-600" },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
            </div>
            <p className={`text-xl font-black tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Operator OEE table */}
      {oeeData.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")} flex items-center gap-2`}>
              <Gauge className="w-4 h-4" /> Operator Efficiency (OEE)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Operator", "Jobs", "Target/Hr", "Output (pcs)", "Avg SMV", "Efficiency"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {oeeData.map(k => {
                  const avgSmvPerJob = k.jobs > 0 ? (k.smv / k.jobs).toFixed(1) : "—";
                  // OEE ≈ actual / (target × available shift hrs)
                  const shiftHrs = 8;
                  // FIX: theoreticalOutput was a single shift's capacity regardless of how
                  // many job cards (≈ shifts) actualOutput was summed across. That pegged
                  // OEE at 100% for anyone with >1 completed job and unfairly tanked it for
                  // anyone with exactly 1. Scale capacity by job count as a shift-count proxy.
                  const theoreticalOutput = k.targetHr * shiftHrs * k.jobs;
                  const oee = theoreticalOutput > 0 ? Math.min(100, Math.round((k.actualOutput / theoreticalOutput) * 100)) : 0;
                  return (
                    <tr key={k.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black ${ac(accent, "badge")}`}>{k.name.charAt(0)}</div>
                          <span className="text-sm font-black text-slate-800 dark:text-slate-100">{k.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{k.jobs}</td>
                      <td className="px-4 py-3 font-black text-amber-600">{k.targetHr > 0 ? k.targetHr + " pcs/hr" : "—"}</td>
                      <td className="px-4 py-3 font-black text-emerald-600">{k.actualOutput.toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold">{avgSmvPerJob} min</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${oee >= 80 ? "bg-emerald-500" : oee >= 60 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${oee}%` }} />
                          </div>
                          <span className={`text-[11px] font-black ${oee >= 80 ? "text-emerald-600" : oee >= 60 ? "text-amber-600" : "text-rose-600"}`}>{oee}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Gauge className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-bold">No SMV data yet</p>
          <p className="text-sm mt-1">Fill in SMV and Target/Hr fields on Stitching job cards.</p>
        </div>
      )}

      {/* Machine-wise table */}
      {(() => {
        const machines = new Map<string, { no: string; ops: DeptOp[]; output: number }>();
        for (const op of ops) {
          const m = op.customData?.machineNo;
          if (!m) continue;
          if (!machines.has(m)) machines.set(m, { no: m, ops: [], output: 0 });
          machines.get(m)!.ops.push(op);
          machines.get(m)!.output += op.completedQuantity || 0;
        }
        if (machines.size === 0) return null;
        return (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")}`}>Machine-wise Output</h3>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {[...machines.values()].map(m => {
                const active = m.ops.some(o => norm(o) === "IN_PROGRESS");
                return (
                  <div key={m.no} className={`rounded-xl border p-3 ${active ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800" : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40"}`}>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-200">{m.no}</p>
                    <p className={`text-lg font-black tabular-nums mt-1 ${active ? "text-indigo-600" : "text-slate-500"}`}>{m.output} <span className="text-xs font-semibold">pcs</span></p>
                    <p className={`text-[9px] font-black mt-0.5 ${active ? "text-indigo-500" : "text-slate-400"}`}>{active ? "● Active" : "○ Idle"}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── NEW: Rework & Rejection Drill ────────────────────────────────────────────

function ReworkPage({ ops, accent, meta }: { ops: DeptOp[]; accent: string; meta: DeptMeta }) {
  const [newDefect, setNewDefect] = useState("");
  const [newCount, setNewCount] = useState(0);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);

  // Aggregate defect types from customData
  const defectTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const op of ops) {
      const defects: Record<string, number> = op.customData?.defects || {};
      for (const [type, count] of Object.entries(defects)) {
        map[type] = (map[type] || 0) + Number(count);
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [ops]);

  const totalRej = ops.reduce((s, o) => s + (o.rejectedQuantity || 0), 0);
  const totalDone = ops.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  // FIX: rejection rate is rejected ÷ total inspected (done+rejected), not rejected ÷ done.
  // The old formula overstated the rate (e.g. 50 done + 50 rejected showed as 100%, not 50%).
  const rejRate = (totalDone + totalRej) > 0 ? ((totalRej / (totalDone + totalRej)) * 100).toFixed(1) : "0";

  // Alteration tracking (Finishing dept)
  const alterationOps = ops.filter(o => (o.customData?.alterationQty || 0) > 0);
  const totalAlteration = alterationOps.reduce((s, o) => s + (o.customData?.alterationQty || 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Rejected", value: totalRej.toLocaleString(), icon: XCircle, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200" },
          { label: "Rejection Rate", value: `${rejRate}%`, icon: XOctagon, color: Number(rejRate) > 5 ? "text-rose-600" : "text-emerald-600", bg: Number(rejRate) > 5 ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" },
          { label: "Alteration Queue", value: totalAlteration.toLocaleString(), icon: RotateCcw, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-3 ${c.bg}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
            </div>
            <p className={`text-xl font-black tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Defect type breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")}`}>Defect Analysis — {meta.label}</h3>
        </div>
        <div className="p-5 space-y-4">
          {/* Common defect types for this dept */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Common Defect Types for {meta.label}</p>
            <div className="flex flex-wrap gap-2">
              {meta.rejectionTypes.map(t => (
                <span key={t} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${ac(accent, "badge")} ${ac(accent, "border")}`}>{t}</span>
              ))}
            </div>
          </div>

          {defectTotals.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Logged Defects</p>
              <div className="space-y-2">
                {defectTotals.map(([type, count]) => {
                  const pct = totalRej > 0 ? Math.round((count / totalRej) * 100) : 0;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-32 shrink-0 truncate">{type}</span>
                      <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-rose-600 w-16 text-right">{count} pcs ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {defectTotals.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No defect data logged yet. Add defect types in the job card Dept fields.</p>
          )}
        </div>
      </div>

      {/* Alteration detail — Finishing */}
      {alterationOps.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">Alteration Queue</h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {alterationOps.map(op => (
              <div key={`${op.woId}-${op.opIndex}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <RotateCcw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{op.woProduct}</p>
                  <p className="text-[10px] text-slate-500">{op.woId}</p>
                </div>
                <span className="text-sm font-black text-amber-600">{op.customData?.alterationQty} pcs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NEW: WIP Inventory (Gate Pass Tracker) ───────────────────────────────────

function WIPPage({ ops, accent, taskName, production }: { ops: DeptOp[]; accent: string; taskName: string; production: WorkOrder[] }) {
  const totalPcs = ops.reduce((s, o) => s + (o.woQty || 0), 0);
  const donePcs = ops.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const wipPcs = ops.filter(o => norm(o) === "IN_PROGRESS").reduce((s, o) => s + (o.woQty || 0), 0);
  const pendingPcs = ops.filter(o => norm(o) === "PENDING" && !(o as any)._blocked).reduce((s, o) => s + (o.woQty || 0), 0);
  const blockedPcs = ops.filter(o => (o as any)._blocked).reduce((s, o) => s + (o.woQty || 0), 0);

  const WO_WIP = useMemo(() => {
    const map: Record<string, { product: string; total: number; done: number; wip: number; pending: number }> = {};
    for (const op of ops) {
      if (!map[op.woId]) map[op.woId] = { product: op.woProduct, total: 0, done: 0, wip: 0, pending: 0 };
      // FIX: accumulate total per-op (same convention as done/wip/pending) instead of
      // setting it once from op.woQty. A WO with multiple piece-tagged ops in this dept
      // (e.g. Kurti+Pant+Dupatta set, all under one woId) was overflowing done+wip+pending
      // past a fixed single-op total, producing >100% progress and mismatched counts.
      map[op.woId].total += op.woQty || 0;
      const s = norm(op);
      if (s === "COMPLETED") map[op.woId].done += op.completedQuantity || 0;
      else if (s === "IN_PROGRESS") map[op.woId].wip += op.woQty || 0;
      else map[op.woId].pending += op.woQty || 0;
    }
    return Object.entries(map).sort((a, b) => b[1].wip - a[1].wip);
  }, [ops]);

  // Unique WOs that have ops in this dept — for full pipeline view
  const uniqueWOIds = useMemo(() => [...new Set(ops.map(o => o.woId))], [ops]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total in Dept", value: totalPcs.toLocaleString(), sub: "pieces", icon: Package, color: `${ac(accent, "text")}`, bg: `${ac(accent, "bg")} ${ac(accent, "border")}` },
          { label: "WIP", value: wipPcs.toLocaleString(), sub: "in progress", icon: Activity, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200" },
          { label: "Completed", value: donePcs.toLocaleString(), sub: "out of dept", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200" },
          { label: "Pending / Blocked", value: (pendingPcs + blockedPcs).toLocaleString(), sub: `${blockedPcs} blocked`, icon: Clock, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900 border-slate-200" },
        ].map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 ${c.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
              <c.icon className={`w-4 h-4 ${c.color}`} />
            </div>
            <p className={`text-2xl font-black tabular-nums ${c.color}`}>{c.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Flow diagram */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Department Flow</h3>
        <div className="flex items-center gap-2">
          {[
            { label: "Pending", value: pendingPcs, color: "bg-slate-400" },
            { label: "In Progress", value: wipPcs, color: "bg-amber-400" },
            { label: "Completed", value: donePcs, color: "bg-emerald-500" },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex-1 text-center">
                <div className={`h-10 rounded-xl ${s.color} flex items-center justify-center mb-1`}>
                  <span className="text-xs font-black text-white">{s.value.toLocaleString()}</span>
                </div>
                <p className="text-[9px] font-bold text-slate-500">{s.label}</p>
              </div>
              {i < 2 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-slate-400 font-semibold">
          <span>In from prev. dept</span>
          <span>Prev. dept → {taskName} → Next dept</span>
          <span>Out to next dept</span>
        </div>
      </div>

      {/* Full garment pipeline per WO — the key upgrade */}
      {uniqueWOIds.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")} flex items-center gap-2`}>
              <GitBranch className="w-4 h-4" /> Full Pipeline Route per Work Order
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Shows where each WO sits in the entire garment manufacturing pipeline</p>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {uniqueWOIds.map(woId => {
              const wo = production.find(w => w.id === woId);
              if (!wo) return null;
              return (
                <WORouteSummary
                  key={woId}
                  woId={wo.id}
                  productName={wo.productName}
                  quantity={wo.quantity}
                  operations={wo.operations || []}
                  currentDept={taskName}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Per-WO WIP table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
          <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")}`}>Work Order WIP</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {["Work Order", "Product", "Total", "Done", "WIP", "Pending", "Progress"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {WO_WIP.map(([woId, w]) => {
                const pct = w.total > 0 ? Math.round((w.done / w.total) * 100) : 0;
                return (
                  <tr key={woId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{woId}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{w.product}</td>
                    <td className="px-4 py-2.5 font-black text-slate-600 dark:text-slate-300">{w.total}</td>
                    <td className="px-4 py-2.5 font-black text-emerald-600">{w.done}</td>
                    <td className="px-4 py-2.5 font-black text-amber-600">{w.wip}</td>
                    <td className="px-4 py-2.5 font-black text-slate-500">{w.pending}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[11px] font-black text-slate-500">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {WO_WIP.length === 0 && <div className="py-10 text-center text-slate-400 text-sm">No WIP data</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Page (unchanged from v2 but improved) ─────────────────────────

function AnalyticsPage({ ops, karigars, accent }: { ops: DeptOp[]; karigars: Karigar[]; accent: string }) {
  const total = ops.length;
  const pending = ops.filter(o => norm(o) === "PENDING").length;
  const wip = ops.filter(o => norm(o) === "IN_PROGRESS").length;
  const done = ops.filter(o => norm(o) === "COMPLETED").length;
  const donePcs = ops.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const rejPcs = ops.reduce((s, o) => s + (o.rejectedQuantity || 0), 0);
  const totalPcs = ops.reduce((s, o) => s + (o.woQty || 0), 0);
  // FIX: denominator should be total inspected (done+rejected), not done alone.
  const rejRate = (donePcs + rejPcs) > 0 ? Math.round((rejPcs / (donePcs + rejPcs)) * 100) : 0;
  const efficiency = total > 0 ? Math.round((done / total) * 100) : 0;

  const karigarStats = useMemo(() => {
    const map: Record<string, { name: string; done: number; rejected: number; jobs: number }> = {};
    for (const op of ops) {
      if (!op.assignedTo) continue;
      const k = karigars.find(k => k.id === op.assignedTo);
      if (!k) continue;
      if (!map[k.id]) map[k.id] = { name: k.name, done: 0, rejected: 0, jobs: 0 };
      map[k.id].done += op.completedQuantity || 0;
      map[k.id].rejected += op.rejectedQuantity || 0;
      map[k.id].jobs++;
    }
    return Object.values(map).sort((a, b) => b.done - a.done);
  }, [ops, karigars]);

  const barData = [
    { label: "Open",         value: ops.filter(o => norm(o) === "PENDING").length,     color: "bg-slate-300 dark:bg-slate-600" },
    { label: "In Progress",  value: ops.filter(o => o.status === "Work In Progress").length, color: "bg-amber-400" },
    { label: "QC Review",    value: ops.filter(o => o.status === "QC Review").length,  color: "bg-violet-400" },
    { label: "Completed",    value: done,                                               color: "bg-emerald-500" },
    { label: "On Hold",      value: ops.filter(o => o.status === "On Hold").length,    color: "bg-orange-400" },
    { label: "Rejected",     value: ops.filter(o => o.status === "Rejected").length,   color: "bg-rose-400" },
  ].filter(b => b.value > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jobs", value: total, sub: `${pending} pending`, icon: Layers, color: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" },
          { label: "Efficiency", value: `${efficiency}%`, sub: `${done} / ${total} jobs done`, icon: Target, color: `${ac(accent, "bg")} ${ac(accent, "border")}` },
          { label: "Rejection Rate", value: `${rejRate}%`, sub: `${rejPcs} items rejected`, icon: XCircle, color: rejRate > 5 ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
          { label: "Completed", value: done, sub: `${wip} in progress`, icon: CheckCircle2, color: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border p-4 ${card.color}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
              <card.icon className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 tabular-nums leading-none">{card.value}</p>
            <p className="text-[10px] text-slate-500 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {barData.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Status Distribution</h3>
          <div className="flex h-8 rounded-xl overflow-hidden gap-0.5 mb-3">
            {barData.map(b => (
              <div
                key={b.label}
                className={`${b.color} flex items-center justify-center text-[9px] font-black text-white transition-all`}
                style={{ width: total > 0 ? `${(b.value / total) * 100}%` : "0%" }}
                title={`${b.label}: ${b.value}`}
              >
                {(b.value / total) * 100 > 8 ? b.value : ""}
              </div>
            ))}
          </div>
          <div className="flex gap-4 flex-wrap">
            {barData.map(b => (
              <div key={b.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
                <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{b.label} <strong className="text-slate-800 dark:text-slate-200">{b.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Pieces Progress</h3>
          <span className={`text-sm font-black ${ac(accent, "text")}`}>{efficiency}%</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full rounded-full transition-all ${efficiency >= 80 ? "bg-emerald-500" : efficiency >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
            style={{ width: `${efficiency}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 font-semibold mt-1">
          <span>{done} jobs complete</span>
          <span>{total} total jobs</span>
        </div>
      </div>

      {karigarStats.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
            <h3 className={`text-xs font-black uppercase tracking-widest ${ac(accent, "text")} flex items-center gap-2`}>
              <Award className={`w-4 h-4 ${ac(accent, "text")}`} />
              Worker Performance
            </h3>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800">
            {karigarStats.map((k, i) => {
              const passRate = (k.done + k.rejected) > 0 ? Math.round((k.done / (k.done + k.rejected)) * 100) : 100;
              return (
                <div key={k.name} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <span className="w-6 text-center text-sm font-black text-slate-400">{i + 1}</span>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${ac(accent, "badge")}`}>
                    {k.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{k.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${passRate}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 shrink-0">{passRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800 dark:text-slate-200">{k.done.toLocaleString()} pcs</p>
                    <p className="text-[10px] text-slate-400">{k.jobs} jobs{k.rejected > 0 ? ` · ${k.rejected} rej` : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Page ────────────────────────────────────────────────────────────

function TimelinePage({ ops, accent }: { ops: DeptOp[]; accent: string }) {
  const events = useMemo(() => {
    const evts: { time: string; label: string; sub: string; type: "start" | "complete" | "pending" }[] = [];
    for (const op of ops) {
      if (op.startedAt) evts.push({ time: op.startedAt, label: `Started: ${op.woProduct}`, sub: `WO: ${op.woId}`, type: "start" });
      if (op.completedAt) evts.push({ time: op.completedAt, label: `Completed: ${op.woProduct}`, sub: `WO: ${op.woId} · ${op.completedQuantity || 0} pcs done`, type: "complete" });
    }
    const pendingOps = ops.filter(o => norm(o) === "PENDING");
    for (const op of pendingOps) {
      evts.push({ time: op.woDeadline || "", label: `Pending: ${op.woProduct}`, sub: `WO: ${op.woId} · ${op.woQty} pcs`, type: "pending" });
    }
    return evts.sort((a, b) => {
      if (!a.time && !b.time) return 0;
      if (!a.time) return 1;
      if (!b.time) return -1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
  }, [ops]);

  const typeStyle = {
    start:    { dot: "bg-amber-400", icon: Play, text: "text-amber-700 dark:text-amber-300" },
    complete: { dot: "bg-emerald-500", icon: CheckCircle2, text: "text-emerald-700 dark:text-emerald-300" },
    pending:  { dot: "bg-slate-300 dark:bg-slate-600", icon: Clock, text: "text-slate-500" },
  };

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <GitBranch className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-bold">No timeline events yet</p>
        <p className="text-sm mt-1">Start or complete job cards to see activity here.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-1">
          {events.map((evt, i) => {
            const s = typeStyle[evt.type];
            const Icon = s.icon;
            return (
              <div key={i} className="relative flex items-start gap-4 pl-12 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors">
                <div className={`absolute left-3.5 w-3 h-3 rounded-full ${s.dot} ring-2 ring-white dark:ring-slate-950 shrink-0 mt-1`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${s.text} shrink-0`} />
                    <p className={`text-sm font-black ${s.text}`}>{evt.label}</p>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{evt.sub}</p>
                </div>
                {evt.time && (
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                    {new Date(evt.time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Page ──────────────────────────────────────────────────────────────

function VendorPage({ ops, accent, taskName }: { ops: DeptOp[]; accent: string; taskName: string }) {
  const isDyeing = taskName.toLowerCase().includes("dyeing");
  const sentKey      = isDyeing ? "sentMeters"    : "sentQty";
  const receivedKey  = isDyeing ? "receivedMeters" : "receivedQty";
  const unit         = isDyeing ? "meters" : "pieces";

  const vendors = useMemo(() => {
    const map: Record<string, { name: string; sent: number; received: number; jobs: DeptOp[]; active: number; challans: any[] }> = {};
    for (const op of ops) {
      const v = op.customData?.vendor || op.customData?.karigarName;
      if (!v) continue;
      if (!map[v]) map[v] = { name: v, sent: 0, received: 0, jobs: [], active: 0, challans: op.customData?.challans || [] };
      map[v].sent     += Number(op.customData?.[sentKey]     || 0);
      map[v].received += Number(op.customData?.[receivedKey] || 0);
      map[v].jobs.push(op);
      if (norm(op) !== "COMPLETED") map[v].active++;
    }
    return Object.values(map).sort((a, b) => (b.sent - b.received) - (a.sent - a.received));
  }, [ops, sentKey, receivedKey]);

  const unassigned = ops.filter(o => !o.customData?.vendor && norm(o) !== "COMPLETED").length;

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Truck className="w-12 h-12 mb-3 opacity-20" />
        <p className="font-bold">No vendor data yet</p>
        <p className="text-sm mt-1">Fill in Vendor field on job cards to track dispatch.</p>
        {unassigned > 0 && (
          <p className="text-xs mt-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 px-3 py-1 rounded-full border border-amber-200">{unassigned} jobs without vendor assigned</p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {unassigned > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {unassigned} active job{unassigned > 1 ? "s" : ""} without a vendor assigned
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Sent", value: vendors.reduce((s,v)=>s+v.sent,0), icon: ArrowUpRight, color: "text-indigo-600" },
          { label: "Total Received", value: vendors.reduce((s,v)=>s+v.received,0), icon: ArrowDownRight, color: "text-emerald-600" },
          { label: "Outstanding", value: vendors.reduce((s,v)=>s+Math.max(0,v.sent-v.received),0), icon: AlertCircle, color: "text-amber-600" },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
            </div>
            <p className={`text-xl font-black tabular-nums ${c.color}`}>{c.value.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400">{unit}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {vendors.map(v => {
          const balance = Math.max(0, v.sent - v.received);
          const recvPct = v.sent > 0 ? Math.round((v.received / v.sent) * 100) : 0;
          return (
            <div key={v.name} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{v.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{v.jobs.length} job cards · {v.active} active</p>
                </div>
                {balance > 0 ? (
                  <span className="text-[11px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 rounded-full">{balance} {unit} outstanding</span>
                ) : v.received > 0 ? (
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full">All received ✓</span>
                ) : null}
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div><p className="text-[10px] text-slate-400 font-semibold">Sent</p><p className="font-black text-slate-700 dark:text-slate-200">{v.sent.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-slate-400 font-semibold">Received</p><p className="font-black text-emerald-600">{v.received.toLocaleString()}</p></div>
                <div><p className="text-[10px] text-slate-400 font-semibold">Balance</p><p className={`font-black ${balance > 0 ? "text-amber-600" : "text-slate-400"}`}>{balance.toLocaleString()}</p></div>
              </div>
              {v.sent > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-semibold">
                    <span>Received back</span>
                    <span>{recvPct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${recvPct}%` }} />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quality Page ─────────────────────────────────────────────────────────────

function QualityPage({ ops, accent }: { ops: DeptOp[]; accent: string }) {
  const completed = ops.filter(o => norm(o) === "COMPLETED");
  const totalDone = completed.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const totalRej  = completed.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
  // FIX: "Total Inspected" was showing only good (completed) pieces, excluding rejects —
  // and rejRate divided by that same incomplete total instead of total inspected.
  const totalInspected = totalDone + totalRej;
  const rejRate   = totalInspected > 0 ? ((totalRej / totalInspected) * 100).toFixed(1) : "0";
  const sorted = [...completed].sort((a, b) => (b.rejectedQuantity || 0) - (a.rejectedQuantity || 0));

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Inspected", value: totalInspected.toLocaleString(), icon: ShieldCheck, color: "text-slate-600" },
          { label: "Rejected", value: totalRej.toLocaleString(), icon: XCircle, color: "text-rose-600" },
          { label: "Rejection Rate", value: `${rejRate}%`, icon: XOctagon, color: Number(rejRate) > 5 ? "text-rose-600" : "text-emerald-600" },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{c.label}</p>
            </div>
            <p className={`text-xl font-black tabular-nums ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {Number(rejRate) > 5 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <p className="text-sm font-black">High rejection rate: {rejRate}%</p>
            <p className="text-xs mt-0.5 opacity-80">Review quality checkpoint data and inspect recent completed job cards.</p>
          </div>
        </div>
      )}

      {completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ShieldCheck className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-bold text-sm">No completed jobs yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 ${ac(accent, "bg")}`}>
            <ShieldCheck className={`w-4 h-4 ${ac(accent, "text")}`} />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Quality Log</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  {["Work Order", "Product", "Done (pcs)", "Rejected", "Pass Rate"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {sorted.map(op => {
                  const total = (op.completedQuantity || 0) + (op.rejectedQuantity || 0);
                  const pass = total > 0 ? Math.round(((op.completedQuantity || 0) / total) * 100) : 100;
                  return (
                    <tr key={`${op.woId}-${op.opIndex}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{op.woId}</td>
                      <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">{op.woProduct}</td>
                      <td className="px-4 py-2.5 font-black text-emerald-600">{(op.completedQuantity || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5 font-black text-rose-500">{(op.rejectedQuantity || 0).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${pass < 90 ? "bg-rose-400" : "bg-emerald-500"}`} style={{ width: `${pass}%` }} />
                          </div>
                          <span className={`text-[11px] font-black ${pass < 90 ? "text-rose-600" : "text-emerald-600"}`}>{pass}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bulk Page ────────────────────────────────────────────────────────────────

function BulkPage({
  ops, karigars, accent, production, onUpdateWorkOrder,
}: {
  ops: DeptOp[];
  karigars: Karigar[];
  accent: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkKarigar, setBulkKarigar] = useState<string>("");
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [done, setDone] = useState(false);

  const key = (op: DeptOp) => `${op.woId}::${op.opIndex}`;

  const filtered = useMemo(() => ops.filter(op => {
    const s = norm(op);
    if (filterStatus !== "ALL" && s !== filterStatus) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      return op.woId?.toLowerCase()?.includes(q) || op.woProduct?.toLowerCase()?.includes(q);
    }
    return true;
  }), [ops, filterStatus, searchQ]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(key)));
  };

  const handleApply = () => {
    if (selected.size === 0 || (!bulkStatus && !bulkKarigar)) return;
    const stateToLegacy: Record<string, string> = {
      Draft: "PENDING", Open: "PENDING",
      "Work In Progress": "IN_PROGRESS",
      "QC Review": "IN_PROGRESS",
      Completed: "COMPLETED",
      "On Hold": "PENDING",
      Rejected: "PENDING",
    };
    const toUpdate: Set<string> = new Set();
    for (const op of ops) {
      if (selected.has(key(op))) toUpdate.add(op.woId);
    }
    for (const woId of toUpdate) {
      const wo = production.find(w => w.id === woId);
      if (!wo) continue;
      const newOps = (wo.operations || []).map((o, i) => {
        const opKey = `${woId}::${i}`;
        if (!selected.has(opKey)) return o;
        const legacyStatus = bulkStatus ? (stateToLegacy[bulkStatus] ?? bulkStatus) : o.status;
        return {
          ...o,
          ...(bulkStatus ? {
            status: legacyStatus as any,
            workflowState: bulkStatus,
            ...(bulkStatus === "Completed" ? { completedAt: new Date().toISOString() } : {}),
            ...(bulkStatus === "Work In Progress" ? { startedAt: new Date().toISOString() } : {}),
          } : {}),
          ...(bulkKarigar ? { assignedTo: bulkKarigar } : {}),
        } as any;
      });
      onUpdateWorkOrder({ ...wo, operations: newOps });
    }
    setDone(true);
    setSelected(new Set());
    setBulkStatus("");
    setBulkKarigar("");
    setTimeout(() => setDone(false), 2000);
  };

  const statusColors: Record<string, string> = {
    PENDING:             "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    IN_PROGRESS:         "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    COMPLETED:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    Draft:               "bg-slate-100 dark:bg-slate-800 text-slate-500",
    Open:                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Work In Progress":  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "QC Review":         "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    Completed:           "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "On Hold":           "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    Rejected:            "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-400 transition-colors"
            placeholder="Search WO / product…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
          />
        </div>
        <select
          className="py-2 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 outline-none"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <span className="text-xs text-slate-500 font-semibold">{filtered.length} jobs</span>
      </div>

      {selected.size > 0 && (
        <div className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl border ${ac(accent, "bg")} ${ac(accent, "border")}`}>
          <span className={`text-sm font-black ${ac(accent, "text")}`}>{selected.size} selected</span>
          <select
            className="py-1.5 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 outline-none"
            value={bulkStatus}
            onChange={e => setBulkStatus(e.target.value)}
          >
            <option value="">Set Status…</option>
            <option value="Open">Open</option>
            <option value="Work In Progress">Work In Progress</option>
            <option value="QC Review">QC Review</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
            <option value="Rejected">Rejected</option>
          </select>
          {karigars.length > 0 && (
            <select
              className="py-1.5 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-600 dark:text-slate-300 outline-none"
              value={bulkKarigar}
              onChange={e => setBulkKarigar(e.target.value)}
            >
              <option value="">Assign Worker…</option>
              {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
            </select>
          )}
          <button
            onClick={handleApply}
            disabled={!bulkStatus && !bulkKarigar}
            className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${(!bulkStatus && !bulkKarigar) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : `${ac(accent, "btn")}`}`}
          >
            Apply to {selected.size}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
          {done && <span className="text-xs font-black text-emerald-600">✓ Updated!</span>}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                </th>
                {["Work Order", "Product", "Target (WO Pcs)", "Status", "Assigned To"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map(op => {
                const k = key(op);
                const karigar = karigars.find(kr => kr.id === op.assignedTo);
                return (
                  <tr
                    key={k}
                    className={`cursor-pointer transition-colors ${selected.has(k) ? `${ac(accent, "bg")}` : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                    onClick={() => { const next = new Set(selected); next.has(k) ? next.delete(k) : next.add(k); setSelected(next); }}
                  >
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(k)} onChange={() => { const next = new Set(selected); next.has(k) ? next.delete(k) : next.add(k); setSelected(next); }} className="rounded" />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{op.woId}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100 max-w-[140px] truncate">{op.woProduct}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                      {(op.woQty || 0).toLocaleString()} <span className="text-[10px] text-slate-400">pcs (WO)</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${statusColors[op.status] ?? statusColors[norm(op)]}`}>
                        {op.status?.replace(/_/g, " ") ?? norm(op).replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-xs">{karigar?.name || <span className="text-slate-300 dark:text-slate-600 italic">Unassigned</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="py-12 text-center text-slate-400 text-sm">No jobs found</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar Panels ───────────────────────────────────────────────────────────

function KarigarPanel({ ops, karigars, accent }: { ops: DeptOp[]; karigars: Karigar[]; accent: string }) {
  const workload = useMemo(() => {
    const map: Record<string, { karigar: Karigar; pending: number; wip: number; done: number; pieces: number }> = {};
    for (const op of ops) {
      if (!op.assignedTo || (op as any)._blocked) continue;
      const k = karigars.find(kar => kar.id === op.assignedTo);
      if (!k) continue;
      if (!map[k.id]) map[k.id] = { karigar: k, pending: 0, wip: 0, done: 0, pieces: 0 };
      const s = norm(op);
      if (s === "PENDING") map[k.id].pending++;
      else if (s === "IN_PROGRESS") map[k.id].wip++;
      else if (s === "COMPLETED") map[k.id].done++;
      map[k.id].pieces += op.completedQuantity || 0;
    }
    return Object.values(map).sort((a, b) => (b.wip + b.pending) - (a.wip + a.pending));
  }, [ops, karigars]);
  const unassigned = ops.filter(o => !o.assignedTo && norm(o) !== "COMPLETED" && !(o as any)._blocked).length;
  if (workload.length === 0 && unassigned === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${ac(accent, "bg")}`}>
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${ac(accent, "text")}`} />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Worker Workload</h3>
        </div>
        {unassigned > 0 && <span className="text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">{unassigned} unassigned</span>}
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {workload.map(({ karigar, pending, wip, done, pieces }) => {
          const total = pending + wip + done;
          const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div key={karigar.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${ac(accent, "badge")}`}>{karigar.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{karigar.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${donePct}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 shrink-0">{donePct}%</span>
                </div>
              </div>
              <div className="flex gap-1 text-[10px] font-black shrink-0">
                {pending > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{pending}P</span>}
                {wip > 0    && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600">{wip}W</span>}
                {done > 0   && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">{done}D</span>}
              </div>
            </div>
          );
        })}
        {unassigned > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50/50 dark:bg-amber-950/10">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0"><Users className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0"><p className="text-sm font-bold text-amber-700 dark:text-amber-300">Unassigned</p><p className="text-[11px] text-amber-600/70">{unassigned} job cards</p></div>
            <span className="text-lg font-black text-amber-600">{unassigned}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DeadlinePanel({ production, taskName, accent }: { production: WorkOrder[]; taskName: string; accent: string }) {
  const overdue = useMemo(() => {
    const today = new Date();
    return production.filter(wo => {
      if (!wo.deadline) return false;
      const dl = new Date(wo.deadline);
      const hasOp = (wo.operations || []).some(op => opBelongsToDeptLocal(op, taskName) && norm({ status: op.status } as DeptOp) !== "COMPLETED");
      return hasOp && dl < today;
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 5);
  }, [production, taskName]);
  const dueSoon = useMemo(() => {
    const today = new Date();
    const soon  = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const ids = new Set(overdue.map(w => w.id));
    return production.filter(wo => {
      if (ids.has(wo.id) || !wo.deadline) return false;
      const dl = new Date(wo.deadline);
      const hasOp = (wo.operations || []).some(op => opBelongsToDeptLocal(op, taskName) && norm({ status: op.status } as DeptOp) !== "COMPLETED");
      return hasOp && dl >= today && dl <= soon;
    }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()).slice(0, 3);
  }, [production, taskName, overdue]);
  if (overdue.length === 0 && dueSoon.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 ${ac(accent, "bg")}`}>
        <Clock className={`w-4 h-4 ${ac(accent, "text")}`} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Deadlines</h3>
      </div>
      <div className="p-3 space-y-2">
        {overdue.map(wo => (
          <div key={wo.id} className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <div className="flex-1 min-w-0"><p className="text-xs font-black text-rose-700 dark:text-rose-300 truncate">{wo.productName}</p><p className="text-[10px] text-rose-500">{wo.id} · Due {new Date(wo.deadline).toLocaleDateString()}</p></div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full shrink-0">OVERDUE</span>
          </div>
        ))}
        {dueSoon.map(wo => (
          <div key={wo.id} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0"><p className="text-xs font-black text-amber-700 dark:text-amber-300 truncate">{wo.productName}</p><p className="text-[10px] text-amber-500">{wo.id} · Due {new Date(wo.deadline).toLocaleDateString()}</p></div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full shrink-0">DUE SOON</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TipsPanel({ tips, accent }: { tips: string[]; accent: string }) {
  const [open, setOpen] = useState(false);
  if (tips.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <button onClick={() => setOpen(o => !o)} className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 ${ac(accent, "bg")} hover:opacity-90 transition-opacity`}>
        <div className="flex items-center gap-2">
          <Info className={`w-4 h-4 ${ac(accent, "text")}`} />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Dept. Tips</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <ul className="p-4 space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className={`font-black text-base leading-none mt-0.5 ${ac(accent, "text")}`}>·</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeptTaskPage({ taskName, production, onUpdateWorkOrder, karigars, inventory = [], onUpdateInventory, onCreateGatePass }: Props) {
  const meta = DEPT_META[taskName] ?? getDefaultMeta(taskName);
  const accent = meta.accent;

  const [activeSub, setActiveSub] = useState<SubPage>("job_board");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const deptOps = useMemo<DeptOp[]>(() =>
    production.flatMap(wo => {
      const allOps = wo.operations || [];
      return allOps
        .map((op, idx) => ({ ...op, woId: wo.id, woProduct: wo.productName, woQty: wo.quantity, woDeadline: wo.deadline, opIndex: idx }))
        .filter(op => opBelongsToDeptLocal(op, taskName))
        .map(op => {
          // Use pipeline DAG blocking (predecessor-based, not just prev-index)
          const { blocked, blockedBy } = computeBlockState(allOps, op.opIndex);
          if (blocked) return { ...op, _blocked: true, _blockedBy: blockedBy ?? "Previous step" } as DeptOp;
          return op as DeptOp;
        });
    }), [production, taskName]);

  const summary = useMemo(() => {
    const pending    = deptOps.filter(o => norm(o) === "PENDING" && !(o as any)._blocked).length;
    const inProgress = deptOps.filter(o => norm(o) === "IN_PROGRESS").length;
    const completed  = deptOps.filter(o => norm(o) === "COMPLETED").length;
    const qcReview   = deptOps.filter(o => o.status === "QC Review").length;
    const onHold     = deptOps.filter(o => (o.status === "On Hold" || o.status === "On_Hold") && !(o as any)._blocked).length;
    const rejected   = deptOps.filter(o => o.status === "Rejected").length;
    const blocked    = deptOps.filter(o => (o as any)._blocked).length;
    const totalPcs   = (Array.from(new Map(deptOps.map(o => [o.woId, o.woQty] as [string, number])).values()) as number[]).reduce((s: number, qty: number) => s + (qty || 0), 0);
    const donePcs    = deptOps.reduce((s, o) => s + (o.completedQuantity || 0), 0);
    const rejPcs     = deptOps.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
    const unassigned = deptOps.filter(o => !o.assignedTo && norm(o) !== "COMPLETED" && !(o as any)._blocked).length;
    return { pending, inProgress, completed, qcReview, onHold, rejected, blocked, total: deptOps.length, totalPcs, donePcs, rejPcs, unassigned };
  }, [deptOps]);

  // FIX: denominator should be total inspected (done+rejected), not done alone — see
  // ReworkPage/AnalyticsPage/QualityPage for the same fix.
  const rejRate = (summary.donePcs + summary.rejPcs) > 0 ? Math.round((summary.rejPcs / (summary.donePcs + summary.rejPcs)) * 100) : 0;

  // Build subpage list — context-aware
  const subPages: SubPageDef[] = ([
    { id: "job_board",  label: "Job Board",   icon: LayoutGrid, badge: (ops) => ops.filter(o => norm(o) === "IN_PROGRESS").length || null },
    { id: "vendor",     label: "Vendors",     icon: Truck, hidden: !meta.hasVendor, badge: (ops) => {
        // Dyeing tracks meters; Hand Work / Embroidery / Printing track pieces
        const isDyeing = taskName.toLowerCase().includes("dyeing");
        const v = isDyeing
          ? Math.round(ops.reduce((s,o)=>s+Math.max(0,Number(o.customData?.sentMeters||0)-Number(o.customData?.receivedMeters||0)),0))
          : ops.reduce((s,o)=>s+Math.max(0,Number(o.customData?.sentQty||0)-Number(o.customData?.receivedQty||0)),0);
        return v > 0 ? v : null;
      } },
    { id: "quality",    label: "Quality",     icon: ShieldCheck, hidden: ["Cutting", "Packing", "Dyeing", "Washing"].includes(meta.label), badge: (ops) => { const r = ops.reduce((s,o)=>s+(o.rejectedQuantity||0),0); return r > 0 ? r : null; } },
    { id: "bulk",       label: "Bulk Edit",   icon: Edit3 },
  ] as SubPageDef[]).filter(s => !s.hidden);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* ── Top Summary Bar ── */}
      <div className={`sticky top-0 z-20 border-b ${ac(accent, "border")} ${ac(accent, "bg")} px-4 py-3 backdrop-blur-sm`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h1 className={`text-base font-black leading-none ${ac(accent, "text")}`}>{meta.label}</h1>
              <p className="text-[10px] text-slate-500 font-semibold">
                {summary.total} job cards · {summary.pending} pending · {summary.blocked} blocked
                {summary.unassigned > 0 && ` · ${summary.unassigned} unassigned`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${ac(accent, "border")} ${ac(accent, "text")} bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-all`}
          >
            {sidebarOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {sidebarOpen ? "Hide" : "Show"} Panel
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide mb-3">
          <StatPill label="Open"        value={summary.pending}    color="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
          <StatPill label="In Progress" value={summary.inProgress} color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" />
          {summary.qcReview > 0 && <StatPill label="QC Review" value={summary.qcReview} color="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300" />}
          <StatPill label="Completed"   value={summary.completed}  color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
          <StatPill label={["Printing", "Dyeing", "Fabric Inspection", "Washing"].includes(taskName) ? "Processed Mtr" : "Done Pcs"} value={summary.donePcs.toLocaleString()} color="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
          {summary.blocked > 0 && <StatPill label="Waiting" value={summary.blocked} color="bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400" />}
          {summary.onHold > 0 && <StatPill label="On Hold" value={summary.onHold} color="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300" />}
          {summary.rejected > 0 && <StatPill label="Rejected" value={summary.rejected} color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" />}
        </div>

        {/* Dept KPIs */}
        {meta.kpis.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-0.5 scrollbar-hide mb-3">
            {meta.kpis.map(kpi => (
              <div key={kpi.label} className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shrink-0">
                <kpi.icon className={`w-3 h-3 ${kpi.color}`} />
                <span className="text-[10px] text-slate-500 font-semibold">{kpi.label}:</span>
                <span className={`text-[11px] font-black ${kpi.color}`}>{kpi.formula(deptOps)}</span>
              </div>
            ))}
            {/* SLA hours badge */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shrink-0">
              <Timer className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] text-slate-500 font-semibold">SLA:</span>
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-300">{meta.slaHours}h</span>
            </div>
          </div>
        )}

        {/* Subpage tabs */}
        <div className="flex gap-0 border-b border-transparent overflow-x-auto scrollbar-hide -mb-3">
          {subPages.map(sp => {
            const Icon = sp.icon;
            const badge = sp.badge ? sp.badge(deptOps) : null;
            const isActive = activeSub === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => setActiveSub(sp.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-black whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? `${ac(accent, "text")} border-current bg-white/60 dark:bg-slate-900/60`
                    : "text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {sp.label}
                {badge !== null && badge !== 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isActive ? `${ac(accent, "badge")}` : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Alert banners ── */}
      {(summary.unassigned > 0 || rejRate > 5) && (
        <div className="px-4 pt-3 space-y-2">
          {summary.unassigned > 0 && (
            <div className="flex items-start gap-3 rounded-xl border px-4 py-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200">
              <Users className="mt-0.5 w-4 h-4 text-amber-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black">{summary.unassigned} job card{summary.unassigned > 1 ? "s" : ""} without a worker assigned</p>
                <p className="text-xs mt-0.5 opacity-80">Assign karigars so work can be tracked accurately.</p>
              </div>
              <button onClick={() => setActiveSub("bulk")} className="text-[11px] font-black text-amber-700 underline shrink-0 mt-0.5">Assign via Bulk</button>
            </div>
          )}
          {rejRate > 5 && (
            <div className="flex items-start gap-3 rounded-xl border px-4 py-3 bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200">
              <TrendingDown className="mt-0.5 w-4 h-4 text-rose-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-black">High rejection rate: {rejRate}% ({summary.rejPcs} pieces)</p>
                <p className="text-xs mt-0.5 opacity-80">Review quality checkpoint data.</p>
              </div>
              <button onClick={() => setActiveSub("quality")} className="text-[11px] font-black text-rose-700 underline shrink-0 mt-0.5">View Quality Log</button>
            </div>
          )}
        </div>
      )}

      {/* ── Main layout ── */}
      <div className={`flex flex-1 min-h-0 gap-0 items-start`}>
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeSub === "job_board" && (
            <TaskBoard
              taskName={taskName}
              production={production}
              onUpdateWorkOrder={onUpdateWorkOrder}
              karigars={karigars}
              inventory={inventory}
              onUpdateInventory={onUpdateInventory}
              onCreateGatePass={onCreateGatePass}
            />
          )}
          {activeSub === "analytics" && <AnalyticsPage ops={deptOps} karigars={karigars} accent={accent} />}
          {activeSub === "targets"   && <TargetsPage ops={deptOps} karigars={karigars} accent={accent} meta={meta} />}
          {activeSub === "wip"       && <WIPPage ops={deptOps} accent={accent} taskName={taskName} production={production} />}
          {activeSub === "timeline"  && <TimelinePage ops={deptOps} accent={accent} />}
          {activeSub === "vendor"    && <VendorPage ops={deptOps} accent={accent} taskName={taskName} />}
          {activeSub === "quality"   && <QualityPage ops={deptOps} accent={accent} />}
          {activeSub === "rework"    && <ReworkPage ops={deptOps} accent={accent} meta={meta} />}
          {activeSub === "smv"       && <SMVPage ops={deptOps} karigars={karigars} accent={accent} />}
          {activeSub === "bulk"      && <BulkPage ops={deptOps} karigars={karigars} accent={accent} production={production} onUpdateWorkOrder={onUpdateWorkOrder} />}
        </div>

        {/* Sidebar — only on Job Board */}
        {activeSub === "job_board" && sidebarOpen && (
          <div className="hidden lg:flex flex-col gap-3 w-72 xl:w-80 shrink-0 p-4 border-l border-slate-100 dark:border-slate-800">
            <DeadlinePanel production={production} taskName={taskName} accent={accent} />
            <KarigarPanel ops={deptOps} karigars={karigars} accent={accent} />
            <TipsPanel tips={meta.tips} accent={accent} />
          </div>
        )}
      </div>

      {/* Mobile sidebar panels */}
      {activeSub === "job_board" && (
        <div className="lg:hidden px-4 pb-6 space-y-3 mt-2">
          <DeadlinePanel production={production} taskName={taskName} accent={accent} />
          <KarigarPanel ops={deptOps} karigars={karigars} accent={accent} />
          <TipsPanel tips={meta.tips} accent={accent} />
        </div>
      )}
    </div>
  );
}