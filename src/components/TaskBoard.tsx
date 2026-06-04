/**
 * TaskBoard.tsx  (Upgraded)
 *
 * A single smart TaskBoard used by ALL task pages:
 *   TaskPageCutting, TaskPageStitching, TaskPageEmbroidery,
 *   TaskPagePrinting, TaskPageWashing, TaskPageFinishing, TaskPagePacking
 *
 * Each task page just passes `taskName` and this board shows:
 *  - Department-specific quick-action fields
 *  - Karigar assignment
 *  - Qty tracking (completed / rejected)
 *  - Notes per job card
 *  - Status pipeline (PENDING → IN_PROGRESS → COMPLETED)
 *
 * Drop-in replacement: same props as the original TaskBoard.tsx
 */

import React, { useState, useMemo } from "react";
import {
  Search, X, Save, User,
  CheckCircle2, Clock, AlertCircle, PlayCircle,
  List, Plus, Check, Layers,
} from "lucide-react";
import type { ProductionJob as WorkOrder, Karigar } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskBoardProps {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars?: Karigar[];
}

type TabType = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ALL";

// ─── Department Config ────────────────────────────────────────────────────────
// Each department gets its own color, icon, and extra fields shown in the job card form.

interface DeptConfig {
  icon: string;
  color: string;         // Tailwind color name
  bgClass: string;
  borderClass: string;
  textClass: string;
  badgeBg: string;
  extraFields: ExtraField[];
}

interface ExtraField {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea";
  placeholder?: string;
  options?: string[];
  hint?: string;
}

