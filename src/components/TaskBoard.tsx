/**
 * TaskBoard.tsx  (TexFlow v8 — ERPNext Workflow Edition)
 *
 * Massive upgrade over v7:
 *  ── SUB-TASKS ────────────────────────────────────────────────────────────────
 *   • Each job card can have unlimited sub-tasks (different work types)
 *   • Sub-tasks have their own status, worker, qty, priority, due date
 *   • Sub-task inline creation + dedicated drawer
 *   • Collapsed/expanded accordion per card (list view)
 *   • Sub-task progress rolls up to parent automatically
 *
 *  ── WORKFLOW / STATES ────────────────────────────────────────────────────────
 *   • ERPNext-style Workflow with named states + allowed transitions
 *   • Draft → Open → Work In Progress → QC Review → Completed / On Hold / Rejected
 *   • Transition buttons render only for valid next states
 *   • State history log with timestamps + user
 *
 *  ── CHECKLISTS ───────────────────────────────────────────────────────────────
 *   • Per-job checklist items (quality gates, pre-checks, SOP steps)
 *   • Add / remove / tick checklist items inline
 *   • Checklist completion % shown on card
 *   • Dept-default checklists auto-populated on new card creation
 *
 *  ── COMMENTS / ACTIVITY ──────────────────────────────────────────────────────
 *   • Multi-line comment input in detail form
 *   • Comments rendered in timeline with avatar + timestamp
 *   • Combined activity + comment feed (newest first)
 *
 *  ── PRIORITY & DUE DATE ──────────────────────────────────────────────────────
 *   • 4-level priority: Low / Medium / High / Urgent
 *   • Due date field with overdue highlight (red)
 *   • Priority + due date visible on kanban cards + list rows
 *
 *  ── RESPONSIVE ───────────────────────────────────────────────────────────────
 *   • Full mobile layout: stacked toolbar, collapsible filters, touch-friendly
 *   • Kanban scrolls horizontally on mobile with snap
 *   • List view collapses to mobile card layout < md
 *   • Detail form single-column on mobile, 2-col sidebar on ≥ lg
 *
 *  ── OTHER IMPROVEMENTS ───────────────────────────────────────────────────────
 *   • "On Hold" quick action with reason
 *   • Reject with reason modal
 *   • Print job card (window.print)
 *   • ERPNext-style form sections with collapsible cards
 *   • Keyboard shortcut: Esc to close detail, S to save
 */

import React, {
  useState, useMemo, useCallback, useEffect,
} from "react";
import {
  Search, X, Save, User, CheckCircle2,
  PlayCircle, Plus, ChevronDown, ChevronUp,
  Printer, Activity,
  AlertTriangle, Calendar, List, KanbanSquare,
  Columns, Trash2, SlidersHorizontal,
  CheckSquare, Square, ChevronRight, Zap,
  Package, FileText, Hash, Users, Target, MessageSquare,
  PauseCircle, XCircle, ArrowRight, ChevronLeft, Inbox,
  GitBranch, CornerDownRight, Send,
  ShieldCheck,
  ListChecks, Flame,
} from "lucide-react";
import type { ProductionJob as WorkOrder, Karigar } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskBoardProps {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars?: Karigar[];
}

type ViewMode = "LIST" | "KANBAN" | "TIMELINE";

// ERPNext-style workflow state
type WorkflowState =
  | "Draft"
  | "Open"
  | "Work In Progress"
  | "QC Review"
  | "Completed"
  | "On Hold"
  | "Rejected";

type Priority = "Low" | "Medium" | "High" | "Urgent";

