/**
 * DeptTaskPage.tsx  — ERPNext-style Dynamic Subpage Upgrade
 *
 * Subpages (tabs inside each dept page):
 *  1. Job Board       — Kanban / List view of all job cards (existing TaskBoard)
 *  2. Analytics       — Live charts: throughput, rejection trend, karigar efficiency
 *  3. Timeline        — Chronological log of all operations this dept
 *  4. Vendor Tracker  — For Embroidery / Printing / Washing dispatch tracking
 *  5. Quality Log     — QC pass/fail detail per job card
 *  6. Bulk Actions    — Multi-select and bulk status change / assignment
 *
 * Each subpage is a full dynamic page with its own state.
 * Inspired by ERPNext's doctype detail tabs pattern.
 */

import React, { useMemo, useState, useCallback } from "react";
import TaskBoard from "../TaskBoard";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";
import {
  AlertTriangle, Users, TrendingUp, TrendingDown, Clock,
  CheckCircle2, Package, ChevronDown, ChevronUp, RefreshCw,
  ArrowRight, Zap, BarChart2, Eye, EyeOff, Info,
  LayoutGrid, List, Activity, ShieldCheck, Truck, CheckSquare,
  Filter, Download, Search, Edit3, Layers, XCircle, PlusCircle,
  ArrowUpRight, ArrowDownRight, Minus, Star, GitBranch,
  AlertCircle, Timer, Target, Award, TrendingDown as Reject,
  ChevronRight, RotateCcw, Play, Pause, Check,
} from "lucide-react";

// ─── Department Meta ────────────────────────────────────────────────────────────

interface DeptMeta {
  icon: string;
  label: string;
  accent: string;
  hasVendor: boolean;
  vendorFields: string[];
  tips: string[];
  kpis: { label: string; formula: (ops: DeptOp[]) => string; icon: React.ElementType; color: string }[];
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
};