const DEPT_CONFIG: Record<string, DeptConfig> = {
  Cutting: {
    icon: "✂️",
    color: "rose",
    bgClass: "bg-rose-50 dark:bg-rose-950/20",
    borderClass: "border-rose-200 dark:border-rose-800",
    textClass: "text-rose-700 dark:text-rose-300",
    badgeBg: "bg-rose-100 text-rose-700",
    extraFields: [
      { key: "fabricLot",   label: "Fabric Lot No.",  type: "text",   placeholder: "e.g. FAB-RED-001" },
      { key: "layers",      label: "No. of Layers",   type: "number", placeholder: "e.g. 8", hint: "How many fabric layers are being cut at once" },
      { key: "marker",      label: "Marker Length",   type: "text",   placeholder: "e.g. 2.5 mtr" },
      { key: "tableNo",     label: "Cutting Table",   type: "text",   placeholder: "e.g. Table 1" },
      { key: "wasteKg",     label: "Waste (kg)",      type: "number", placeholder: "0" },
    ],
  },
  Stitching: {
    icon: "🧵",
    color: "indigo",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/20",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    textClass: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-100 text-indigo-700",
    extraFields: [
      { key: "machineNo",   label: "Machine No.",      type: "text",   placeholder: "e.g. M-04" },
      { key: "stitchType",  label: "Stitch Type",      type: "select", options: ["Lock Stitch", "Chain Stitch", "Overlock", "Flat Lock", "Blind Stitch"] },
      { key: "threadColor", label: "Thread Color",     type: "text",   placeholder: "e.g. White 601" },
      { key: "targetPerHr", label: "Target / Hr",      type: "number", placeholder: "e.g. 50" },
    ],
  },
  Embroidery: {
    icon: "🌸",
    color: "violet",
    bgClass: "bg-violet-50 dark:bg-violet-950/20",
    borderClass: "border-violet-200 dark:border-violet-800",
    textClass: "text-violet-700 dark:text-violet-300",
    badgeBg: "bg-violet-100 text-violet-700",
    extraFields: [
      { key: "design",       label: "Embroidery Design",  type: "text",   placeholder: "e.g. Floral-A" },
      { key: "vendor",       label: "Vendor / Machine",   type: "text",   placeholder: "e.g. Ramesh EMB" },
      { key: "stitchCount",  label: "Stitch Count",       type: "number", placeholder: "e.g. 5000", hint: "Total stitches per piece" },
      { key: "colorCount",   label: "No. of Colors",      type: "number", placeholder: "e.g. 4" },
      { key: "sentQty",      label: "Sent to Vendor",     type: "number", placeholder: "0" },
      { key: "receivedQty",  label: "Received Back",      type: "number", placeholder: "0" },
    ],
  },
  Printing: {
    icon: "🖨️",
    color: "amber",
    bgClass: "bg-amber-50 dark:bg-amber-950/20",
    borderClass: "border-amber-200 dark:border-amber-800",
    textClass: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100 text-amber-700",
    extraFields: [
      { key: "printType",    label: "Print Type",         type: "select", options: ["Screen Print", "Digital Print", "Block Print", "Sublimation", "Transfer"] },
      { key: "colorCount",   label: "No. of Colors",      type: "number", placeholder: "e.g. 3" },
      { key: "inkLot",       label: "Ink / Dye Lot",      type: "text",   placeholder: "e.g. INK-BLK-01" },
      { key: "vendor",       label: "Printer Vendor",     type: "text",   placeholder: "e.g. Sai Printers" },
      { key: "dryTime",      label: "Drying Time (hrs)",  type: "number", placeholder: "e.g. 2" },
    ],
  },
  Washing: {
    icon: "🫧",
    color: "cyan",
    bgClass: "bg-cyan-50 dark:bg-cyan-950/20",
    borderClass: "border-cyan-200 dark:border-cyan-800",
    textClass: "text-cyan-700 dark:text-cyan-300",
    badgeBg: "bg-cyan-100 text-cyan-700",
    extraFields: [
      { key: "washType",     label: "Wash Type",          type: "select", options: ["Normal Wash", "Stone Wash", "Acid Wash", "Enzyme Wash", "Bleach Wash", "Dry Wash"] },
      { key: "vendor",       label: "Laundry Vendor",     type: "text",   placeholder: "e.g. AK Laundry" },
      { key: "temperature",  label: "Temp (°C)",          type: "number", placeholder: "e.g. 40" },
      { key: "shrinkage",    label: "Shrinkage %",        type: "number", placeholder: "e.g. 3" },
      { key: "sentQty",      label: "Sent to Vendor",     type: "number", placeholder: "0" },
      { key: "receivedQty",  label: "Received Back",      type: "number", placeholder: "0" },
    ],
  },
  Finishing: {
    icon: "✨",
    color: "emerald",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    textClass: "text-emerald-700 dark:text-emerald-300",
    badgeBg: "bg-emerald-100 text-emerald-700",
    extraFields: [
      { key: "ironing",      label: "Ironing Type",       type: "select", options: ["Steam Press", "Hand Iron", "Tunnel Finish", "None"] },
      { key: "buttonCheck",  label: "Button / Snap Check",type: "select", options: ["Done", "Pending", "N/A"] },
      { key: "labelAttach",  label: "Label Attached",     type: "select", options: ["Yes", "No", "Pending"] },
      { key: "qcPass",       label: "QC Pass Count",      type: "number", placeholder: "0" },
      { key: "qcFail",       label: "QC Fail Count",      type: "number", placeholder: "0" },
      { key: "alterationQty",label: "Sent for Alteration",type: "number", placeholder: "0" },
    ],
  },
  Packing: {
    icon: "📦",
    color: "sky",
    bgClass: "bg-sky-50 dark:bg-sky-950/20",
    borderClass: "border-sky-200 dark:border-sky-800",
    textClass: "text-sky-700 dark:text-sky-300",
    badgeBg: "bg-sky-100 text-sky-700",
    extraFields: [
      { key: "packType",     label: "Packing Type",       type: "select", options: ["Poly Bag", "Box", "Hanger", "Flat Pack", "Bulk"] },
      { key: "tagAttached",  label: "Price Tag",          type: "select", options: ["Attached", "Pending", "N/A"] },
      { key: "barcodeScanned", label: "Barcode Scan",     type: "select", options: ["Done", "Pending", "N/A"] },
      { key: "boxCount",     label: "No. of Boxes/Bags",  type: "number", placeholder: "0" },
      { key: "cartonNo",     label: "Carton No.",         type: "text",   placeholder: "e.g. CTN-001" },
    ],
  },
};

const DEFAULT_DEPT: DeptConfig = {
  icon: "🔧",
  color: "slate",
  bgClass: "bg-slate-50",
  borderClass: "border-slate-200",
  textClass: "text-slate-700",
  badgeBg: "bg-slate-100 text-slate-700",
  extraFields: [],
};

