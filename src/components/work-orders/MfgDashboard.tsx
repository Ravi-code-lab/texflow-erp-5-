import React, { useMemo, useState } from "react";
import {
  Factory, Clock, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown,
  Zap, Package, Scissors, BarChart2, Activity, Timer, ChevronRight,
  AlertCircle, RefreshCw, Target, Layers, ArrowUpRight, ArrowDownRight,
  Calendar, Filter, Search, LayoutGrid, List
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
interface WO { id: string; productName?: string; quantity?: number; status?: string; dueDate?: string; createdAt?: string; operations?: Op[]; progress?: number; }
interface Op { id: string; name?: string; stage?: string; dept?: string; workflowState?: string; status?: string; completedQuantity?: number; rejectedQuantity?: number; startedAt?: string; completedAt?: string; assignedTo?: string; woQty?: number; customData?: any; }
interface Props { production: WO[]; karigars?: any[]; onNavigate?: (v: string) => void; }

// ─── Stage colour map ─────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  "Fabric Inspection": "#84cc16", Dyeing: "#3b82f6", Printing: "#f59e0b",
  Cutting: "#ef4444", Stitching: "#6366f1", Embroidery: "#8b5cf6",
  Washing: "#06b6d4", "Hand Work": "#f97316", Finishing: "#10b981",
  "QC Check": "#14b8a6", Packing: "#0ea5e9",
};
const STAGE_ICONS: Record<string, string> = {
  "Fabric Inspection": "🔍", Dyeing: "🎨", Printing: "🖨️", Cutting: "✂️",
  Stitching: "🧵", Embroidery: "🌸", Washing: "🫧", "Hand Work": "🤲",
  Finishing: "✨", "QC Check": "✅", Packing: "📦",
};
const MAIN_STAGES = [
  "Fabric Inspection","Dyeing","Printing","Cutting","Stitching",
  "Embroidery","Washing","Hand Work","Finishing","QC Check","Packing",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function woStatus(wo: WO) { return (wo.status || "PENDING").toUpperCase(); }
function opState(op: Op) { return (op.workflowState || op.status || "Pending"); }
function isOverdue(wo: WO) {
  if (!wo.dueDate) return false;
  return new Date(wo.dueDate) < new Date() && woStatus(wo) !== "COMPLETED" && woStatus(wo) !== "FULFILLED";
}
function daysLeft(wo: WO) {
  if (!wo.dueDate) return null;
  return Math.ceil((new Date(wo.dueDate).getTime() - Date.now()) / 86400000);
}
function opDept(op: Op) {
  if (op.dept) return op.dept;
  const n = (op.name || "").toLowerCase();
  for (const s of MAIN_STAGES) if (n.includes(s.toLowerCase())) return s;
  return op.stage || "Other";
}
function woCompletion(wo: WO) {
  const ops = wo.operations || [];
  if (!ops.length) return wo.progress || 0;
  const done = ops.filter(o => opState(o) === "Completed").length;
  return Math.round((done / ops.length) * 100);
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, trend, onClick }: {
  label: string; value: string | number; sub?: string; icon: any;
  color: string; trend?: "up"|"down"|"flat"; onClick?: () => void;
}) {
  const bg: Record<string,string> = {
    blue:"bg-blue-50 border-blue-200 text-blue-600",
    emerald:"bg-emerald-50 border-emerald-200 text-emerald-600",
    amber:"bg-amber-50 border-amber-200 text-amber-600",
    rose:"bg-rose-50 border-rose-200 text-rose-600",
    violet:"bg-violet-50 border-violet-200 text-violet-600",
    cyan:"bg-cyan-50 border-cyan-200 text-cyan-600",
    indigo:"bg-indigo-50 border-indigo-200 text-indigo-600",
    slate:"bg-slate-50 border-slate-200 text-slate-600",
  };
  const cls = bg[color] || bg.slate;
  return (
    <div onClick={onClick} className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow bg-white ${onClick ? "hover:scale-[1.01]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-800 leading-none tabular-nums">{value}</p>
          {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${cls}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className={`mt-2 flex items-center gap-1 text-[11px] font-semibold ${trend==="up"?"text-emerald-600":trend==="down"?"text-rose-500":"text-slate-400"}`}>
          {trend==="up" ? <ArrowUpRight className="w-3 h-3"/> : trend==="down" ? <ArrowDownRight className="w-3 h-3"/> : null}
        </div>
      )}
    </div>
  );
}