const DEPT_META: Record<string, DeptMeta> = {
  Cutting: {
    icon: "✂️", label: "Cutting", accent: "rose",
    hasVendor: false, vendorFields: [],
    tips: [
      "Check fabric grain before spreading layers",
      "Verify marker length vs. fabric roll",
      "Log waste (kg) per lot for costing",
    ],
    kpis: [
      { label: "Efficiency", formula: ops => { const c = ops.filter(o => norm(o) === "COMPLETED"); const t = c.reduce((s,o) => s + (o.completedQuantity||0),0); const total = ops.reduce((s,o) => s + (o.woQty||0),0); return total > 0 ? Math.round((t/total)*100)+"%" : "—"; }, icon: Target, color: "text-rose-600" },
      { label: "Waste Jobs", formula: ops => ops.filter(o => (o.customData?.wasteKg || 0) > 0).length + " lots", icon: AlertCircle, color: "text-amber-600" },
      { label: "Tables Active", formula: ops => { const t = new Set(ops.filter(o => norm(o)==="IN_PROGRESS").map(o => o.customData?.tableNo).filter(Boolean)); return t.size + " tables"; }, icon: Layers, color: "text-rose-500" },
    ],
  },
  Stitching: {
    icon: "🧵", label: "Stitching", accent: "indigo",
    hasVendor: false, vendorFields: [],
    tips: [
      "Set machine tension before each batch",
      "Log target/hr to track efficiency",
      "Separate sizes before issuing bundles",
    ],
    kpis: [
      { label: "Avg Target/Hr", formula: ops => { const vals = ops.map(o => Number(o.customData?.targetPerHr||0)).filter(v => v > 0); return vals.length > 0 ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) + " pcs/hr" : "—"; }, icon: Zap, color: "text-indigo-600" },
      { label: "Machines Active", formula: ops => { const m = new Set(ops.filter(o => norm(o)==="IN_PROGRESS").map(o => o.customData?.machineNo).filter(Boolean)); return m.size + " machines"; }, icon: Activity, color: "text-indigo-500" },
    ],
  },
  Embroidery: {
    icon: "🌸", label: "Embroidery", accent: "violet",
    hasVendor: true, vendorFields: ["vendor","sentQty","receivedQty"],
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
    icon: "🖨️", label: "Printing", accent: "amber",
    hasVendor: true, vendorFields: ["vendor"],
    tips: [
      "Confirm colour proofs before bulk print",
      "Note ink lot for traceability",
      "Allow full drying time before packing",
    ], 
    kpis: [
      { label: "Print Types", formula: ops => { const t = new Set(ops.map(o => o.customData?.printType).filter(Boolean)); return t.size + " types"; }, icon: BarChart2, color: "text-amber-600" },
      { label: "Avg Dry Time", formula: ops => { const v = ops.map(o => Number(o.customData?.dryTime||0)).filter(v=>v>0); return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+" hrs" : "—"; }, icon: Timer, color: "text-amber-500" },
    ],
  },
  Washing: {
    icon: "🫧", label: "Washing", accent: "cyan",
    hasVendor: true, vendorFields: ["vendor","sentQty","receivedQty"],
    tips: [
      "Log wash temperature and shrinkage %",
      "Match received qty to dispatch challan",
      "Check for colour bleeding before bulk",
    ],
    kpis: [
      { label: "Out at Vendor", formula: ops => ops.reduce((s,o) => s + Math.max(0,(o.customData?.sentQty||0)-(o.customData?.receivedQty||0)),0) + " pcs", icon: Truck, color: "text-cyan-600" },
      { label: "Avg Shrinkage", formula: ops => { const v = ops.map(o => Number(o.customData?.shrinkage||0)).filter(v=>v>0); return v.length>0 ? (v.reduce((a,b)=>a+b,0)/v.length).toFixed(1)+"%" : "—"; }, icon: TrendingDown, color: "text-cyan-500" },
    ],
  },
  Finishing: {
    icon: "✨", label: "Finishing", accent: "emerald",
    hasVendor: false, vendorFields: [],
    tips: [
      "Steam press before attaching labels",
      "Log QC pass/fail count per WO",
      "Alteration pieces must loop back to stitching",
    ],
    kpis: [
      { label: "QC Pass Rate", formula: ops => { const pass = ops.reduce((s,o)=>s+(o.customData?.qcPass||0),0); const fail = ops.reduce((s,o)=>s+(o.customData?.qcFail||0),0); return (pass+fail)>0 ? Math.round((pass/(pass+fail))*100)+"%" : "—"; }, icon: ShieldCheck, color: "text-emerald-600" },
      { label: "For Alteration", formula: ops => ops.reduce((s,o)=>s+(o.customData?.alterationQty||0),0) + " pcs", icon: RotateCcw, color: "text-amber-600" },
    ],
  },
  Packing: {
    icon: "📦", label: "Packing", accent: "sky",
    hasVendor: false, vendorFields: [],
    tips: [
      "Scan barcodes to verify before sealing",
      "Record carton numbers for dispatch",
      "Size-wise segregation before poly-bag",
    ],
    kpis: [
      { label: "Boxes Packed", formula: ops => ops.reduce((s,o)=>s+(o.customData?.boxCount||0),0) + " boxes", icon: Package, color: "text-sky-600" },
      { label: "Scan Done", formula: ops => { const done = ops.filter(o => o.customData?.barcodeScanned === "Done").length; return done + "/" + ops.length; }, icon: CheckCircle2, color: "text-sky-500" },
    ],
  },
};

// Maps both legacy status strings (PENDING / IN_PROGRESS / COMPLETED) AND
// new TaskBoard workflowState values to a canonical tri-state used by DeptTaskPage.
type NormState = "PENDING" | "IN_PROGRESS" | "COMPLETED";

function norm(op: DeptOp): NormState {
  const raw = (op.status || "PENDING");
  // New workflow states (from TaskBoard)
  switch (raw) {
    case "Draft":
    case "Open":
    case "On Hold":
    case "Rejected":
      return "PENDING";
    case "Work In Progress":
    case "QC Review":
      return "IN_PROGRESS";
    case "Completed":
      return "COMPLETED";
  }
  // Legacy uppercase strings
  switch (raw.toUpperCase()) {
    case "IN_PROGRESS":
      return "IN_PROGRESS";
    case "COMPLETED":
      return "COMPLETED";
    default:
      return "PENDING";
  }
}

function getDefaultMeta(taskName: string): DeptMeta {
  return {
    icon: "🔧", label: taskName, accent: "slate",
    hasVendor: false, vendorFields: [], tips: [], kpis: [],
  };
}

// ─── Accent helpers ─────────────────────────────────────────────────────────────

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

