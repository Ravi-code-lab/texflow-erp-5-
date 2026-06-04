import React from "react";
import {
  Play,
  Square,
  UserPlus,
  CheckCircle2,
  Factory,
  History,
  Timer,
  DollarSign,
  Activity,
} from "lucide-react";

interface WorkOrderJobCardsProps {
  operations: any[];
  singleOpIndex?: number;
  activeTimerOpIndex: number | null;
  timerSeconds: number;
  onStartTimer: (idx: number) => void;
  onStopTimer: () => void;
  karigars: any[];
  karigarAssignments: Record<number, string>;
  onAssignKarigar: (idx: number, id: string) => void;
  currency: string;
  qty: number;
  onSignOffOperation: (idx: number) => void;
  signedOffOps: Record<number, boolean>;
}

export const WorkOrderJobCards: React.FC<WorkOrderJobCardsProps> = ({
  operations,
  singleOpIndex,
  activeTimerOpIndex,
  timerSeconds,
  onStartTimer,
  onStopTimer,
  karigars,
  karigarAssignments,
  onAssignKarigar,
  currency,
  qty,
  onSignOffOperation,
  signedOffOps,
}) => {
  const opsToRender =
    singleOpIndex !== undefined && singleOpIndex !== null
      ? [{ op: operations[singleOpIndex], originalIndex: singleOpIndex }]
      : operations.map((op, i) => ({ op, originalIndex: i }));

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hrs > 0)
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (opsToRender.length === 0) {
    return (
      <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
        <h4 className="font-extrabold text-slate-800 text-sm mb-2">
          No Operations Found
        </h4>
        <p className="text-slate-500 text-xs font-medium max-w-md mx-auto">
          This work order does not have any routing operations. Edit the work
          order to add tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {opsToRender.map(({ op, originalIndex: idx }) => {
        const isTimerRunning = activeTimerOpIndex === idx;
        const assignedKarigarId = karigarAssignments[idx];
        const initialKarigar = karigars.find((k) => k.id === assignedKarigarId);
        const isCompleted = signedOffOps[idx];

        return (
          <div
            key={idx}
            className={`bg-white rounded-xl shadow-sm border overflow-hidden ${isCompleted ? "border-emerald-200" : "border-[#d1d8dd]"}`}
          >
            {/* Task Header Context */}
            <div
              className={`p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 border-b ${isCompleted ? "bg-emerald-50/30 border-emerald-100" : "bg-slate-50/50 border-slate-100"}`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase ${isCompleted ? "bg-emerald-100 text-emerald-700" : "bg-[#1b6bf9]/10 text-[#1b6bf9]"}`}
                  >
                    Operation {idx + 1}
                  </span>
                  {isTimerRunning && (
                    <span className="flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold animate-pulse">
                      <Activity className="w-3 h-3" /> In Progress
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Signed Off
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {op.name}
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5 flex items-center gap-1">
                  <Factory className="w-3.5 h-3.5" /> Workspace:{" "}
                  {op.workstation || "General Plant"}
                </p>
              </div>

              <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 flex flex-col items-end shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Base Rate
                </span>
                <span className="text-sm font-black text-emerald-600 font-mono flex items-center">
                  <DollarSign className="w-3.5 h-3.5 opacity-60 mr-0.5" />
                  {op.rate ? `${op.rate}/pc` : "Variable"}
                </span>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Work Details & Assignment */}
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    <UserPlus className="w-3.5 h-3.5 text-indigo-500" /> Assign
                    Worker (Karigar)
                  </label>
                  <select
                    value={assignedKarigarId || ""}
                    onChange={(e) => onAssignKarigar(idx, e.target.value)}
                    disabled={isCompleted || isTimerRunning}
                    className="w-full text-sm font-bold border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60 disabled:bg-slate-50"
                  >
                    <option value="">-- Assign a worker (Optional) --</option>
                    {karigars.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.skills.join(", ")})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Target Quantity
                    </span>
                    <span className="font-mono text-lg font-black text-slate-800">
                      {qty.toLocaleString()}{" "}
                      <span className="text-sm">PCS</span>
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
                      Effort EST.
                    </span>
                    <span className="font-mono text-lg font-black text-slate-800">
                      {op.time || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timer & Controls */}
              <div className="bg-[#f4f5f6] border border-slate-200 rounded-lg p-5 flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-slate-800">
                  <Timer className="w-32 h-32" />
                </div>

                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Time Tracking
                    </h4>
                    <div className="font-mono text-4xl font-extrabold text-slate-800 mt-1 tracking-tight">
                      {isTimerRunning ? formatTime(timerSeconds) : "00:00"}
                    </div>
                  </div>
                  {isTimerRunning && (
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                    </span>
                  )}
                </div>

                <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
                  {!isCompleted && (
                    <>
                      <button
                        onClick={() =>
                          isTimerRunning ? onStopTimer() : onStartTimer(idx)
                        }
                        disabled={
                          activeTimerOpIndex !== null && !isTimerRunning
                        }
                        className={`col-span-2 py-2.5 rounded justify-center font-bold text-xs flex items-center gap-2 transition-all ${
                          isTimerRunning
                            ? "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                            : activeTimerOpIndex !== null
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200"
                              : "bg-[#1b6bf9] hover:bg-blue-600 font-bold text-white shadow-sm"
                        }`}
                      >
                        {isTimerRunning ? (
                          <>
                            <Square className="w-3.5 h-3.5" /> Stop Timer & Save
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" /> Start Task Session
                          </>
                        )}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => onSignOffOperation(idx)}
                    disabled={isTimerRunning}
                    className={`col-span-2 py-2.5 rounded font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                      isCompleted
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {isCompleted
                      ? "Completed & Verified"
                      : "Mark Task as Completed"}
                  </button>
                </div>
              </div>
            </div>

            {/* Task Footer / Logs */}
            {isCompleted && (
              <div className="bg-emerald-50 border-t border-emerald-100 p-3 px-5 flex items-center gap-3">
                <History className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700">
                  Task logged and signed off. Ready for next workflow stage.
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