// ─── Stage WIP Row ────────────────────────────────────────────────────────────
function StageRow({ stage, ops, total }: { key?: React.Key; stage: string; ops: Op[]; total: number }) {
  const done = ops.filter(o => opState(o) === "Completed").length;
  const wip  = ops.filter(o => opState(o) === "In Progress").length;
  const pend = ops.filter(o => !["Completed","In Progress"].includes(opState(o))).length;
  const color = STAGE_COLORS[stage] || "#94a3b8";
  const pct = ops.length > 0 ? Math.round((done / ops.length) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 group">
      <div className="w-7 text-center text-base">{STAGE_ICONS[stage] || "⚙️"}</div>
      <div className="w-28 min-w-[112px]">
        <p className="text-xs font-bold text-slate-700 truncate">{stage}</p>
      </div>
      <div className="flex-1">
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, background: color }} />
        </div>
      </div>
      <div className="w-10 text-right text-xs font-black tabular-nums" style={{ color }}>{pct}%</div>
      <div className="flex gap-3 text-[10px] font-semibold w-36 justify-end">
        <span className="text-emerald-600">{done} done</span>
        <span className="text-amber-500">{wip} wip</span>
        <span className="text-slate-400">{pend} pend</span>
      </div>
    </div>
  );
}

// ─── Work Order Row ───────────────────────────────────────────────────────────
function WORow({ wo, idx }: { key?: React.Key; wo: WO; idx: number }) {
  const pct = woCompletion(wo);
  const overdue = isOverdue(wo);
  const dl = daysLeft(wo);
  const st = woStatus(wo);
  const ops = wo.operations || [];
  const activeOp = ops.find(o => opState(o) === "In Progress");
  const currentStage = activeOp ? opDept(activeOp) : (st === "COMPLETED" ? "Done" : "—");
  return (
    <tr className="hover:bg-slate-50 transition-colors text-sm border-b border-slate-100">
      <td className="py-2.5 px-3 text-xs font-mono text-slate-400">{idx+1}</td>
      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600 text-xs">{wo.id}</td>
      <td className="py-2.5 px-3 font-semibold text-slate-800">{wo.productName || "—"}</td>
      <td className="py-2.5 px-3 text-slate-600 tabular-nums text-xs font-bold">{wo.quantity || 0} pcs</td>
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width:`${pct}%` }} />
          </div>
          <span className="text-xs font-black text-indigo-600 tabular-nums">{pct}%</span>
        </div>
      </td>
      <td className="py-2.5 px-3 text-xs text-slate-500">{currentStage}</td>
      <td className="py-2.5 px-3">
        {st === "COMPLETED" || st === "FULFILLED"
          ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold"><CheckCircle2 className="w-3 h-3"/>Done</span>
          : st === "IN_PROGRESS"
          ? <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold"><Timer className="w-3 h-3"/>WIP</span>
          : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold"><Clock className="w-3 h-3"/>Pending</span>
        }
      </td>
      <td className="py-2.5 px-3">
        {wo.dueDate
          ? <span className={`text-xs font-bold tabular-nums ${overdue ? "text-rose-600" : dl !== null && dl <= 3 ? "text-amber-600" : "text-slate-500"}`}>
              {overdue ? <span className="mr-1">⚠️</span> : null}
              {new Date(wo.dueDate).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}
              {dl !== null ? <span className="font-normal text-slate-400 ml-1">({dl < 0 ? `${Math.abs(dl)}d late` : dl === 0 ? "Today" : `${dl}d`})</span> : null}
            </span>
          : <span className="text-slate-300 text-xs">—</span>
        }
      </td>
    </tr>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MfgDashboard({ production = [], karigars = [], onNavigate }: Props) {
  const [tab, setTab] = useState<"overview"|"pipeline"|"orders"|"analytics">("overview");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ── Core metrics ─────────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = production.length;
    const wip   = production.filter(w => woStatus(w) === "IN_PROGRESS").length;
    const done  = production.filter(w => ["COMPLETED","FULFILLED"].includes(woStatus(w))).length;
    const pend  = production.filter(w => woStatus(w) === "PENDING").length;
    const over  = production.filter(isOverdue).length;
    const totalPcs = production.reduce((s,w) => s + (w.quantity||0), 0);
    const donePcs  = production.filter(w => ["COMPLETED","FULFILLED"].includes(woStatus(w))).reduce((s,w) => s+(w.quantity||0), 0);

    // All ops flattened
    const allOps = production.flatMap(w => (w.operations||[]).map(o => ({ ...o, _woId: w.id, _woProd: w.productName, _woQty: w.quantity })));
    const totalOps = allOps.length;
    const doneOps  = allOps.filter(o => opState(o) === "Completed").length;
    const wipOps   = allOps.filter(o => opState(o) === "In Progress").length;

    // Rejection rate
    const totalRej = allOps.reduce((s,o) => s + (o.rejectedQuantity||0), 0);
    const totalComp = allOps.reduce((s,o) => s + (o.completedQuantity||0), 0);
    const rejRate  = (totalComp + totalRej) > 0 ? ((totalRej / (totalComp+totalRej))*100).toFixed(1) : "0.0";

    return { total, wip, done, pend, over, totalPcs, donePcs, totalOps, doneOps, wipOps, rejRate };
  }, [production]);

  // ── Stage WIP breakdown ───────────────────────────────────────────────────────
  const stageWip = useMemo(() => {
    const map: Record<string, Op[]> = {};
    MAIN_STAGES.forEach(s => map[s] = []);
    production.forEach(w => (w.operations||[]).forEach(op => {
      const d = opDept(op);
      if (map[d]) map[d].push(op);
    }));
    return MAIN_STAGES.filter(s => map[s].length > 0).map(s => ({ stage: s, ops: map[s] }));
  }, [production]);

  // ── Stage chart data ──────────────────────────────────────────────────────────
  const stageChartData = useMemo(() => stageWip.map(({ stage, ops }) => ({
    name: stage.length > 8 ? stage.slice(0,8)+"…" : stage,
    fullName: stage,
    done:  ops.filter(o => opState(o) === "Completed").length,
    wip:   ops.filter(o => opState(o) === "In Progress").length,
    pend:  ops.filter(o => !["Completed","In Progress"].includes(opState(o))).length,
  })), [stageWip]);

  // ── WO throughput by week ─────────────────────────────────────────────────────
  const throughputData = useMemo(() => {
    const weeks: Record<string, { created: number; completed: number }> = {};
    production.forEach(w => {
      const d = new Date(w.createdAt || Date.now());
      const wk = `W${Math.ceil(d.getDate()/7)} ${d.toLocaleString("en",{month:"short"})}`;
      if (!weeks[wk]) weeks[wk] = { created:0, completed:0 };
      weeks[wk].created++;
      if (["COMPLETED","FULFILLED"].includes(woStatus(w))) weeks[wk].completed++;
    });
    return Object.entries(weeks).slice(-8).map(([wk, v]) => ({ wk, ...v }));
  }, [production]);

  // ── Overdue orders ────────────────────────────────────────────────────────────
  const overdueWOs = useMemo(() => production.filter(isOverdue).sort((a,b) => {
    return new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime();
  }), [production]);

  // ── Filtered WO list ──────────────────────────────────────────────────────────
  const filteredWOs = useMemo(() => {
    return production.filter(w => {
      if (filterStatus !== "ALL") {
        const s = woStatus(w);
        if (filterStatus === "WIP" && s !== "IN_PROGRESS") return false;
        if (filterStatus === "PENDING" && s !== "PENDING") return false;
        if (filterStatus === "DONE" && !["COMPLETED","FULFILLED"].includes(s)) return false;
        if (filterStatus === "OVERDUE" && !isOverdue(w)) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (w.id||"").toLowerCase().includes(q) || (w.productName||"").toLowerCase().includes(q);
      }
      return true;
    });
  }, [production, filterStatus, search]);

  const TABS = [
    { id:"overview", label:"Overview", icon: LayoutGrid },
    { id:"pipeline", label:"Stage Pipeline", icon: Activity },
    { id:"orders", label:"Work Orders", icon: List },
    { id:"analytics", label:"Analytics", icon: BarChart2 },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <Factory className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Manufacturing Dashboard</h1>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                {metrics.wip} WIP · {metrics.over > 0 ? <span className="text-rose-500">{metrics.over} Overdue</span> : "On Track"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onNavigate?.("PRODUCTION")} className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">
              <Factory className="w-4 h-4" /> New Work Order
            </button>
            <button onClick={() => onNavigate?.("JOB_CARD_SUMMARY")} className="flex items-center gap-2 text-sm font-bold text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg transition-colors">
              <BarChart2 className="w-4 h-4" /> Job Cards
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${tab === t.id ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">

        {/* ── OVERVIEW ── */}
        {tab === "overview" && (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Total Work Orders" value={metrics.total} sub={`${metrics.totalPcs} pcs planned`} icon={Layers} color="indigo" onClick={() => setTab("orders")} />
              <KpiCard label="In Progress" value={metrics.wip} sub={`${metrics.wipOps} ops running`} icon={Timer} color="amber" onClick={() => { setTab("orders"); setFilterStatus("WIP"); }} />
              <KpiCard label="Completed" value={metrics.done} sub={`${metrics.donePcs} pcs delivered`} icon={CheckCircle2} color="emerald" onClick={() => { setTab("orders"); setFilterStatus("DONE"); }} />
              <KpiCard label="Overdue" value={metrics.over} sub={metrics.over > 0 ? "Needs attention" : "All on track"} icon={AlertTriangle} color={metrics.over > 0 ? "rose" : "slate"} onClick={() => { setTab("orders"); setFilterStatus("OVERDUE"); }} />
            </div>

            {/* Second KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KpiCard label="Total Job Cards" value={metrics.totalOps} sub="All operations" icon={Activity} color="blue" />
              <KpiCard label="Ops Done" value={metrics.doneOps} sub={`${metrics.totalOps > 0 ? Math.round((metrics.doneOps/metrics.totalOps)*100) : 0}% complete`} icon={CheckCircle2} color="emerald" />
              <KpiCard label="Pending Orders" value={metrics.pend} sub="Not yet started" icon={Clock} color="slate" />
              <KpiCard label="Rejection Rate" value={`${metrics.rejRate}%`} sub="Across all ops" icon={AlertCircle} color={parseFloat(metrics.rejRate) > 5 ? "rose" : "emerald"} />
            </div>

            {/* Overdue Alert */}
            {overdueWOs.length > 0 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h3 className="text-sm font-black text-rose-700">Overdue Work Orders ({overdueWOs.length})</h3>
                </div>
                <div className="space-y-2">
                  {overdueWOs.slice(0,5).map(w => (
                    <div key={w.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600">{w.id}</span>
                        <span className="text-sm text-slate-700 font-semibold">{w.productName}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">{w.quantity} pcs</span>
                        <span className="text-xs font-black text-rose-600">
                          {Math.abs(daysLeft(w)!)}d overdue
                        </span>
                      </div>
                    </div>
                  ))}
                  {overdueWOs.length > 5 && (
                    <p className="text-xs text-rose-500 font-semibold text-center">{overdueWOs.length - 5} more overdue…</p>
                  )}
                </div>
              </div>
            )}

            {/* Stage WIP + Throughput side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stage breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Stage-wise WIP</h3>
                {stageWip.length === 0
                  ? <div className="text-center py-10 text-slate-400 text-sm">No operations found. Create Work Orders first.</div>
                  : stageWip.map(({ stage, ops }) => <StageRow key={stage} stage={stage} ops={ops} total={ops.length} />)
                }
              </div>

              {/* Throughput chart */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Weekly Throughput</h3>
                {throughputData.length === 0
                  ? <div className="text-center py-10 text-slate-400 text-sm">No data yet.</div>
                  : <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={throughputData}>
                        <defs>
                          <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="wk" tick={{ fontSize:10, fill:"#94a3b8" }} />
                        <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} />
                        <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                        <Area type="monotone" dataKey="created" stroke="#6366f1" fill="url(#gc)" name="Created" strokeWidth={2} />
                        <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#gd)" name="Completed" strokeWidth={2} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          </>
        )}

        {/* ── PIPELINE ── */}
        {tab === "pipeline" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-700">Stage-wise Operation Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">{metrics.totalOps} total operations across {stageWip.length} active stages</p>
              </div>
              {stageChartData.length > 0 && (
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stageChartData} layout="vertical" barCategoryGap="20%">
                      <XAxis type="number" tick={{ fontSize:10, fill:"#94a3b8" }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#64748b" }} width={90} />
                      <Tooltip
                        contentStyle={{ fontSize:11, borderRadius:8 }}
                        formatter={(v,n,p) => [v, n === "done" ? "Completed" : n === "wip" ? "In Progress" : "Pending"]}
                        labelFormatter={(_,payload) => payload?.[0]?.payload?.fullName || ""}
                      />
                      <Bar dataKey="done" name="done" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                      <Bar dataKey="wip"  name="wip"  stackId="a" fill="#f59e0b" />
                      <Bar dataKey="pend" name="pend" stackId="a" fill="#e2e8f0" radius={[0,4,4,0]} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} formatter={(v) => v === "done" ? "Completed" : v === "wip" ? "In Progress" : "Pending"} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Stage cards grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {stageWip.map(({ stage, ops }) => {
                const done = ops.filter(o => opState(o) === "Completed").length;
                const wip  = ops.filter(o => opState(o) === "In Progress").length;
                const pend = ops.filter(o => !["Completed","In Progress"].includes(opState(o))).length;
                const pct  = ops.length > 0 ? Math.round((done/ops.length)*100) : 0;
                const color = STAGE_COLORS[stage] || "#94a3b8";
                return (
                  <div key={stage} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{STAGE_ICONS[stage] || "⚙️"}</span>
                      <div>
                        <p className="text-xs font-black text-slate-700 leading-tight">{stage}</p>
                        <p className="text-[10px] text-slate-400">{ops.length} job cards</p>
                      </div>
                    </div>
                    <div className="text-2xl font-black tabular-nums mb-2" style={{ color }}>{pct}%</div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full" style={{ width:`${pct}%`, background: color }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span className="text-emerald-600">{done} done</span>
                      <span className="text-amber-500">{wip} wip</span>
                      <span>{pend} pend</span>
                    </div>
                  </div>
                );
              })}
              {stageWip.length === 0 && (
                <div className="col-span-4 text-center py-16 text-slate-400">
                  <Factory className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                  <p className="font-bold">No production data yet</p>
                  <p className="text-xs mt-1">Create Work Orders and assign routing operations</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── WORK ORDERS ── */}
        {tab === "orders" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search WO, product…" className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white" />
              </div>
              {(["ALL","WIP","PENDING","DONE","OVERDUE"] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors border ${filterStatus===f ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"}`}>
                  {f === "ALL" ? "All" : f === "WIP" ? "In Progress" : f === "DONE" ? "Completed" : f === "OVERDUE" ? "⚠️ Overdue" : "Pending"}
                </button>
              ))}
              <span className="ml-auto text-xs font-semibold text-slate-400">{filteredWOs.length} records</span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-10">#</th>
                    <th className="py-3 px-3 border-l border-slate-200">WO ID</th>
                    <th className="py-3 px-3 border-l border-slate-200">Product</th>
                    <th className="py-3 px-3 border-l border-slate-200">Qty</th>
                    <th className="py-3 px-3 border-l border-slate-200">Progress</th>
                    <th className="py-3 px-3 border-l border-slate-200">Stage</th>
                    <th className="py-3 px-3 border-l border-slate-200">Status</th>
                    <th className="py-3 px-3 border-l border-slate-200">Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWOs.length === 0
                    ? <tr><td colSpan={8} className="py-16 text-center text-slate-400">
                        <Factory className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                        <p className="font-bold text-slate-600">No Work Orders Found</p>
                      </td></tr>
                    : filteredWOs.map((wo, i) => <WORow key={wo.id} wo={wo} idx={i} />)
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Pie */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">WO Status Distribution</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={[
                      { name:"Completed", value: metrics.done,   fill:"#10b981" },
                      { name:"In Progress",value:metrics.wip,   fill:"#f59e0b" },
                      { name:"Pending",   value: metrics.pend,  fill:"#e2e8f0" },
                      { name:"Overdue",   value: metrics.over,  fill:"#ef4444" },
                    ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2}>
                      {[0,1,2,3].map(i => <Cell key={i} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 text-sm">
                  {[
                    { label:"Completed",  v:metrics.done, c:"bg-emerald-500" },
                    { label:"In Progress",v:metrics.wip,  c:"bg-amber-400" },
                    { label:"Pending",    v:metrics.pend, c:"bg-slate-200" },
                    { label:"Overdue",    v:metrics.over, c:"bg-rose-500" },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${r.c}`} />
                      <span className="text-slate-600 font-medium">{r.label}</span>
                      <span className="font-black text-slate-800 tabular-nums ml-auto">{r.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stage completion bar */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Stage Completion Rate</h3>
              {stageChartData.length === 0
                ? <div className="text-center py-10 text-slate-400 text-sm">No data</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stageChartData.map(d => ({ ...d, pct: d.done+d.wip+d.pend > 0 ? Math.round((d.done/(d.done+d.wip+d.pend))*100) : 0 }))}>
                      <XAxis dataKey="name" tick={{ fontSize:9, fill:"#94a3b8" }} />
                      <YAxis domain={[0,100]} tick={{ fontSize:10, fill:"#94a3b8" }} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} formatter={(v) => [`${v}%`, "Completion"]} labelFormatter={(_,p) => p?.[0]?.payload?.fullName || ""} />
                      <Bar dataKey="pct" name="Completion %" fill="#6366f1" radius={[4,4,0,0]}>
                        {stageChartData.map((_, i) => <Cell key={i} fill={Object.values(STAGE_COLORS)[i % Object.values(STAGE_COLORS).length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>

            {/* Throughput */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Weekly Throughput (Created vs Completed)</h3>
              {throughputData.length === 0
                ? <div className="text-center py-10 text-slate-400 text-sm">No data yet</div>
                : <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={throughputData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="wk" tick={{ fontSize:10, fill:"#94a3b8" }} />
                      <YAxis tick={{ fontSize:10, fill:"#94a3b8" }} />
                      <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                      <Bar dataKey="created"   name="Created"   fill="#6366f1" radius={[3,3,0,0]} />
                      <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3,3,0,0]} />
                      <Legend iconSize={8} wrapperStyle={{ fontSize:10 }} />
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
