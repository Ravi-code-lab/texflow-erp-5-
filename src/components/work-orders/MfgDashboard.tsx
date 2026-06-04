import React, { useMemo } from "react";
import { ProductionJob as WorkOrder } from "../../types";
import {
  Factory, CheckCircle2, Timer, Clock, TrendingUp, Layers,
  AlertCircle, Activity, Zap, Package, Users, BarChart2
} from "lucide-react";

interface Props {
  production: WorkOrder[];
  karigars?: any[];
  onNavigate?: (view: string) => void;
}

const TASKS = [
  { name: "Cutting",    icon: "✂️", color: "text-rose-700",    bg: "bg-rose-50",    border: "border-rose-200",   view: "TASK_CUTTING" },
  { name: "Stitching",  icon: "🧵", color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200", view: "TASK_STITCHING" },
  { name: "Embroidery", icon: "🌸", color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200", view: "TASK_EMBROIDERY" },
  { name: "Printing",   icon: "🖨️", color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  view: "TASK_PRINTING" },
  { name: "Washing",    icon: "🫧", color: "text-cyan-700",    bg: "bg-cyan-50",    border: "border-cyan-200",   view: "TASK_WASHING" },
  { name: "Finishing",  icon: "✨", color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", view: "TASK_FINISHING" },
  { name: "Packing",    icon: "📦", color: "text-sky-700",     bg: "bg-sky-50",     border: "border-sky-200",    view: "TASK_PACKING" },
];

export default function MfgDashboard({ production, karigars = [], onNavigate }: Props) {
  const allOps = useMemo(() =>
    production.flatMap((wo) =>
      (wo.operations || []).map((op: any) => ({ ...op, woId: wo.id, woProduct: wo.productName, woQty: wo.quantity }))
    ), [production]);

  const woStats = useMemo(() => ({
    total: production.length,
    draft: production.filter((w) => w.status === "DRAFT").length,
    submitted: production.filter((w) => w.status === "SUBMITTED").length,
    inProgress: production.filter((w) => ["IN_PROGRESS", "STITCHING", "CUTTING", "PRINTING", "EMBROIDERY", "FINISHING"].includes(w.status)).length,
    completed: production.filter((w) => w.status === "COMPLETED" || w.status === "READY").length,
    totalQty: production.reduce((s, w) => s + (w.quantity || 0), 0),
  }), [production]);

  const taskStats = useMemo(() =>
    TASKS.map(({ name }) => {
      const ops = allOps.filter((o: any) => o.name?.toLowerCase().includes(name.toLowerCase()));
      return {
        name,
        total: ops.length,
        pending: ops.filter((o: any) => (o.status || "PENDING").toUpperCase() === "PENDING").length,
        wip: ops.filter((o: any) => (o.status || "").toUpperCase() === "IN_PROGRESS").length,
        done: ops.filter((o: any) => (o.status || "").toUpperCase() === "COMPLETED").length,
      };
    }), [allOps]);

  // Most recent 5 WIP jobs
  const wipJobs = useMemo(() =>
    production
      .filter((w) => ["IN_PROGRESS", "SUBMITTED", "STITCHING", "CUTTING", "PRINTING", "EMBROIDERY", "FINISHING"].includes(w.status))
      .slice(0, 5), [production]);

  // Bottleneck: task with most pending ops
  const bottleneck = useMemo(() =>
    [...taskStats].sort((a, b) => b.pending - a.pending)[0], [taskStats]);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
          <Factory className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Manufacturing Dashboard</h2>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Shopfloor · Live Overview</p>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Live
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Work Order KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total WOs", value: woStats.total, color: "text-slate-800", icon: <Layers className="w-4 h-4" /> },
            { label: "Draft", value: woStats.draft, color: "text-slate-500", icon: <Clock className="w-4 h-4" /> },
            { label: "Submitted", value: woStats.submitted, color: "text-blue-600", icon: <Zap className="w-4 h-4" /> },
            { label: "In Progress", value: woStats.inProgress, color: "text-amber-600", icon: <Timer className="w-4 h-4" /> },
            { label: "Completed", value: woStats.completed, color: "text-emerald-600", icon: <CheckCircle2 className="w-4 h-4" /> },
            { label: "Total Pieces", value: woStats.totalQty.toLocaleString(), color: "text-indigo-600", icon: <Package className="w-4 h-4" /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className={`flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ${color}`}>
                {icon} {label}
              </div>
              <div className={`text-3xl font-black tabular-nums ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Alert Banner - Bottleneck */}
        {bottleneck && bottleneck.pending > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-none" />
            <div>
              <span className="font-bold text-amber-800 text-sm">Bottleneck Detected: </span>
              <span className="text-amber-700 text-sm">
                <strong>{bottleneck.name}</strong> has <strong>{bottleneck.pending}</strong> pending job cards — the most of any task. Consider re-assigning workers.
              </span>
            </div>
            {onNavigate && (
              <button
                onClick={() => onNavigate(`TASK_${bottleneck.name.toUpperCase()}`)}
                className="ml-auto text-xs font-bold text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 whitespace-nowrap"
              >
                View Task →
              </button>
            )}
          </div>
        )}

        {/* Task-wise Shopfloor Grid */}
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Shopfloor Task Status
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {TASKS.map(({ name, icon, color, bg, border, view }) => {
              const stat = taskStats.find((t) => t.name === name)!;
              const pct = stat.total > 0 ? Math.round((stat.done / stat.total) * 100) : 0;
              return (
                <div
                  key={name}
                  onClick={() => onNavigate?.(view)}
                  className={`cursor-pointer bg-white border ${border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all hover:scale-105`}
                >
                  <div className="text-2xl mb-2">{icon}</div>
                  <div className={`text-xs font-black uppercase tracking-wider ${color} mb-3`}>{name}</div>
                  <div className="space-y-1.5 mb-3">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Pending</span><span className="text-slate-700 font-bold">{stat.pending}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>WIP</span><span className="text-amber-600 font-bold">{stat.wip}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Done</span><span className="text-emerald-600 font-bold">{stat.done}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${bg}`} style={{ width: `${pct}%`, background: pct > 0 ? undefined : undefined }}>
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <div className={`text-right text-[10px] font-black mt-1 ${pct >= 80 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-slate-400"}`}>{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live WIP Jobs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" /> Active Work Orders
              </h3>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{wipJobs.length} WIP</span>
            </div>
            {wipJobs.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No active work orders</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {wipJobs.map((wo) => (
                  <div key={wo.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">{wo.id}</span>
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          wo.priority === "HIGH" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                          wo.priority === "NORMAL" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>{wo.priority}</span>
                      </div>
                      <div className="font-bold text-slate-800 text-sm truncate mt-0.5">{wo.productName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{wo.quantity} pcs · Due {wo.deadline}</div>
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-xs font-black text-indigo-700">{wo.progress || 0}%</div>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${wo.progress || 0}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Karigar Utilization */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" /> Worker Load
              </h3>
            </div>
            {karigars.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">No workers assigned</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {karigars.slice(0, 6).map((k: any) => {
                  const assigned = allOps.filter((o: any) => o.assignedTo === k.id && (o.status || "PENDING").toUpperCase() !== "COMPLETED").length;
                  return (
                    <div key={k.id} className="px-5 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs flex-none">
                        {k.name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{k.name}</div>
                        <div className="text-xs text-slate-500">{k.skills?.join(", ") || k.skill || "General"}</div>
                      </div>
                      <div className={`text-xs font-black px-2 py-1 rounded ${assigned > 3 ? "bg-rose-50 text-rose-700" : assigned > 0 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {assigned} jobs
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
