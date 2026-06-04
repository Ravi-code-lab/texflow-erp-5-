/**
 * DeptTaskPage.tsx
 * 
 * Shared department task page used by all 7 task pages.
 * Adds features missing from the plain TaskBoard wrapper:
 *  - Live summary bar (pending / wip / done / pieces)
 *  - Overdue / deadline alerts
 *  - Karigar workload panel (who has how many jobs)
 *  - Vendor tracking panel (Embroidery / Printing / Washing)
 *  - Efficiency & rejection rate alerts
 *  - Quick bulk-status actions
 *  - Bottleneck warning when this dept has the most pending ops
 *  - Department-specific fields preview on each card
 */

import React, { useMemo, useState } from "react";
import TaskBoard from "../TaskBoard";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";
import {
  AlertTriangle, Users, TrendingUp, TrendingDown, Clock,
  CheckCircle2, Package, ChevronDown, ChevronUp, RefreshCw,
  ArrowRight, Zap, BarChart2, Eye, EyeOff, Info
} from "lucide-react";

// ─── Department meta ───────────────────────────────────────────────────────────

interface DeptMeta {
  icon: string;
  label: string;
  accent: string;        // tailwind color e.g. "rose"
  hasVendor: boolean;    // Embroidery, Printing, Washing have vendor dispatch
  vendorFields: string[];
  tips: string[];        // department-specific quality tips shown in sidebar
}