function getDept(taskName: string): DeptConfig {
  const key = Object.keys(DEPT_CONFIG).find(k => taskName.toLowerCase().includes(k.toLowerCase()));
  return key ? DEPT_CONFIG[key] : DEFAULT_DEPT;
}

// ─── Status styles ─────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string; icon: React.ElementType }> = {
  PENDING:     { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-300", label: "Pending",     icon: Clock },
  IN_PROGRESS: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300", label: "In Progress", icon: PlayCircle },
  COMPLETED:   { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", label: "Completed",  icon: CheckCircle2 },
};

// ─── Job Card Form ─────────────────────────────────────────────────────────────

function JobCardForm({
  task,
  dept,
  karigars,
  production,
  onSave,
  onCancel,
}: {
  task: any;
  dept: DeptConfig;
  karigars: Karigar[];
  production: WorkOrder[];
  onSave: (t: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(task);
  const isNew = !!task.isNew;
  const status = (form.status || "PENDING").toUpperCase();

  const set = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const setExtra = (key: string, val: any) => set({ customData: { ...(form.customData || {}), [key]: val } });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{dept.icon}</span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {isNew ? `New ${task.name || "Job Card"}` : `${task.name}`}
              </h2>
              {!isNew && (
                <p className="text-[11px] text-slate-500">WO: {form.woId} · {form.woProduct}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status actions */}
        <div className="flex items-center gap-2">
          {!isNew && status === "PENDING" && (
            <button onClick={() => set({ status: "IN_PROGRESS", startedAt: new Date().toISOString() })}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black shadow transition-colors">
              ▶ Start
            </button>
          )}
          {!isNew && status === "IN_PROGRESS" && (
            <button onClick={() => set({ status: "COMPLETED", completedAt: new Date().toISOString() })}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow transition-colors">
              ✓ Complete
            </button>
          )}
          <button onClick={() => onSave(form)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black shadow transition-colors">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-20">

        {/* Status pipeline */}
        {!isNew && (
          <div className={`flex items-center justify-between p-4 rounded-2xl border ${dept.borderClass} ${dept.bgClass}`}>
            {["PENDING", "IN_PROGRESS", "COMPLETED"].map((s, i) => {
              const st = STATUS_STYLE[s];
              const Icon = st.icon;
              const active = status === s;
              const done = (status === "IN_PROGRESS" && i === 0) || (status === "COMPLETED" && i <= 1);
              return (
                <React.Fragment key={s}>
                  <button
                    onClick={() => set({ status: s })}
                    className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-xl transition-all ${
                      active ? `${st.bg} ${st.text} font-black scale-105 shadow-sm` : done ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{st.label}</span>
                  </button>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-2 rounded-full ${done ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Work Order Reference (only for new) */}
        {isNew && (
          <FormSection title="Link to Work Order">
            <select
              value={form.woId || ""}
              onChange={e => {
                const wo = production.find(w => w.id === e.target.value);
                set({ woId: e.target.value, woProduct: wo?.productName, woQty: wo?.quantity });
              }}
              className="input w-full"
            >
              <option value="">-- Select Work Order --</option>
              {production.map(wo => (
                <option key={wo.id} value={wo.id}>{wo.id} — {wo.productName} ({wo.quantity} pcs)</option>
              ))}
            </select>
          </FormSection>
        )}

        {/* Production Output */}
        <FormSection title="Production Output">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Total Order</Label>
              <div className="input w-full bg-slate-50 dark:bg-slate-800 text-slate-500 cursor-default">{form.woQty || 0} pcs</div>
            </div>
            <div>
              <Label>Completed ✓</Label>
              <input type="number" min={0} className="input w-full bg-emerald-50 text-emerald-700 font-black"
                placeholder="0" value={form.completedQuantity || ""}
                onChange={e => set({ completedQuantity: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Rejected ✗</Label>
              <input type="number" min={0} className="input w-full bg-rose-50 text-rose-700 font-black"
                placeholder="0" value={form.rejectedQuantity || ""}
                onChange={e => set({ rejectedQuantity: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          {/* Visual completion bar */}
          {(form.woQty || 0) > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Completion</span>
                <span className="font-black">{form.woQty > 0 ? Math.round(((form.completedQuantity || 0) / form.woQty) * 100) : 0}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${form.woQty > 0 ? Math.min(100, Math.round(((form.completedQuantity || 0) / form.woQty) * 100)) : 0}%` }}
                />
              </div>
            </div>
          )}
        </FormSection>

        {/* Karigar Assignment */}
        {karigars.length > 0 && (
          <FormSection title="Assign Worker (Karigar)">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => set({ assignedTo: "" })}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm font-bold transition-all ${
                  !form.assignedTo ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-600 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-400"
                }`}
              >
                <User className="w-4 h-4" />
                <span className="text-xs">Unassigned</span>
              </button>
              {karigars.slice(0, 11).map(k => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => set({ assignedTo: k.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                    form.assignedTo === k.id ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-black dark:bg-indigo-950/30 dark:border-indigo-600 dark:text-indigo-300" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-black text-indigo-600 dark:text-indigo-300 shrink-0">
                    {k.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold truncate">{k.name}</span>
                </button>
              ))}
            </div>
          </FormSection>
        )}

        {/* Department-specific fields */}
        {dept.extraFields.length > 0 && (
          <FormSection title={`${task.name || "Department"} Details`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dept.extraFields.map(field => (
                <div key={field.key}>
                  <Label>{field.label}</Label>
                  {field.hint && <p className="text-[11px] text-slate-400 mb-1">{field.hint}</p>}
                  {field.type === "select" ? (
                    <select
                      className="input w-full"
                      value={(form.customData || {})[field.key] || ""}
                      onChange={e => setExtra(field.key, e.target.value)}
                    >
                      <option value="">-- Select --</option>
                      {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === "textarea" ? (
                    <textarea
                      className="input w-full resize-none"
                      rows={3}
                      placeholder={field.placeholder}
                      value={(form.customData || {})[field.key] || ""}
                      onChange={e => setExtra(field.key, e.target.value)}
                    />
                  ) : (
                    <input
                      type={field.type}
                      className="input w-full"
                      placeholder={field.placeholder}
                      value={(form.customData || {})[field.key] || ""}
                      onChange={e => setExtra(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {/* Notes */}
        <FormSection title="Notes">
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="Any instructions, observations, or remarks for this job card…"
            value={form.notes || form.customData?.notes || ""}
            onChange={e => set({ notes: e.target.value, customData: { ...(form.customData || {}), notes: e.target.value } })}
          />
        </FormSection>

        {/* Timestamps (read-only) */}
        {!isNew && (form.startedAt || form.completedAt) && (
          <FormSection title="Time Log">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {form.startedAt && (
                <div>
                  <Label>Started At</Label>
                  <div className="input bg-slate-50 dark:bg-slate-800 text-slate-500">{new Date(form.startedAt).toLocaleString()}</div>
                </div>
              )}
              {form.completedAt && (
                <div>
                  <Label>Completed At</Label>
                  <div className="input bg-slate-50 dark:bg-slate-800 text-slate-500">{new Date(form.completedAt).toLocaleString()}</div>
                </div>
              )}
            </div>
          </FormSection>
        )}
      </div>

      <style>{`
        .input {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          background: white;
          outline: none;
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .dark .input { background: #1e293b; color: #f1f5f9; border-color: #334155; }
        .input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{children}</label>;
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Job Card (list item) ──────────────────────────────────────────────────────

function JobCard({
  task,
  dept,
  karigars,
  onEdit,
  onQuickComplete,
}: {
  task: any;
  dept: DeptConfig;
  karigars: Karigar[];
  onEdit: (t: any) => void;
  onQuickComplete: (t: any) => void;
}) {
  const status = (task.status || "PENDING").toUpperCase();
  const st = STATUS_STYLE[status] || STATUS_STYLE.PENDING;
  const Icon = st.icon;
  const karigar = karigars.find(k => k.id === task.assignedTo);
  const completionPct = task.woQty > 0 ? Math.round((task.completedQuantity || 0) / task.woQty * 100) : 0;

  return (
    <div
      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer"
      onClick={() => onEdit(task)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg ${dept.bgClass} border ${dept.borderClass}`}>
            {dept.icon}
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm text-slate-800 dark:text-slate-100 truncate">{task.name}</p>
            <p className="text-[11px] text-slate-500 font-mono">WO: {task.woId} · {task.woProduct}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Quick complete button for pending/in-progress */}
          {status !== "COMPLETED" && (
            <button
              onClick={e => { e.stopPropagation(); onQuickComplete(task); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
              title="Mark Complete"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${st.bg} ${st.text}`}>
            <Icon className="w-3 h-3" />
            {st.label}
          </span>
        </div>
      </div>

      {/* Qty row */}
      <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
        <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {task.woQty || 0} pcs</span>
        {task.completedQuantity > 0 && (
          <span className="flex items-center gap-1 text-emerald-600 font-bold">
            <CheckCircle2 className="w-3 h-3" /> {task.completedQuantity} done
          </span>
        )}
        {task.rejectedQuantity > 0 && (
          <span className="flex items-center gap-1 text-rose-500 font-bold">
            <AlertCircle className="w-3 h-3" /> {task.rejectedQuantity} rejected
          </span>
        )}
        {karigar && (
          <span className="flex items-center gap-1 text-indigo-600 font-bold ml-auto">
            <User className="w-3 h-3" /> {karigar.name}
          </span>
        )}
      </div>

      {/* Completion bar */}
      {task.woQty > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${completionPct >= 80 ? "bg-emerald-500" : completionPct >= 40 ? "bg-amber-400" : "bg-rose-400"}`}
              style={{ width: `${Math.min(100, completionPct)}%` }}
            />
          </div>
          <span className="text-[10px] font-black text-slate-400">{completionPct}%</span>
        </div>
      )}

      {/* Department-specific quick data preview */}
      {task.customData && Object.keys(task.customData).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(task.customData).slice(0, 3).map(([k, v]) => v ? (
            <span key={k} className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-slate-800 text-[10px] text-slate-500 border border-slate-100 dark:border-slate-700">
              {k}: <strong>{String(v)}</strong>
            </span>
          ) : null)}
        </div>
      )}

      {(task.notes || task.customData?.notes) && (
        <p className="mt-2 text-[11px] text-slate-400 italic line-clamp-1">{task.notes || task.customData?.notes}</p>
      )}
    </div>
  );
}

// ─── Main TaskBoard ────────────────────────────────────────────────────────────

export default function TaskBoard({
  taskName,
  production,
  onUpdateWorkOrder,
  karigars = [],
}: TaskBoardProps) {
  const dept = getDept(taskName);
  const [activeTab, setActiveTab] = useState<TabType>("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"LIST" | "KANBAN">("LIST");

  // Extract all operations matching this task dept from all work orders
  const allTasks = useMemo(() => {
    return production.flatMap(wo => {
      if (!wo.operations) return [];
      return wo.operations
        .map((op, idx) => ({
          ...op,
          woId: wo.id,
          woQty: wo.quantity,
          woProduct: wo.productName,
          woProgress: wo.progress,
          opIndex: idx,
        }))
        .filter(op => {
          const tl = taskName.toLowerCase();
          return (
            op.name.toLowerCase().includes(tl) ||
            (op.stage || "").toLowerCase().includes(tl) ||
            (op.workstationType || "").toLowerCase().includes(tl)
          );
        });
    });
  }, [production, taskName]);

  // Tab counts
  const counts = useMemo(() => ({
    PENDING:     allTasks.filter(t => (t.status || "PENDING").toUpperCase() === "PENDING").length,
    IN_PROGRESS: allTasks.filter(t => (t.status || "").toUpperCase() === "IN_PROGRESS").length,
    COMPLETED:   allTasks.filter(t => (t.status || "").toUpperCase() === "COMPLETED").length,
    ALL:         allTasks.length,
  }), [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      const status = (t.status || "PENDING").toUpperCase();
      if (activeTab !== "ALL" && status !== activeTab) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return t.woId?.toLowerCase().includes(q) || t.woProduct?.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allTasks, activeTab, searchTerm]);

  // Save handler
  const handleSave = (updatedTask: any) => {
    const wo = production.find(w => w.id === updatedTask.woId);
    if (!wo) return;

    let newOps = (wo.operations || []).map((op, i) =>
      i === updatedTask.opIndex ? {
        ...op,
        status: updatedTask.status,
        completedQuantity: updatedTask.completedQuantity,
        rejectedQuantity: updatedTask.rejectedQuantity,
        assignedTo: updatedTask.assignedTo,
        startedAt: updatedTask.startedAt,
        completedAt: updatedTask.completedAt,
        customData: { ...(op.customData || {}), ...updatedTask.customData, notes: updatedTask.notes },
      } : op
    );

    // If it's a new op being created
    if (updatedTask.isNew && updatedTask.woId) {
      newOps = [...(wo.operations || []), {
        id: `OP-${Date.now()}`,
        name: taskName,
        stage: taskName.toUpperCase(),
        processType: "IN_HOUSE" as const,
        workstationType: taskName,
        plannedHours: 4,
        qualityCheckpoint: false,
        status: updatedTask.status || "PENDING",
        completedQuantity: updatedTask.completedQuantity || 0,
        rejectedQuantity: updatedTask.rejectedQuantity || 0,
        assignedTo: updatedTask.assignedTo,
        customData: { ...(updatedTask.customData || {}), notes: updatedTask.notes },
      }];
    }

    const completedOps = newOps.filter(o => (o.status || "").toUpperCase() === "COMPLETED").length;
    const progress = newOps.length > 0 ? Math.round((completedOps / newOps.length) * 100) : wo.progress || 0;

    // Auto-complete the work order when every operation is done
    const allDone = newOps.length > 0 && completedOps === newOps.length;
    const newWoStatus = allDone ? "COMPLETED" : (completedOps > 0 ? "IN_PROGRESS" : (wo.status || "PLANNED"));

    onUpdateWorkOrder({ ...wo, operations: newOps, progress, status: newWoStatus, ...(allDone && !wo.completedAt ? { completedAt: new Date().toISOString() } : {}) });
    setEditingTask(null);
  };

  const handleQuickComplete = (task: any) => {
    handleSave({ ...task, status: "COMPLETED", completedAt: new Date().toISOString(), completedQuantity: task.completedQuantity || task.woQty });
  };

  // Show form view
  if (editingTask) {
    return (
      <JobCardForm
        task={editingTask}
        dept={dept}
        karigars={karigars}
        production={production}
        onSave={handleSave}
        onCancel={() => setEditingTask(null)}
      />
    );
  }

  // ── List view
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-5">

      {/* Header */}
      <div className={`flex items-center justify-between p-4 rounded-2xl border ${dept.borderClass} ${dept.bgClass}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{dept.icon}</span>
          <div>
            <h1 className={`text-xl font-black ${dept.textClass}`}>{taskName} Department</h1>
            <p className="text-xs text-slate-500">{counts.ALL} job cards · {counts.PENDING} pending</p>
          </div>
        </div>
        <button
          onClick={() => {
            // Find first available WO to pre-fill
            const firstWo = production[0];
            setEditingTask({
              isNew: true,
              name: taskName,
              status: "PENDING",
              woId: firstWo?.id || "",
              woQty: firstWo?.quantity || 0,
              woProduct: firstWo?.productName || "",
            });
          }}
          className={`flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border ${dept.borderClass} ${dept.textClass} rounded-xl text-xs font-black shadow-sm hover:shadow transition-all`}
        >
          <Plus className="w-4 h-4" />
          New Job Card
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 transition-colors"
          placeholder={`Search ${taskName} job cards…`}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 w-fit">
        {(["PENDING", "IN_PROGRESS", "COMPLETED", "ALL"] as TabType[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
              activeTab === tab
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.replace("_", " ")}
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${activeTab === tab ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Job Card List */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <span className="text-5xl mb-3 opacity-30">{dept.icon}</span>
          <p className="font-bold text-base">No {activeTab.toLowerCase().replace("_", " ")} job cards</p>
          <p className="text-sm mt-1">
            {activeTab === "PENDING" ? "All caught up! No pending work." : `No jobs in ${activeTab.toLowerCase().replace("_", " ")} status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task, i) => (
            <JobCard
              key={`${task.woId}-${task.opIndex}-${i}`}
              task={task}
              dept={dept}
              karigars={karigars}
              onEdit={setEditingTask}
              onQuickComplete={handleQuickComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
