/**
 * PipelineStrip.tsx — Cross-department pipeline visualisation component
 *
 * Shows where a Work Order sits in the full garment manufacturing pipeline.
 * Used in:
 *  - Job card detail form header (full strip)
 *  - Kanban card footer (compact mini strip)
 *  - DeptTaskPage WIP overview (route progress per WO)
 */

import React, { useMemo } from "react";
import { CheckCircle2, Clock, Lock, ArrowRight, AlertTriangle } from "lucide-react";
import { computePipelineProgress, type PipelineProgress } from "./pipelineWiring";

// ─── Full Pipeline Strip (for detail form header) ──────────────────────────────

interface PipelineStripProps {
  operations: any[];
  currentDept?: string; // highlight this dept
  compact?: boolean;    // compact mode for kanban cards
  className?: string;
}

export function PipelineStrip({ operations, currentDept, compact = false, className = "" }: PipelineStripProps) {
  const progress = useMemo(() => computePipelineProgress(operations), [operations]);

  if (progress.route.length === 0) return null;

  if (compact) {
    return <CompactPipelineStrip progress={progress} currentDept={currentDept} className={className} />;
  }

  return <FullPipelineStrip progress={progress} currentDept={currentDept} className={className} />;
}

// ─── Full strip ─────────────────────────────────────────────────────────────