interface SubTask {
  id: string;
  name: string;
  workType: string;
  assignedTo?: string;
  status: "Pending" | "In Progress" | "Done" | "Blocked";
  qty: number;
  completedQty: number;
  dueDate?: string;
  priority: Priority;
  notes?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

interface Comment {
  id: string;
  text: string;
  user: string;
  time: string;
  type: "comment" | "system";
}

interface StateTransition {
  time: string;
  from: WorkflowState;
  to: WorkflowState;
  user: string;
  reason?: string;
}

interface EnrichedTask {
  _uid: string;
  woId: string;
  woQty: number;
  woProduct: string;
  opIndex: number;
  name: string;
  id: string;
  isNew?: boolean; // fix: was previously cast as (task as any).isNew
  // enriched fields
  workflowState: WorkflowState;
  priority: Priority;
  dueDate?: string;
  subTasks: SubTask[];
  checklist: ChecklistItem[];
  comments: Comment[];
  stateHistory: StateTransition[];
  assignedTo?: string;
  completedQuantity?: number;
  rejectedQuantity?: number;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
  customData?: Record<string, any>;
  status?: string; // kept for compat
  _blocked?: boolean;   // true when previous routing step is not Completed
  _blockedBy?: string;  // name of the blocking step
}

// ─── Workflow Config ──────────────────────────────────────────────────────────

const WORKFLOW: Record<WorkflowState, {
  label: string; color: string; bg: string; text: string; dot: string;
  icon: React.ComponentType<any>; nextStates: WorkflowState[];
}> = {
  Draft:            { label: "Draft",            color: "#94a3b8", bg: "bg-slate-100 dark:bg-slate-800",       text: "text-slate-500 dark:text-slate-400",     dot: "bg-slate-400",    icon: FileText,     nextStates: ["Open"] },
  Open:             { label: "Open",             color: "#3b82f6", bg: "bg-blue-50 dark:bg-blue-950/30",       text: "text-blue-600 dark:text-blue-400",       dot: "bg-blue-500",     icon: Inbox,        nextStates: ["Work In Progress", "On Hold"] },
  "Work In Progress": { label: "In Progress",   color: "#f59e0b", bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-600 dark:text-amber-400",     dot: "bg-amber-400",    icon: PlayCircle,   nextStates: ["QC Review", "On Hold"] },
  "QC Review":      { label: "QC Review",       color: "#8b5cf6", bg: "bg-violet-50 dark:bg-violet-950/30",   text: "text-violet-600 dark:text-violet-400",   dot: "bg-violet-500",   icon: ShieldCheck,  nextStates: ["Completed", "Rejected", "Work In Progress"] },
  Completed:        { label: "Completed",        color: "#10b981", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500",  icon: CheckCircle2, nextStates: ["Open"] },
  "On Hold":        { label: "On Hold",          color: "#f97316", bg: "bg-orange-50 dark:bg-orange-950/30",  text: "text-orange-600 dark:text-orange-400",   dot: "bg-orange-400",   icon: PauseCircle,  nextStates: ["Open", "Work In Progress"] },
  Rejected:         { label: "Rejected",         color: "#ef4444", bg: "bg-rose-50 dark:bg-rose-950/30",      text: "text-rose-600 dark:text-rose-400",       dot: "bg-rose-500",     icon: XCircle,      nextStates: ["Open"] },
};

const KANBAN_COLUMNS: WorkflowState[] = ["Open", "Work In Progress", "QC Review", "Completed", "On Hold"];

const PRIORITY_CFG: Record<Priority, { color: string; icon: React.ComponentType<any>; bg: string; text: string }> = {
  Low:    { color: "#94a3b8", icon: ChevronDown,    bg: "bg-slate-100 dark:bg-slate-800",  text: "text-slate-500" },
  Medium: { color: "#3b82f6", icon: ChevronRight,   bg: "bg-blue-50 dark:bg-blue-900/30", text: "text-blue-600 dark:text-blue-400" },
  High:   { color: "#f59e0b", icon: AlertTriangle,  bg: "bg-amber-50 dark:bg-amber-900/30", text: "text-amber-600 dark:text-amber-400" },
  Urgent: { color: "#ef4444", icon: Flame,          bg: "bg-rose-50 dark:bg-rose-900/30", text: "text-rose-600 dark:text-rose-400" },
};

// ─── Dept Config ──────────────────────────────────────────────────────────────

interface DeptConfig {
  icon: string; label: string; accentHex: string;
  tw: { bg: string; border: string; text: string; badge: string; kpiBg: string; tabActive: string; btnBg: string; };
  extraFields: ExtraField[];
  defaultChecklist: string[];
  subTaskTypes: string[];
}

interface ExtraField {
  key: string; label: string; type: "text" | "number" | "select" | "textarea";
  placeholder?: string; options?: string[]; hint?: string; icon?: string;
}

const DEPT_CONFIG: Record<string, DeptConfig> = {
  Cutting: {
    icon: "✂️", label: "Cutting", accentHex: "#f43f5e",
    tw: { bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", kpiBg: "bg-rose-500", tabActive: "bg-rose-600 text-white", btnBg: "bg-rose-600 hover:bg-rose-700 text-white" },
    defaultChecklist: ["Fabric lot verified", "Cutting table cleaned", "Marker placed correctly", "Wastage recorded", "QC count matched"],
    subTaskTypes: ["Fabric Spreading", "Marker Placement", "Cutting", "Bundling", "Wastage Collection"],
    extraFields: [
      { key: "fabricLot", label: "Fabric Lot", type: "text", placeholder: "FAB-RED-001", icon: "🧵" },
      { key: "layers", label: "Layers", type: "number", placeholder: "8", hint: "Layers cut at once", icon: "📚" },
      { key: "marker", label: "Marker Length", type: "text", placeholder: "2.5 mtr", icon: "📏" },
      { key: "tableNo", label: "Cutting Table", type: "text", placeholder: "Table 1", icon: "🪑" },
      { key: "wasteKg", label: "Waste (kg)", type: "number", placeholder: "0", icon: "♻️" },
      { key: "efficiency", label: "Efficiency %", type: "number", placeholder: "85", icon: "⚡" },
    ],
  },
  Stitching: {
    icon: "🧵", label: "Stitching", accentHex: "#6366f1",
    tw: { bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", kpiBg: "bg-indigo-500", tabActive: "bg-indigo-600 text-white", btnBg: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    defaultChecklist: ["Machine threaded correctly", "Sample stitch checked", "Thread colour matched", "Target/hr set", "SMV recorded"],
    subTaskTypes: ["Front Panel", "Back Panel", "Sleeve Attach", "Collar Attach", "Pocket Attach", "Side Seam", "Hem"],
    extraFields: [
      { key: "machineNo", label: "Machine No.", type: "text", placeholder: "M-04", icon: "⚙️" },
      { key: "stitchType", label: "Stitch Type", type: "select", options: ["Lock Stitch", "Chain Stitch", "Overlock", "Flat Lock", "Blind Stitch"], icon: "🔗" },
      { key: "threadColor", label: "Thread Color", type: "text", placeholder: "White 601", icon: "🎨" },
      { key: "targetPerHr", label: "Target/Hr", type: "number", placeholder: "50", icon: "🎯" },
      { key: "smv", label: "SMV (min)", type: "number", placeholder: "12", hint: "Standard Minute Value", icon: "⏱️" },
      { key: "operator", label: "Operator Grade", type: "select", options: ["Master", "Senior", "Junior", "Trainee"], icon: "👷" },
    ],
  },
  Embroidery: {
    icon: "🌸", label: "Embroidery", accentHex: "#8b5cf6",
    tw: { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", kpiBg: "bg-violet-500", tabActive: "bg-violet-600 text-white", btnBg: "bg-violet-600 hover:bg-violet-700 text-white" },
    defaultChecklist: ["Design code verified", "Frame size correct", "Stitch count approved", "Colour match confirmed", "First piece QC done"],
    subTaskTypes: ["Frame Loading", "Machine Setup", "Embroidery Run", "Quality Check", "Unloading & Trimming"],
    extraFields: [
      { key: "design", label: "Design Code", type: "text", placeholder: "EMB-FLORAL-A", icon: "🎨" },
      { key: "vendor", label: "Vendor", type: "text", placeholder: "Ramesh EMB", icon: "🏭" },
      { key: "stitchCount", label: "Stitch Count", type: "number", placeholder: "5000", hint: "Per piece", icon: "🔢" },
      { key: "colorCount", label: "Colors", type: "number", placeholder: "4", icon: "🌈" },
      { key: "sentQty", label: "Sent to Vendor", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back", type: "number", placeholder: "0", icon: "📥" },
    ],
  },
  Printing: {
    icon: "🖨️", label: "Printing", accentHex: "#f59e0b",
    tw: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", kpiBg: "bg-amber-500", tabActive: "bg-amber-600 text-white", btnBg: "bg-amber-600 hover:bg-amber-700 text-white" },
    defaultChecklist: ["Screen prepared", "Ink mixed & approved", "Registration marks set", "First print QC done", "Drying scheduled"],
    subTaskTypes: ["Screen Preparation", "Ink Mixing", "Printing", "Drying / Curing", "Quality Inspection"],
    extraFields: [
      { key: "printType", label: "Print Type", type: "select", options: ["Screen Print", "Digital Print", "Block Print", "Sublimation", "Transfer"], icon: "🖨️" },
      { key: "colorCount", label: "Colors", type: "number", placeholder: "3", icon: "🌈" },
      { key: "inkLot", label: "Ink/Dye Lot", type: "text", placeholder: "INK-BLK-01", icon: "🎨" },
      { key: "vendor", label: "Printer Vendor", type: "text", placeholder: "Sai Printers", icon: "🏭" },
      { key: "dryTime", label: "Drying Time (hrs)", type: "number", placeholder: "2", icon: "⏳" },
      { key: "meshCount", label: "Mesh Count", type: "number", placeholder: "120", icon: "🔬" },
    ],
  },
  Washing: {
    icon: "🫧", label: "Washing", accentHex: "#06b6d4",
    tw: { bg: "bg-cyan-50 dark:bg-cyan-950/20", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", kpiBg: "bg-cyan-500", tabActive: "bg-cyan-600 text-white", btnBg: "bg-cyan-600 hover:bg-cyan-700 text-white" },
    defaultChecklist: ["Wash type confirmed", "Batch weight checked", "Temperature set", "Fabric tested for shrinkage", "Post-wash count verified"],
    subTaskTypes: ["Sorting & Batching", "Loading", "Wash Cycle", "Unloading & Counting", "Shade Matching"],
    extraFields: [
      { key: "washType", label: "Wash Type", type: "select", options: ["Normal Wash", "Stone Wash", "Acid Wash", "Enzyme Wash", "Bleach Wash", "Dry Wash"], icon: "🫧" },
      { key: "vendor", label: "Laundry Vendor", type: "text", placeholder: "AK Laundry", icon: "🏭" },
      { key: "temperature", label: "Temp (°C)", type: "number", placeholder: "40", icon: "🌡️" },
      { key: "shrinkage", label: "Shrinkage %", type: "number", placeholder: "3", icon: "📉" },
      { key: "sentQty", label: "Sent to Vendor", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back", type: "number", placeholder: "0", icon: "📥" },
    ],
  },
  Finishing: {
    icon: "✨", label: "Finishing", accentHex: "#10b981",
    tw: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", kpiBg: "bg-emerald-500", tabActive: "bg-emerald-600 text-white", btnBg: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    defaultChecklist: ["Ironing done", "Buttons & snaps checked", "Labels attached", "Tags attached", "QC pass count recorded"],
    subTaskTypes: ["Ironing / Pressing", "Button & Snap Check", "Label Attach", "Quality Check", "Alteration"],
    extraFields: [
      { key: "ironing", label: "Ironing Type", type: "select", options: ["Steam Press", "Hand Iron", "Tunnel Finish", "None"], icon: "🧺" },
      { key: "buttonCheck", label: "Button/Snap Check", type: "select", options: ["Done", "Pending", "N/A"], icon: "🔘" },
      { key: "labelAttach", label: "Label Attached", type: "select", options: ["Yes", "No", "Pending"], icon: "🏷️" },
      { key: "qcPass", label: "QC Pass Count", type: "number", placeholder: "0", icon: "✅" },
      { key: "qcFail", label: "QC Fail Count", type: "number", placeholder: "0", icon: "❌" },
      { key: "alterationQty", label: "Sent for Alteration", type: "number", placeholder: "0", icon: "🔄" },
    ],
  },
  Packing: {
    icon: "📦", label: "Packing", accentHex: "#0ea5e9",
    tw: { bg: "bg-sky-50 dark:bg-sky-950/20", border: "border-sky-200 dark:border-sky-800", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", kpiBg: "bg-sky-500", tabActive: "bg-sky-600 text-white", btnBg: "bg-sky-600 hover:bg-sky-700 text-white" },
    defaultChecklist: ["Packing type confirmed", "Price tags attached", "Barcodes scanned", "Carton count verified", "Weight recorded"],
    subTaskTypes: ["Poly Bag / Box Packing", "Price Tag Attach", "Barcode Scan", "Carton Filling", "Dispatch Check"],
    extraFields: [
      { key: "packType", label: "Packing Type", type: "select", options: ["Poly Bag", "Box", "Hanger", "Flat Pack", "Bulk"], icon: "📦" },
      { key: "tagAttached", label: "Price Tag", type: "select", options: ["Attached", "Pending", "N/A"], icon: "🏷️" },
      { key: "barcodeScanned", label: "Barcode Scan", type: "select", options: ["Done", "Pending", "N/A"], icon: "📊" },
      { key: "boxCount", label: "Boxes/Bags", type: "number", placeholder: "0", icon: "📫" },
      { key: "cartonNo", label: "Carton No.", type: "text", placeholder: "CTN-001", icon: "🗃️" },
      { key: "grossWt", label: "Gross Weight (kg)", type: "number", placeholder: "0", icon: "⚖️" },
    ],
  },
};

const DEFAULT_DEPT: DeptConfig = {
  icon: "🔧", label: "Task", accentHex: "#64748b",
  tw: { bg: "bg-slate-50 dark:bg-slate-900/40", border: "border-slate-200 dark:border-slate-700", text: "text-slate-700 dark:text-slate-300", badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", kpiBg: "bg-slate-400", tabActive: "bg-slate-700 text-white", btnBg: "bg-slate-700 hover:bg-slate-800 text-white" },
  defaultChecklist: ["Pre-check done", "Work completed", "QC passed"],
  subTaskTypes: ["Sub-task"],
  extraFields: [],
};

// ─── Stage → Department tab mapping ──────────────────────────────────────────
// Maps GarmentOperationTemplate.stage values to the dept tab name (taskName).
// This is the authoritative lookup — it fixes style-wise routing so that
// ops created via RoutingMaster appear in the correct department tab even when
// the op.name text doesn't contain the tab keyword (e.g. "Panel Cutting" on Cutting tab).
export const STAGE_TO_DEPT: Record<string, string> = {
  FABRIC_INSPECTION: "Fabric Inspection",
  DYEING:            "Dyeing",
  FABRIC_PRINTING:   "Printing",
  GARMENT_PRINTING:  "Printing",
  EMBROIDERY_FABRIC: "Embroidery",
  EMBROIDERY_GARMENT:"Embroidery",
  CUTTING:           "Cutting",
  STITCHING:         "Stitching",
  WASHING:           "Washing",
  HAND_WORK:         "Hand Work",
  FINISHING:         "Finishing",
  QC_CHECK:          "QC Check",
  PACKING:           "Packing",
};

/**
 * Returns true if this operation belongs to the given dept tab.
 * Priority: stage field (canonical) → op.name text match (legacy fallback)
 */
export function opBelongsToDept(op: any, deptTabName: string): boolean {
  // 1. Stage-based match (authoritative for RoutingMaster-created WOs)
  if (op.stage) {
    const mappedDept = STAGE_TO_DEPT[op.stage];
    if (mappedDept) return mappedDept.toLowerCase() === deptTabName.toLowerCase();
  }
  // 2. workstationType match (used by some legacy templates)
  if (op.workstationType) {
    if (op.workstationType.toLowerCase() === deptTabName.toLowerCase()) return true;
  }
  // 3. Name text match fallback (for old mock templates RT-001/RT-002/RT-003)
  return (op.name || "").toLowerCase().includes(deptTabName.toLowerCase());
}

function getDept(taskName: string): DeptConfig {
  const key = Object.keys(DEPT_CONFIG).find(k => taskName.toLowerCase().includes(k.toLowerCase()));
  return key ? DEPT_CONFIG[key] : DEFAULT_DEPT;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function isOverdue(dueDate?: string) {
  if (!dueDate) return false;
  // Compare date strings directly (YYYY-MM-DD) to avoid timezone shift making
  // today's due date appear overdue in UTC+offset environments
  const today = new Date().toISOString().split("T")[0];
  return dueDate < today;
}

function subTaskProgress(task: EnrichedTask) {
  if (!task.subTasks?.length) {
    const total = task.woQty || 0;
    const done = task.completedQuantity || 0;
    return total > 0 ? Math.min(100, Math.round(done / total * 100)) : 0;
  }
  const total = task.subTasks.length;
  const done = task.subTasks.filter(s => s.status === "Done").length;
  return total > 0 ? Math.round(done / total * 100) : 0;
}

function checklistProgress(task: EnrichedTask) {
  if (!task.checklist?.length) return null;
  const done = task.checklist.filter(c => c.done).length;
  return { done, total: task.checklist.length, pct: Math.round(done / task.checklist.length * 100) };
}

function uid() { return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

// ─── Small shared components ──────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{children}</label>;
}

function FormCard({ title, icon: Icon, children, collapsible = false }: {
  title: string; icon?: React.ComponentType<any>; children: React.ReactNode; collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => collapsible && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 ${collapsible ? "cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors" : "cursor-default"}`}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
          <h3 className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</h3>
        </div>
        {collapsible && (open ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />)}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CFG[priority];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-2.5 h-2.5" />
      {priority}
    </span>
  );
}

function WorkflowBadge({ state }: { state: WorkflowState }) {
  const cfg = WORKFLOW[state];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

function KPIBar({ tasks, dept }: { tasks: EnrichedTask[]; dept: DeptConfig }) {
  const total = tasks.length;
  const inprog = tasks.filter(t => t.workflowState === "Work In Progress").length;
  const qc = tasks.filter(t => t.workflowState === "QC Review").length;
  const done = tasks.filter(t => t.workflowState === "Completed").length;
  const onHold = tasks.filter(t => t.workflowState === "On Hold").length;
  const totalPcs = tasks.reduce((s, t) => s + (t.woQty || 0), 0);
  const donePcs = tasks.reduce((s, t) => s + (t.completedQuantity || 0), 0);
  const overallPct = totalPcs > 0 ? Math.round(donePcs / totalPcs * 100) : 0;
  const urgent = tasks.filter(t => t.priority === "Urgent").length;
  const overdue = tasks.filter(t => isOverdue(t.dueDate) && t.workflowState !== "Completed").length;

  const stats = [
    { label: "Total Jobs", value: total, icon: Hash, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-50 dark:bg-slate-900/60" },
    { label: "In Progress", value: inprog, icon: PlayCircle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
    { label: "QC Review", value: qc, icon: ShieldCheck, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/20" },
    { label: "Completed", value: done, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "On Hold", value: onHold, icon: PauseCircle, color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { label: "Urgent", value: urgent, icon: Flame, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-900/20" },
    { label: "Overdue", value: overdue, icon: AlertTriangle, color: overdue > 0 ? "text-rose-600" : "text-slate-400", bg: overdue > 0 ? "bg-rose-50 dark:bg-rose-900/20" : "bg-slate-50 dark:bg-slate-900/60" },
  ];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 ${s.bg}`}>
              <Icon className={`w-4 h-4 shrink-0 ${s.color}`} />
              <div>
                <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold leading-tight">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="col-span-full">
        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
          <span className="font-bold">Overall {dept.label} Progress — {donePcs}/{totalPcs} pcs</span>
          <span className="font-black">{overallPct}%</span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overallPct}%`, background: dept.accentHex }} />
        </div>
      </div>
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

type StateFilter = WorkflowState | "ALL";

function Toolbar({
  dept, taskName, searchTerm, setSearchTerm, viewMode, setViewMode,
  stateFilter, setStateFilter, stateCounts, filterAssigned, setFilterAssigned,
  filterPriority, setFilterPriority,
  karigars, selectedIds, onBulkComplete, onBulkHold, onClearSelect, onNewCard,
}: any) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2">
      {/* Row 1: search + view + filter toggle + new */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-400 transition-colors placeholder:text-slate-400"
            placeholder={`Search ${taskName} cards…`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="w-3 h-3 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex gap-0.5 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {([["LIST", List], ["KANBAN", KanbanSquare], ["TIMELINE", Columns]] as [ViewMode, any][]).map(([v, Icon]) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`p-1.5 rounded-md transition-all ${viewMode === v ? "bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-white" : "text-slate-400 hover:text-slate-600"}`}
              title={v.charAt(0) + v.slice(1).toLowerCase()}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-all ${showFilters ? `${dept.tw.border} ${dept.tw.text} ${dept.tw.bg}` : "border-slate-200 dark:border-slate-700 text-slate-500 bg-white dark:bg-slate-900"}`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
        </button>

        <button onClick={onNewCard} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black shadow-sm transition-all ${dept.tw.btnBg}`}>
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Job Card</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Assigned</span>
            <button onClick={() => setFilterAssigned("")} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${filterAssigned === "" ? `${dept.tw.badge} ${dept.tw.border}` : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>All</button>
            {karigars.slice(0, 6).map((k: Karigar) => (
              <button key={k.id} onClick={() => setFilterAssigned(filterAssigned === k.id ? "" : k.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${filterAssigned === k.id ? `${dept.tw.badge} ${dept.tw.border}` : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                {k.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Priority</span>
            {["", "Low", "Medium", "High", "Urgent"].map(p => (
              <button key={p} onClick={() => setFilterPriority(p)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${filterPriority === p ? `${dept.tw.badge} ${dept.tw.border}` : "border-slate-200 dark:border-slate-700 text-slate-500"}`}>
                {p || "All"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* State tab strip */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-0.5 p-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {(["ALL", "Open", "Work In Progress", "QC Review", "Completed", "On Hold", "Rejected"] as StateFilter[]).map(s => {
            const cfg = s !== "ALL" ? WORKFLOW[s as WorkflowState] : null;
            return (
              <button key={s} onClick={() => setStateFilter(s)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[9px] font-black uppercase tracking-wide transition-all whitespace-nowrap ${stateFilter === s ? dept.tw.tabActive : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>
                {cfg && <span className={`w-1.5 h-1.5 rounded-full ${stateFilter === s ? "bg-white" : cfg.dot}`} />}
                {s === "ALL" ? "All" : s === "Work In Progress" ? "In Progress" : s}
                <span className={`px-1 py-0.5 rounded text-[8px] font-black ${stateFilter === s ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                  {stateCounts[s] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg">
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-300">{selectedIds.length} selected</span>
            <button onClick={onBulkComplete} className="text-[10px] font-black text-emerald-600 border border-emerald-300 px-2 py-0.5 rounded-md hover:bg-emerald-50">✓ Complete</button>
            <button onClick={onBulkHold} className="text-[10px] font-black text-orange-500 border border-orange-300 px-2 py-0.5 rounded-md hover:bg-orange-50">⏸ Hold</button>
            <button onClick={onClearSelect}><X className="w-3 h-3 text-slate-400" /></button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-task row (inside list view expand) ───────────────────────────────────

function SubTaskRow({ sub, karigars, accentHex, onUpdate, onDelete }: {
  sub: SubTask; karigars: Karigar[]; accentHex: string;
  onUpdate: (s: SubTask) => void; onDelete: (id: string) => void;
}) {
  const st = sub.status;
  const stColor = st === "Done" ? "text-emerald-600" : st === "In Progress" ? "text-amber-600" : st === "Blocked" ? "text-rose-600" : "text-slate-400";
  const pct = sub.qty > 0 ? Math.min(100, Math.round(sub.completedQty / sub.qty * 100)) : 0;
  const karigar = karigars.find(k => k.id === sub.assignedTo);
  const overdue = isOverdue(sub.dueDate);

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 group text-[10px]">
      <CornerDownRight className="w-3 h-3 text-slate-300 shrink-0" />
      <span className="flex-1 font-bold text-slate-700 dark:text-slate-200 truncate min-w-0">{sub.workType} — {sub.name}</span>
      <PriorityBadge priority={sub.priority} />
      {karigar && <span className="text-slate-500 font-medium hidden sm:inline">{karigar.name}</span>}
      {sub.dueDate && <span className={`font-bold ${overdue ? "text-rose-500" : "text-slate-400"}`}>{fmtDate(sub.dueDate)}</span>}
      <span className="w-10 text-right font-black text-slate-600 dark:text-slate-300">{pct}%</span>
      <select value={st} onChange={e => onUpdate({ ...sub, status: e.target.value as SubTask["status"] })}
        className={`text-[9px] font-black rounded px-1 py-0.5 border-0 outline-none cursor-pointer ${stColor} bg-transparent`}>
        {["Pending", "In Progress", "Done", "Blocked"].map(v => <option key={v}>{v}</option>)}
      </select>
      <button onClick={() => onDelete(sub.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600">
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ tasks, dept, karigars, selectedIds, onToggleSelect, onSelectAll, onEdit, onTransition, onUpdateSubTask }: any) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;

  const toggleExpand = (uid: string) => setExpandedIds(prev => {
    const next = new Set(prev);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    return next;
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Header — desktop only */}
      <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => onSelectAll(allSelected ? [] : tasks.map((t: any) => t._uid))} className="shrink-0 w-4 h-4 text-slate-400 hover:text-indigo-500 transition-colors">
          {allSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
        </button>
        <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: "1.6fr 1fr 90px 80px 80px 100px 80px 36px" }}>
          {["Job / WO", "Product", "Priority", "Qty", "Assigned", "Status", "Progress", ""].map(h => (
            <span key={h} className="text-[9px] font-black uppercase tracking-widest text-slate-400">{h}</span>
          ))}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-slate-400">
          <span className="text-4xl mb-2 opacity-20">{dept.icon}</span>
          <p className="font-bold text-sm">No job cards found</p>
        </div>
      ) : tasks.map((task: EnrichedTask) => {
        const wf = WORKFLOW[task.workflowState] || WORKFLOW["Draft"];
        const karigar = karigars.find((k: Karigar) => k.id === task.assignedTo);
        const pct = subTaskProgress(task);
        const cl = checklistProgress(task);
        const isSelected = selectedIds.includes(task._uid);
        const isExpanded = expandedIds.has(task._uid);
        const hasSubTasks = task.subTasks?.length > 0;
        const overdue = isOverdue(task.dueDate);

        return (
          <div key={task._uid} className={`border-b border-slate-100 dark:border-slate-800 last:border-0 ${isSelected ? "bg-indigo-50/60 dark:bg-indigo-900/10" : ""}`}>
            {/* Desktop row */}
            <div className="hidden md:flex items-center gap-2 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group">
              <button onClick={() => onToggleSelect(task._uid)} className="shrink-0 w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors">
                {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4" />}
              </button>
              <div className="flex-1 grid items-center gap-2" style={{ gridTemplateColumns: "1.6fr 1fr 90px 80px 80px 100px 80px 36px" }}>
                {/* Job */}
                <button className="text-left" onClick={() => onEdit(task)}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{dept.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{task.name}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-slate-400 font-mono">{task.woId}</p>
                        {task._blocked && (
                          <span className="text-[9px] font-black text-orange-600 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 px-1.5 py-0.5 rounded-full">
                            🔒 Waiting: {task._blockedBy}
                          </span>
                        )}
                        {overdue && !task._blocked && <span className="text-[9px] font-black text-rose-500">OVERDUE</span>}
                        {task.dueDate && !overdue && !task._blocked && <span className="text-[9px] text-slate-400">{fmtDate(task.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                </button>
                {/* Product */}
                <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate">{task.woProduct}</p>
                {/* Priority */}
                <PriorityBadge priority={task.priority} />
                {/* Qty */}
                <div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">{task.woQty || 0}</span>
                  {task.completedQuantity! > 0 && <p className="text-[9px] text-emerald-600 font-bold">{task.completedQuantity} done</p>}
                </div>
                {/* Assigned */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {karigar ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[9px] font-black text-indigo-600 shrink-0">{karigar.name.charAt(0).toUpperCase()}</div>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate">{karigar.name}</span>
                    </>
                  ) : <span className="text-[10px] text-slate-300">—</span>}
                </div>
                {/* Workflow state */}
                <WorkflowBadge state={task.workflowState} />
                {/* Progress */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dept.accentHex }} />
                    </div>
                    <span className="text-[9px] font-black text-slate-400 w-6 text-right">{pct}%</span>
                  </div>
                  {cl && <div className="text-[8px] text-slate-400 font-bold">✓ {cl.done}/{cl.total} checks</div>}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  {hasSubTasks && (
                    <button onClick={() => toggleExpand(task._uid)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Sub-tasks">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  )}
                  {/* Quick transition buttons */}
                  {wf.nextStates.slice(0, 1).map(ns => {
                    const nw = WORKFLOW[ns];
                    const NIcon = nw.icon;
                    return (
                      <button key={ns} onClick={() => onTransition(task, ns)}
                        className={`p-1 rounded-md transition-colors ${nw.text} hover:bg-slate-100 dark:hover:bg-slate-800`} title={`→ ${ns}`}>
                        <NIcon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile card */}
            <div className="md:hidden p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <button onClick={() => onToggleSelect(task._uid)} className="mt-0.5 shrink-0">
                    {isSelected ? <CheckSquare className="w-4 h-4 text-indigo-500" /> : <Square className="w-4 h-4 text-slate-300" />}
                  </button>
                  <div className="min-w-0" onClick={() => onEdit(task)}>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{dept.icon} {task.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{task.woId} · {task.woProduct}</p>
                  </div>
                </div>
                <WorkflowBadge state={task.workflowState} />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <PriorityBadge priority={task.priority} />
                {karigar && <span className="text-[10px] text-slate-500 font-bold">{karigar.name}</span>}
                {overdue && <span className="text-[9px] font-black text-rose-500">OVERDUE</span>}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dept.accentHex }} />
                </div>
                <span className="text-[9px] font-black text-slate-400">{pct}%</span>
              </div>
            </div>

            {/* Sub-task expand panel */}
            {isExpanded && hasSubTasks && (
              <div className="px-4 pb-3 space-y-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 pt-2 mb-1.5">Sub-tasks ({task.subTasks.length})</p>
                {task.subTasks.map(sub => (
                  <SubTaskRow key={sub.id} sub={sub} karigars={karigars} accentHex={dept.accentHex}
                    onUpdate={(updated: SubTask) => onUpdateSubTask(task, task.subTasks.map((s: SubTask) => s.id === updated.id ? updated : s))}
                    onDelete={(id: string) => onUpdateSubTask(task, task.subTasks.filter((s: SubTask) => s.id !== id))} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ tasks, dept, karigars, onEdit, onTransition }: any) {
  const cols = KANBAN_COLUMNS.map(state => ({
    state,
    tasks: tasks.filter((t: EnrichedTask) => t.workflowState === state),
  }));

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
      {cols.map(col => {
        const cfg = WORKFLOW[col.state];
        const CfgIcon = cfg.icon;
        return (
          <div key={col.state} className="flex flex-col gap-2 min-w-[240px] w-[240px] sm:min-w-[260px] sm:w-[260px] snap-start shrink-0">
            <div className={`flex items-center justify-between px-3 py-2 rounded-xl ${cfg.bg} border border-slate-200 dark:border-slate-700 sticky top-0`}>
              <div className="flex items-center gap-2">
                <CfgIcon className={`w-3.5 h-3.5 ${cfg.text}`} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>{cfg.label}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${cfg.bg} ${cfg.text}`}>{col.tasks.length}</span>
            </div>

            <div className="space-y-2 min-h-[80px]">
              {col.tasks.map((task: EnrichedTask) => {
                const pct = subTaskProgress(task);
                const cl = checklistProgress(task);
                const karigar = karigars.find((k: Karigar) => k.id === task.assignedTo);
                const overdue = isOverdue(task.dueDate);

                return (
                  <div key={task._uid}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                    onClick={() => onEdit(task)}>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 truncate">{task.woProduct}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{task.woId}</p>
                      </div>
                      <span className="text-base shrink-0">{dept.icon}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      <PriorityBadge priority={task.priority} />
                      {task.subTasks?.length > 0 && (
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                          <GitBranch className="w-2.5 h-2.5" /> {task.subTasks.filter(s => s.status === "Done").length}/{task.subTasks.length}
                        </span>
                      )}
                    </div>

                    {karigar && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[8px] font-black text-indigo-600">{karigar.name.charAt(0).toUpperCase()}</div>
                        <span className="text-[9px] text-slate-500 font-bold">{karigar.name}</span>
                      </div>
                    )}

                    {task.dueDate && (
                      <div className={`text-[9px] font-bold mb-1.5 flex items-center gap-1 ${overdue ? "text-rose-500" : "text-slate-400"}`}>
                        <Calendar className="w-2.5 h-2.5" />
                        {overdue ? "Overdue · " : ""}{fmtDate(task.dueDate)}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: dept.accentHex }} />
                      </div>
                      <span className="text-[9px] font-black text-slate-400">{pct}%</span>
                    </div>

                    {cl && (
                      <div className="text-[8px] text-slate-400 font-bold flex items-center gap-1">
                        <ListChecks className="w-2.5 h-2.5" /> {cl.done}/{cl.total}
                      </div>
                    )}

                    {/* Quick transitions */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {WORKFLOW[task.workflowState].nextStates.slice(0, 2).map(ns => {
                        const nw = WORKFLOW[ns];
                        return (
                          <button key={ns} onClick={e => { e.stopPropagation(); onTransition(task, ns); }}
                            className={`flex-1 py-1 rounded-lg text-[8px] font-black border transition-colors ${nw.bg} ${nw.text} border-current/30`}>
                            → {nw.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {col.tasks.length === 0 && (
                <div className="flex items-center justify-center py-8 text-slate-300 dark:text-slate-700 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <span className="text-[10px] font-bold">Drop here</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline View ────────────────────────────────────────────────────────────

function TimelineView({ tasks, dept, karigars, onEdit }: any) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timeline — Progress by Job Card</h3>
      </div>
      {tasks.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-slate-300"><p className="text-sm font-bold">No jobs</p></div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task: EnrichedTask) => {
            const cfg = WORKFLOW[task.workflowState];
            const karigar = karigars.find((k: Karigar) => k.id === task.assignedTo);
            const pct = subTaskProgress(task);
            const overdue = isOverdue(task.dueDate);

            return (
              <div key={task._uid} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group flex-wrap md:flex-nowrap" onClick={() => onEdit(task)}>
                <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                <div className="w-full md:w-44 shrink-0 min-w-0">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-200 truncate">{task.name}</p>
                  <p className="text-[9px] text-slate-400 font-mono">{task.woId} · {task.woProduct}</p>
                </div>
                <div className="shrink-0"><PriorityBadge priority={task.priority} /></div>
                <div className="w-14 text-center shrink-0">
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">{task.woQty || 0}</span>
                  <p className="text-[9px] text-slate-400">pcs</p>
                </div>
                <div className="flex-1 relative min-w-[100px]">
                  <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 flex items-center pl-2"
                      style={{ width: `${Math.max(pct, 4)}%`, background: dept.accentHex, opacity: 0.85 }}>
                      {pct > 10 && <span className="text-[8px] font-black text-white">{pct}%</span>}
                    </div>
                  </div>
                </div>
                <div className="w-20 text-right shrink-0">
                  {task.completedQuantity! > 0 && <p className="text-[10px] text-emerald-600 font-black">{task.completedQuantity} done</p>}
                </div>
                <div className="w-20 shrink-0 text-right">
                  {karigar ? <span className="text-[10px] text-slate-500 font-bold">{karigar.name}</span> : <span className="text-[10px] text-slate-300">Unassigned</span>}
                </div>
                <WorkflowBadge state={task.workflowState} />
                {overdue && <span className="text-[9px] font-black text-rose-500 shrink-0">OVERDUE</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Sub-task Manager (in detail form) ────────────────────────────────────────

function SubTaskManager({ subTasks, setSubTasks, karigars, dept }: {
  subTasks: SubTask[]; setSubTasks: (s: SubTask[]) => void; karigars: Karigar[]; dept: DeptConfig;
}) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(dept.subTaskTypes[0] || "Sub-task");
  const [newPriority, setNewPriority] = useState<Priority>("Medium");
  const [newDue, setNewDue] = useState("");
  const [newQty, setNewQty] = useState(0);
  const [newWorker, setNewWorker] = useState("");

  const addSub = () => {
    if (!newName.trim()) return;
    setSubTasks([...subTasks, {
      id: uid(), name: newName.trim(), workType: newType, priority: newPriority,
      dueDate: newDue, qty: newQty, completedQty: 0, status: "Pending", assignedTo: newWorker,
    }]);
    setNewName(""); setNewQty(0); setNewDue(""); setNewWorker("");
  };

  const updateSub = (updated: SubTask) => setSubTasks(subTasks.map(s => s.id === updated.id ? updated : s));
  const deleteSub = (id: string) => setSubTasks(subTasks.filter(s => s.id !== id));

  const doneCnt = subTasks.filter(s => s.status === "Done").length;

  return (
    <div className="space-y-2">
      {subTasks.length > 0 && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-slate-400 font-bold">{doneCnt}/{subTasks.length} sub-tasks done</span>
          <div className="flex-1 mx-3 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${subTasks.length > 0 ? Math.round(doneCnt / subTasks.length * 100) : 0}%`, background: dept.accentHex }} />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {subTasks.map(sub => {
          const karigar = karigars.find(k => k.id === sub.assignedTo);
          const overdue = isOverdue(sub.dueDate);
          return (
            <div key={sub.id} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_80px_80px_80px_28px] gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 items-center">
              <div className="flex items-center gap-2 col-span-1 sm:col-span-2 min-w-0">
                <CornerDownRight className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 truncate">[{sub.workType}] {sub.name}</span>
                {overdue && <span className="text-[9px] font-black text-rose-500 shrink-0">OVERDUE</span>}
              </div>
              <select value={sub.status} onChange={e => updateSub({ ...sub, status: e.target.value as SubTask["status"] })}
                className="erp-input text-[10px] font-bold">
                {["Pending", "In Progress", "Done", "Blocked"].map(v => <option key={v}>{v}</option>)}
              </select>
              <input type="number" min={0} value={sub.completedQty} onChange={e => updateSub({ ...sub, completedQty: Number(e.target.value) })}
                className="erp-input text-[10px]" placeholder="Done qty" />
              <div className="flex items-center gap-1">
                <PriorityBadge priority={sub.priority} />
              </div>
              <button onClick={() => deleteSub(sub.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add new sub-task */}
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_80px_80px_80px_80px] gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addSub()}
          placeholder="Sub-task name…" className="erp-input text-[10px] col-span-2 sm:col-span-1" />
        <select value={newType} onChange={e => setNewType(e.target.value)} className="erp-input text-[10px]">
          {dept.subTaskTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={newWorker} onChange={e => setNewWorker(e.target.value)} className="erp-input text-[10px]">
          <option value="">Unassigned</option>
          {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)} className="erp-input text-[10px]">
          {(["Low", "Medium", "High", "Urgent"] as Priority[]).map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="erp-input text-[10px]" />
        <button onClick={addSub} disabled={!newName.trim()}
          className={`flex items-center justify-center gap-1 rounded-lg text-[10px] font-black transition-all ${dept.tw.btnBg} disabled:opacity-40`}>
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Checklist Manager ────────────────────────────────────────────────────────

function ChecklistManager({ checklist, setChecklist, dept }: {
  checklist: ChecklistItem[]; setChecklist: (c: ChecklistItem[]) => void; dept: DeptConfig;
}) {
  const [newLabel, setNewLabel] = useState("");

  const toggle = (id: string) => setChecklist(checklist.map(c => c.id === id ? { ...c, done: !c.done } : c));
  const remove = (id: string) => setChecklist(checklist.filter(c => c.id !== id));
  const add = () => {
    if (!newLabel.trim()) return;
    setChecklist([...checklist, { id: uid(), label: newLabel.trim(), done: false }]);
    setNewLabel("");
  };

  const done = checklist.filter(c => c.done).length;
  const pct = checklist.length > 0 ? Math.round(done / checklist.length * 100) : 0;

  return (
    <div className="space-y-2">
      {checklist.length > 0 && (
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: dept.accentHex }} />
          </div>
          <span className="text-[10px] font-black text-slate-500">{done}/{checklist.length} ({pct}%)</span>
        </div>
      )}
      <div className="space-y-1">
        {checklist.map(item => (
          <div key={item.id} className="flex items-center gap-2 group">
            <button onClick={() => toggle(item.id)} className="shrink-0">
              {item.done
                ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                : <Square className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />}
            </button>
            <span className={`flex-1 text-[11px] font-medium ${item.done ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"}`}>{item.label}</span>
            <button onClick={() => remove(item.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3 h-3 text-rose-400 hover:text-rose-600" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newLabel} onChange={e => setNewLabel(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add checklist item…" className="erp-input flex-1 text-[11px]" />
        <button onClick={add} disabled={!newLabel.trim()} className={`px-3 rounded-lg text-[10px] font-black transition-all ${dept.tw.btnBg} disabled:opacity-40`}>
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Comments Feed ────────────────────────────────────────────────────────────

function CommentsFeed({ comments, setComments, stateHistory }: {
  comments: Comment[]; setComments: (c: Comment[]) => void; stateHistory: StateTransition[];
}) {
  const [text, setText] = useState("");

  const addComment = () => {
    if (!text.trim()) return;
    setComments([...comments, { id: uid(), text: text.trim(), user: "Me", time: new Date().toISOString(), type: "comment" }]);
    setText("");
  };

  // Merge comments + state history into a unified feed
  type FeedItem = (Comment & { _type: "comment" }) | (StateTransition & { _type: "state" });
  const feed: FeedItem[] = [
    ...comments.map(c => ({ ...c, _type: "comment" as const })),
    ...stateHistory.map(s => ({ ...s, _type: "state" as const, id: s.time })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  return (
    <div className="space-y-3">
      {/* Comment input */}
      <div className="flex gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-black text-white shrink-0 mt-0.5">M</div>
        <div className="flex-1 space-y-1.5">
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addComment(); }}
            rows={2} placeholder="Add a comment… (Ctrl+Enter to send)"
            className="erp-input w-full resize-none text-[11px]" />
          <button onClick={addComment} disabled={!text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black disabled:opacity-40 transition-colors">
            <Send className="w-3 h-3" /> Comment
          </button>
        </div>
      </div>

      {/* Feed */}
      {feed.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {feed.map(item => {
            if (item._type === "comment") {
              const c = item as Comment & { _type: "comment" };
              return (
                <div key={c.id} className="flex gap-2">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[8px] font-black text-indigo-600 shrink-0 mt-0.5">{c.user.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">{c.user}</span>
                      <span className="text-[9px] text-slate-400">{fmtTime(c.time)}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2">{c.text}</p>
                  </div>
                </div>
              );
            } else {
              const s = item as StateTransition & { _type: "state"; id: string };
              const from = WORKFLOW[s.from];
              const to = WORKFLOW[s.to];
              return (
                <div key={s.id} className="flex items-center gap-2 text-[9px] text-slate-400 py-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                  <Activity className="w-3 h-3 shrink-0" />
                  <span className="font-bold">{s.user}</span> moved
                  <span className={`font-black ${from.text}`}>{from.label}</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                  <span className={`font-black ${to.text}`}>{to.label}</span>
                  {s.reason && <span className="text-slate-400">· {s.reason}</span>}
                  <span className="ml-auto shrink-0">{fmtTime(s.time)}</span>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

// ─── Detail Form ──────────────────────────────────────────────────────────────

function DetailForm({ task, dept, karigars, production, taskName, onSave, onCancel }: {
  task: EnrichedTask; dept: DeptConfig; karigars: Karigar[];
  production: WorkOrder[]; taskName: string;
  onSave: (t: EnrichedTask) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<EnrichedTask>(task);
  const [activeSection, setActiveSection] = useState("output");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [showHoldModal, setShowHoldModal] = useState(false);
  const isNew = !!task.isNew;

  const set = (patch: Partial<EnrichedTask>) => setForm(f => ({ ...f, ...patch }));
  const setExtra = (key: string, val: any) => set({ customData: { ...(form.customData || {}), [key]: val } });

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); onSave(form); }
      // Plain S to save (only when not focused on an input/textarea/select)
      if (e.key === "s" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (!["INPUT", "TEXTAREA", "SELECT"].includes(tag)) {
          e.preventDefault();
          onSave(form);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [form, onCancel, onSave]);

  const doTransition = (to: WorkflowState, reason?: string) => {
    const entry: StateTransition = { time: new Date().toISOString(), from: form.workflowState, to, user: "Me", reason };
    set({
      workflowState: to,
      stateHistory: [entry, ...(form.stateHistory || [])],
      startedAt: to === "Work In Progress" && !form.startedAt ? new Date().toISOString() : form.startedAt,
      completedAt: to === "Completed" ? new Date().toISOString() : form.completedAt,
    });
  };

  const pct = form.woQty > 0 ? Math.min(100, Math.round((form.completedQuantity || 0) / form.woQty * 100)) : 0;
  const wf = WORKFLOW[form.workflowState];
  const validNextStates = wf.nextStates;

  const SECTIONS = [
    { id: "output", label: "Output", icon: Target },
    { id: "subtasks", label: "Sub-tasks", icon: GitBranch },
    { id: "checklist", label: "Checklist", icon: ListChecks },
    { id: "worker", label: "Worker", icon: Users },
    { id: "dept", label: dept.label, icon: Zap },
    { id: "comments", label: "Comments", icon: MessageSquare },
    { id: "notes", label: "Notes", icon: FileText },
  ];

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2.5 flex items-center justify-between shadow-sm gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <span className="text-lg shrink-0">{dept.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xs font-black text-slate-900 dark:text-white truncate">{isNew ? `New ${taskName} Job Card` : task.name}</h2>
              <WorkflowBadge state={form.workflowState} />
            </div>
            {!isNew && <p className="text-[10px] text-slate-400 font-mono">{form.woId} · {form.woProduct}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {/* Priority picker */}
          <select value={form.priority} onChange={e => set({ priority: e.target.value as Priority })}
            className="text-[10px] font-black rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none">
            {(["Low", "Medium", "High", "Urgent"] as Priority[]).map(p => <option key={p}>{p}</option>)}
          </select>

          {/* Due date */}
          <input type="date" value={form.dueDate || ""} onChange={e => set({ dueDate: e.target.value })}
            className="text-[10px] font-bold rounded-lg px-2 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 outline-none" />

          {/* Workflow transitions */}
          {!isNew && validNextStates.map(ns => {
            const nw = WORKFLOW[ns];
            const NIcon = nw.icon;
            const isReject = ns === "Rejected";
            const isHold = ns === "On Hold";
            return (
              <button key={ns}
                onClick={() => {
                  if (isReject) { setShowRejectModal(true); return; }
                  if (isHold) { setShowHoldModal(true); return; }
                  doTransition(ns);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${nw.bg} ${nw.text} border border-current/20`}>
                <NIcon className="w-3 h-3" />
                <span className="hidden sm:inline">{nw.label}</span>
              </button>
            );
          })}

          <button onClick={() => onSave(form)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${dept.tw.btnBg}`}>
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      {/* Workflow pipeline strip */}
      {!isNew && (
        <div className={`px-3 py-1.5 flex items-center gap-1 overflow-x-auto shrink-0 ${dept.tw.bg} border-b ${dept.tw.border}`}>
          {(["Draft", "Open", "Work In Progress", "QC Review", "Completed"] as WorkflowState[]).map((s, i) => {
            const cfg = WORKFLOW[s];
            const Icon = cfg.icon;
            const active = form.workflowState === s;
            // Include "Completed" so steps before it correctly render as passed (green)
            const orderedStates: WorkflowState[] = ["Draft", "Open", "Work In Progress", "QC Review", "Completed"];
            const passed = orderedStates.indexOf(form.workflowState) > i;
            return (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black whitespace-nowrap transition-all ${active ? `${cfg.bg} ${cfg.text} shadow-sm` : passed ? "text-emerald-600 dark:text-emerald-400" : "text-slate-300 dark:text-slate-600"}`}>
                  <Icon className="w-2.5 h-2.5" />{cfg.label}
                </div>
                {i < 4 && <div className={`flex-1 h-px min-w-3 ${passed ? "bg-emerald-400" : "bg-slate-200 dark:bg-slate-700"}`} />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 gap-0 overflow-hidden min-h-0">
        {/* Main */}
        <div className="flex-1 p-3 sm:p-4 space-y-3 overflow-y-auto pb-6">
          {/* Section nav */}
          <div className="flex gap-0.5 p-0.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto w-full">
            {SECTIONS.map(sec => {
              const Icon = sec.icon;
              return (
                <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black whitespace-nowrap transition-all ${activeSection === sec.id ? dept.tw.tabActive : "text-slate-400 hover:text-slate-600"}`}>
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{sec.label}</span>
                  <span className="sm:hidden">{sec.label.slice(0, 4)}</span>
                </button>
              );
            })}
          </div>

          {/* WO link for new */}
          {isNew && (
            <FormCard title="Link Work Order" icon={Package}>
              <select value={form.woId || ""} onChange={e => {
                const wo = production.find(w => w.id === e.target.value);
                set({ woId: e.target.value, woProduct: wo?.productName, woQty: wo?.quantity || 0 });
              }} className="erp-input w-full">
                <option value="">— Select Work Order —</option>
                {production.map(wo => <option key={wo.id} value={wo.id}>{wo.id} — {wo.productName} ({wo.quantity} pcs)</option>)}
              </select>
            </FormCard>
          )}

          {/* OUTPUT */}
          {activeSection === "output" && (
            <FormCard title="Production Output" icon={Target}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <FieldLabel>Total Order</FieldLabel>
                  <div className="erp-input bg-slate-50 dark:bg-slate-800 text-slate-400">{form.woQty || 0} pcs</div>
                </div>
                <div>
                  <FieldLabel>Completed ✓</FieldLabel>
                  <input type="number" min={0} className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                    value={form.completedQuantity || ""} onChange={e => set({ completedQuantity: parseInt(e.target.value) || 0 })} placeholder="0" />
                </div>
                <div>
                  <FieldLabel>Rejected ✗</FieldLabel>
                  <input type="number" min={0} className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700 font-black"
                    value={form.rejectedQuantity || ""} onChange={e => set({ rejectedQuantity: parseInt(e.target.value) || 0 })} placeholder="0" />
                </div>
              </div>
              {(form.woQty || 0) > 0 && (
                <>
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span className="font-bold">Completion</span>
                    <span className="font-black" style={{ color: dept.accentHex }}>{pct}%</span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: dept.accentHex }} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">
                    {form.completedQuantity || 0} completed · {form.rejectedQuantity || 0} rejected · {Math.max(0, (form.woQty || 0) - (form.completedQuantity || 0) - (form.rejectedQuantity || 0))} remaining
                  </p>
                </>
              )}
            </FormCard>
          )}

          {/* SUB-TASKS */}
          {activeSection === "subtasks" && (
            <FormCard title="Sub-tasks" icon={GitBranch}>
              <SubTaskManager
                subTasks={form.subTasks || []}
                setSubTasks={st => set({ subTasks: st })}
                karigars={karigars}
                dept={dept}
              />
            </FormCard>
          )}

          {/* CHECKLIST */}
          {activeSection === "checklist" && (
            <FormCard title="Quality Checklist" icon={ListChecks}>
              <ChecklistManager
                checklist={form.checklist || []}
                setChecklist={cl => set({ checklist: cl })}
                dept={dept}
              />
            </FormCard>
          )}

          {/* WORKER */}
          {activeSection === "worker" && karigars.length > 0 && (
            <FormCard title="Assign Karigar (Worker)" icon={Users}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button type="button" onClick={() => set({ assignedTo: "" })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${!form.assignedTo ? `${dept.tw.border} ${dept.tw.bg} ${dept.tw.text}` : "border-slate-200 dark:border-slate-700 text-slate-400"}`}>
                  <User className="w-3.5 h-3.5" /> Unassigned
                </button>
                {karigars.map(k => (
                  <button key={k.id} type="button" onClick={() => set({ assignedTo: k.id })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all ${form.assignedTo === k.id ? `${dept.tw.border} ${dept.tw.bg} ${dept.tw.text} font-black` : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300"}`}>
                    <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[9px] font-black text-indigo-600 shrink-0">{k.name.charAt(0).toUpperCase()}</div>
                    <span className="text-[11px] font-bold truncate">{k.name}</span>
                  </button>
                ))}
              </div>
            </FormCard>
          )}

          {/* DEPT FIELDS */}
          {activeSection === "dept" && dept.extraFields.length > 0 && (
            <FormCard title={`${dept.label} Specific Details`} icon={Zap}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dept.extraFields.map(field => (
                  <div key={field.key}>
                    <FieldLabel>{field.icon} {field.label}</FieldLabel>
                    {field.hint && <p className="text-[10px] text-slate-400 mb-1">{field.hint}</p>}
                    {field.type === "select" ? (
                      <select className="erp-input w-full" value={(form.customData || {})[field.key] || ""}
                        onChange={e => setExtra(field.key, e.target.value)}>
                        <option value="">— Select —</option>
                        {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea className="erp-input w-full resize-none" rows={3} placeholder={field.placeholder}
                        value={(form.customData || {})[field.key] || ""}
                        onChange={e => setExtra(field.key, e.target.value)} />
                    ) : (
                      <input type={field.type} className="erp-input w-full" placeholder={field.placeholder}
                        value={(form.customData || {})[field.key] || ""}
                        onChange={e => setExtra(field.key, field.type === "number" ? Number(e.target.value) : e.target.value)} />
                    )}
                  </div>
                ))}
              </div>
            </FormCard>
          )}

          {/* COMMENTS */}
          {activeSection === "comments" && (
            <FormCard title="Comments & Activity" icon={MessageSquare}>
              <CommentsFeed
                comments={form.comments || []}
                setComments={c => set({ comments: c })}
                stateHistory={form.stateHistory || []}
              />
            </FormCard>
          )}

          {/* NOTES */}
          {activeSection === "notes" && (
            <FormCard title="Notes & Remarks" icon={FileText}>
              <textarea className="erp-input w-full resize-none" rows={6}
                placeholder="Any instructions, quality notes, or remarks…"
                value={form.notes || ""} onChange={e => set({ notes: e.target.value })} />
            </FormCard>
          )}
        </div>

        {/* Sidebar — desktop */}
        <div className="w-72 shrink-0 hidden lg:flex flex-col p-3 gap-3 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-y-auto">
          <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl ${dept.tw.bg} border ${dept.tw.border}`}>
            <span className="text-2xl">{dept.icon}</span>
            <div>
              <p className={`text-xs font-black ${dept.tw.text}`}>{dept.label}</p>
              <p className="text-[10px] text-slate-400">Department</p>
            </div>
          </div>

          <div   className="space-y-1.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Quick Info</p>
            {[
              { l: "Work Order", v: form.woId || "—" },
              { l: "Product", v: form.woProduct || "—" },
              { l: "Total Qty", v: form.woQty ? `${form.woQty} pcs` : "—" },
              { l: "Completed", v: form.completedQuantity ? `${form.completedQuantity} pcs` : "—" },
              { l: "Priority", v: form.priority },
              { l: "Due Date", v: form.dueDate ? fmtDate(form.dueDate) : "—" },
              { l: "Sub-tasks", v: form.subTasks?.length ? `${form.subTasks.filter(s => s.status === "Done").length}/${form.subTasks.length} done` : "None" },
              { l: "Checklist", v: form.checklist?.length ? `${form.checklist.filter(c => c.done).length}/${form.checklist.length} checked` : "None" },
            ].map(({ l, v }) => (
              <div key={l} className="flex items-start justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-medium shrink-0">{l}</span>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 text-right">{v}</span>
              </div>
            ))}
          </div>

          {/* State history */}
          {(form.stateHistory?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">State History</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {form.stateHistory.slice(0, 6).map((s, i) => {
                  const to = WORKFLOW[s.to];
                  const ToIcon = to.icon;
                  return (
                    <div key={`${s.time}-${s.to}`} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
                      <ToIcon className={`w-3 h-3 shrink-0 mt-0.5 ${to.text}`} />
                      <div>
                        <p className={`text-[10px] font-black ${to.text}`}>{to.label}</p>
                        <p className="text-[9px] text-slate-400">{fmtTime(s.time)}</p>
                        {s.reason && <p className="text-[9px] text-slate-500 mt-0.5 italic">"{s.reason}"</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2"><XCircle className="w-4 h-4 text-rose-500" /> Reject Job Card</h3>
            <p className="text-[11px] text-slate-500 mb-3">Please provide a reason for rejection.</p>
            <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection…" className="erp-input w-full resize-none mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { doTransition("Rejected", rejectReason); setShowRejectModal(false); setRejectReason(""); }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-black">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1 flex items-center gap-2"><PauseCircle className="w-4 h-4 text-orange-500" /> Put On Hold</h3>
            <p className="text-[11px] text-slate-500 mb-3">Please provide a reason for putting this on hold.</p>
            <textarea rows={3} value={holdReason} onChange={e => setHoldReason(e.target.value)}
              placeholder="Reason for hold…" className="erp-input w-full resize-none mb-3" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowHoldModal(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={() => { doTransition("On Hold", holdReason); setShowHoldModal(false); setHoldReason(""); }}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-black">Hold</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .erp-input {
          border: 1.5px solid #e2e8f0;
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          background: white;
          outline: none;
          width: 100%;
          transition: border-color 0.15s, box-shadow 0.15s;
          display: block;
        }
        .dark .erp-input { background: #1e293b; color: #f1f5f9; border-color: #334155; }
        .erp-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.10); }
        select.erp-input { cursor: pointer; }
      `}</style>
    </div>
  );
}

// (module-level mutable global removed — taskName is now passed as a prop)

// ─── Enrich task (op → EnrichedTask) ─────────────────────────────────────────

function enrichOp(op: any, wo: WorkOrder, opIndex: number): EnrichedTask {
  const rawState = (op.status || "Open") as string;
  // map legacy statuses to workflow states
  const stateMap: Record<string, WorkflowState> = {
    PENDING: "Open", OPEN: "Open", Open: "Open",
    IN_PROGRESS: "Work In Progress",
    COMPLETED: "Completed",
    Draft: "Draft",
    "Work In Progress": "Work In Progress",
    "QC Review": "QC Review",
    "Completed": "Completed",
    "On Hold": "On Hold",
    "Rejected": "Rejected",
  };
  return {
    ...op,
    _uid: `${wo.id}-${opIndex}`,
    woId: wo.id,
    woQty: wo.quantity,
    woProduct: wo.productName,
    opIndex,
    workflowState: stateMap[rawState] || stateMap[rawState.toUpperCase()] || "Open",
    priority: op.priority || "Medium",
    dueDate: op.dueDate,
    subTasks: op.subTasks || [],
    checklist: op.checklist || [],
    comments: op.comments || [],
    stateHistory: op.stateHistory || [],
  };
}

// ─── Main TaskBoard ───────────────────────────────────────────────────────────

export default function TaskBoard({ taskName: tn, production, onUpdateWorkOrder, karigars = [] }: TaskBoardProps) {
  const dept = getDept(tn);

  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [editingTask, setEditingTask] = useState<EnrichedTask | null>(null);
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const allTasks = useMemo<EnrichedTask[]>(() => {
    return production.flatMap(wo => {
      const ops = wo.operations || [];
      return ops
        .map((op, idx) => enrichOp(op, wo, idx))
        .filter(op => opBelongsToDept(op, tn))
        .map(op => {
          // ── ERPNext-style gating: if the previous step in the WO is not
          // yet Completed, mark this op as _blocked so the board shows it
          // but clearly indicates it cannot start yet.
          const globalIdx = ops.findIndex(
            (o, i) => `${wo.id}-${i}` === op._uid
          );
          if (globalIdx > 0) {
            const prevOp = ops[globalIdx - 1];
            const prevDone =
              prevOp.status === "Completed" ||
              prevOp.status === "COMPLETED" ||
              (prevOp as any).workflowState === "Completed";
            if (!prevDone) {
              return { ...op, _blocked: true, _blockedBy: prevOp.name || "Previous step" };
            }
          }
          return op;
        });
    });
  }, [production, tn]);

  const stateCounts = useMemo(() => {
    const c: Record<string, number> = { ALL: allTasks.length };
    allTasks.forEach(t => { c[t.workflowState] = (c[t.workflowState] || 0) + 1; });
    return c;
  }, [allTasks]);

  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => {
      if (stateFilter !== "ALL" && t.workflowState !== stateFilter) return false;
      if (filterAssigned && t.assignedTo !== filterAssigned) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return t.woId?.toLowerCase().includes(q) || t.woProduct?.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allTasks, stateFilter, searchTerm, filterAssigned, filterPriority]);

  const saveTask = useCallback((updatedTask: EnrichedTask, opts?: { closeDrawer?: boolean; clearSelection?: boolean }) => {
    const { closeDrawer = true, clearSelection = true } = opts ?? {};
    const wo = production.find(w => w.id === updatedTask.woId);
    if (!wo) return;

    // map workflow state back to legacy status
    const stateToStatus: Record<WorkflowState, string> = {
      Draft: "PENDING", Open: "PENDING",
      "Work In Progress": "IN_PROGRESS",
      "QC Review": "IN_PROGRESS",
      Completed: "COMPLETED",
      "On Hold": "PENDING",
      Rejected: "PENDING",
    };

    let newOps = (wo.operations || []).map((op, i) =>
      i === updatedTask.opIndex ? {
        ...op,
        status: stateToStatus[updatedTask.workflowState],
        workflowState: updatedTask.workflowState,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        subTasks: updatedTask.subTasks,
        checklist: updatedTask.checklist,
        comments: updatedTask.comments,
        stateHistory: updatedTask.stateHistory,
        completedQuantity: updatedTask.completedQuantity,
        rejectedQuantity: updatedTask.rejectedQuantity,
        assignedTo: updatedTask.assignedTo,
        startedAt: updatedTask.startedAt,
        completedAt: updatedTask.completedAt,
        notes: updatedTask.notes,
        customData: { ...(op.customData || {}), ...updatedTask.customData },
      } : op
    );

    if (updatedTask.isNew && updatedTask.woId) {
      newOps = [...(wo.operations || []), {
        id: `OP-${Date.now()}`,
        name: tn,
        stage: tn.toUpperCase(),
        processType: "IN_HOUSE" as const,
        workstationType: tn,
        plannedHours: 4,
        qualityCheckpoint: false,
        status: stateToStatus[updatedTask.workflowState],
        workflowState: updatedTask.workflowState,
        priority: updatedTask.priority,
        dueDate: updatedTask.dueDate,
        subTasks: updatedTask.subTasks || [],
        checklist: updatedTask.checklist || dept.defaultChecklist.map(l => ({ id: uid(), label: l, done: false })),
        comments: updatedTask.comments || [],
        stateHistory: updatedTask.stateHistory || [],
        completedQuantity: updatedTask.completedQuantity || 0,
        rejectedQuantity: updatedTask.rejectedQuantity || 0,
        assignedTo: updatedTask.assignedTo,
        customData: updatedTask.customData || {},
        notes: updatedTask.notes,
      }];
    }

    const completedOps = newOps.filter(o => ["COMPLETED", "Completed"].includes(o.status || "")).length;
    const progress = newOps.length > 0 ? Math.round(completedOps / newOps.length * 85) : wo.progress || 0;
    onUpdateWorkOrder({ ...wo, operations: newOps, progress: Math.max(wo.progress || 0, progress) });
    if (closeDrawer) setEditingTask(null);
    if (clearSelection) setSelectedIds([]);
  }, [production, tn, onUpdateWorkOrder, dept]);

  const doTransition = useCallback((task: EnrichedTask, to: WorkflowState, opts?: { closeDrawer?: boolean; clearSelection?: boolean }) => {
    const entry: StateTransition = { time: new Date().toISOString(), from: task.workflowState, to, user: "Me" };
    saveTask({
      ...task,
      workflowState: to,
      stateHistory: [entry, ...(task.stateHistory || [])],
      startedAt: to === "Work In Progress" && !task.startedAt ? new Date().toISOString() : task.startedAt,
      completedAt: to === "Completed" ? new Date().toISOString() : task.completedAt,
    }, opts);
  }, [saveTask]);

  const updateSubTasks = useCallback((task: EnrichedTask, newSubTasks: SubTask[]) => {
    saveTask({ ...task, subTasks: newSubTasks }, { closeDrawer: false, clearSelection: false });
  }, [saveTask]);

  const bulkComplete = () => {
    filteredTasks.filter(t => selectedIds.includes(t._uid)).forEach(t =>
      doTransition(t, "Completed", { closeDrawer: false, clearSelection: false })
    );
    setSelectedIds([]);
  };

  const bulkHold = () => {
    filteredTasks.filter(t => selectedIds.includes(t._uid)).forEach(t =>
      doTransition(t, "On Hold", { closeDrawer: false, clearSelection: false })
    );
    setSelectedIds([]);
  };

  const openNew = () => {
    const firstWo = production[0];
    const newTask: EnrichedTask = {
      isNew: true,
      name: tn,
      workflowState: "Open",
      priority: "Medium",
      _uid: `new-${uid()}`,
      opIndex: -1,
      id: "",
      woId: firstWo?.id || "",
      woQty: firstWo?.quantity || 0,
      woProduct: firstWo?.productName || "",
      subTasks: [],
      checklist: dept.defaultChecklist.map(l => ({ id: uid(), label: l, done: false })),
      comments: [],
      stateHistory: [],
    };
    setEditingTask(newTask);
  };

  return (
    <div id="taskboard-print-target" className="min-h-screen bg-slate-50 dark:bg-slate-950 p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
      {/* Page header */}
      <div className={`flex items-center justify-between p-3 sm:p-4 rounded-2xl border ${dept.tw.border} ${dept.tw.bg} flex-wrap gap-2`}>
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl sm:text-4xl shrink-0">{dept.icon}</span>
          <div className="min-w-0">
            <h1 className={`text-lg sm:text-xl font-black ${dept.tw.text} truncate`}>{tn} Department</h1>
            <p className="text-[10px] sm:text-[11px] text-slate-500">{stateCounts.ALL || 0} job cards · {stateCounts["Work In Progress"] || 0} in progress · {stateCounts.Completed || 0} completed</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${dept.tw.badge} border ${dept.tw.border}`}>{dept.label}</div>
          <button onClick={() => {
            const style = document.createElement("style");
            style.id = "__taskboard-print-style";
            style.textContent = `@media print { body > * { display: none !important; } #taskboard-print-target { display: block !important; } }`;
            document.head.appendChild(style);
            try {
              window.print();
            } finally {
              document.head.removeChild(style);
            }
          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 hover:bg-white dark:hover:bg-slate-800 transition-colors">
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* KPI bar */}
      <KPIBar tasks={allTasks} dept={dept} />

      {/* Toolbar */}
      <Toolbar
        dept={dept} taskName={tn} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        viewMode={viewMode} setViewMode={setViewMode}
        stateFilter={stateFilter} setStateFilter={setStateFilter} stateCounts={stateCounts}
        filterAssigned={filterAssigned} setFilterAssigned={setFilterAssigned}
        filterPriority={filterPriority} setFilterPriority={setFilterPriority}
        karigars={karigars} selectedIds={selectedIds}
        onBulkComplete={bulkComplete} onBulkHold={bulkHold}
        onClearSelect={() => setSelectedIds([])} onNewCard={openNew}
      />

      {/* Views */}
      {viewMode === "LIST" && (
        <ListView
          tasks={filteredTasks} dept={dept} karigars={karigars}
          selectedIds={selectedIds}
          onToggleSelect={(uid: string) => setSelectedIds(prev => prev.includes(uid) ? prev.filter(i => i !== uid) : [...prev, uid])}
          onSelectAll={setSelectedIds}
          onEdit={setEditingTask}
          onTransition={doTransition}
          onUpdateSubTask={updateSubTasks}
        />
      )}
      {viewMode === "KANBAN" && (
        <KanbanView
          tasks={filteredTasks} dept={dept} karigars={karigars}
          onEdit={setEditingTask} onTransition={doTransition}
        />
      )}
      {viewMode === "TIMELINE" && (
        <TimelineView tasks={filteredTasks} dept={dept} karigars={karigars} onEdit={setEditingTask} />
      )}

      {filteredTasks.length > 0 && (
        <p className="text-center text-[10px] text-slate-400 font-medium pb-4">
          Showing {filteredTasks.length} of {stateCounts.ALL || 0} job cards
        </p>
      )}

      {/* Detail Form — slide-in drawer overlay */}
      {editingTask && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
            onClick={() => setEditingTask(null)}
          />
          {/* Drawer panel */}
          <div className="fixed top-0 right-0 h-full w-full max-w-2xl z-50 shadow-2xl overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 animate-slideIn">
            <DetailForm
              task={editingTask}
              dept={dept}
              karigars={karigars}
              production={production}
              taskName={tn}
              onSave={saveTask}
              onCancel={() => setEditingTask(null)}
            />
          </div>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); opacity: 0.5; }
              to   { transform: translateX(0);    opacity: 1; }
            }
            .animate-slideIn { animation: slideIn 0.22s cubic-bezier(0.22,1,0.36,1) both; }
          `}</style>
        </>
      )}
    </div>
  );
}
