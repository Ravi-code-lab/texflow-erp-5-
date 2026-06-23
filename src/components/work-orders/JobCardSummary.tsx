import React, { useState, useMemo } from "react";
import { ProductionJob as WorkOrder, Design } from "../../types";
import {
  CheckCircle2, Timer, Clock, Search, Filter, Download,
  ChevronDown, TrendingUp, AlertCircle, BarChart2, Calendar,
  Factory, User, Layers
} from "lucide-react";

interface Props {
  production: WorkOrder[];
  designs?: Design[];
}

const TASK_NAMES = ["Cutting", "Stitching", "Embroidery", "Printing", "Washing", "Finishing", "Packing"];

// Stages that operate on uncut/gray fabric (tracked in meters) rather than finished pieces.
// Cutting itself is excluded — cut job cards are conventionally tracked by pieces to cut.
const FABRIC_STAGES = new Set([
  "FABRIC_INSPECTION", "FABRIC_PRINTING", "DYEING", "EMBROIDERY_FABRIC",
  "SEQUIN_FABRIC", "GSMLOT_TEST", "SHRINKAGE_TEST", "COLOUR_FASTNESS",
  "SUBLIMATION", "MARKER_MAKING", "SPREADING",
]);

const TASK_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  "Fabric Inspection": { color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", icon: "🔍" },
  "Dyeing":            { color: "text-blue-700",  bg: "bg-blue-50",  border: "border-blue-200", icon: "🎨" },
  Cutting:             { color: "text-rose-700",  bg: "bg-rose-50",  border: "border-rose-200", icon: "✂️" },
  Stitching:           { color: "text-indigo-700",bg: "bg-indigo-50",border: "border-indigo-200",icon: "🧵" },
  Embroidery:          { color: "text-violet-700",bg: "bg-violet-50",border: "border-violet-200",icon: "🌸" },
  Printing:            { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "🖨️" },
  Washing:             { color: "text-cyan-700",  bg: "bg-cyan-50",  border: "border-cyan-200", icon: "🫧" },
  "Hand Work":         { color: "text-pink-700",  bg: "bg-pink-50",  border: "border-pink-200", icon: "✋" },
  Finishing:           { color: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",icon: "✨" },
  "QC Check":          { color: "text-green-700", bg: "bg-green-50", border: "border-green-200", icon: "✅" },
  Packing:             { color: "text-sky-700",   bg: "bg-sky-50",   border: "border-sky-200",  icon: "📦" },
};

export default function JobCardSummary({ production, designs = [] }: Props) {
  const [search, setSearch] = useState("");
  const [filterTask, setFilterTask] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [period, setPeriod] = useState("ALL");

  // Match each work order to its design (by style code / SKU first, falling back to product name)
  // so fabric-stage job cards (printing, dyeing, inspection) can show real fabric meterage from the BOM.
  const designByKey = useMemo(() => {
    const map = new Map<string, Design>();
    (designs || []).forEach((d) => {
      if (d.sku) map.set(d.sku.toLowerCase(), d);
      if (d.name) map.set(d.name.toLowerCase(), d);
    });
    return map;
  }, [designs]);

  const fabricMetersPerPiece = (wo: WorkOrder) => {
    const design =
      (wo.styleCode ? designByKey.get(wo.styleCode.toLowerCase()) : null) ||
      (wo.productName ? designByKey.get(wo.productName.toLowerCase()) : null);
    if (!design || !design.recipe) return 0;
    return design.recipe.reduce((sum: number, item: any) => {
      const u = (item.unit || "").toString().toUpperCase();
      if (u.includes("METER") || u === "MTR" || u === "M") return sum + (Number(item.quantity) || 0);
      return sum;
    }, 0);
  };

  // Flatten all job cards from all work orders
  const allJobCards = useMemo(() => {
    return production.flatMap((wo) => {
      let activeIdx = (wo.operations || []).findIndex(o => {
        const s = (o.status || "").toUpperCase();
        return s !== "COMPLETED" && s !== "SKIPPED";
      });
      if (activeIdx === -1) activeIdx = (wo.operations || []).length;

      const perPieceMeters = fabricMetersPerPiece(wo);
      const totalFabricMeters = perPieceMeters * (wo.quantity || 0);

      return (wo.operations || []).map((op, idx) => {
        const isFabricStage = FABRIC_STAGES.has((op.stage || "").toUpperCase()) || op.rateUnit === "PER_METER" || op.name?.toLowerCase()?.includes("fabric printing") || op.name?.toLowerCase()?.includes("fabric inspection") || op.name?.toLowerCase()?.includes("dyeing");
        const useFabricQty = isFabricStage;
        return {
          ...op,
          woId: wo.id,
          woProduct: wo.productName,
          woQty: wo.quantity,
          qtyValue: useFabricQty ? totalFabricMeters : wo.quantity,
          qtyUnit: useFabricQty ? "Mtr" : "pcs",
          missingBom: useFabricQty && totalFabricMeters === 0,
          woStatus: wo.status,
          opIndex: idx,
          isReady: idx <= activeIdx,
          taskCategory: TASK_NAMES.find((t) =>
            op.name?.toLowerCase()?.includes(t.toLowerCase())
          ) || "Other",
        };
      }).filter(op => op.isReady);
    });
  }, [production, designByKey]);

  // Summary stats per task
  const taskStats = useMemo(() =>
    TASK_NAMES.map((task) => {
      const cards = allJobCards.filter((j) => j.taskCategory === task);
      return {
        task,
        total: cards.length,
        pending: cards.filter((c) => (c.status || "PENDING").toUpperCase() === "PENDING").length,
        inProgress: cards.filter((c) => (c.status || "").toUpperCase() === "IN_PROGRESS").length,
        completed: cards.filter((c) => (c.status || "").toUpperCase() === "COMPLETED").length,
      };
    }), [allJobCards]);

  const totalCards = allJobCards.length;
  const totalCompleted = allJobCards.filter((c) => (c.status || "").toUpperCase() === "COMPLETED").length;
  const totalPending = allJobCards.filter((c) => (c.status || "PENDING").toUpperCase() === "PENDING").length;
  const totalWip = allJobCards.filter((c) => (c.status || "").toUpperCase() === "IN_PROGRESS").length;
  const completionPct = totalCards > 0 ? Math.round((totalCompleted / totalCards) * 100) : 0;

  const filtered = useMemo(() => {
    return allJobCards.filter((j) => {
      if (filterTask !== "ALL" && j.taskCategory !== filterTask) return false;
      if (filterStatus !== "ALL") {
        const s = (j.status || "PENDING").toUpperCase();
        if (filterStatus === "PENDING" && s !== "PENDING") return false;
        if (filterStatus === "IN_PROGRESS" && s !== "IN_PROGRESS") return false;
        if (filterStatus === "COMPLETED" && s !== "COMPLETED") return false;
      }
      if (search) {
        const q = search.toLowerCase();
        if (!j.woId?.toLowerCase()?.includes(q) && !j.woProduct?.toLowerCase()?.includes(q) && !j.name?.toLowerCase()?.includes(q)) return false;
      }
      return true;
    });
  }, [allJobCards, filterTask, filterStatus, search]);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex-none bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Job Card Summary</h2>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Manufacturing · Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 bg-white"
            >
              <option value="ALL">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_WEEK">This Week</option>
            </select>
            <button className="flex items-center gap-2 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 bg-white">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="flex-none px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Job Cards</div>
          <div className="text-3xl font-black text-slate-800 tabular-nums">{totalCards}</div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-semibold">
            <Layers className="w-3.5 h-3.5" /> {production.length} Work Orders
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Pending</div>
          <div className="text-3xl font-black text-slate-600 tabular-nums">{totalPending}</div>
          <div className="flex items-center gap-1 mt-2 text-xs text-slate-400 font-semibold">
            <Clock className="w-3.5 h-3.5" /> Awaiting start
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">In Progress</div>
          <div className="text-3xl font-black text-amber-600 tabular-nums">{totalWip}</div>
          <div className="flex items-center gap-1 mt-2 text-xs text-amber-400 font-semibold">
            <Timer className="w-3.5 h-3.5" /> Active on floor
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Completed</div>
          <div className="text-3xl font-black text-emerald-600 tabular-nums">{totalCompleted}</div>
          <div className="flex items-center gap-1 mt-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionPct}%` }} />
            </div>
            <span className="text-xs font-black text-emerald-600 tabular-nums">{completionPct}%</span>
          </div>
        </div>
      </div>

      {/* Per-Task Summary Bar Chart */}
      <div className="flex-none px-6 pb-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Task-wise Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {taskStats.map(({ task, total, pending, inProgress, completed }) => {
              const cfg = TASK_CONFIG[task];
              const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
              return (
                <div
                  key={task}
                  onClick={() => setFilterTask(filterTask === task ? "ALL" : task)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all ${filterTask === task ? `${cfg.bg} ${cfg.border} ring-2 ring-offset-1 ring-indigo-400` : "border-slate-200 hover:border-slate-300 bg-slate-50/50"}`}
                >
                  <div className="text-lg mb-1">{cfg.icon}</div>
                  <div className={`text-xs font-black uppercase tracking-wider mb-2 ${cfg.color}`}>{task}</div>
                  <div className="text-2xl font-black text-slate-800 tabular-nums mb-2">{total}</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                      <span>Done</span><span className="text-emerald-600 font-bold">{completed}</span>
                    </div>
                    <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>{inProgress} WIP</span><span>{pending} Pending</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters + Table */}
      <div className="flex-none px-6 pb-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search job cards..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:border-indigo-500 bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <button
          onClick={() => { setFilterTask("ALL"); setFilterStatus("ALL"); setSearch(""); }}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50"
        >
          Clear Filters
        </button>
        <span className="ml-auto text-xs font-semibold text-slate-500">{filtered.length} records</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4 border-l border-slate-200">Work Order</th>
                <th className="py-3 px-4 border-l border-slate-200">Product</th>
                <th className="py-3 px-4 border-l border-slate-200">Operation</th>
                <th className="py-3 px-4 border-l border-slate-200">Task</th>
                <th className="py-3 px-4 border-l border-slate-200">Workstation</th>
                <th className="py-3 px-4 border-l border-slate-200">Qty</th>
                <th className="py-3 px-4 border-l border-slate-200">Assigned</th>
                <th className="py-3 px-4 border-l border-slate-200">Status</th>
                <th className="py-3 px-4 border-l border-slate-200">Start Time</th>
                <th className="py-3 px-4 border-l border-slate-200">End Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <BarChart2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                    <p className="font-bold text-slate-600">No Job Cards Found</p>
                    <p className="text-xs mt-1">Submit Work Orders and define routing operations to generate job cards.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((j, idx) => {
                  const status = (j.status || "PENDING").toUpperCase();
                  const cfg = TASK_CONFIG[j.taskCategory] || TASK_CONFIG["Stitching"];
                  return (
                    <tr key={`${j.woId}-${j.opIndex}-${idx}`} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3 px-4 border-l border-slate-100 font-mono font-bold text-indigo-600 text-xs">{j.woId}</td>
                      <td className="py-3 px-4 border-l border-slate-100 font-semibold text-slate-800">{j.woProduct}</td>
                      <td className="py-3 px-4 border-l border-slate-100 text-slate-700">{j.name}</td>
                      <td className="py-3 px-4 border-l border-slate-100">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                          {cfg.icon} {j.taskCategory}
                        </span>
                      </td>
                      <td className="py-3 px-4 border-l border-slate-100 text-xs text-slate-500 font-semibold">{j.workstationType || "—"}</td>
                      <td className="py-3 px-4 border-l border-slate-100 text-xs font-bold text-slate-700 tabular-nums">
                        {j.missingBom ? (
                          <div className="text-[10px] text-amber-600 font-semibold leading-tight">
                            ? Mtr<br/><span className="text-slate-400 font-normal">({j.woQty} pcs req. BOM)</span>
                          </div>
                        ) : (
                          <div>{j.qtyUnit === "Mtr" ? j.qtyValue.toFixed(1) : j.qtyValue} {j.qtyUnit}</div>
                        )}
                        {j.completedQuantity ? <div className="text-emerald-600 mt-0.5 text-[10px]">{j.completedQuantity} {j.qtyUnit === "Mtr" ? "mtr" : "pcs"} done</div> : null}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-100 text-xs text-slate-500">{j.assignedTo || <span className="italic text-slate-300">Unassigned</span>}</td>
                      <td className="py-3 px-4 border-l border-slate-100">
                        {status === "COMPLETED" ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            <CheckCircle2 className="w-3 h-3" /> Done
                          </span>
                        ) : status === "IN_PROGRESS" ? (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            <Timer className="w-3 h-3" /> WIP
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 border border-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-100 text-[11px] text-slate-400 font-mono">
                        {j.startedAt ? new Date(j.startedAt).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 px-4 border-l border-slate-100 text-[11px] text-slate-400 font-mono">
                        {j.completedAt ? new Date(j.completedAt).toLocaleString([], { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