const DEPT_META: Record<string, DeptMeta> = {
  Cutting: {
    icon: "✂️", label: "Cutting", accent: "rose",
    hasVendor: false, vendorFields: [],
    tips: [
      "Check fabric grain before spreading layers",
      "Verify marker length vs. fabric roll",
      "Log waste (kg) per lot for costing",
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
  },
  Embroidery: {
    icon: "🌸", label: "Embroidery", accent: "violet",
    hasVendor: true, vendorFields: ["vendor", "sentQty", "receivedQty"],
    tips: [
      "Confirm design & stitch count with vendor",
      "Track sent vs received qty per vendor",
      "Inspect sampling pieces before bulk run",
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
  },
  Washing: {
    icon: "🫧", label: "Washing", accent: "cyan",
    hasVendor: true, vendorFields: ["vendor", "sentQty", "receivedQty"],
    tips: [
      "Log wash temperature and shrinkage %",
      "Match received qty to dispatch challan",
      "Check for colour bleeding before bulk",
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
  },
  Packing: {
    icon: "📦", label: "Packing", accent: "sky",
    hasVendor: false, vendorFields: [],
    tips: [
      "Scan barcodes to verify before sealing",
      "Record carton numbers for dispatch",
      "Size-wise segregation before poly-bag",
    ],
  },
};

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function accentCls(accent: string, variant: "bg" | "border" | "text" | "badge") {
  const map: Record<string, Record<string, string>> = {
    rose:    { bg: "bg-rose-50 dark:bg-rose-950/20",    border: "border-rose-200 dark:border-rose-800",    text: "text-rose-700 dark:text-rose-300",    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
    indigo:  { bg: "bg-indigo-50 dark:bg-indigo-950/20",  border: "border-indigo-200 dark:border-indigo-800",  text: "text-indigo-700 dark:text-indigo-300",  badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" },
    violet:  { bg: "bg-violet-50 dark:bg-violet-950/20",  border: "border-violet-200 dark:border-violet-800",  text: "text-violet-700 dark:text-violet-300",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" },
    amber:   { bg: "bg-amber-50 dark:bg-amber-950/20",   border: "border-amber-200 dark:border-amber-800",   text: "text-amber-700 dark:text-amber-300",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    cyan:    { bg: "bg-cyan-50 dark:bg-cyan-950/20",    border: "border-cyan-200 dark:border-cyan-800",    text: "text-cyan-700 dark:text-cyan-300",    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
    sky:     { bg: "bg-sky-50 dark:bg-sky-950/20",     border: "border-sky-200 dark:border-sky-800",     text: "text-sky-700 dark:text-sky-300",     badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" },
  };
  return map[accent]?.[variant] ?? "";
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatPill({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`flex-1 min-w-0 rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
      <p className="text-2xl font-black tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[10px] opacity-60 mt-0.5 font-semibold">{sub}</p>}
    </div>
  );
}

function AlertBanner({ icon, title, body, color }: { icon: React.ReactNode; title: string; body: string; color: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${color}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-black">{title}</p>
        <p className="text-xs mt-0.5 opacity-80">{body}</p>
      </div>
    </div>
  );
}

// ─── Karigar Workload Panel ────────────────────────────────────────────────────

function KarigarPanel({ ops, karigars, accent }: { ops: any[]; karigars: Karigar[]; accent: string }) {
  const workload = useMemo(() => {
    const map: Record<string, { karigar: Karigar; pending: number; wip: number; done: number; pieces: number }> = {};
    for (const op of ops) {
      if (!op.assignedTo) continue;
      const k = karigars.find(k => k.id === op.assignedTo);
      if (!k) continue;
      if (!map[k.id]) map[k.id] = { karigar: k, pending: 0, wip: 0, done: 0, pieces: 0 };
      const s = (op.status || "PENDING").toUpperCase();
      if (s === "PENDING") map[k.id].pending++;
      else if (s === "IN_PROGRESS") map[k.id].wip++;
      else if (s === "COMPLETED") map[k.id].done++;
      map[k.id].pieces += (op.completedQuantity || 0);
    }
    return Object.values(map).sort((a, b) => (b.wip + b.pending) - (a.wip + a.pending));
  }, [ops, karigars]);

  const unassigned = ops.filter(o => !o.assignedTo && (o.status || "PENDING").toUpperCase() !== "COMPLETED").length;

  if (workload.length === 0 && unassigned === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between ${accentCls(accent, "bg")}`}>
        <div className="flex items-center gap-2">
          <Users className={`w-4 h-4 ${accentCls(accent, "text")}`} />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Worker Workload</h3>
        </div>
        {unassigned > 0 && (
          <span className="text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
            {unassigned} unassigned
          </span>
        )}
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {workload.map(({ karigar, pending, wip, done, pieces }) => {
          const total = pending + wip + done;
          const donePct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div key={karigar.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${accentCls(accent, "badge")}`}>
                {karigar.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate">{karigar.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${donePct}%` }} />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 shrink-0">{donePct}%</span>
                </div>
              </div>
              <div className="flex gap-2 text-[10px] font-black shrink-0">
                {pending > 0 && <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{pending}P</span>}
                {wip > 0    && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600">{wip}W</span>}
                {done > 0   && <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">{done}D</span>}
              </div>
              <div className="text-right text-[10px] text-slate-400 shrink-0 font-semibold hidden sm:block">
                {pieces > 0 && <div>{pieces} pcs</div>}
              </div>
            </div>
          );
        })}
        {unassigned > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50/50 dark:bg-amber-950/10">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Unassigned jobs</p>
              <p className="text-[11px] text-amber-600/70">{unassigned} job cards have no worker assigned</p>
            </div>
            <span className="text-lg font-black text-amber-600">{unassigned}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vendor Dispatch Panel (Embroidery / Printing / Washing) ──────────────────

function VendorPanel({ ops, accent }: { ops: any[]; accent: string }) {
  const vendors = useMemo(() => {
    const map: Record<string, { name: string; sent: number; received: number; pending: number }> = {};
    for (const op of ops) {
      const v = op.customData?.vendor;
      if (!v) continue;
      if (!map[v]) map[v] = { name: v, sent: 0, received: 0, pending: 0 };
      map[v].sent     += Number(op.customData?.sentQty || 0);
      map[v].received += Number(op.customData?.receivedQty || 0);
      if ((op.status || "PENDING").toUpperCase() !== "COMPLETED") map[v].pending++;
    }
    return Object.values(map);
  }, [ops]);

  if (vendors.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 ${accentCls(accent, "bg")}`}>
        <ArrowRight className={`w-4 h-4 ${accentCls(accent, "text")}`} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Vendor Dispatch</h3>
      </div>
      <div className="divide-y divide-slate-50 dark:divide-slate-800">
        {vendors.map(v => {
          const balance = v.sent - v.received;
          return (
            <div key={v.name} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{v.name}</p>
                {balance > 0 && (
                  <span className="text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full">
                    {balance} pcs out
                  </span>
                )}
                {balance === 0 && v.received > 0 && (
                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    All received ✓
                  </span>
                )}
              </div>
              <div className="flex gap-3 text-[11px] text-slate-500 font-semibold">
                <span>Sent: <strong className="text-slate-700 dark:text-slate-200">{v.sent}</strong></span>
                <span>Received: <strong className="text-emerald-600">{v.received}</strong></span>
                <span>Active: <strong className="text-amber-600">{v.pending}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quality / Rejection Panel ─────────────────────────────────────────────────

function QualityPanel({ ops, accent }: { ops: any[]; accent: string }) {
  const stats = useMemo(() => {
    const completed = ops.filter(o => (o.status || "").toUpperCase() === "COMPLETED");
    const totalDone = completed.reduce((s, o) => s + (o.completedQuantity || 0), 0);
    const totalRej  = completed.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
    const rate = totalDone > 0 ? Math.round((totalRej / totalDone) * 100) : 0;
    const worstOps = completed
      .filter(o => o.rejectedQuantity > 0)
      .sort((a, b) => b.rejectedQuantity - a.rejectedQuantity)
      .slice(0, 3);
    return { totalDone, totalRej, rate, worstOps };
  }, [ops]);

  if (stats.totalDone === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 ${accentCls(accent, "bg")}`}>
        <TrendingDown className={`w-4 h-4 ${accentCls(accent, "text")}`} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Quality / Rejection</h3>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1 font-semibold text-slate-500">
              <span>Pass rate</span>
              <span className={`font-black ${stats.rate > 5 ? "text-rose-600" : "text-emerald-600"}`}>{100 - stats.rate}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${100 - stats.rate}%` }} />
            </div>
          </div>
          <div className="text-right text-sm shrink-0">
            <p className="font-black text-rose-600">{stats.totalRej} rej</p>
            <p className="text-[10px] text-slate-400">of {stats.totalDone} pcs</p>
          </div>
        </div>
        {stats.worstOps.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Highest Rejection</p>
            <div className="space-y-1">
              {stats.worstOps.map((op, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="truncate">{op.woProduct} — {op.woId}</span>
                  <span className="font-black text-rose-500 shrink-0 ml-2">{op.rejectedQuantity} pcs</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {stats.rate > 5 && (
          <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">Rejection rate above 5% — review process</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Deadline Alert Panel ──────────────────────────────────────────────────────

function DeadlinePanel({ production, taskName, accent }: { production: WorkOrder[]; taskName: string; accent: string }) {
  const overdue = useMemo(() => {
    const today = new Date();
    return production
      .filter(wo => {
        if (!wo.deadline) return false;
        const dl = new Date(wo.deadline);
        const hasOp = (wo.operations || []).some(op =>
          op.name.toLowerCase().includes(taskName.toLowerCase()) &&
          (op.status || "PENDING").toUpperCase() !== "COMPLETED"
        );
        return hasOp && dl < today;
      })
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [production, taskName]);

  const dueSoon = useMemo(() => {
    const today = new Date();
    const soon  = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    return production
      .filter(wo => {
        if (!wo.deadline) return false;
        const dl = new Date(wo.deadline);
        const hasOp = (wo.operations || []).some(op =>
          op.name.toLowerCase().includes(taskName.toLowerCase()) &&
          (op.status || "PENDING").toUpperCase() !== "COMPLETED"
        );
        return hasOp && dl >= today && dl <= soon;
      })
      .slice(0, 3);
  }, [production, taskName]);

  if (overdue.length === 0 && dueSoon.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className={`px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 ${accentCls(accent, "bg")}`}>
        <Clock className={`w-4 h-4 ${accentCls(accent, "text")}`} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Deadlines</h3>
      </div>
      <div className="p-3 space-y-2">
        {overdue.map(wo => (
          <div key={wo.id} className="flex items-center gap-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-rose-700 dark:text-rose-300 truncate">{wo.productName}</p>
              <p className="text-[10px] text-rose-500">{wo.id} · Due {new Date(wo.deadline).toLocaleDateString()}</p>
            </div>
            <span className="text-[10px] font-black text-rose-600 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-full shrink-0">OVERDUE</span>
          </div>
        ))}
        {dueSoon.map(wo => (
          <div key={wo.id} className="flex items-center gap-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-amber-700 dark:text-amber-300 truncate">{wo.productName}</p>
              <p className="text-[10px] text-amber-500">{wo.id} · Due {new Date(wo.deadline).toLocaleDateString()}</p>
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full shrink-0">DUE SOON</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tips Panel ────────────────────────────────────────────────────────────────

function TipsPanel({ tips, accent }: { tips: string[]; accent: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-2.5 flex items-center justify-between gap-2 ${accentCls(accent, "bg")} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-2">
          <Info className={`w-4 h-4 ${accentCls(accent, "text")}`} />
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Dept. Tips</h3>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <ul className="p-4 space-y-2">
          {tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
              <span className={`font-black text-base leading-none mt-0.5 ${accentCls(accent, "text")}`}>·</span>
              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function DeptTaskPage({ taskName, production, onUpdateWorkOrder, karigars }: Props) {
  const meta = DEPT_META[taskName] ?? {
    icon: "🔧", label: taskName, accent: "slate",
    hasVendor: false, vendorFields: [], tips: [],
  };
  const accent = meta.accent;

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // All ops for this dept
  const deptOps = useMemo(() =>
    production.flatMap(wo =>
      (wo.operations || [])
        .filter(op => op.name.toLowerCase().includes(taskName.toLowerCase()))
        .map((op, idx) => ({
          ...op,
          woId: wo.id,
          woProduct: wo.productName,
          woQty: wo.quantity,
          woDeadline: wo.deadline,
          opIndex: idx,
        }))
    ), [production, taskName]);

  // Summary numbers
  const summary = useMemo(() => {
    const pending     = deptOps.filter(o => (o.status || "PENDING").toUpperCase() === "PENDING").length;
    const inProgress  = deptOps.filter(o => (o.status || "").toUpperCase() === "IN_PROGRESS").length;
    const completed   = deptOps.filter(o => (o.status || "").toUpperCase() === "COMPLETED").length;
    const totalPcs    = deptOps.reduce((s, o) => s + (o.woQty || 0), 0);
    const donePcs     = deptOps.reduce((s, o) => s + (o.completedQuantity || 0), 0);
    const rejPcs      = deptOps.reduce((s, o) => s + (o.rejectedQuantity  || 0), 0);
    const unassigned  = deptOps.filter(o => !o.assignedTo && (o.status || "PENDING").toUpperCase() !== "COMPLETED").length;
    return { pending, inProgress, completed, total: deptOps.length, totalPcs, donePcs, rejPcs, unassigned };
  }, [deptOps]);

  // Rejection alert threshold
  const rejRate = summary.donePcs > 0 ? Math.round((summary.rejPcs / summary.donePcs) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Top Summary Bar ── */}
      <div className={`sticky top-0 z-10 border-b ${accentCls(accent, "border")} ${accentCls(accent, "bg")} px-4 py-3`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <h1 className={`text-base font-black leading-none ${accentCls(accent, "text")}`}>{meta.label}</h1>
              <p className="text-[10px] text-slate-500 font-semibold">{summary.total} job cards</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border ${accentCls(accent, "border")} ${accentCls(accent, "text")} bg-white dark:bg-slate-900 shadow-sm hover:shadow transition-all`}
          >
            {sidebarOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {sidebarOpen ? "Hide" : "Show"} Panel
          </button>
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <StatPill label="Pending"     value={summary.pending}    color="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
          <StatPill label="In Progress" value={summary.inProgress} color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300" />
          <StatPill label="Completed"   value={summary.completed}  color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300" />
          <StatPill label="Done Pcs"    value={summary.donePcs.toLocaleString()} sub={`of ${summary.totalPcs.toLocaleString()}`} color="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200" />
          {summary.unassigned > 0 && (
            <StatPill label="Unassigned" value={summary.unassigned} color="bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" />
          )}
          {summary.rejPcs > 0 && (
            <StatPill label="Rejected" value={summary.rejPcs} color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300" />
          )}
        </div>
      </div>

      {/* ── Alerts row (inline, above board) ── */}
      <div className="px-4 pt-3 space-y-2">
        {summary.unassigned > 0 && (
          <AlertBanner
            icon={<Users className="w-4 h-4 text-amber-600" />}
            title={`${summary.unassigned} job card${summary.unassigned > 1 ? "s" : ""} without a worker assigned`}
            body="Assign karigars to these job cards so work can be tracked accurately."
            color="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200"
          />
        )}
        {rejRate > 5 && (
          <AlertBanner
            icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
            title={`High rejection rate: ${rejRate}% (${summary.rejPcs} pieces rejected)`}
            body="Review quality checkpoint data and inspect recent completed job cards."
            color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
          />
        )}
      </div>

      {/* ── Main layout: board + sidebar ── */}
      <div className={`flex gap-0 ${sidebarOpen ? "lg:gap-4" : ""} p-0 lg:p-4 items-start`}>

        {/* Board */}
        <div className="flex-1 min-w-0">
          <TaskBoard
            taskName={taskName}
            production={production}
            onUpdateWorkOrder={onUpdateWorkOrder}
            karigars={karigars}
          />
        </div>

        {/* Sidebar panels */}
        {sidebarOpen && (
          <div className="hidden lg:flex flex-col gap-3 w-72 xl:w-80 shrink-0 pt-0 lg:pt-2">
            <DeadlinePanel production={production} taskName={taskName} accent={accent} />
            <KarigarPanel ops={deptOps} karigars={karigars} accent={accent} />
            {meta.hasVendor && <VendorPanel ops={deptOps} accent={accent} />}
            <QualityPanel ops={deptOps} accent={accent} />
            {meta.tips.length > 0 && <TipsPanel tips={meta.tips} accent={accent} />}
          </div>
        )}
      </div>

      {/* Mobile panels (collapsed by default, shown below board) */}
      <div className="lg:hidden px-4 pb-6 space-y-3 mt-2">
        <DeadlinePanel production={production} taskName={taskName} accent={accent} />
        <KarigarPanel ops={deptOps} karigars={karigars} accent={accent} />
        {meta.hasVendor && <VendorPanel ops={deptOps} accent={accent} />}
        <QualityPanel ops={deptOps} accent={accent} />
        {meta.tips.length > 0 && <TipsPanel tips={meta.tips} accent={accent} />}
      </div>
    </div>
  );
}