// ─── Stage → Department mapping (mirrors TaskBoard.tsx) ────────────────────────
// Must stay in sync with STAGE_TO_DEPT in TaskBoard.tsx
const STAGE_TO_DEPT_MAP: Record<string, string> = {
  FABRIC_INSPECTION:  "Fabric Inspection",
  DYEING:             "Dyeing",
  FABRIC_PRINTING:    "Printing",
  GARMENT_PRINTING:   "Printing",
  EMBROIDERY_FABRIC:  "Embroidery",
  EMBROIDERY_GARMENT: "Embroidery",
  CUTTING:            "Cutting",
  STITCHING:          "Stitching",
  WASHING:            "Washing",
  HAND_WORK:          "Hand Work",
  FINISHING:          "Finishing",
  QC_CHECK:           "QC Check",
  PACKING:            "Packing",
};

function opBelongsToDeptLocal(op: any, deptTabName: string): boolean {
  if (op.stage) {
    const mapped = STAGE_TO_DEPT_MAP[op.stage];
    if (mapped) return mapped.toLowerCase() === deptTabName.toLowerCase();
  }
  if (op.workstationType) {
    if (op.workstationType.toLowerCase() === deptTabName.toLowerCase()) return true;
  }
  return (op.name || "").toLowerCase().includes(deptTabName.toLowerCase());
}



interface Props {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
}

// ─── Subpage types ──────────────────────────────────────────────────────────────

type SubPage =
  | "job_board"
  | "analytics"
  | "timeline"
  | "vendor"
  | "quality"
  | "bulk";

interface SubPageDef {
  id: SubPage;
  label: string;
  icon: React.ElementType;
  badge?: (ops: DeptOp[]) => number | string | null;
  hidden?: boolean;
}

// ─── Subpage: Analytics ─────────────────────────────────────────────────────────