function FullPipelineStrip({
  progress,
  currentDept,
  className,
}: {
  progress: PipelineProgress;
  currentDept?: string;
  className: string;
}) {
  const { route, overallPct, completedCount } = progress;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${overallPct}%`,
              background: overallPct === 100
                ? "#10b981"
                : overallPct > 50
                ? "#f59e0b"
                : "#3b82f6",
            }}
          />
        </div>
        <span className="text-[10px] font-black text-slate-500 shrink-0 tabular-nums">
          {completedCount}/{route.length} stages · {overallPct}%
        </span>
      </div>

      {/* Stage pills */}
      <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
        {route.map((r, idx) => {
          const isCurrent = currentDept
            ? r.stage.dept.toLowerCase() === currentDept.toLowerCase()
            : r.isActive;

          const dotColor = r.isCompleted
            ? "bg-emerald-500"
            : r.isActive
            ? "bg-amber-400 animate-pulse"
            : r.isBlocked
            ? "bg-slate-300 dark:bg-slate-600"
            : "bg-blue-400";

          const textColor = r.isCompleted
            ? "text-emerald-600 dark:text-emerald-400"
            : isCurrent
            ? "text-amber-700 dark:text-amber-300 font-black"
            : r.isBlocked
            ? "text-slate-400 dark:text-slate-500"
            : "text-slate-500 dark:text-slate-400";

          const bgColor = isCurrent
            ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
            : r.isCompleted
            ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
            : r.isBlocked
            ? "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700";

          return (
            <React.Fragment key={r.stage.id}>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-bold whitespace-nowrap transition-all ${bgColor} ${textColor} ${isCurrent ? "shadow-sm scale-105" : ""}`}
                title={r.stage.label + (r.isBlocked ? ` — blocked by upstream` : r.isCompleted ? " — done" : r.isActive ? " — in progress" : "")}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                <span className="hidden sm:inline">{r.stage.icon}</span>
                <span>{r.stage.label}</span>
                {r.isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                {r.isBlocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                {isCurrent && !r.isCompleted && <Clock className="w-2.5 h-2.5 text-amber-500" />}
              </div>
              {idx < route.length - 1 && (
                <ArrowRight className="w-3 h-3 text-slate-200 dark:text-slate-700 shrink-0 mx-0.5" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ─── Compact mini strip (for kanban cards / list rows) ────────────────────────

function CompactPipelineStrip({
  progress,
  currentDept,
  className,
}: {
  progress: PipelineProgress;
  currentDept?: string;
  className: string;
}) {
  const { route, overallPct, completedCount } = progress;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Dot trail */}
      <div className="flex items-center gap-0.5">
        {route.map((r, idx) => {
          const isCurrent = currentDept
            ? r.stage.dept.toLowerCase() === currentDept.toLowerCase()
            : r.isActive;

          return (
            <React.Fragment key={r.stage.id}>
              <div
                className={`rounded-full transition-all ${
                  r.isCompleted
                    ? "w-2 h-2 bg-emerald-500"
                    : isCurrent
                    ? "w-2.5 h-2.5 bg-amber-400 ring-2 ring-amber-200 dark:ring-amber-800"
                    : r.isBlocked
                    ? "w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600"
                    : "w-1.5 h-1.5 bg-blue-300 dark:bg-blue-700"
                }`}
                title={r.stage.label}
              />
              {idx < route.length - 1 && (
                <div className={`h-px w-2 ${r.isCompleted ? "bg-emerald-300" : "bg-slate-200 dark:bg-slate-700"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Current stage label */}
      <span className="text-[9px] text-slate-400 font-semibold shrink-0">
        {completedCount}/{route.length}
      </span>
    </div>
  );
}

// ─── WO Route card (used in DeptTaskPage WIP view) ────────────────────────────

interface WORouteSummaryProps {
  woId: string;
  productName: string;
  quantity: number;
  operations: any[];
  currentDept: string;
  onClick?: () => void;
}

export function WORouteSummary({
  woId,
  productName,
  quantity,
  operations,
  currentDept,
  onClick,
}: WORouteSummaryProps) {
  const progress = useMemo(() => computePipelineProgress(operations), [operations]);
  const thisRoute = progress.route.find(
    r => r.stage.dept.toLowerCase() === currentDept.toLowerCase()
  );

  const statusColor = thisRoute?.isCompleted
    ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20"
    : thisRoute?.isActive
    ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20"
    : thisRoute?.isBlocked
    ? "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
    : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20";

  return (
    <div
      className={`rounded-xl border p-3 transition-all hover:shadow-sm cursor-pointer ${statusColor}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{productName}</p>
          <p className="text-[9px] text-slate-500 font-mono">{woId} · {quantity.toLocaleString()} pcs</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {thisRoute?.isBlocked && (
            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full flex items-center gap-1">
              <Lock className="w-2 h-2" /> Blocked
            </span>
          )}
          {thisRoute?.isActive && !thisRoute.isCompleted && (
            <span className="text-[9px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
              Active
            </span>
          )}
          {thisRoute?.isCompleted && (
            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
              ✓ Done
            </span>
          )}
        </div>
      </div>

      <PipelineStrip operations={operations} currentDept={currentDept} compact />

      {/* Upstream / downstream summary */}
      {progress.route.length > 0 && (
        <div className="mt-2 flex items-center gap-1 text-[9px] text-slate-400 font-semibold overflow-hidden">
          {progress.route.map((r, idx) => {
            const isCurr = r.stage.dept.toLowerCase() === currentDept.toLowerCase();
            return (
              <React.Fragment key={r.stage.id}>
                <span className={isCurr ? "font-black text-amber-600 dark:text-amber-400" : ""}>
                  {r.stage.icon}
                </span>
                {idx < progress.route.length - 1 && (
                  <span className="text-slate-200 dark:text-slate-700">›</span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Pipeline unlock toast (shown when a dept completion unlocks next dept) ───

interface UnlockToastProps {
  unlockedDepts: string[];
  onDismiss: () => void;
}

export function UnlockToast({ unlockedDepts, onDismiss }: UnlockToastProps) {
  if (unlockedDepts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-slideUp">
      <div className="bg-emerald-600 text-white rounded-2xl shadow-xl px-5 py-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black">Pipeline Unlocked!</p>
          <p className="text-xs mt-0.5 opacity-90">
            Next dept{unlockedDepts.length > 1 ? "s are" : " is"} now ready to start:{" "}
            <strong>{unlockedDepts.join(", ")}</strong>
          </p>
        </div>
        <button onClick={onDismiss} className="opacity-70 hover:opacity-100 transition-opacity">
          ✕
        </button>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>
    </div>
  );
}

// ─── Route Template Picker (for new WO / Add Route dialog) ──────────────────

import { ROUTE_TEMPLATES, GARMENT_PIPELINE, type StageId } from "./pipelineWiring";

interface RoutePickerProps {
  selectedStages: StageId[];
  onChange: (stages: StageId[]) => void;
}

export function RoutePicker({ selectedStages, onChange }: RoutePickerProps) {
  const [mode, setMode] = React.useState<"template" | "custom">("template");

  const applyTemplate = (stages: StageId[]) => {
    onChange(stages);
    setMode("custom");
  };

  const toggleStage = (id: StageId) => {
    if (selectedStages.includes(id)) {
      onChange(selectedStages.filter(s => s !== id));
    } else {
      // Insert in pipeline order
      const pipelineOrder = GARMENT_PIPELINE.map(s => s.id);
      const next = [...selectedStages, id].sort(
        (a, b) => pipelineOrder.indexOf(a) - pipelineOrder.indexOf(b)
      );
      onChange(next);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        {(["template", "custom"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              mode === m
                ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm"
                : "text-slate-500"
            }`}
          >
            {m === "template" ? "Templates" : "Custom Route"}
          </button>
        ))}
      </div>

      {mode === "template" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ROUTE_TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => applyTemplate(t.stages)}
              className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all group"
            >
              <p className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {t.name}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{t.description}</p>
              <div className="flex items-center gap-0.5 mt-1.5 flex-wrap">
                {t.stages.map((id, i) => {
                  const stage = GARMENT_PIPELINE.find(s => s.id === id);
                  return (
                    <React.Fragment key={id}>
                      <span className="text-[9px] text-slate-500">{stage?.icon}</span>
                      {i < t.stages.length - 1 && (
                        <span className="text-[9px] text-slate-300">›</span>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      )}

      {mode === "custom" && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Toggle stages for this WO's route (pipeline order is enforced)
          </p>
          <div className="flex flex-wrap gap-2">
            {GARMENT_PIPELINE.map(stage => {
              const selected = selectedStages.includes(stage.id);
              return (
                <button
                  key={stage.id}
                  onClick={() => toggleStage(stage.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    selected
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  <span>{stage.icon}</span>
                  <span>{stage.label}</span>
                  {stage.isVendor && (
                    <span className="text-[8px] font-black bg-violet-100 text-violet-600 dark:bg-violet-900/30 px-1 rounded">
                      Vendor
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedStages.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                Your route ({selectedStages.length} stages)
              </p>
              <div className="flex items-center gap-1 flex-wrap">
                {selectedStages.map((id, i) => {
                  const stage = GARMENT_PIPELINE.find(s => s.id === id);
                  return (
                    <React.Fragment key={id}>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {stage?.icon} {stage?.label}
                      </span>
                      {i < selectedStages.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
