/**
 * WorkOrderPage.tsx  — Dynamic Routing Edition
 *
 * Work Orders now use style-wise routing templates.
 * Current stage is derived from the routing steps progress — not a fixed status field.
 * Each department only advances their own step; next step unlocks after previous is done.
 */

import React, { useState, useMemo, useEffect } from "react";
import { uuidShort } from "../utils/uuid";
import {
  Plus, Search, ChevronRight, Package, Calendar, Hash,
  Layers, CheckCircle2, Clock, AlertCircle, PlayCircle,
  Edit2, Trash2, X, Save, ArrowLeft, Settings2, Lock,
  ArrowRight, CheckCheck, RefreshCw, GitBranch, Wrench, ShoppingCart
} from "lucide-react";
import type { ProductionJob, Karigar, Design, Order, InventoryItem, Machine, SampleRequest, GarmentRoutingTemplate, GarmentWorkOrderOperation } from "../types";
import { DEFAULT_ROUTING_TEMPLATES, getProcessMeta, ROUTING_STORAGE_KEY } from "./work-orders/RoutingMaster";
import { getItem } from "../utils/networkClient";
import ProductImageThumb, { resolveProductImage } from "./ProductImageThumb";
import { toast } from "../utils/toast";
import { WorkOrderPrintDesk } from "./work-orders/WorkOrderPrintDesk";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkOrderPageProps {
  jobs: ProductionJob[];
  karigars?: Karigar[];
  designs?: Design[];
  inventory?: InventoryItem[];
  machines?: Machine[];
  samples?: SampleRequest[];
  orders?: Order[];
  onAddJob: (job: ProductionJob) => void;
  onUpdateJob: (job: ProductionJob) => void;
  onDeleteJob?: (id: string) => void;
  onAction?: (action: string, data: any) => void;
  currency?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITIES = ["LOW", "NORMAL", "HIGH"] as const;
const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

const PRIORITY_STYLE: Record<string, string> = {
  HIGH:   "bg-red-50 text-red-600",
  NORMAL: "bg-amber-50 text-amber-600",
  LOW:    "bg-slate-50 text-slate-500",
};

const STEP_STATUS_STYLE = {
  COMPLETED:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  IN_PROGRESS: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PENDING:     "bg-slate-50 text-slate-400 border-slate-200",
  SKIPPED:     "bg-slate-50 text-slate-300 border-slate-100",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId() { return `WO-${uuidShort(12)}`; }
function totalSizes(sw: Record<string, number> = {}) {
  return Object.values(sw).reduce((s, v) => s + (Number(v) || 0), 0);
}

/** Derives the current stage label from routing steps */
function getCurrentStage(ops: GarmentWorkOrderOperation[]): string {
  if (!ops || ops.length === 0) return "—";
  const inProg = ops.find(o => o.status === "IN_PROGRESS");
  if (inProg) return getProcessMeta(inProg.stage).label;
  const pending = ops.find(o => o.status === "PENDING");
  if (pending) return getProcessMeta(pending.stage).label;
  const allDone = ops.every(o => o.status === "COMPLETED" || o.status === "SKIPPED");
  if (allDone) return "Ready";
  return "—";
}

/** Returns stage string for status-based filters */
function getActiveStageId(ops: GarmentWorkOrderOperation[]): string {
  if (!ops || ops.length === 0) return "NO_ROUTE";
  const inProg = ops.find(o => o.status === "IN_PROGRESS");
  if (inProg) return inProg.stage;
  const pending = ops.find(o => o.status === "PENDING");
  if (pending) return pending.stage;
  return "READY";
}

function makeOperationsFromTemplate(template: GarmentRoutingTemplate): GarmentWorkOrderOperation[] {
  return template.operations.map((op, i) => ({
    ...op,
    id: `${op.id}-${Date.now()}-${i}`,
    status: i === 0 ? "PENDING" : "PENDING",
    completedQuantity: 0,
    rejectedQuantity: 0,
  }));
}

function progressPercent(ops: GarmentWorkOrderOperation[]): number {
  if (!ops || ops.length === 0) return 0;
  const done = ops.filter(o => o.status === "COMPLETED" || o.status === "SKIPPED").length;
  return Math.round((done / ops.length) * 100);
}

function progressColor(p: number) {
  if (p >= 80) return "bg-emerald-500";
  if (p >= 40) return "bg-amber-400";
  return "bg-rose-400";
}

// ─── Routing Steps Viewer (inline on card) ───────────────────────────────────

function RouteStepsBar({ ops }: { ops: GarmentWorkOrderOperation[] }) {
  if (!ops || ops.length === 0) return (
    <span className="text-[10px] text-slate-400 italic">No route assigned</span>
  );
  return (
    <div className="flex items-center gap-0.5 flex-wrap mt-1">
      {ops.map((op, i) => {
        const meta = getProcessMeta(op.stage);
        const isDone = op.status === "COMPLETED" || op.status === "SKIPPED";
        const isActive = op.status === "IN_PROGRESS";
        return (
          <React.Fragment key={op.id}>
            <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border whitespace-nowrap transition-all ${
              isDone    ? "bg-emerald-50 text-emerald-600 border-emerald-200 opacity-70" :
              isActive  ? `${meta.bg} ${meta.color} ${meta.border} ring-1 ring-current` :
                          "bg-slate-50 text-slate-300 border-slate-100"
            }`}>
              {isDone ? <CheckCircle2 className="w-2.5 h-2.5" /> : <span>{meta.icon}</span>}
              <span className="hidden sm:inline">{op.name}</span>
            </div>
            {i < ops.length - 1 && (
              <ArrowRight className={`w-2.5 h-2.5 shrink-0 ${isDone ? "text-emerald-300" : "text-slate-200"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Work Order Form ──────────────────────────────────────────────────────────

function WorkOrderForm({
  initial, designs, orders, samples, templates, onSave, onCancel, currency,
}: {
  initial: Partial<ProductionJob>;
  designs: Design[];
  orders: Order[];
  samples: SampleRequest[];
  templates: GarmentRoutingTemplate[];
  onSave: (data: ProductionJob) => void;
  onCancel: () => void;
  currency: string;
}) {
  const [form, setForm] = useState<Partial<ProductionJob>>(initial);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    initial.routingTemplateId || (templates[0]?.id ?? "")
  );
  const isEdit = !!initial.id;

  const set = (patch: Partial<ProductionJob>) => setForm(f => ({ ...f, ...patch }));

  const handleSizeChange = (size: string, val: string) => {
    const sizeWise = { ...form.sizeWise, [size]: Number(val) || 0 };
    set({ sizeWise, quantity: totalSizes(sizeWise) });
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    // Only auto-assign operations if creating new or no operations yet
    if (!isEdit || !form.operations?.length) {
      const tpl = templates.find(t => t.id === templateId);
      if (tpl) {
        set({ routingTemplateId: templateId, operations: makeOperationsFromTemplate(tpl) });
        // Auto-fill deadline from start date + cumulative planned hours
        autoFillDeadline(form.startDate, tpl);
      }
    } else {
      set({ routingTemplateId: templateId });
    }
  };

  const autoFillDeadline = (startDate: string | undefined, tpl: GarmentRoutingTemplate) => {
    if (!startDate || !tpl) return;
    const totalHours = tpl.operations.reduce((s, op) => s + (op.plannedHours || 0), 0);
    const workingHrsPerDay = 8;
    const calendarDays = Math.ceil(totalHours / workingHrsPerDay);
    const deadline = new Date(startDate);
    deadline.setDate(deadline.getDate() + calendarDays);
    set({ deadline: deadline.toISOString().split("T")[0] });
  };

  // Per-dept estimated dates based on cumulative planned hours from start date
  const deptSchedule = useMemo(() => {
    const tpl = templates.find(t => t.id === selectedTemplateId);
    if (!tpl || !form.startDate) return [];
    let cumHours = 0;
    const workHrsPerDay = 8;
    // Group ops by stage/dept
    const seen = new Map<string, { dept: string; hours: number; startDay: number; endDay: number }>();
    for (const op of tpl.operations) {
      const dept = op.workstationType || op.stage;
      if (!seen.has(dept)) {
        seen.set(dept, { dept, hours: 0, startDay: Math.floor(cumHours / workHrsPerDay), endDay: 0 });
      }
      seen.get(dept)!.hours += op.plannedHours || 0;
    }
    // Re-derive start/end days sequentially
    let cursor = 0;
    const result: { dept: string; startDate: string; endDate: string; hours: number }[] = [];
    for (const [, entry] of seen) {
      const start = new Date(form.startDate!);
      start.setDate(start.getDate() + Math.floor(cursor / workHrsPerDay));
      cursor += entry.hours;
      const end = new Date(form.startDate!);
      end.setDate(end.getDate() + Math.ceil(cursor / workHrsPerDay));
      result.push({
        dept: entry.dept,
        hours: entry.hours,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      });
    }
    return result;
  }, [selectedTemplateId, form.startDate, templates]);



  const handleSubmit = () => {
    if (!form.productName?.trim()) { toast.error("Please enter a product name."); return; }
    if (!form.quantity || form.quantity < 1) { toast.error("Quantity must be at least 1."); return; }
    const ops = form.operations?.length
      ? form.operations
      : selectedTemplateId
        ? makeOperationsFromTemplate(templates.find(t => t.id === selectedTemplateId)!)
        : [];
    onSave({
      ...form,
      id: form.id || genId(),
      status: getActiveStageId(ops),
      operations: ops,
      routingTemplateId: selectedTemplateId,
      progress: progressPercent(ops),
      createdAt: form.createdAt || new Date().toISOString(),
    } as ProductionJob);
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">
              {isEdit ? `Edit Work Order · ${form.id}` : "New Work Order"}
            </h1>
            <p className="text-xs text-slate-500">Fill in the details and assign a process route</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow transition-colors"
          >
            <Save className="w-4 h-4" />
            {isEdit ? "Update" : "Create Work Order"}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Section 1: Basic Info */}
        <FormSection title="Basic Information" icon={<Package className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FLabel>Product Name *</FLabel>
              <div className="flex items-center gap-3">
                <ProductImageThumb
                  productName={form.productName}
                  sku={form.styleCode}
                  designs={designs}
                  size="lg"
                  className="shrink-0"
                />
                <div className="flex-1">
                  {designs.length > 0 ? (
                    <select className="finput w-full" value={form.productName || ""} onChange={e => {
                      const d = designs.find(x => x.name === e.target.value);
                      set({ productName: e.target.value, styleCode: d?.sku || form.styleCode, imageUrl: d?.imageUrl || form.imageUrl });
                      // Auto-pick routing template based on design category
                      if (d?.routingTemplateId) handleTemplateChange(d.routingTemplateId);
                    }}>
                      <option value="">-- Select Product --</option>
                      {designs.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                    </select>
                  ) : (
                    <input className="finput w-full" placeholder="e.g. Zari Embroidered Kurti" value={form.productName || ""} onChange={e => set({ productName: e.target.value })} />
                  )}
                </div>
              </div>
            </div>
            <div>
              <FLabel>Style Code</FLabel>
              <input className="finput w-full" placeholder="e.g. KT-EMB-001" value={form.styleCode || ""} onChange={e => set({ styleCode: e.target.value })} />
            </div>
            <div>
              <FLabel>Color / Variant</FLabel>
              <input className="finput w-full" placeholder="e.g. Red, Navy Blue" value={form.color || ""} onChange={e => set({ color: e.target.value })} />
            </div>
            {orders.length > 0 && (
              <div>
                <FLabel>Link to Sales Order</FLabel>
                <select className="finput w-full" value={form.orderId || ""} onChange={e => set({ orderId: e.target.value })}>
                  <option value="">-- None --</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.id} — {o.customerName || "Customer"}</option>)}
                </select>
              </div>
            )}
          </div>
        </FormSection>

        {/* Section 2: Process Route */}
        <FormSection title="Process Route (Style-wise)" icon={<Settings2 className="w-4 h-4" />}>
          <p className="text-xs text-slate-500 mb-3">
            Select the routing template for this style. The process steps will be assigned based on the route.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {templates.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTemplateChange(t.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  selectedTemplateId === t.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-100">{t.name}</span>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">{t.category}</span>
                </div>
                <div className="flex flex-wrap gap-0.5">
                  {t.operations.map((op, i) => {
                    const meta = getProcessMeta(op.stage);
                    return (
                      <React.Fragment key={op.id}>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                          {meta.icon} {op.name}
                        </span>
                        {i < t.operations.length - 1 && <span className="text-slate-300 text-[9px]">›</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
              </button>
            ))}
          </div>

          {selectedTemplate && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 mb-1">
                Selected: {selectedTemplate.name} — {selectedTemplate.operations.length} steps
              </p>
              <div className="flex flex-wrap gap-1 items-center">
                {selectedTemplate.operations.map((op, i) => {
                  const meta = getProcessMeta(op.stage);
                  return (
                    <React.Fragment key={op.id}>
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color} ${meta.border}`}>
                        {meta.icon} {op.name}
                        {op.processType === "JOB_WORK" && <span className="opacity-60 text-[9px]">(Out)</span>}
                      </span>
                      {i < selectedTemplate.operations.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-indigo-300 shrink-0" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
          {/* Dept-wise Auto Date Schedule */}
          {deptSchedule.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Auto-Scheduled Dates (based on start date + planned hours)
              </p>
              <div className="space-y-2">
                {deptSchedule.map((d, i) => (
                  <div key={`${d.dept}-${i}`} className="flex items-center gap-3 text-xs">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    <span className="font-black text-slate-700 dark:text-slate-200 w-32 truncate">{d.dept}</span>
                    <span className="text-slate-500 font-mono">{d.startDate}</span>
                    <ArrowRight className="w-3 h-3 text-slate-300 shrink-0" />
                    <span className="text-slate-500 font-mono">{d.endDate}</span>
                    <span className="ml-auto text-slate-400 font-semibold">{d.hours}h planned</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-3">
                ⚡ Deadline auto-filled. Based on 8 working hrs/day. Adjust in Schedule section.
              </p>
            </div>
          )}
        </FormSection>

        {/* Section 3: Quantity */}
        <FormSection title="Quantity (Size-wise)" icon={<Layers className="w-4 h-4" />}>
          <p className="text-xs text-slate-500 mb-3">Enter pieces per size. Total auto-calculates.</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-3">
            {SIZES.map(size => (
              <div key={size}>
                <label className="block text-center text-[10px] font-black uppercase text-slate-400 mb-1">{size}</label>
                <input
                  type="number" min={0} className="finput w-full text-center font-bold" placeholder="0"
                  value={form.sizeWise?.[size] || ""}
                  onChange={e => handleSizeChange(size, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">Total Quantity</span>
            <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{form.quantity || 0} pcs</span>
          </div>
        </FormSection>

        {/* Section 4: Schedule */}
        <FormSection title="Schedule & Priority" icon={<Calendar className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <FLabel>Start Date</FLabel>
              <input type="date" className="finput w-full" value={form.startDate || ""} onChange={e => {
                set({ startDate: e.target.value });
                const tpl = templates.find(t => t.id === selectedTemplateId);
                if (tpl) autoFillDeadline(e.target.value, tpl);
              }} />
            </div>
            <div>
              <FLabel>Deadline</FLabel>
              <input type="date" className="finput w-full" value={form.deadline || ""} onChange={e => set({ deadline: e.target.value })} />
            </div>
            <div>
              <FLabel>Priority</FLabel>
              <div className="flex gap-2 mt-1">
                {PRIORITIES.map(p => (
                  <button
                    key={p} type="button" onClick={() => set({ priority: p })}
                    className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wide border transition-all ${
                      form.priority === p
                        ? p === "HIGH" ? "bg-red-500 text-white border-red-500"
                        : p === "NORMAL" ? "bg-amber-400 text-white border-amber-400"
                        : "bg-slate-500 text-white border-slate-500"
                        : "bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Section 5: Batch */}
        <FormSection title="Additional Details" icon={<Hash className="w-4 h-4" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FLabel>Batch / Lot No.</FLabel>
              <input className="finput w-full" placeholder="e.g. LOT-2024-001" value={form.batchNo || ""} onChange={e => set({ batchNo: e.target.value })} />
            </div>
            <div>
              <FLabel>Fabric Lot</FLabel>
              <input className="finput w-full" placeholder="e.g. FAB-RED-001" value={form.fabricLot || ""} onChange={e => set({ fabricLot: e.target.value })} />
            </div>
          </div>
        </FormSection>

      </div>

      <style>{`
        .finput {
          border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px;
          font-size: 14px; font-weight: 600; color: #1e293b; background: white;
          outline: none; transition: border-color 0.15s;
        }
        .dark .finput { background: #1e293b; color: #f1f5f9; border-color: #334155; }
        .finput:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
      `}</style>
    </div>
  );
}

// ─── Step Advance Modal (quick update current step) ───────────────────────────

function StepAdvanceModal({
  job, onUpdate, onClose
}: {
  job: ProductionJob;
  onUpdate: (j: ProductionJob) => void;
  onClose: () => void;
}) {
  const ops = job.operations || [];
  const [localOps, setLocalOps] = useState<GarmentWorkOrderOperation[]>(JSON.parse(JSON.stringify(ops)));

  const updateOp = (id: string, newStatus: GarmentWorkOrderOperation["status"]) => {
    setLocalOps(prev => {
      const opIndex = prev.findIndex(o => o.id === id);
      if (opIndex === -1) return prev;

      // Prevent advancing if prior steps are not completed
      const isTryingToProgress = newStatus !== "PENDING";
      if (isTryingToProgress) {
        for (let i = 0; i < opIndex; i++) {
          if (prev[i].status !== "COMPLETED" && prev[i].status !== "SKIPPED") {
            toast.warn("Please complete previous steps first. Cannot skip sequence.");
            return prev;
          }
        }
      }

      return prev.map((o, i) => {
        // Update the target step
        if (i === opIndex) {
          const u = { ...o, status: newStatus };
          if (newStatus === "IN_PROGRESS" && !o.startedAt) u.startedAt = new Date().toISOString();
          if (newStatus === "COMPLETED") u.completedAt = new Date().toISOString();
          return u;
        }

        // Cascade regression to subsequent steps
        if (i > opIndex && (newStatus === "PENDING" || newStatus === "IN_PROGRESS")) {
           return { ...o, status: "PENDING", startedAt: undefined, completedAt: undefined };
        }

        return o;
      });
    });
  };

  const handleSave = () => {
    const pct = progressPercent(localOps);
    const newStatus = getActiveStageId(localOps);
    onUpdate({ ...job, operations: localOps, progress: pct, status: newStatus });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-slate-900 flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <ProductImageThumb
              productName={job.productName}
              sku={job.styleCode}
              size="md"
            />
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Update Production Steps</h3>
              <p className="text-xs text-slate-500 mt-0.5">{job.id} — {job.productName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {localOps.map((op, i) => {
            const meta = getProcessMeta(op.stage);
            const prevDone = i === 0 || localOps[i - 1].status === "COMPLETED" || localOps[i - 1].status === "SKIPPED";
            const locked = !prevDone && op.status === "PENDING";
            return (
              <div key={op.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                op.status === "COMPLETED" ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800" :
                op.status === "IN_PROGRESS" ? `${meta.bg} ${meta.border}` :
                locked ? "bg-slate-50 border-slate-100 opacity-50" :
                "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700"
              }`}>
                {/* Step icon */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${
                  op.status === "COMPLETED" ? "bg-emerald-500 text-white" :
                  op.status === "IN_PROGRESS" ? `${meta.bg} ${meta.color}` :
                  "bg-slate-100 text-slate-400"
                }`}>
                  {op.status === "COMPLETED" ? <CheckCheck className="w-4 h-4" /> :
                   locked ? <Lock className="w-3.5 h-3.5" /> :
                   <span>{meta.icon}</span>}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{op.name}</span>
                    {op.processType === "JOB_WORK" && (
                      <span className="text-[9px] font-black bg-amber-100 text-amber-600 px-1 rounded">JOB WORK</span>
                    )}
                    {op.qualityCheckpoint && (
                      <span className="text-[9px] font-black bg-green-100 text-green-600 px-1 rounded">QC</span>
                    )}
                    {(op.ratePerPiece || 0) > 0 && (
                      <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">
                        ₹{op.ratePerPiece}{op.rateUnit === "PER_HOUR" ? "/hr" : op.rateUnit === "PER_METER" ? "/mtr" : "/pc"}
                        {op.rateUnit === "PER_PIECE" && job.quantity > 0 && (
                          <span className="opacity-60 ml-1">= ₹{((op.ratePerPiece || 0) * (Number(job.quantity) || 0)).toLocaleString()} total</span>
                        )}
                      </span>
                    )}
                  </div>
                  {op.completedAt && (
                    <p className="text-[10px] text-slate-400 mt-0.5">Completed: {new Date(op.completedAt).toLocaleDateString()}</p>
                  )}
                </div>

                {/* Status buttons */}
                {!locked && (
                  <div className="flex gap-1 shrink-0">
                    {(["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateOp(op.id, s)}
                        title={s}
                        className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all border ${
                          op.status === s
                            ? s === "COMPLETED" ? "bg-emerald-500 text-white border-emerald-500"
                            : s === "IN_PROGRESS" ? "bg-indigo-500 text-white border-indigo-500"
                            : s === "SKIPPED" ? "bg-slate-400 text-white border-slate-400"
                            : "bg-slate-600 text-white border-slate-600"
                            : "bg-white dark:bg-slate-700 text-slate-400 border-slate-200 dark:border-slate-600 hover:border-slate-400"
                        }`}
                      >
                        {s === "PENDING" ? "⏳" : s === "IN_PROGRESS" ? "▶" : s === "COMPLETED" ? "✓" : "⊘"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-4 border-t border-slate-100 dark:border-slate-800">
          {/* Operation cost summary */}
          {localOps.some(o => (o.ratePerPiece || 0) > 0) && (
            <div className="mb-3 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100">
              <p className="text-[10px] font-black uppercase text-indigo-500 mb-1.5">Operation Cost — {job.quantity} pcs</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                {localOps.filter(o => (o.ratePerPiece || 0) > 0).map(o => (
                  <div key={o.id} className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500">{o.name}:</span>
                    <span className="font-black text-indigo-700 font-mono">
                      ₹{((o.ratePerPiece || 0) * (o.rateUnit === "PER_PIECE" ? (Number(job.quantity) || 0) : 1)).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-indigo-200">
                <span className="text-[11px] font-black text-slate-700">Total Operation Cost</span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  ₹{localOps.reduce((s, o) => s + (o.ratePerPiece || 0) * (o.rateUnit === "PER_PIECE" ? (Number(job.quantity) || 0) : 1), 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Save Progress
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny Helpers ─────────────────────────────────────────────────────────────

function FLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{children}</label>;
}

function FormSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
        <span className="text-indigo-500">{icon}</span>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`flex flex-col items-center justify-center px-5 py-3 rounded-xl border ${color}`}>
      <span className="text-2xl font-black leading-none">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">{label}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const EMPTY_FORM: Partial<ProductionJob> = {
  productName: "", quantity: 0, status: "PENDING",
  priority: "NORMAL", progress: 0,
  startDate: new Date().toISOString().split("T")[0],
  deadline: "", batchNo: "", styleCode: "", color: "",
  sizeWise: {}, operations: [],
};

export default function WorkOrderPage({
  jobs, designs = [], inventory = [], orders = [], samples = [], karigars = [], onAction,
  onAddJob, onUpdateJob, onDeleteJob, currency = "₹",
}: WorkOrderPageProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<Partial<ProductionJob> | null>(null);
  const [advancing, setAdvancing] = useState<ProductionJob | null>(null);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("ALL");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<GarmentRoutingTemplate[]>(DEFAULT_ROUTING_TEMPLATES);

  // Load routing templates from IndexedDB
  useEffect(() => {
    getItem<GarmentRoutingTemplate[]>(ROUTING_STORAGE_KEY).then(saved => {
      if (saved && saved.length) {
        const savedIds = new Set(saved.map((t: GarmentRoutingTemplate) => t.id));
        const missing = DEFAULT_ROUTING_TEMPLATES.filter(t => !savedIds.has(t.id));
        setTemplates(missing.length > 0 ? [...saved, ...missing] : saved);
      }
    }).catch(() => {
      console.warn('Could not load routing templates from storage.');
    });
  }, []);

  // ── Unique active stages for filter chips
  const activeStages = useMemo(() => {
    const seen = new Set<string>();
    jobs.forEach(j => {
      const s = getActiveStageId(j.operations || []);
      if (s) seen.add(s);
    });
    return Array.from(seen);
  }, [jobs]);

  // ── Stats
  const stats = useMemo(() => ({
    total:    jobs.length,
    active:   jobs.filter(j => {
      const s = getActiveStageId(j.operations || []);
      return s !== "READY" && s !== "NO_ROUTE";
    }).length,
    ready:    jobs.filter(j => getActiveStageId(j.operations || []) === "READY").length,
    highPrio: jobs.filter(j => j.priority === "HIGH" && getActiveStageId(j.operations || []) !== "READY").length,
  }), [jobs]);

  // ── Filtered list
  const filtered = useMemo(() => jobs.filter(j => {
    const matchSearch =
      j.productName?.toLowerCase()?.includes(search.toLowerCase()) ||
      j.id?.toLowerCase()?.includes(search.toLowerCase()) ||
      (j.styleCode || "").toLowerCase().includes(search.toLowerCase());
    const matchStage = filterStage === "ALL" || getActiveStageId(j.operations || []) === filterStage;
    return matchSearch && matchStage;
  }), [jobs, search, filterStage]);

  // ── Actions
  const handleNew = () => { setEditing(EMPTY_FORM); setView("form"); };
  const handleEdit = (job: ProductionJob) => { setEditing({ ...job, sizeWise: job.sizeWise || {} }); setView("form"); };
  const handleSave = (data: ProductionJob) => {
    if (data.id && jobs.find(j => j.id === data.id)) onUpdateJob(data);
    else onAddJob(data);
    setView("list"); setEditing(null);
  };

  // Form view
  if (view === "form" && editing !== null) {
    return (
      <WorkOrderForm
        initial={editing as any} designs={designs} orders={orders} samples={samples}
        templates={templates as GarmentRoutingTemplate[]} onSave={handleSave}
        onCancel={() => { setView("list"); setEditing(null); }}
        currency={currency}
      />
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Dynamic style-wise routing — each order follows its own process</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Work Order
        </button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="Total"  value={stats.total}    color="border-slate-200 text-slate-700 bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200" />
        <StatPill label="Active" value={stats.active}   color="border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300" />
        <StatPill label="Ready"  value={stats.ready}    color="border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300" />
        {stats.highPrio > 0 && (
          <StatPill label="Urgent" value={stats.highPrio} color="border-red-200 text-red-700 bg-red-50 dark:bg-red-950/30 dark:border-red-800 dark:text-red-300" />
        )}
      </div>

      {/* Search + Stage filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 transition-colors"
            placeholder="Search by product, WO number, style code…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterStage("ALL")}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
              filterStage === "ALL"
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
            }`}
          >All</button>
          {activeStages.map(s => {
            const meta = getProcessMeta(s);
            return (
              <button key={s} onClick={() => setFilterStage(s)}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wide border transition-all ${
                  filterStage === s
                    ? `${meta.bg} ${meta.color} ${meta.border} shadow-sm`
                    : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-400"
                }`}
              >
                <span>{meta.icon}</span> {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Work Order list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-bold text-lg">No work orders found</p>
          <button onClick={handleNew} className="mt-5 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" /> Create Work Order
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => {
            const ops = job.operations || [];
            const pct = progressPercent(ops);
            const currentStage = getCurrentStage(ops);
            const activeStageId = getActiveStageId(ops);
            const activeMeta = getProcessMeta(activeStageId);
            const overdueFlag = job.deadline && new Date(job.deadline) < new Date() && activeStageId !== "READY";
            const doneCount = ops.filter(o => o.status === "COMPLETED" || o.status === "SKIPPED").length;
            const isReady = activeStageId === "READY";

            return (
              <div key={job.id} className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:shadow-md transition-all hover:border-indigo-200 dark:hover:border-indigo-800">
                <div className="flex items-start gap-4">
                  {/* Style Image */}
                  <ProductImageThumb
                    productName={job.productName}
                    sku={job.styleCode}
                    designs={designs}
                    inventory={inventory}
                    size="md"
                    className="shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                  />

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-black text-slate-400 font-mono">{job.id}</span>
                      {overdueFlag && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-black">
                          <AlertCircle className="w-3 h-3" /> OVERDUE
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${PRIORITY_STYLE[job.priority] || PRIORITY_STYLE['NORMAL']}`}>
                        {job.priority}
                      </span>
                    </div>

                    <p className="text-base font-black text-slate-800 dark:text-slate-100 truncate">{job.productName}</p>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{Number(job.quantity) || 0} pcs</span>
                      {job.styleCode && <span>Style: {job.styleCode}</span>}
                      {job.deadline && (
                        <span className={`flex items-center gap-1 ${overdueFlag ? "text-red-500 font-bold" : ""}`}>
                          <Calendar className="w-3 h-3" /> Due {job.deadline}
                        </span>
                      )}
                      {ops.some(o => (o.ratePerPiece || 0) > 0) && (
                        <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-black">
                          ₹{ops.reduce((s, o) => s + (o.ratePerPiece || 0) * (o.rateUnit === "PER_PIECE" ? (Number(job.quantity) || 0) : 1), 0).toLocaleString()} ops cost
                        </span>
                      )}
                    </div>

                    {/* Dynamic route steps */}
                    {ops.length > 0 && <RouteStepsBar ops={ops} />}

                    {/* Progress bar */}
                    {ops.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progressColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">
                          {doneCount}/{ops.length} steps · {pct}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                      isReady
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : `${activeMeta.bg} ${activeMeta.color} ${activeMeta.border}`
                    }`}>
                      {isReady ? "✅ Ready" : `${activeMeta.icon} ${currentStage}`}
                    </span>

                    <div className="flex gap-1">
                      {/* Advance steps */}
                      {ops.length > 0 && (
                        <button
                          onClick={() => setAdvancing(job)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Update Steps"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(job)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Edit Work Order"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {onAction && (
                        <>
                          <button
                            onClick={() => onAction('CONVERT_TO_MATERIAL_REQUEST', job)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors"
                            title="Create Material Request"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAction('CONVERT_TO_SUBCONTRACTING_FROM_ROUTE', job)}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors"
                            title="Send to Subcontracting"
                          >
                            <GitBranch className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAction('CONVERT_TO_JOB_CARD', job)}
                            className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                            title="Create Job Card"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setExpandedJobId(expandedJobId === job.id ? null : job.id)}
                        className="p-1.5 rounded-lg hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors"
                        title="Print Job Card"
                      >
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform ${expandedJobId === job.id ? 'rotate-90' : ''}`} />
                      </button>
                      {onDeleteJob && (
                        <button
                          onClick={() => setConfirmDelete(job.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {/* ── Inline Print Desk ── */}
                {expandedJobId === job.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <WorkOrderPrintDesk
                      job={job}
                      karigars={karigars}
                      currency={currency}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Step Advance Modal */}
      {advancing && (
        <StepAdvanceModal
          job={advancing}
          onUpdate={job => { onUpdateJob(job); setAdvancing(null); }}
          onClose={() => setAdvancing(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">Delete Work Order?</h3>
            </div>
            <p className="text-sm text-slate-500 mb-5">
              This will permanently delete <strong className="text-slate-700 dark:text-slate-300">{confirmDelete}</strong>. Cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => { onDeleteJob?.(confirmDelete); setConfirmDelete(null); }}
                className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