function AnalyticsPage({ ops, karigars, accent }: { ops: DeptOp[]; karigars: Karigar[]; accent: string }) {
  const total = ops.length;
  const pending = ops.filter(o => norm(o) === "PENDING").length;
  const wip = ops.filter(o => norm(o) === "IN_PROGRESS").length;
  const done = ops.filter(o => norm(o) === "COMPLETED").length;
  const donePcs = ops.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const rejPcs = ops.reduce((s, o) => s + (o.rejectedQuantity || 0), 0);
  const totalPcs = ops.reduce((s, o) => s + (o.woQty || 0), 0);
  const rejRate = donePcs > 0 ? Math.round((rejPcs / donePcs) * 100) : 0;
  const efficiency = totalPcs > 0 ? Math.round((donePcs / totalPcs) * 100) : 0;

  // Karigar efficiency
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

  // Status distribution bar
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
      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Jobs", value: total, sub: `${pending} pending`, icon: Layers, color: "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700" },
          { label: "Efficiency", value: `${efficiency}%`, sub: `${donePcs.toLocaleString()} / ${totalPcs.toLocaleString()} pcs`, icon: Target, color: `${ac(accent, "bg")} ${ac(accent, "border")}` },
          { label: "Rejection Rate", value: `${rejRate}%`, sub: `${rejPcs} pieces rejected`, icon: XCircle, color: rejRate > 5 ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800" : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800" },
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

      {/* Status distribution */}
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
        <div className="flex gap-4">
          {barData.map(b => (
            <div key={b.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${b.color}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{b.label} <strong className="text-slate-800 dark:text-slate-200">{b.value}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Pieces progress */}
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
        <div className="flex justify-between text-xs text-slate-500 font-semibold">
          <span>{donePcs.toLocaleString()} done</span>
          <span>{rejPcs > 0 && <span className="text-rose-500 mr-2">{rejPcs} rejected</span>}{totalPcs.toLocaleString()} total</span>
        </div>
      </div>

      {/* Karigar leaderboard */}
      {karigarStats.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className={`px-5 py-3 border-b border-slate-100 dark:border-slate-800 ${ac(accent, "bg")}`}>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center gap-2">
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

// ─── Subpage: Timeline ──────────────────────────────────────────────────────────

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
    start:    { dot: "bg-amber-400", line: "border-amber-200", icon: Play, text: "text-amber-700 dark:text-amber-300" },
    complete: { dot: "bg-emerald-500", line: "border-emerald-200", icon: CheckCircle2, text: "text-emerald-700 dark:text-emerald-300" },
    pending:  { dot: "bg-slate-300 dark:bg-slate-600", line: "border-slate-100 dark:border-slate-800", icon: Clock, text: "text-slate-500" },
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
        {/* vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
        <div className="space-y-1">
          {events.map((evt, i) => {
            const s = typeStyle[evt.type];
            const Icon = s.icon;
            return (
              <div key={i} className="relative flex items-start gap-4 pl-12 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 rounded-xl transition-colors group">
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

// ─── Subpage: Vendor Tracker ────────────────────────────────────────────────────

function VendorPage({ ops, accent }: { ops: DeptOp[]; accent: string }) {
  const vendors = useMemo(() => {
    const map: Record<string, {
      name: string; sent: number; received: number;
      jobs: DeptOp[]; active: number;
    }> = {};
    for (const op of ops) {
      const v = op.customData?.vendor;
      if (!v) continue;
      if (!map[v]) map[v] = { name: v, sent: 0, received: 0, jobs: [], active: 0 };
      map[v].sent     += Number(op.customData?.sentQty || 0);
      map[v].received += Number(op.customData?.receivedQty || 0);
      map[v].jobs.push(op);
      if (norm(op) !== "COMPLETED") map[v].active++;
    }
    return Object.values(map).sort((a, b) => (b.sent - b.received) - (a.sent - a.received));
  }, [ops]);

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

      {/* Summary row */}
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
            <p className="text-[10px] text-slate-400">pieces</p>
          </div>
        ))}
      </div>

      {/* Vendor cards */}
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
                  <span className="text-[11px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2.5 py-1 rounded-full">{balance} pcs outstanding</span>
                ) : v.received > 0 ? (
                  <span className="text-[11px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full">All received ✓</span>
                ) : null}
              </div>
              <div className="flex gap-4 text-sm mb-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Sent</p>
                  <p className="font-black text-slate-700 dark:text-slate-200">{v.sent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Received</p>
                  <p className="font-black text-emerald-600">{v.received.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold">Balance</p>
                  <p className={`font-black ${balance > 0 ? "text-amber-600" : "text-slate-400"}`}>{balance.toLocaleString()}</p>
                </div>
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

// ─── Subpage: Quality Log ───────────────────────────────────────────────────────

function QualityPage({ ops, accent }: { ops: DeptOp[]; accent: string }) {
  const completed = ops.filter(o => norm(o) === "COMPLETED");
  const totalDone = completed.reduce((s, o) => s + (o.completedQuantity || 0), 0);
  const totalRej  = completed.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
  const rejRate   = totalDone > 0 ? ((totalRej / totalDone) * 100).toFixed(1) : "0";

  const sorted = [...completed].sort((a, b) => (b.rejectedQuantity || 0) - (a.rejectedQuantity || 0));

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Inspected", value: totalDone.toLocaleString(), icon: ShieldCheck, color: "text-slate-600" },
          { label: "Rejected", value: totalRej.toLocaleString(), icon: XCircle, color: "text-rose-600" },
          { label: "Rejection Rate", value: `${rejRate}%`, icon: Reject, color: Number(rejRate) > 5 ? "text-rose-600" : "text-emerald-600" },
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

      {/* Per-job quality table */}
      {completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <ShieldCheck className="w-10 h-10 mb-3 opacity-20" />
          <p className="font-bold text-sm">No completed jobs yet</p>
          <p className="text-xs mt-1">Quality data appears here once jobs are completed.</p>
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

// ─── Subpage: Bulk Actions ──────────────────────────────────────────────────────

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
      return op.woId.toLowerCase().includes(q) || op.woProduct.toLowerCase().includes(q);
    }
    return true;
  }), [ops, filterStatus, searchQ]);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(key)));
  };

  const handleApply = () => {
    if (selected.size === 0 || (!bulkStatus && !bulkKarigar)) return;
    // Map new workflow states back to legacy status for compat with WO storage
    const stateToLegacy: Record<string, string> = {
      Draft:              "PENDING",
      Open:               "PENDING",
      "Work In Progress": "IN_PROGRESS",
      "QC Review":        "IN_PROGRESS",
      Completed:          "COMPLETED",
      "On Hold":          "PENDING",
      Rejected:           "PENDING",
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
            status: legacyStatus,
            workflowState: bulkStatus,
            ...(bulkStatus === "Completed" ? { completedAt: new Date().toISOString() } : {}),
            ...(bulkStatus === "Work In Progress" ? { startedAt: new Date().toISOString() } : {}),
          } : {}),
          ...(bulkKarigar ? { assignedTo: bulkKarigar } : {}),
        };
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
    PENDING:     "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
    IN_PROGRESS: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    COMPLETED:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    // New workflow states
    Draft:              "bg-slate-100 dark:bg-slate-800 text-slate-500",
    Open:               "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Work In Progress": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "QC Review":        "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    Completed:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    "On Hold":          "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    Rejected:           "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Toolbar */}
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
          <option value="PENDING">Pending (any)</option>
          <option value="IN_PROGRESS">In Progress (any)</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <span className="text-xs text-slate-500 font-semibold">{filtered.length} jobs</span>
      </div>

      {/* Bulk action bar */}
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

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                {["Work Order", "Product", "Qty", "Status", "Assigned To"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filtered.map(op => {
                const k = key(op);
                const karigar = karigars.find(kr => kr.id === op.assignedTo);
                const sc = statusColors[norm(op)] || statusColors.PENDING;
                return (
                  <tr
                    key={k}
                    className={`cursor-pointer transition-colors ${selected.has(k) ? `${ac(accent, "bg")}` : "hover:bg-slate-50 dark:hover:bg-slate-800/30"}`}
                    onClick={() => {
                      const next = new Set(selected);
                      next.has(k) ? next.delete(k) : next.add(k);
                      setSelected(next);
                    }}
                  >
                    <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(k)}
                        onChange={() => {
                          const next = new Set(selected);
                          next.has(k) ? next.delete(k) : next.add(k);
                          setSelected(next);
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{op.woId}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100 max-w-[140px] truncate">{op.woProduct}</td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{(op.woQty || 0).toLocaleString()}</td>
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
          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">No jobs found</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar panels (unchanged from original, compacted) ────────────────────────

function StatPill({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5 font-semibold">{sub}</p>}
    </div>
  );
}

function KarigarPanel({ ops, karigars, accent }: { ops: DeptOp[]; karigars: Karigar[]; accent: string }) {
  const workload = useMemo(() => {
    const map: Record<string, { karigar: Karigar; pending: number; wip: number; done: number; pieces: number }> = {};
    for (const op of ops) {
      if (!op.assignedTo) continue;
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
  const unassigned = ops.filter(o => !o.assignedTo && norm(o) !== "COMPLETED").length;
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
      const hasOp = (wo.operations || []).some(op => op.name.toLowerCase().includes(taskName.toLowerCase()) && norm({ status: op.status } as DeptOp) !== "COMPLETED");
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
      const hasOp = (wo.operations || []).some(op => op.name.toLowerCase().includes(taskName.toLowerCase()) && norm({ status: op.status } as DeptOp) !== "COMPLETED");
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

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function DeptTaskPage({ taskName, production, onUpdateWorkOrder, karigars }: Props) {
  const meta = DEPT_META[taskName] ?? getDefaultMeta(taskName);
  const accent = meta.accent;

  const [activeSub, setActiveSub] = useState<SubPage>("job_board");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // All ops for this dept — matched by stage (authoritative) then name (fallback)
  const deptOps = useMemo<DeptOp[]>(() =>
    production.flatMap(wo => {
      const allOps = wo.operations || [];
      return allOps
        .map((op, idx) => ({ ...op, woId: wo.id, woProduct: wo.productName, woQty: wo.quantity, woDeadline: wo.deadline, opIndex: idx }))
        .filter(op => opBelongsToDeptLocal(op, taskName))
        .map(op => {
          // Gating: if the previous step in the WO sequence is not Completed,
          // mark this op with a blocked indicator (mirrors ERPNext step gating).
          const prevOp = op.opIndex > 0 ? allOps[op.opIndex - 1] : null;
          if (prevOp) {
            const prevDone =
              prevOp.status === "Completed" ||
              prevOp.status === "COMPLETED" ||
              (prevOp as any).workflowState === "Completed";
            if (!prevDone) {
              return { ...op, _blocked: true, _blockedBy: prevOp.name || "Previous step" } as DeptOp & { _blocked: boolean; _blockedBy: string };
            }
          }
          return op as DeptOp;
        });
    }), [production, taskName]);

  // Summary numbers — counts both legacy and new workflow states
  const summary = useMemo(() => {
    const pending     = deptOps.filter(o => norm(o) === "PENDING").length;
    const inProgress  = deptOps.filter(o => norm(o) === "IN_PROGRESS").length;
    const completed   = deptOps.filter(o => norm(o) === "COMPLETED").length;
    // Granular new-state counts for richer display
    const qcReview    = deptOps.filter(o => o.status === "QC Review").length;
    const onHold      = deptOps.filter(o => o.status === "On Hold" || o.status === "On_Hold").length;
    const rejected    = deptOps.filter(o => o.status === "Rejected").length;
    const totalPcs    = [...new Map(deptOps.map(o => [o.woId, o.woQty])).values()].reduce((s, qty) => s + (qty || 0), 0);
    const donePcs     = deptOps.reduce((s, o) => s + (o.completedQuantity || 0), 0);
    const rejPcs      = deptOps.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
    const unassigned  = deptOps.filter(o => !o.assignedTo && norm(o) !== "COMPLETED").length;
    return { pending, inProgress, completed, qcReview, onHold, rejected, total: deptOps.length, totalPcs, donePcs, rejPcs, unassigned };
  }, [deptOps]);

  const rejRate = summary.donePcs > 0 ? Math.round((summary.rejPcs / summary.donePcs) * 100) : 0;

  // Build subpage list
  const subPages: SubPageDef[] = [
    { id: "job_board",  label: "Job Board",   icon: LayoutGrid, badge: ops => ops.filter(o => norm(o) === "IN_PROGRESS").length || null },
    { id: "analytics",  label: "Analytics",   icon: BarChart2 },
    { id: "timeline",   label: "Timeline",    icon: GitBranch },
    { id: "vendor",     label: "Vendors",     icon: Truck, hidden: !meta.hasVendor, badge: ops => { const v = ops.reduce((s,o)=>s+Math.max(0,(o.customData?.sentQty||0)-(o.customData?.receivedQty||0)),0); return v > 0 ? v : null; } },
    { id: "quality",    label: "Quality Log", icon: ShieldCheck, badge: ops => { const r = ops.reduce((s,o)=>s+(o.rejectedQuantity||0),0); return r > 0 ? r : null; } },
    { id: "bulk",       label: "Bulk Edit",   icon: Edit3 },
  ].filter(s => !s.hidden);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* ── Top Summary Bar ── */}
      <div className={`sticky top-0 z-20 border-b ${ac(accent, "border")} ${ac(accent, "bg")} px-4 py-3 backdrop-blur-sm`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h1 className={`text-base font-black leading-none ${ac(accent, "text")}`}>{meta.label}</h1>
              <p className="text-[10px] text-slate-500 font-semibold">{summary.total} job cards · {summary.pending} pending</p>
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
          <StatPill label="Done Pcs"    value={summary.donePcs.toLocaleString()} sub={`of ${summary.totalPcs.toLocaleString()}`} color="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
          {summary.onHold > 0 && <StatPill label="On Hold" value={summary.onHold} color="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300" />}
          {summary.unassigned > 0 && <StatPill label="Unassigned" value={summary.unassigned} color="bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" />}
          {summary.rejected > 0 && <StatPill label="Rejected" value={summary.rejected} color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" />}
          {summary.rejPcs > 0 && <StatPill label="Rej Pcs" value={summary.rejPcs} color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" />}
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
          </div>
        )}

        {/* ERPNext-style subpage tabs */}
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

      {/* ── Main layout: subpage + sidebar ── */}
      <div className={`flex flex-1 min-h-0 gap-0 ${sidebarOpen ? "lg:gap-0" : ""} items-start`}>

        {/* Subpage content */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {activeSub === "job_board" && (
            <TaskBoard
              taskName={taskName}
              production={production}
              onUpdateWorkOrder={onUpdateWorkOrder}
              karigars={karigars}
            />
          )}
          {activeSub === "analytics" && (
            <AnalyticsPage ops={deptOps} karigars={karigars} accent={accent} />
          )}
          {activeSub === "timeline" && (
            <TimelinePage ops={deptOps} accent={accent} />
          )}
          {activeSub === "vendor" && (
            <VendorPage ops={deptOps} accent={accent} />
          )}
          {activeSub === "quality" && (
            <QualityPage ops={deptOps} accent={accent} />
          )}
          {activeSub === "bulk" && (
            <BulkPage ops={deptOps} karigars={karigars} accent={accent} production={production} onUpdateWorkOrder={onUpdateWorkOrder} />
          )}
        </div>

        {/* Sidebar panels — only show on Job Board tab */}
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
