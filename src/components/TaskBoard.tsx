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
import { uuidShort } from "../utils/uuid";
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
  ShieldCheck, Clock, Timer,
  ListChecks, Flame,
} from "lucide-react";
import type { ProductionJob as WorkOrder, Karigar } from "../types";
import {
  computeBlockState,
  getUnlockedDepts,
  getInheritedFieldData,
  opBelongsToDept as pipelineOpBelongsToDept,
  STAGE_TO_DEPT as PIPELINE_STAGE_TO_DEPT,
  GARMENT_PIPELINE,
} from "./pipelineWiring";

/**
 * deptNameToStageId — converts a department tab label (e.g. "Fabric Inspection")
 * to its canonical StageId (e.g. "FABRIC_INSPECTION").
 *
 * This is THE fix for the dynamic routing bug: when a new job card is saved for
 * a dept, the operation's `stage` field must be a proper StageId (underscores,
 * uppercase) so that pipelineWiring.getOpStageId() can match it against STAGE_MAP.
 *
 * Previously: stage: tn.toUpperCase()  → "FABRIC INSPECTION"  (broken — spaces)
 * Fixed:      stage: deptNameToStageId(tn) → "FABRIC_INSPECTION" (correct)
 */
function deptNameToStageId(deptTabName: string): string {
  const lower = deptTabName.toLowerCase().trim();
  // Exact dept match first
  for (const stage of GARMENT_PIPELINE) {
    if (stage.dept.toLowerCase() === lower) return stage.id;
  }
  // Fuzzy: stage label match
  for (const stage of GARMENT_PIPELINE) {
    if (stage.label.toLowerCase() === lower) return stage.id;
  }
  // Fuzzy: partial match
  for (const stage of GARMENT_PIPELINE) {
    if (lower.includes(stage.dept.toLowerCase()) || stage.dept?.toLowerCase()?.includes(lower)) return stage.id;
  }
  // Fallback: spaces→underscores uppercase (better than plain toUpperCase with spaces)
  return deptTabName.trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z_]/g, "");
}
import { PipelineStrip, UnlockToast } from "./PipelineStrip";
import { toast } from "../utils/toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskBoardProps {
  taskName: string;
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars?: Karigar[];
  inventory?: any[];
  onUpdateInventory?: (item: any) => void;
  onCreateGatePass?: (gp: any) => void;
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
  pieceTag?: string;     // e.g. "Kurti", "Pant", "Dupatta" — extracted from op.name brackets
  plannedStartDate?: string; // auto-derived from WO startDate + cumulative hours of prior ops
  plannedDueDate?: string;   // auto-derived from WO startDate + cumulative hours up to this op
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

  // ─── CUTTING ─────────────────────────────────────────────────────────────────
  Cutting: {
    icon: "✂️", label: "Cutting", accentHex: "#f43f5e",
    tw: { bg: "bg-rose-50 dark:bg-rose-950/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", kpiBg: "bg-rose-500", tabActive: "bg-rose-600 text-white", btnBg: "bg-rose-600 hover:bg-rose-700 text-white" },
    defaultChecklist: [
      "Fabric lot & shade verified against WO",
      "Cutting table cleaned & prepared",
      "Fabric relaxed / spread (min 4 hrs)",
      "Marker efficiency checked (≥85%)",
      "Lay height & layer count recorded",
      "Notches & drill marks verified",
      "Cutting done — count matched with WO qty",
      "Bundle tagging done (size / colour / lot)",
      "Fusing done (if applicable)",
      "Wastage weighed & recorded",
      "Cut pieces handed to Stitching with checklist",
    ],
    subTaskTypes: [
      "Fabric Relaxing / Conditioning",
      "Fabric Spreading (Lay)",
      "Marker Making / Placement",
      "Straight Knife Cutting",
      "Band Knife Cutting",
      "Die Cutting (Collar / Cuff)",
      "Fusing (Interlining Attach)",
      "Bundling & Lot Tagging",
      "Numbering (Panel Numbering)",
      "Wastage Segregation",
      "Re-cut (Defect Replacement)",
      "Cut Panel Count & Issue to Stitching",
    ],
    extraFields: [
      { key: "fabricLot", label: "Fabric Lot No.", type: "text", placeholder: "FAB-RED-001", icon: "🧵" },
      { key: "colorShade", label: "Colour / Shade", type: "text", placeholder: "Navy Blue – Shade 4B", icon: "🎨" },
      { key: "layers", label: "No. of Layers (Lay)", type: "number", placeholder: "80", hint: "Fabric layers in one lay", icon: "📚" },
      { key: "markerLength", label: "Marker Length (mtr)", type: "number", placeholder: "2.80", icon: "📏" },
      { key: "markerEfficiency", label: "Marker Efficiency %", type: "number", placeholder: "86", hint: "Target ≥85%", icon: "⚡" },
      { key: "tableNo", label: "Cutting Table No.", type: "text", placeholder: "Table 2", icon: "🪑" },
      { key: "cuttingMachine", label: "Cutting Machine", type: "select", options: ["Straight Knife", "Band Knife", "Round Knife", "Die Press", "Manual"], icon: "⚙️" },
      { key: "fusingRequired", label: "Fusing Required?", type: "select", options: ["Yes – Done", "Yes – Pending", "No"], icon: "🔥" },
      { key: "fusingMachine", label: "Fusing Machine Temp (°C)", type: "number", placeholder: "150", icon: "🌡️" },
      { key: "totalPanelsCut", label: "Total Panels Cut", type: "number", placeholder: "0", icon: "📐" },
      { key: "wasteKg", label: "Fabric Waste (kg)", type: "number", placeholder: "0", icon: "♻️" },
      { key: "wastePct", label: "Waste %", type: "number", placeholder: "0", hint: "Auto: waste ÷ total fabric used", icon: "📉" },
      { key: "recutQty", label: "Re-cut Qty (Defect)", type: "number", placeholder: "0", icon: "🔁" },
      { key: "sizeSet", label: "Size Set", type: "text", placeholder: "S / M / L / XL – 30/40/20/10", icon: "📊" },
      { key: "bundleCount", label: "Bundle Count", type: "number", placeholder: "0", icon: "🗂️" },
      { key: "cutBy", label: "Cut By (Worker)", type: "text", placeholder: "Ramesh K.", icon: "👷" },
    ],
  },

  // ─── STITCHING ───────────────────────────────────────────────────────────────
  Stitching: {
    icon: "🧵", label: "Stitching", accentHex: "#6366f1",
    tw: { bg: "bg-indigo-50 dark:bg-indigo-950/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", kpiBg: "bg-indigo-500", tabActive: "bg-indigo-600 text-white", btnBg: "bg-indigo-600 hover:bg-indigo-700 text-white" },
    defaultChecklist: [
      "Cut bundles received & counted",
      "Machine threaded & needle size checked",
      "Thread colour matched with BOM",
      "SPI (stitches per inch) verified",
      "First piece / pilot sample approved by supervisor",
      "Target per hour set on production board",
      "SMV recorded",
      "Inline QC at every 50 pieces",
      "End-line check done",
      "Completed pieces forwarded to Finishing",
    ],
    subTaskTypes: [
      // Assembly operations (garment-part level)
      "Front Panel Join",
      "Back Panel Join",
      "Shoulder Join",
      "Side Seam",
      "Sleeve Making",
      "Sleeve Attach (Set-in / Raglan)",
      "Collar / Neckband Making",
      "Collar Attach",
      "Cuff Making",
      "Cuff Attach",
      "Placket Making & Attach",
      "Pocket Making",
      "Pocket Attach",
      "Waistband Attach",
      "Belt Loop Attach",
      "Fly / Zipper Attach",
      "Lining Attach",
      "Bottom Hem",
      "Sleeve Hem",
      "Thread Trimming (In-line)",
      // Machine-type operations
      "Overlock (Serging)",
      "Flat Lock Stitch",
      "Bar Tack",
      "Button Hole",
      "Button Attach",
      "Hook & Eye Attach",
      "Snap / Press Stud Attach",
      "Blind Hem (Blind Stitch)",
      "Chain Stitch",
      // QC sub-tasks
      "Inline QC (per 50 pcs)",
      "End-line QC",
      "Measurement Check",
    ],
    extraFields: [
      { key: "lineNo", label: "Stitching Line No.", type: "text", placeholder: "Line 3", icon: "🏭" },
      { key: "machineNo", label: "Machine No.", type: "text", placeholder: "M-12", icon: "⚙️" },
      { key: "stitchType", label: "Primary Stitch Type", type: "select", options: ["Lock Stitch (SN)", "Chain Stitch (DN)", "Overlock (3T/4T/5T)", "Flat Lock", "Blind Hem", "Bar Tack", "Button Sew"], icon: "🔗" },
      { key: "spi", label: "SPI (Stitches per Inch)", type: "number", placeholder: "12", hint: "Standard: 12–14 SPI for wovens", icon: "🔬" },
      { key: "needleSize", label: "Needle Size", type: "select", options: ["65/9", "75/11", "80/12", "90/14", "100/16", "110/18"], icon: "🪡" },
      { key: "threadCount", label: "Thread Count / Ticket", type: "text", placeholder: "120/2 – Gütermann", icon: "🧵" },
      { key: "threadColor", label: "Thread Colour Code", type: "text", placeholder: "White – 000 / Navy – 310", icon: "🎨" },
      { key: "smv", label: "SMV (min)", type: "number", placeholder: "14.5", hint: "Standard Minute Value per piece", icon: "⏱️" },
      { key: "targetPerHr", label: "Target / Hour (pcs)", type: "number", placeholder: "45", icon: "🎯" },
      { key: "actualPerHr", label: "Actual / Hour (pcs)", type: "number", placeholder: "0", icon: "📊" },
      { key: "efficiency", label: "Operator Efficiency %", type: "number", placeholder: "0", hint: "Actual ÷ Target × 100", icon: "⚡" },
      { key: "operatorGrade", label: "Operator Grade", type: "select", options: ["Grade A – Master", "Grade B – Senior", "Grade C – Skilled", "Grade D – Semi-skilled", "Trainee"], icon: "👷" },
      { key: "inlineQcFreq", label: "Inline QC Frequency", type: "select", options: ["Every 25 pcs", "Every 50 pcs", "Every 100 pcs", "End-of-line only"], icon: "🔍" },
      { key: "defectQty", label: "Defect Qty (inline)", type: "number", placeholder: "0", icon: "❌" },
      { key: "alterationQty", label: "Sent for Alteration", type: "number", placeholder: "0", icon: "🔄" },
      { key: "garmentType", label: "Garment Type", type: "select", options: ["Kurti", "Salwar", "Dupatta", "Shirt", "T-Shirt", "Trouser / Pant", "Jacket", "Blouse", "Lehenga", "Saree Blouse", "Co-ord Set", "Other"], icon: "👗" },
    ],
  },

  // ─── EMBROIDERY ──────────────────────────────────────────────────────────────
  Embroidery: {
    icon: "🌸", label: "Embroidery", accentHex: "#8b5cf6",
    tw: { bg: "bg-violet-50 dark:bg-violet-950/20", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", kpiBg: "bg-violet-500", tabActive: "bg-violet-600 text-white", btnBg: "bg-violet-600 hover:bg-violet-700 text-white" },
    defaultChecklist: [
      "Design code & version verified with buyer approval sheet",
      "DST / EMB file loaded on machine & test run completed",
      "Frame / hoop size correct for panel size",
      "Backing / stabiliser type selected & applied",
      "Topping applied (if high-pile or knit fabric)",
      "Thread colours matched against colour card — all bobbins loaded",
      "First piece / strike-off approved by supervisor & buyer (if reqd.)",
      "Stitch count per piece confirmed from DST file",
      "Machine speed set correctly for fabric type",
      "Jump stitches & thread tails trimmed on all pieces",
      "Batch completed — quantity counted & tallied with WO",
      "QC: placement position, colour accuracy, stitch density checked",
      "Rejected / rework pieces separated & tagged",
      "Challan prepared (if job work to vendor)",
      "Received back from vendor — count verified & GRN done",
    ],
    subTaskTypes: [
      // Design & Setup
      "Design Digitising / DST File Preparation",
      "Colour Separation & Thread Mapping",
      "DST File Test Run (Machine Trial)",
      "Machine Setup & Bobbin / Thread Load",
      "Frame / Hoop Selection & Size Check",
      "Backing / Stabiliser Cut & Apply",
      "Topping Apply (High-pile / Knit)",
      // Production runs
      "Hooping / Framing (Panel Mount)",
      "First Piece / Strike-off Run",
      "Colour Approval (First Piece Sign-off)",
      "Bulk Embroidery Run",
      "Re-run / Repair (Colour Mismatch / Break)",
      // Machine-type specific
      "Flat / Regular Embroidery",
      "3D Puff Embroidery",
      "Sequin Embroidery (In-line Machine)",
      "Chenille Embroidery",
      "Appliqué Embroidery (Auto-cut)",
      "Cutwork Embroidery",
      // Post-production
      "Jump Stitch & Thread Trimming",
      "Backing Tear-away / Cut-away",
      "Steam Pressing after Embroidery",
      // QC
      "QC – Placement & Registration Check",
      "QC – Stitch Density & Coverage Check",
      "QC – Colour Accuracy Check",
      "QC – Colour Bleeding / Running Check",
      "QC – Dimensional / Size Check",
      // Vendor job work
      "Challan Prepare & Dispatch to Vendor",
      "Vendor Return Receipt & Count",
      "Post-return Inspection",
      // Completion
      "Count, Bundle & Forward to Next Dept",
    ],
    extraFields: [
      { key: "design", label: "Design Code / Name", type: "text", placeholder: "EMB-FLORAL-072-A", icon: "🎨" },
      { key: "designVersion", label: "Design Version / Approval Date", type: "text", placeholder: "v3 – Approved 01-Jun-2024", icon: "📋" },
      { key: "embType", label: "Embroidery Type", type: "select", options: ["Flat / Regular", "3D Puff", "Appliqué (Auto)", "Sequin (In-line Machine)", "Chenille", "Cutwork", "Aari / Tambour (Machine)", "Mixed / Multiple"], icon: "🌸" },
      { key: "placement", label: "Placement / Position", type: "text", placeholder: "Centre chest – 8 cm from neckline", icon: "📍" },
      { key: "embSize", label: "Design Size (W×H cm)", type: "text", placeholder: "12×10 cm", icon: "📏" },
      { key: "stitchCount", label: "Stitch Count (per piece)", type: "number", placeholder: "12500", hint: "Total stitches from DST file", icon: "🔢" },
      { key: "colorCount", label: "No. of Thread Colours", type: "number", placeholder: "5", icon: "🌈" },
      { key: "threadRef", label: "Thread Brand / Ref", type: "text", placeholder: "Madeira Rayon 40 – Col. 1082", icon: "🧵" },
      { key: "backingType", label: "Backing / Stabiliser Type", type: "select", options: ["Cut-away", "Tear-away", "Wash-away", "Heat-away", "No Backing"], icon: "🧷" },
      { key: "toppingRequired", label: "Topping Required?", type: "select", options: ["No", "Yes – Water-soluble Film", "Yes – Foam (Puff)"], icon: "🫧" },
      { key: "frameSize", label: "Frame / Hoop Size", type: "text", placeholder: "15×20 cm", icon: "🔲" },
      { key: "machineHeads", label: "Machine Heads Used", type: "number", placeholder: "12", icon: "⚙️" },
      { key: "runSpeed", label: "Machine Speed (RPM)", type: "number", placeholder: "750", hint: "Typical range: 600–900 RPM", icon: "⚡" },
      { key: "vendor", label: "Embroidery Vendor (Job Work)", type: "text", placeholder: "Ramesh EMB Works", icon: "🏭" },
      { key: "sentQty", label: "Sent to Vendor (pcs)", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back (pcs)", type: "number", placeholder: "0", icon: "📥" },
      { key: "rejectedQty", label: "Rejected / Rework (pcs)", type: "number", placeholder: "0", icon: "❌" },
      { key: "challanNo", label: "Challan / Gate Pass No.", type: "text", placeholder: "CH-EMB-2024-088", icon: "📄" },
    ],
  },

  // ─── PRINTING ────────────────────────────────────────────────────────────────
  Printing: {
    icon: "🖨️", label: "Printing", accentHex: "#f59e0b",
    tw: { bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", kpiBg: "bg-amber-500", tabActive: "bg-amber-600 text-white", btnBg: "bg-amber-600 hover:bg-amber-700 text-white" },
    defaultChecklist: [
      "Artwork / print file (PDF/AI/DST) received & buyer-approved version confirmed",
      "Screen / plate prepared, coated & exposed correctly",
      "Screen mesh count & tension verified",
      "Registration marks aligned across all colours",
      "Ink colour mixed & shade-matched to approved strike-off",
      "Squeegee hardness, pressure & angle set",
      "Drying / curing temperature & dwell time programmed",
      "First pull / strike-off approved by supervisor",
      "Bulk print run started — inline colour & registration check every 50 pcs",
      "Flash cure done between colours (if multi-colour)",
      "Final cure (tunnel oven) — all pieces passed through",
      "Wash fastness & rub fastness test done on first batch",
      "Print checked for sharpness, bleed, registration, pinholes",
      "Completed pieces counted, bundled & challan raised",
      "Vendor return receipt checked (if job work)",
    ],
    subTaskTypes: [
      // Pre-press
      "Artwork File Check & Colour Separation",
      "Film / Positive Output",
      "Screen Coating (Emulsion Apply)",
      "Screen Exposure (UV Light)",
      "Screen Washing & Drying",
      "Screen Mesh Tension Check",
      "Screen Mounting & Registration",
      "Ink Mixing & Pantone / Shade Matching",
      "Strike-off / First Pull Approval",
      // Screen printing methods
      "Printing – Manual Flat Bed",
      "Printing – Semi-auto Carousel",
      "Printing – Auto Rotary Carousel",
      "Flash Cure (Between Colours)",
      "Final Cure (Tunnel Oven / Conveyor Dryer)",
      // Digital & specialty
      "Printing – Digital DTG (Direct to Garment)",
      "Printing – Sublimation Transfer",
      "Printing – Block / Wooden Block Hand Print",
      "Transfer Print Application (Heat Press)",
      "Foil Print Application",
      "Glitter / Puff / Gel Print",
      "Discharge Print",
      "Pigment / Reactive Print",
      "Rubber / Plastisol Print",
      "Flock / Velvet Print Application",
      // Testing & QC
      "Wash Fastness Test",
      "Rub Fastness (Dry & Wet) Test",
      "Print Placement & Registration Check",
      "Colour Consistency Check (Batch-to-batch)",
      // Vendor job work
      "Challan Prepare & Vendor Dispatch",
      "Vendor Return Receipt & Inspection",
      "Count, Bundle & Forward to Next Dept",
    ],
    extraFields: [
      { key: "printType", label: "Print Type", type: "select", options: ["Screen Print – Manual", "Screen Print – Semi-auto", "Screen Print – Auto Carousel", "Digital DTG", "Sublimation", "Block / Hand Print", "Transfer Print (Heat Press)", "Foil Print", "Discharge Print", "Pigment Print", "Rubber / Plastisol", "Glitter / Puff", "Flock Print", "Mixed / Multiple"], icon: "🖨️" },
      { key: "artworkRef", label: "Artwork File Ref", type: "text", placeholder: "ART-SS25-FLORAL-042-v2", icon: "🎨" },
      { key: "printLocation", label: "Print Location", type: "select", options: ["Front Centre", "Back Centre", "Chest Left", "Chest Right", "All-over (Fabric)", "Sleeve – Left", "Sleeve – Right", "Yoke", "Hem Border", "Multiple Placements"], icon: "📍" },
      { key: "printSize", label: "Print Size (W×H cm)", type: "text", placeholder: "30×25 cm", icon: "📏" },
      { key: "colorCount", label: "No. of Colours", type: "number", placeholder: "4", icon: "🌈" },
      { key: "inkType", label: "Ink / Dye Type", type: "select", options: ["Plastisol", "Water-based", "Discharge Ink", "Pigment", "Sublimation Ink", "Reactive Dye", "Acid Dye", "Foil Adhesive", "UV Ink"], icon: "🧪" },
      { key: "inkLot", label: "Ink Lot / Mix Ref", type: "text", placeholder: "INK-BLK-042", icon: "🏷️" },
      { key: "meshCount", label: "Mesh Count (LPI)", type: "number", placeholder: "120", hint: "Lines per inch — fine detail needs 150+", icon: "🔬" },
      { key: "squeegeeHardness", label: "Squeegee Hardness (Shore)", type: "select", options: ["Soft – 60 Shore", "Medium – 70 Shore", "Hard – 80 Shore", "Extra Hard – 90 Shore"], icon: "📐" },
      { key: "squeegeeAngle", label: "Squeegee Angle (°)", type: "number", placeholder: "75", icon: "📐" },
      { key: "cureTemp", label: "Cure Temp (°C)", type: "number", placeholder: "165", hint: "Plastisol: 160–170°C; Water-based: 150°C", icon: "🌡️" },
      { key: "cureTime", label: "Cure / Dwell Time (sec)", type: "number", placeholder: "45", icon: "⏱️" },
      { key: "washFastnessResult", label: "Wash Fastness Result", type: "select", options: ["Pass – Grade 4+", "Pass – Grade 3-4", "Fail – Retest Needed", "Not Tested Yet"], icon: "✅" },
      { key: "rubFastnessResult", label: "Rub Fastness Result", type: "select", options: ["Pass – Dry & Wet OK", "Pass – Dry OK / Wet Marginal", "Fail – Retest Needed", "Not Tested Yet"], icon: "✅" },
      { key: "vendor", label: "Printer Vendor (Job Work)", type: "text", placeholder: "Sai Screen Printers", icon: "🏭" },
      { key: "sentQty", label: "Sent to Vendor (pcs)", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back (pcs)", type: "number", placeholder: "0", icon: "📥" },
      { key: "rejectedQty", label: "Rejected / Reprint (pcs)", type: "number", placeholder: "0", icon: "❌" },
      { key: "challanNo", label: "Challan No.", type: "text", placeholder: "CH-PRINT-2024-120", icon: "📄" },
    ],
  },

  // ─── WASHING ─────────────────────────────────────────────────────────────────
  Washing: {
    icon: "🫧", label: "Washing", accentHex: "#06b6d4",
    tw: { bg: "bg-cyan-50 dark:bg-cyan-950/20", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", kpiBg: "bg-cyan-500", tabActive: "bg-cyan-600 text-white", btnBg: "bg-cyan-600 hover:bg-cyan-700 text-white" },
    defaultChecklist: [
      "Wash type confirmed against buyer specification / tech pack",
      "Garments sorted by colour, fabric type & weight",
      "Metal hardware / buttons covered or removed before loading",
      "Batch weight checked against machine max capacity",
      "Chemical recipe (detergent, softener, stone, enzyme) issued & mixed correctly",
      "Machine temperature, RPM & wash time programmed",
      "First batch: shrinkage (length & width) measured & recorded",
      "First batch: shade checked under D65 lamp after washing",
      "Post-wash count verified (no missing pieces)",
      "Shade consistency checked batch-to-batch",
      "Hydro extraction & tumble dry completed",
      "Post-wash dimensional check done",
      "Drying, pressing & folding done before dispatch",
      "Challan raised & pieces dispatched to vendor (if job work)",
      "Vendor return receipt verified — count & shade check done",
    ],
    subTaskTypes: [
      // Pre-wash
      "Sorting & Batch Making",
      "Hardware Protection / Button Cover / Zip Up",
      "Pre-treatment / De-sizing / Scouring",
      "Stain Pre-treatment",
      // Wash types
      "Normal / Garment Wash",
      "Cold Wash (Low Temp)",
      "Stone Wash",
      "Pumice Stone Wash",
      "Micro Stone / Bio Stone Wash",
      "Acid Wash",
      "Enzyme Wash (Cellulase)",
      "Bleach Wash (Light / Heavy)",
      "Silicon / Softener Finish",
      "Denim Whiskering (Manual)",
      "Sand Blast / Sand Wash",
      "PP Spray / 3D Crinkle Effect",
      "Over-dye / Tinting",
      "Damage / Destroy Wash",
      "Anti-bacterial / Nano Finish Treatment",
      "Water-repellent (DWR) Finish",
      // Post-wash
      "Hydro Extraction",
      "Tumble Dry",
      "Shade Matching (Batch-to-Batch)",
      "Shrinkage Measurement",
      "Post-wash Dimensional Check",
      "Post-wash Pressing & Folding",
      // Vendor / dispatch
      "Challan Prepare & Vendor Dispatch",
      "Vendor Return Receipt & Shade Approval",
      "Post-return Count & Bundle",
    ],
    extraFields: [
      { key: "washType", label: "Wash Type", type: "select", options: ["Normal Garment Wash", "Cold Wash", "Stone Wash", "Pumice Stone Wash", "Micro / Bio Stone Wash", "Acid Wash", "Enzyme Wash", "Bleach Wash – Light", "Bleach Wash – Heavy", "Silicon / Softener Finish", "Sand Blast / Sand Wash", "PP Spray / 3D Crinkle", "Over-dye / Tint", "Damage / Destroy Wash", "Anti-bacterial Finish", "DWR / Water-repellent Finish", "Mixed / Multiple"], icon: "🫧" },
      { key: "fabricType", label: "Fabric / Garment Type", type: "select", options: ["100% Cotton Woven", "100% Cotton Knit", "Denim", "Linen", "Rayon / Viscose", "Polyester", "Blended Fabric", "Silk / Satin", "Wool / Woollen"], icon: "🧵" },
      { key: "vendor", label: "Laundry / Processing Vendor", type: "text", placeholder: "AK Laundry Services", icon: "🏭" },
      { key: "machineType", label: "Washing Machine Type", type: "select", options: ["Front Load Industrial", "Top Load Industrial", "Overflow Dyeing Machine", "Sample Washing Machine", "Jet Dyeing Machine"], icon: "⚙️" },
      { key: "batchWeight", label: "Batch Weight (kg)", type: "number", placeholder: "50", hint: "Max load per machine cycle", icon: "⚖️" },
      { key: "noOfBatches", label: "No. of Batches", type: "number", placeholder: "4", icon: "🔢" },
      { key: "temperature", label: "Wash Temp (°C)", type: "number", placeholder: "40", icon: "🌡️" },
      { key: "washTime", label: "Wash Time (min)", type: "number", placeholder: "45", icon: "⏱️" },
      { key: "chemicalRef", label: "Chemical Recipe Ref", type: "text", placeholder: "RCP-STONE-07", hint: "Recipe code from chemical register", icon: "🧪" },
      { key: "shrinkageLengthPct", label: "Shrinkage – Length (%)", type: "number", placeholder: "3", icon: "📉" },
      { key: "shrinkageWidthPct", label: "Shrinkage – Width (%)", type: "number", placeholder: "2", icon: "📉" },
      { key: "shadeConsistency", label: "Shade Consistency (Batch-to-Batch)", type: "select", options: ["Consistent – All Batches Pass", "Minor Variation – Acceptable", "Major Variation – Hold for Re-wash", "Not Checked Yet"], icon: "🎨" },
      { key: "sentQty", label: "Sent to Vendor (pcs)", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back (pcs)", type: "number", placeholder: "0", icon: "📥" },
      { key: "rejectedQty", label: "Rejected / Damaged (pcs)", type: "number", placeholder: "0", icon: "❌" },
      { key: "challanNo", label: "Challan No.", type: "text", placeholder: "CH-WASH-2024-055", icon: "📄" },
    ],
  },

  // ─── FINISHING ───────────────────────────────────────────────────────────────
  Finishing: {
    icon: "✨", label: "Finishing", accentHex: "#10b981",
    tw: { bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", kpiBg: "bg-emerald-500", tabActive: "bg-emerald-600 text-white", btnBg: "bg-emerald-600 hover:bg-emerald-700 text-white" },
    defaultChecklist: [
      "Garments received from Stitching / Washing — count verified",
      "Thread trimming (all loose threads) done — 100% pieces",
      "Stain check & spot cleaning done (solvent / water-based as applicable)",
      "Ironing / pressing done as per garment spec & fabric type",
      "Shape / form pressing done (collar, cuff, placket, pocket)",
      "Measurement check on critical dimensions (chest, length, sleeve, waist)",
      "Button / snap / hook & eye — all present, securely attached & functional",
      "Zipper & velcro — smooth operation checked",
      "Elastic check & edge-tacking done",
      "Brand label, care label & size label — all attached correctly",
      "Country of origin label attached (if required)",
      "Price tag, hangtag & barcode sticker attached",
      "Alteration pieces tagged with defect type & returned to production",
      "QC pass qty & fail qty recorded",
      "Pieces folded as per packing spec & forwarded to Packing / QC",
    ],
    subTaskTypes: [
      // Thread & surface
      "Thread Trimming (Loose Thread Removal)",
      "Stain Check & Spot Removal (Solvent)",
      "Stain Check & Spot Removal (Water-based)",
      "Oil / Grease Mark Removal",
      "Chalk / Marker Mark Removal",
      // Pressing & ironing
      "Steam Pressing (Buck Press)",
      "Tunnel / Conveyor Finishing",
      "Hand Steam Ironing",
      "Form / Shape Finisher (3D Press)",
      "Collar & Cuff Press",
      "Placket & Pocket Press",
      "Sleeve Press",
      "Re-press after Alteration",
      // Measurement & inspection
      "Measurement Check (Critical Dimensions)",
      "Button / Snap / Hook Functionality Check",
      "Zipper & Velcro Check",
      "Elastic Tension & Tacking Check",
      "Embellishment / Embroidery Final Check",
      // Labels & tags
      "Brand Label Attach",
      "Care Label Attach",
      "Size Label Attach",
      "Country of Origin Label Attach",
      "Price Tag Attach",
      "Hangtag Attach",
      "Barcode / UPC Sticker Attach",
      // Alteration & rework
      "Alteration – Seam Repair",
      "Alteration – Button / Snap Resew",
      "Alteration – Broken / Skip Stitch Fix",
      "Alteration – Measurement Correction",
      "Alteration – Embellishment Repair",
      // Final steps
      "End-line QC Check & Tally",
      "Folding (as per buyer packing spec)",
      "Count & Forward to Packing",
    ],
    extraFields: [
      { key: "ironingType", label: "Ironing / Pressing Type", type: "select", options: ["Steam Buck Press", "Tunnel / Conveyor Finisher", "Hand Iron (Steam)", "Form Finisher (3D)", "Collar / Cuff Press (Clam)", "No Ironing Required"], icon: "🧺" },
      { key: "ironingTemp", label: "Iron Temp (°C)", type: "number", placeholder: "160", hint: "Cotton: 190–210°C | Polyester: 140–160°C | Silk: 100–120°C", icon: "🌡️" },
      { key: "steamPressure", label: "Steam Pressure (bar)", type: "number", placeholder: "4", icon: "💨" },
      { key: "buttonCheck", label: "Button / Snap Check Result", type: "select", options: ["All Passed – No Issues", "1–3 Resewn – Now OK", "Sent for Alteration", "N/A"], icon: "🔘" },
      { key: "zipperCheck", label: "Zipper / Velcro Check Result", type: "select", options: ["All Passed – Smooth", "Issue Found – Fixed In-house", "Sent for Alteration", "N/A"], icon: "🤐" },
      { key: "brandLabelAttach", label: "Brand Label Status", type: "select", options: ["Attached – All Pieces", "In Progress", "Pending Stock", "N/A"], icon: "🏷️" },
      { key: "careLabelAttach", label: "Care Label Status", type: "select", options: ["Attached – All Pieces", "In Progress", "Pending Stock", "N/A"], icon: "🏷️" },
      { key: "sizeLabelAttach", label: "Size Label Status", type: "select", options: ["Attached – All Pieces", "In Progress", "Pending Stock", "N/A"], icon: "🏷️" },
      { key: "hangtagAttach", label: "Hangtag Status", type: "select", options: ["Attached – All Pieces", "In Progress", "Pending Stock", "N/A"], icon: "🏷️" },
      { key: "qcPassQty", label: "QC Pass Qty", type: "number", placeholder: "0", icon: "✅" },
      { key: "qcFailQty", label: "QC Fail Qty", type: "number", placeholder: "0", icon: "❌" },
      { key: "alterationQty", label: "Sent for Alteration (pcs)", type: "number", placeholder: "0", icon: "🔄" },
      { key: "stainQty", label: "Stain / Spot Found (pcs)", type: "number", placeholder: "0", icon: "💧" },
      { key: "threadIssueQty", label: "Thread Trimming Issues (pcs)", type: "number", placeholder: "0", icon: "🧵" },
      { key: "measVarianceQty", label: "Measurement Out-of-spec (pcs)", type: "number", placeholder: "0", icon: "📐" },
      { key: "finishingWorker", label: "Finishing Supervisor / Worker", type: "text", placeholder: "Sita Devi", icon: "👷" },
    ],
  },

  // ─── PACKING ─────────────────────────────────────────────────────────────────
  Packing: {
    icon: "📦", label: "Packing", accentHex: "#0ea5e9",
    tw: { bg: "bg-sky-50 dark:bg-sky-950/20", border: "border-sky-200 dark:border-sky-800", text: "text-sky-700 dark:text-sky-300", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", kpiBg: "bg-sky-500", tabActive: "bg-sky-600 text-white", btnBg: "bg-sky-600 hover:bg-sky-700 text-white" },
    defaultChecklist: [
      "Packing specification / buyer manual reviewed & confirmed",
      "Correct poly bag size, micron & spec confirmed",
      "Price tags & hangtags present & correctly attached on all pieces",
      "Barcode / UPC scanned & verified (every piece)",
      "Size ratio (S/M/L/XL breakup) cross-checked against PO",
      "Folding style done as per buyer packing spec",
      "Tissue / insert board / butterfly / collar support placed",
      "Carton inner liner / poly liner placed (if required)",
      "Pieces per carton count correct & verified",
      "Carton label printed & applied correctly (buyer, PO, style, colour, size ratio, qty, destination)",
      "Net weight & gross weight per carton recorded",
      "Carton sealed with tape & PP strapping done",
      "Packing list prepared, totals cross-checked with WO qty",
      "Pre-shipment random audit done (AQL 2.5)",
      "Cartons stacked & ready for loading / dispatch",
    ],
    subTaskTypes: [
      // Garment prep
      "Sorting by Size, Colour & Style",
      "Final Visual Check (Stain / Defect) before Pack",
      "Folding – Flat Fold",
      "Folding – Roll Fold",
      "Folding – Tri-fold",
      "Hanging (GOH – Garment on Hanger)",
      // Inserts & accessories
      "Tissue Paper Placement",
      "Collar Support / Butterfly Insert",
      "Back Board / Insert Board Place",
      "Silica Gel Sachet Insert",
      // Poly bag
      "Individual Poly Bag – Flat Pack",
      "Individual Poly Bag – Hanger Pack",
      "Set Pack / Combo Pack (2/3 pc set)",
      "Vacuum Pack",
      // Tags & scanning
      "Price Tag Attach (Final Check)",
      "Hangtag Final Check",
      "Barcode / UPC Sticker Scan & Verify",
      "Security Tag Attach (if required)",
      // Carton
      "Carton Lining (Poly / Kraft Paper)",
      "Filling Carton (Size Ratio & Count Check)",
      "Carton Label Print & Apply",
      "Gross Weight & Net Weight Recording",
      "Carton Seal (Tape)",
      "Carton PP Strapping",
      // Documents & audit
      "Packing List Preparation",
      "Pre-shipment AQL Audit (Random Check)",
      "Final Count Verification",
      "Loading / Dispatch Preparation",
    ],
    extraFields: [
      { key: "buyerPO", label: "Buyer PO No.", type: "text", placeholder: "PO-2024-7821", icon: "🧾" },
      { key: "packingSpec", label: "Packing Spec / Buyer Manual Ref", type: "text", placeholder: "H&M Packing Manual v4 – Oct 2024", icon: "📋" },
      { key: "packType", label: "Packing Type", type: "select", options: ["Individual Poly Bag – Flat", "Individual Poly Bag – Hanger", "Set Pack (2 pc)", "Set Pack (3 pc)", "Bulk / Bale Pack", "Box Pack (Cardboard Box)", "Garment on Hanger (GOH)", "Vacuum Pack"], icon: "📦" },
      { key: "foldingStyle", label: "Folding Style", type: "select", options: ["Flat Fold", "Roll Fold", "Tri-fold", "Hanging – No Fold", "Buyer-specific Fold"], icon: "📐" },
      { key: "polyBagSpec", label: "Poly Bag Spec", type: "text", placeholder: '12"×16" – 50 micron – Self-seal with header', icon: "🧴" },
      { key: "sizeRatio", label: "Size Ratio (S/M/L/XL)", type: "text", placeholder: "2/4/4/2 per carton", icon: "📊" },
      { key: "pcsPerCarton", label: "Pcs per Carton", type: "number", placeholder: "12", icon: "📦" },
      { key: "cartonSpec", label: "Carton Spec (L×W×H cm / ply)", type: "text", placeholder: "60×40×50 cm – 5-ply corrugated", icon: "📫" },
      { key: "cartonNo", label: "Carton No. Range", type: "text", placeholder: "CTN-001 to CTN-042", icon: "🗃️" },
      { key: "totalCartons", label: "Total Cartons", type: "number", placeholder: "0", icon: "🗂️" },
      { key: "totalPacked", label: "Total Pieces Packed", type: "number", placeholder: "0", icon: "✅" },
      { key: "netWt", label: "Net Weight / Carton (kg)", type: "number", placeholder: "0", icon: "⚖️" },
      { key: "grossWt", label: "Gross Weight / Carton (kg)", type: "number", placeholder: "0", icon: "⚖️" },
      { key: "barcodeScanned", label: "Barcode / UPC Scan Status", type: "select", options: ["100% Scanned – All Pass", "Partial – In Progress", "Failed – Reprint Needed", "N/A – No Barcode"], icon: "📊" },
      { key: "aqlResult", label: "Pre-shipment AQL Result", type: "select", options: ["Pass – AQL 1.5", "Pass – AQL 2.5", "Pass – AQL 4.0", "Fail – 100% Recheck Ordered", "Not Yet Done"], icon: "🛡️" },
      { key: "dispatchDate", label: "Target Dispatch / Loading Date", type: "text", placeholder: "dd/mm/yyyy", icon: "🚚" },
      { key: "portOfLoading", label: "Port of Loading", type: "text", placeholder: "JNPT Mumbai / ICD Jodhpur", icon: "🚢" },
    ],
  },

  "Fabric Inspection": {
    icon: "🔍", label: "Fabric Inspection", accentHex: "#84cc16",
    tw: { bg: "bg-lime-50 dark:bg-lime-950/20", border: "border-lime-200 dark:border-lime-800", text: "text-lime-700 dark:text-lime-300", badge: "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300", kpiBg: "bg-lime-500", tabActive: "bg-lime-600 text-white", btnBg: "bg-lime-600 hover:bg-lime-700 text-white" },
    defaultChecklist: [
      "Purchase Order / DC (Delivery Challan) matched with received rolls",
      "Roll count & thaan nos. recorded in register",
      "Shade checked under D65 / TL84 / UV lamp — all rolls in same lot",
      "Fabric width measured at 3 points per roll — noted",
      "GSM measured & compared to PO spec",
      "Fabric construction (EPI × PPI / Wales × Course) verified",
      "Colour fastness to rubbing (crocking) checked on first roll",
      "Shrinkage test (warp & weft) done on sample",
      "Defect inspection done using 4-Point system",
      "4-Point score per 100 sq. yards calculated — accept / reject decision",
      "Defect locations marked on rolls with sticker / chalk",
      "Rejected / short-length rolls isolated & tagged",
      "Accepted meters entered — GRN created in system",
      "Fabric stored in correct godown location & rack",
    ],
    subTaskTypes: [
      // Receiving
      "Roll Receiving & DC / Challan Matching",
      "Roll Count & Thaan No. Recording",
      "Weight Measurement (Gross / Net per Roll)",
      // Visual & shade
      "Shade Inspection (D65 / TL84 / UV Lamp)",
      "Shade Grouping / Lot Segregation",
      "Colour Fastness – Crocking (Dry & Wet) Test",
      "Colour Fastness – Wash Fastness Test",
      // Physical tests
      "Width Measurement (3 Points per Roll)",
      "GSM Measurement & Verification",
      "Fabric Construction Check (EPI×PPI / Wales×Course)",
      "Fabric Weight (Grams per Linear Meter)",
      "Shrinkage Test – Warp Direction",
      "Shrinkage Test – Weft Direction",
      "Pilling Test (Martindale / ICI Box)",
      "Tensile Strength Test (if required)",
      // Defect inspection
      "4-Point Defect Inspection (Roll-by-Roll)",
      "Defect Marking (Sticker / Chalk)",
      "Defect Segregation by Type (Weave / Stain / Hole)",
      "4-Point Score Calculation per 100 sq. yards",
      // Store
      "Accept / Reject Decision & Tagging",
      "GRN Creation & System Entry",
      "Fabric Storage & Rack Allocation",
      "Short-length Roll Tagging & Isolation",
    ],
    extraFields: [
      { key: "supplierName", label: "Supplier / Mill Name", type: "text", placeholder: "Ravi Textiles, Surat", icon: "🏭" },
      { key: "poNo", label: "Purchase Order No.", type: "text", placeholder: "PO-FAB-2024-082", icon: "🧾" },
      { key: "fabricType", label: "Fabric Type / Construction", type: "select", options: ["100% Cotton – Plain Weave", "100% Cotton – Twill", "100% Cotton – Poplin", "Cotton-Polyester Blend", "100% Polyester", "Rayon / Viscose", "Linen", "Denim (Cotton Twill)", "Knit – Single Jersey", "Knit – Interlock", "Knit – Rib", "Silk / Satin", "Wool / Woollen Blend", "Other"], icon: "🧵" },
      { key: "rollCount", label: "No. of Rolls / Thaans Received", type: "number", placeholder: "10", icon: "🧻" },
      { key: "totalMeters", label: "Total Meters Received", type: "number", placeholder: "500", icon: "📏" },
      { key: "fabricWidth", label: "Width (inches)", type: "number", placeholder: "44", hint: "Measure at 3 points per roll — record average", icon: "↔️" },
      { key: "gsm", label: "GSM (Grams per Sq. Meter)", type: "number", placeholder: "180", hint: "Weigh a 10×10 cm swatch × 100", icon: "⚖️" },
      { key: "shadeNo", label: "Shade No. / Colour Ref", type: "text", placeholder: "SH-204 / PMS 18-1550", icon: "🎨" },
      { key: "shrinkageWarp", label: "Shrinkage – Warp (%)", type: "number", placeholder: "3", icon: "📉" },
      { key: "shrinkageWeft", label: "Shrinkage – Weft (%)", type: "number", placeholder: "2", icon: "📉" },
      { key: "fourPointScore", label: "4-Point Score (per 100 sq. yds)", type: "number", placeholder: "0", hint: "Accept if ≤40 pts/100 sq. yds", icon: "📊" },
      { key: "inspectionResult", label: "Inspection Result", type: "select", options: ["Accepted – All Rolls", "Accepted with Remarks", "Partially Accepted – Some Rolls Rejected", "Rejected – Entire Lot"], icon: "✅" },
      { key: "defectMeters", label: "Defective Meters (rejected)", type: "number", placeholder: "0", icon: "❌" },
      { key: "acceptedMeters", label: "Accepted Meters", type: "number", placeholder: "0", icon: "✅" },
      { key: "warehouseLocation", label: "Godown / Rack Location", type: "text", placeholder: "Grey Fabric Godown – Rack B3", icon: "🏠" },
      { key: "grnNo", label: "GRN No.", type: "text", placeholder: "GRN-2024-001", icon: "📄" },
    ],
  },
  Dyeing: {
    icon: "🎨", label: "Dyeing", accentHex: "#ec4899",
    tw: { bg: "bg-pink-50 dark:bg-pink-950/20", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300", kpiBg: "bg-pink-500", tabActive: "bg-pink-600 text-white", btnBg: "bg-pink-600 hover:bg-pink-700 text-white" },
    defaultChecklist: [
      "Shade card matched",
      "Dye recipe issued",
      "Machine loaded & bath set",
      "Shade approval after dye",
      "Post-wash done",
      "Shade matching final QC",
      "Received back & added to store",
    ],
    subTaskTypes: [
      "Pre-treatment / Scouring",
      "Dye Bath Preparation",
      "Dyeing Cycle",
      "Post-wash & Neutralise",
      "Shade Matching QC",
      "Drying",
      "Receive Back (Store Entry)",
    ],
    extraFields: [
      { key: "dyeingType", label: "Dyeing Type", type: "select", options: ["Piece Dyeing", "Yarn Dyeing", "Garment Dyeing", "Vat Dyeing", "Reactive Dyeing", "Discharge Dyeing"], icon: "🎨" },
      { key: "shadeRef", label: "Shade Ref / Pantone", type: "text", placeholder: "PMS 19-1664", icon: "🎯" },
      { key: "vendor", label: "Dyeing Vendor", type: "text", placeholder: "Rathi Dyers", icon: "🏭" },
      { key: "sentMeters", label: "Sent (Meters)", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedMeters", label: "Received Back (Meters)", type: "number", placeholder: "0", icon: "📥" },
      { key: "shrinkage", label: "Shrinkage %", type: "number", placeholder: "3", icon: "📉" },
      { key: "dyeRecipeRef", label: "Dye Recipe Ref", type: "text", placeholder: "RCP-042", icon: "📋" },
      { key: "temperature", label: "Temp (°C)", type: "number", placeholder: "60", icon: "🌡️" },
      { key: "addToStore", label: "Add to Dyed Fabric Store?", type: "select", options: ["Yes – on completion", "No"], icon: "🏠" },
    ],
  },
  "Hand Work": {
    icon: "🤲", label: "Hand Work", accentHex: "#d97706",
    tw: { bg: "bg-yellow-50 dark:bg-yellow-950/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-300", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", kpiBg: "bg-yellow-500", tabActive: "bg-yellow-600 text-white", btnBg: "bg-yellow-600 hover:bg-yellow-700 text-white" },
    defaultChecklist: [
      "Work order & design sheet received by karigar",
      "Design reference / photo shared with worker",
      "Raw material / trimmings issued & counted (beads, sequins, thread, mirrors, etc.)",
      "Karigar / group assigned & rate confirmed",
      "First piece / sample approved by supervisor",
      "In-process count check done (mid-batch)",
      "Completed pieces received & counted",
      "Quality check: placement, density, uniformity verified",
      "Rejected / rework pieces separated & tagged",
      "Challan raised for karigar payment",
      "Pieces forwarded to next department",
    ],
    subTaskTypes: [
      // Bead & Sequin work
      "Bead Work (Hand Bead Attach)",
      "Sequin Work (Hand Sequin Stitch)",
      "Sequin Work (Machine Sequin)",
      "Bugle Bead / Tube Bead Work",
      "Pearl / Stone Attach",
      // Zari & Zardozi
      "Aari / Tambour Embroidery",
      "Zardozi (Wire / Metal Thread)",
      "Zari Work (Gold / Silver Thread)",
      "Sitara / Kachhua Work",
      "Dabka / Bullion Work",
      // Mirror & Appliqué
      "Mirror Work (Shisha Attach)",
      "Patch / Appliqué Attach",
      "Fabric Flower Attach",
      "Motif / Badge Sew-on",
      // Smocking & Gathering
      "Smocking (English / American)",
      "Gathering / Shirring",
      "Tucks & Pleating",
      // Lace & Trimming
      "Lace Attach (Hand Sew)",
      "Fringe / Tassel Attach",
      "Pompom / Ball Attach",
      "Ribbon Attach",
      "Elastic / Cord Attach",
      // Functional hand stitches
      "Button Hole Stitch (Hand)",
      "Button Attach (Hand)",
      "Hook & Eye Attach",
      "Snap Attach",
      "Hand Hemming / Catch Stitch",
      "Blind Stitch (Hand)",
      "Slip Stitch / Fell Stitch",
      // Painting & printing
      "Hand Painting / Block Print",
      "Tie & Dye (Bandhani / Batik)",
      // QC & dispatch
      "Quality Check (Placement & Density)",
      "Rework / Repair",
      "Count & Bundle for Dispatch",
    ],
    extraFields: [
      { key: "workType", label: "Hand Work Type", type: "select", options: ["Bead Work", "Sequin Work", "Aari / Tambour", "Zardozi / Zari", "Mirror Work (Shisha)", "Patch / Appliqué", "Smocking", "Lace / Fringe / Tassel", "Hand Painting", "Tie & Dye (Bandhani)", "Mixed / Multiple"], icon: "🤲" },
      { key: "karigarName", label: "Karigar / Group Name", type: "text", placeholder: "Mehboob Bead Group", icon: "👷" },
      { key: "karigarType", label: "Karigar Type", type: "select", options: ["In-house Worker", "Home-based Karigar", "Vendor / Contractor", "Group / Thekedar"], icon: "🏭" },
      { key: "designRef", label: "Design Ref / Code", type: "text", placeholder: "HW-BEAD-2024-042", icon: "🎨" },
      { key: "placement", label: "Work Placement / Position", type: "text", placeholder: "Front yoke – 10 cm from neckline", icon: "📍" },
      { key: "ratePerPc", label: "Rate / Piece (₹)", type: "number", placeholder: "25", hint: "Agreed rate with karigar per piece", icon: "💰" },
      { key: "targetQty", label: "Target Qty (pcs)", type: "number", placeholder: "200", icon: "🎯" },
      { key: "sentQty", label: "Sent to Karigar (pcs)", type: "number", placeholder: "0", icon: "📤" },
      { key: "receivedQty", label: "Received Back (pcs)", type: "number", placeholder: "0", icon: "📥" },
      { key: "rejectedQty", label: "Rejected / Rework (pcs)", type: "number", placeholder: "0", icon: "❌" },
      { key: "materialsIssued", label: "Materials Issued", type: "textarea", placeholder: "500 crystal beads – 4mm, 200 shisha mirrors – 2cm, 100m zari thread gold", icon: "🪢" },
      { key: "materialCost", label: "Material Cost (₹)", type: "number", placeholder: "0", icon: "💸" },
      { key: "laborCost", label: "Labour Cost (₹)", type: "number", placeholder: "0", hint: "Rate × received qty", icon: "💰" },
      { key: "estimatedDays", label: "Est. Days to Complete", type: "number", placeholder: "3", icon: "📅" },
      { key: "challanNo", label: "Karigar Challan No.", type: "text", placeholder: "CH-HW-2024-012", icon: "📄" },
      { key: "qualityNotes", label: "Quality / Rework Notes", type: "textarea", placeholder: "Describe any defects, loose beads, wrong placement...", icon: "📝" },
    ],
  },
  "QC Check": {
    icon: "🛡️", label: "QC Check", accentHex: "#0891b2",
    tw: { bg: "bg-teal-50 dark:bg-teal-950/20", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-300", badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", kpiBg: "bg-teal-500", tabActive: "bg-teal-600 text-white", btnBg: "bg-teal-600 hover:bg-teal-700 text-white" },
    defaultChecklist: [
      "Style / PO / WO reference confirmed before inspection",
      "AQL sampling plan selected & sample size drawn",
      "Measurement check done on critical dimensions (chest, length, sleeve, waist)",
      "Stitch quality checked (SPI, skip stitch, open seam, broken stitch)",
      "Colour consistency verified across all pieces (shade variation check)",
      "Print / embroidery / embellishment placement & quality checked",
      "Thread trimming checked (no loose threads)",
      "Label check: brand, size, care, country of origin — correct & securely attached",
      "Button / snap / hook & zipper functionality checked",
      "Stain, soiling, oil mark, hole check done",
      "AQL defect tally prepared (major / minor / critical counts)",
      "Pass / Fail decision recorded on QC report",
      "QC report signed by inspector & supervisor",
      "Passed pieces forwarded to packing",
      "Failed / alteration pieces tagged & returned to production",
    ],
    subTaskTypes: [
      // Incoming / In-process QC
      "Raw Material Inspection (Fabric / Trim)",
      "Inline QC (In-Process – per 50 pcs)",
      "End-of-Line QC",
      // Measurement
      "Measurement Check (Critical Dimensions)",
      "Size Set Measurement Audit",
      "Graded Measurement Check",
      // Stitch & Seam quality
      "SPI (Stitches per Inch) Check",
      "Seam Strength / Seam Slippage Check",
      "Stitch Skip / Broken Stitch Check",
      "Overedge / Overlock Quality Check",
      // Visual & Surface
      "Colour Consistency / Shade Matching",
      "Fabric Defect Check (Holes, Weave Fault)",
      "Stain / Soiling / Oil Mark Check",
      "Pressing & Appearance Check",
      // Trims & Labels
      "Label Check (Brand / Size / Care / COO)",
      "Hangtag & Barcode Check",
      "Button / Snap / Hook Functionality Check",
      "Zipper & Velcro Check",
      "Elastic / Cord Check",
      // Embellishment QC
      "Print Quality & Placement Check",
      "Embroidery Placement & Density Check",
      "Bead / Sequin Attachment Check",
      // Final / Pre-shipment
      "Final QC (Pre-packing)",
      "Pre-Shipment Inspection (PSI)",
      "Buyer QC / Third-party Audit",
      "AQL Defect Tally & Decision",
      // Defect handling
      "Alteration Sorting & Tagging",
      "Rejection Segregation",
      "QC Report Preparation & Sign-off",
    ],
    extraFields: [
      { key: "qcStage", label: "QC Stage", type: "select", options: ["Raw Material Inspection", "Inline / In-Process", "End-of-Line", "Final QC (Pre-packing)", "Pre-Shipment Inspection (PSI)", "Buyer / Third-party QC"], icon: "🛡️" },
      { key: "styleRef", label: "Style / PO Reference", type: "text", placeholder: "STYLE-KRT-2024-042 / PO-8821", icon: "📋" },
      { key: "aqlLevel", label: "AQL Level", type: "select", options: ["AQL 0.65", "AQL 1.0", "AQL 1.5", "AQL 2.5", "AQL 4.0", "100% Inspection"], icon: "📊" },
      { key: "inspectionLevel", label: "Inspection Level", type: "select", options: ["Level I – Reduced", "Level II – Normal", "Level III – Tightened"], icon: "🔍" },
      { key: "lotSize", label: "Lot Size (Total Pcs)", type: "number", placeholder: "0", icon: "📦" },
      { key: "sampleSize", label: "Sample Size (Inspected Pcs)", type: "number", placeholder: "0", icon: "🔢" },
      { key: "passQty", label: "Pass Qty", type: "number", placeholder: "0", icon: "✅" },
      { key: "failQty", label: "Fail / Reject Qty", type: "number", placeholder: "0", icon: "❌" },
      { key: "alterationQty", label: "Sent for Alteration", type: "number", placeholder: "0", icon: "🔄" },
      { key: "majorDefects", label: "Major Defect Count", type: "number", placeholder: "0", hint: "AQL counts: causes rejection if > acceptance number", icon: "⚠️" },
      { key: "minorDefects", label: "Minor Defect Count", type: "number", placeholder: "0", icon: "ℹ️" },
      { key: "criticalDefects", label: "Critical Defect Count", type: "number", placeholder: "0", hint: "Any critical defect = auto-fail", icon: "🚫" },
      { key: "topDefect1", label: "Top Defect #1", type: "select", options: ["Stitching Skip / Open Seam", "Broken / Dropped Stitch", "Measurement Out of Spec", "Colour / Shade Variation", "Stain / Soiling / Oil Mark", "Print Misplacement / Bleed", "Embroidery Defect", "Label Missing / Wrong", "Button / Snap Missing / Loose", "Zipper Defect", "Thread Not Trimmed", "Fabric Defect (Hole / Weave)", "Bead / Sequin Loose / Missing", "Pressing / Appearance Defect", "Other"], icon: "⚠️" },
      { key: "topDefect2", label: "Top Defect #2", type: "select", options: ["None", "Stitching Skip / Open Seam", "Broken / Dropped Stitch", "Measurement Out of Spec", "Colour / Shade Variation", "Stain / Soiling / Oil Mark", "Print Misplacement / Bleed", "Embroidery Defect", "Label Missing / Wrong", "Button / Snap Missing / Loose", "Zipper Defect", "Thread Not Trimmed", "Fabric Defect (Hole / Weave)", "Bead / Sequin Loose / Missing", "Pressing / Appearance Defect", "Other"], icon: "⚠️" },
      { key: "defectNotes", label: "Defect Details / Notes", type: "textarea", placeholder: "Describe specific defects, affected sizes, root cause...", icon: "📝" },
      { key: "finalDecision", label: "QC Decision", type: "select", options: ["PASS – Forward to Packing", "PASS with Minor Remarks", "HOLD – Re-inspect after Alteration", "FAIL – 100% Re-check Ordered", "REJECT – Return to Production"], icon: "🏁" },
      { key: "qcBy", label: "QC Inspector Name", type: "text", placeholder: "Ramesh Kumar", icon: "👤" },
      { key: "buyerRepresent", label: "Buyer / Third-party Present?", type: "select", options: ["No", "Yes – Buyer Rep", "Yes – SGS / Intertek / BV", "Yes – Other TPI"], icon: "🤝" },
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
// Re-exported from pipelineWiring.ts (single source of truth)
export const STAGE_TO_DEPT: Record<string, string> = PIPELINE_STAGE_TO_DEPT;

/**
 * Returns true if this operation belongs to the given dept tab.
 * Delegates to pipelineWiring.opBelongsToDept (authoritative DAG-based lookup).
 */
export function opBelongsToDept(op: any, deptTabName: string): boolean {
  return pipelineOpBelongsToDept(op, deptTabName);
}

function getDept(taskName: string): DeptConfig {
  const tn = taskName.toLowerCase();
  // Exact match first (keys now match WorkOrderTaskHub tab IDs exactly)
  const exactKey = Object.keys(DEPT_CONFIG).find(k => k.toLowerCase() === tn);
  if (exactKey) return DEPT_CONFIG[exactKey];
  // Partial match (e.g. "Fabric Printing" → Printing, "Garment Printing" → Printing)
  const partialKey = Object.keys(DEPT_CONFIG).find(k => tn.includes(k.toLowerCase()) || k.toLowerCase().includes(tn));
  return partialKey ? DEPT_CONFIG[partialKey] : DEFAULT_DEPT;
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

function uid() { return `id-${uuidShort(12)}`; }

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
  const isMeterDept = ["Printing", "Fabric Inspection", "Dyeing", "Washing"].includes(dept.label);
  const outputUnit = isMeterDept ? "m" : "pcs";
  // For meter depts, totalPcs is still the WO order qty — label it as WO qty, not op output
  const donePcs = tasks.reduce((s, t) => {
    if (isMeterDept) {
      return s + (Number(t.customData?.receivedFabricMeters || t.customData?.acceptedMeters || t.customData?.receivedMeters || t.completedQuantity || 0));
    }
    return s + (t.completedQuantity || 0);
  }, 0);
  const overallPct = totalPcs > 0 ? Math.min(100, Math.round(donePcs / totalPcs * 100)) : 0;
  const progressLabel = isMeterDept
    ? `${dept.label} Output — ${donePcs}${outputUnit} processed`
    : `Overall ${dept.label} Progress — ${donePcs}/${totalPcs} pcs`;
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
          <span className="font-bold">{progressLabel}</span>
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
  showBlocked, setShowBlocked
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
          <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Visibility</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showBlocked} onChange={(e) => setShowBlocked(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">Show blocked / waiting jobs</span>
            </label>
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
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        {task.name}
                        {task.pieceTag && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                            {task.pieceTag}
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-slate-400 font-mono">{task.woId}</p>
                        {task.plannedStartDate && !task.startedAt && !task._blocked && (
                          <span className="text-[9px] text-indigo-500 font-semibold">📅 {task.plannedStartDate} → {task.plannedDueDate}</span>
                        )}
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
                  {task.customData?.isJobWork && task.customData?.vendor ? (
                    <>
                      <div className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-[9px] shrink-0">🏭</div>
                      <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 truncate">{task.customData.vendor}</span>
                    </>
                  ) : karigar ? (
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
                        disabled={task._blocked}
                        className={`p-1 rounded-md transition-colors ${task._blocked ? "text-slate-300 dark:text-slate-700 cursor-not-allowed" : `${nw.text} hover:bg-slate-100 dark:hover:bg-slate-800`}`} title={task._blocked ? `Blocked by ${task._blockedBy}` : `→ ${ns}`}>
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
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                      {dept.icon} {task.name}
                      {task.pieceTag && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 shrink-0">
                          {task.pieceTag}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">{task.woId} · {task.woProduct}</p>
                    {task.plannedStartDate && !task.startedAt && (
                      <p className="text-[9px] text-indigo-500 font-semibold">📅 {task.plannedStartDate} → {task.plannedDueDate}</p>
                    )}
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

function KanbanView({ tasks, dept, karigars, onEdit, onTransition, production, taskName }: any) {
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

                    {task.customData?.isJobWork && task.customData?.vendor ? (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-4 h-4 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center text-[8px]">🏭</div>
                        <span className="text-[9px] text-orange-600 dark:text-orange-400 font-black truncate">{task.customData.vendor}</span>
                        <span className="text-[8px] text-orange-400 font-bold bg-orange-100 dark:bg-orange-900/40 px-1 rounded">JW</span>
                      </div>
                    ) : karigar && (
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

                    {/* Cross-dept pipeline mini strip */}
                    {(() => {
                      const wo = production.find((w: WorkOrder) => w.id === task.woId);
                      if (!wo?.operations?.length) return null;
                      return (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <PipelineStrip
                            operations={wo.operations}
                            currentDept={taskName}
                            compact
                          />
                        </div>
                      );
                    })()}

                    {/* Quick transitions */}
                    <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(WORKFLOW[task.workflowState] ?? WORKFLOW["Open"]).nextStates.slice(0, 2).map(ns => {
                        const nw = WORKFLOW[ns];
                        return (
                          <button key={ns} onClick={e => { e.stopPropagation(); onTransition(task, ns); }}
                            disabled={task._blocked}
                            className={`flex-1 py-1 rounded-lg text-[8px] font-black border transition-colors ${task._blocked ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed" : `${nw.bg} ${nw.text} border-current/30`}`}>
                            {task._blocked ? "Blocked" : `→ ${nw.label}`}
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
            const cfg = WORKFLOW[task.workflowState] ?? WORKFLOW["Open"];
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
      <div className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-dashed border-slate-200 dark:border-slate-700">
        <input value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addSub()}
          placeholder="Sub-task name…" className="erp-input text-[10px] flex-1 min-w-[120px]" />
        <select value={newType} onChange={e => setNewType(e.target.value)} className="erp-input text-[10px] w-24 shrink-0">
          {dept.subTaskTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={newWorker} onChange={e => setNewWorker(e.target.value)} className="erp-input text-[10px] w-24 shrink-0">
          <option value="">Unassigned</option>
          {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <select value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)} className="erp-input text-[10px] w-24 shrink-0">
          {(["Low", "Medium", "High", "Urgent"] as Priority[]).map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={newDue} onChange={e => setNewDue(e.target.value)} className="erp-input text-[10px] w-32 shrink-0" />
        <button onClick={addSub} disabled={!newName.trim()}
          className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${dept.tw.btnBg} disabled:opacity-40 shrink-0`}>
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

function DetailForm({ task, dept, karigars, production, taskName, onSave, onCancel, onDelete }: {
  task: EnrichedTask; dept: DeptConfig; karigars: Karigar[];
  production: WorkOrder[]; taskName: string;
  onSave: (t: EnrichedTask) => void; onCancel: () => void; onDelete: (t: EnrichedTask) => void;
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

  // ── Auto-fill stage-input fields from a completed predecessor op ───────────
  // Works for ANY dynamic route: getInheritedFieldData() walks this WO's own
  // operations array against the GARMENT_PIPELINE DAG to find the nearest
  // completed predecessor and carries forward matching customData fields
  // (e.g. Fabric Printing's "Received Back (Meters)" → Fabric Inspection's
  // "Total Meters Received"), so the user never re-enters the same number.
  useEffect(() => {
    const wo = production.find(w => w.id === form.woId);
    const ops = wo?.operations;
    if (!ops?.length) return;

    const opIndex = form.opIndex;
    if (opIndex == null || opIndex < 0 || opIndex >= ops.length) return;

    const patch = getInheritedFieldData(ops, opIndex);
    if (Object.keys(patch).length === 0) return;

    set({ customData: { ...(form.customData || {}), ...patch } });
  }, [dept.label, form.woId, production]);

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

  // ── Required-field validation before status advance ───────────────────────
  const getMissingFields = (targetState: WorkflowState): string[] => {
    // Only gate on forward moves to QC Review or Completed
    if (targetState !== "Completed" && targetState !== "QC Review") return [];
    const cd = form.customData || {};
    const missing: string[] = [];

    switch (dept.label) {
      case "Cutting":
        if (!form.completedQuantity)        missing.push("Completed Qty");
        if (!cd.bundlesOut)                 missing.push("Bundles Out");
        if (!cd.layersLaid)                 missing.push("Layers Laid");
        if (!cd.tableNo)                    missing.push("Cutting Table No.");
        break;
      case "Stitching":
        if (!form.completedQuantity)        missing.push("Completed Qty");
        if (!cd.bundlesReceived)            missing.push("Bundles Received (Cutting)");
        if (!cd.forwardedToFinishing)       missing.push("Forwarded to Finishing");
        if (!cd.lineNo)                     missing.push("Stitching Line No.");
        if (!cd.actualPerHr)                missing.push("Actual Pcs/Hr");
        break;
      case "Printing":
        // Printing measures fabric meters returned, not pcs
        if (!cd.receivedFabricMeters)       missing.push("Received Fabric (Meters) — Stock Receipt");
        if (cd.isJobWork) {
          // Job work outer — need vendor & challan
          if (!cd.vendor)                   missing.push("Vendor / Printer Name");
          if (!cd.challanNo)                missing.push("Challan No.");
          if (!cd.sentMeters)               missing.push("Sent to Vendor (meters)");
        } else {
          // In-house printing
          if (!cd.colorCount)               missing.push("No. of Colours");
          if (!cd.screensUsed)              missing.push("Screens Used");
        }
        break;
      case "Finishing":
        if (!form.completedQuantity)        missing.push("Completed Qty");
        if (!cd.pcsReceivedFromStitching)   missing.push("Pieces Received (from Stitching)");
        if (!cd.qcPassQty && cd.qcPassQty !== 0) missing.push("QC Pass Qty");
        if (!cd.forwardedToPacking)         missing.push("Forwarded to Packing");
        if (!cd.threadTrimDone)             missing.push("Thread Trimming Done ✓");
        if (!cd.taggingDone)                missing.push("Labels & Tags Attached ✓");
        break;
      case "Packing":
        if (!cd.totalPacked)                missing.push("Total Pieces Packed");
        if (!cd.totalCartons)               missing.push("Total Cartons");
        if (!cd.barcodeScanned)             missing.push("Barcode Scan Status");
        if (!cd.aqlResult)                  missing.push("AQL Result");
        break;
      case "Washing":
        if (!form.completedQuantity)        missing.push("Completed Qty");
        if (!cd.sentQty)                    missing.push("Sent to Vendor (pcs)");
        if (!cd.receivedQty)                missing.push("Received Back (pcs)");
        if (!cd.washType)                   missing.push("Wash Type");
        if (!cd.challanNo)                  missing.push("Challan No.");
        break;
      case "Dyeing":
        if (!cd.sentMeters)                 missing.push("Sent to Vendor (Meters)");
        if (!cd.receivedMeters)             missing.push("Received Back (Meters)");
        if (!cd.shadeRef)                   missing.push("Shade Ref / Pantone");
        if (!cd.dyeRecipeRef)               missing.push("Dye Recipe Ref");
        break;
      case "Fabric Inspection":
        if (!cd.totalMeters)                missing.push("Total Meters Received");
        if (!cd.acceptedMeters)             missing.push("Accepted Meters");
        if (!cd.grnNo)                      missing.push("GRN No.");
        if (!cd.rollCount)                  missing.push("No. of Rolls / Thaans");
        break;
      case "Embroidery":
        if (!cd.sentQty)                    missing.push("Sent to Vendor (pcs)");
        if (!cd.receivedQty)                missing.push("Received Back (pcs)");
        if (!cd.challanNo)                  missing.push("Challan No.");
        break;
      case "Hand Work":
        if (!cd.sentQty)                    missing.push("Sent to Karigar (pcs)");
        if (!cd.receivedQty)                missing.push("Received Back (pcs)");
        if (!cd.challanNo)                  missing.push("Karigar Challan No.");
        break;
      case "QC Check":
        if (!cd.inspectedQty)               missing.push("Inspected Qty");
        if (!cd.passQty && cd.passQty !== 0) missing.push("Pass Qty");
        if (!cd.failQty && cd.failQty !== 0) missing.push("Fail Qty");
        break;
      default:
        if (!form.completedQuantity)        missing.push("Completed Qty");
    }
    return missing;
  };

  const doTransition = (to: WorkflowState, reason?: string) => {
    if (form._blocked) {
      toast.warn(`Cannot start task — complete: ${form._blockedBy} first`);
      return;
    }

    // Required field gate
    const missing = getMissingFields(to);
    if (missing.length > 0) {
      toast.warn(`Cannot move to "${to}" — please fill in the following required fields first:\n\n${missing.map(f => `  • ${f}`).join("\n")}\n\nSwitch to the "Output" tab to complete them.`);
      setActiveSection("output");
      return;
    }

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
    { id: "dept", label: "Parameters", icon: Zap, hidden: dept.extraFields.length === 0 },
    { id: "time_logs", label: "Time Logs", icon: Clock },
    { id: "subtasks", label: "Sub-tasks", icon: GitBranch },
    { id: "checklist", label: "Checklist", icon: ListChecks, hidden: ["Washing", "Dyeing"].includes(dept.label) },
    { id: "worker", label: "Worker", icon: Users },
    { id: "comments", label: "Comments", icon: MessageSquare },
  ].filter(s => !s.hidden);

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
            
            // Only disable "forward" transitions. Rejects/Holds could still be allowed technically, but let's just use form._blocked for forward movement
            const isDisabled = form._blocked && (ns === "Work In Progress" || ns === "Completed");
            const missingForNext = getMissingFields(ns as WorkflowState);
            const hasUnfilledRequired = missingForNext.length > 0;

            return (
              <button key={ns}
                disabled={isDisabled}
                onClick={() => {
                  if (isDisabled) return;
                  if (isReject) { setShowRejectModal(true); return; }
                  if (isHold) { setShowHoldModal(true); return; }
                  doTransition(ns);
                }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${isDisabled ? "bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed" : hasUnfilledRequired ? "bg-amber-50 text-amber-700 border border-amber-400 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-600" : `${nw.bg} ${nw.text} border border-current/20`}`}
                title={isDisabled ? `Blocked by ${form._blockedBy}` : hasUnfilledRequired ? `Fill required fields first:\n${missingForNext.map(f=>`• ${f}`).join("\n")}` : `Move to ${ns}`}>
                <NIcon className="w-3 h-3" />
                {hasUnfilledRequired && !isDisabled && <span className="text-amber-500">⚠</span>}
                <span className="hidden sm:inline">{nw.label}</span>
              </button>
            );
          })}

          {!isNew && (
            <button onClick={() => onDelete(task)}
              title="Delete this task"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors text-rose-600 border border-rose-200 hover:bg-rose-50 dark:border-rose-800 dark:hover:bg-rose-950/30">
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          )}

          <button onClick={() => onSave(form)}
            disabled={isNew && (!form.name || form.name.trim() === "" || form.name === taskName)}
            title={isNew && (!form.name || form.name.trim() === "" || form.name === taskName) ? "Enter a task name first" : undefined}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors ${dept.tw.btnBg} ${isNew && (!form.name || form.name.trim() === "" || form.name === taskName) ? "opacity-40 cursor-not-allowed" : ""}`}>
            <Save className="w-3 h-3" /> Save
          </button>
        </div>
      </div>

      {/* New-task name field — without this, every new task is saved with the
          department name as its name instead of a specific task name */}
      {isNew && (
        <div className={`px-3 py-2 shrink-0 ${dept.tw.bg} border-b ${dept.tw.border}`}>
          <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 block mb-1">Task Name *</label>
          <input
            type="text"
            autoFocus
            value={form.name === taskName ? "" : form.name}
            onChange={e => set({ name: e.target.value })}
            placeholder={`e.g. "${taskName} — Lot 12" or a specific job description`}
            className="w-full text-xs font-bold rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-current/20"
          />
        </div>
      )}

      {/* Workflow pipeline strip — shows BOTH the WO's full garment pipeline AND the op-level state */}
      {!isNew && (
        <div className={`px-3 py-2 shrink-0 ${dept.tw.bg} border-b ${dept.tw.border} space-y-1.5`}>
          {/* Full garment route (cross-dept pipeline visibility) */}
          {(() => {
            const wo = production.find(w => w.id === form.woId);
            if (!wo?.operations?.length) return null;
            return (
              <PipelineStrip
                operations={wo.operations}
                currentDept={taskName}
                className="w-full"
              />
            );
          })()}
          {/* Op-level workflow states (this dept only) */}
          <div className={`px-2 py-1 flex items-center gap-1 overflow-x-auto shrink-0`}>
            {(["Draft", "Open", "Work In Progress", "QC Review", "Completed"] as WorkflowState[]).map((s, i) => {
              const cfg = WORKFLOW[s];
              const Icon = cfg.icon;
              const active = form.workflowState === s;
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

          {/* TIME LOGS */}
          {activeSection === "time_logs" && (
            <FormCard title="Time Logs" icon={Clock}>
              <div className="space-y-4">
                {(() => {
                  const logs = form.customData?.timeLogs || [];
                  const totalHrs = logs.reduce((sum: number, l: any) => sum + Number(l.hours || 0), 0);
                  return (
                    <>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="text-[10px] font-black uppercase text-slate-500">Operation Timesheets</div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Total: {totalHrs.toFixed(2)} Hrs</div>
                      </div>
                      
                      {logs.map((log: any, i: number) => (
                        <div key={log.id || i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl space-y-3 text-xs relative">
                          <button type="button" onClick={() => {
                            const newLogs = logs.filter((_: any, idx: number) => idx !== i);
                            setExtra("timeLogs", newLogs);
                          }} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-200 dark:hover:bg-red-900/60 z-10">✕</button>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                              <FieldLabel>Employee</FieldLabel>
                              <select className="erp-input w-full" value={log.employeeId || ""} onChange={(e) => {
                                const newLogs = [...logs]; newLogs[i].employeeId = e.target.value; setExtra("timeLogs", newLogs);
                              }}>
                                <option value="">— Select Worker —</option>
                                {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                              </select>
                            </div>
                            <div>
                               <FieldLabel>From Date Time</FieldLabel>
                               <input type="datetime-local" className="erp-input w-full" value={log.fromTime || ""}
                                  onChange={e => {
                                    const newLogs = [...logs]; newLogs[i].fromTime = e.target.value;
                                    if (newLogs[i].toTime) {
                                      const hrs = (new Date(newLogs[i].toTime).getTime() - new Date(newLogs[i].fromTime).getTime()) / 3600000;
                                      newLogs[i].hours = hrs > 0 ? hrs.toFixed(2) : "0";
                                    }
                                    setExtra("timeLogs", newLogs);
                                  }} />
                            </div>
                            <div>
                               <FieldLabel>To Date Time</FieldLabel>
                               <input type="datetime-local" className="erp-input w-full" value={log.toTime || ""}
                                  onChange={e => {
                                    const newLogs = [...logs]; newLogs[i].toTime = e.target.value;
                                    if (newLogs[i].fromTime) {
                                      const hrs = (new Date(newLogs[i].toTime).getTime() - new Date(newLogs[i].fromTime).getTime()) / 3600000;
                                      newLogs[i].hours = hrs > 0 ? hrs.toFixed(2) : "0";
                                    }
                                    setExtra("timeLogs", newLogs);
                                  }} />
                            </div>
                            <div>
                              <FieldLabel>Time (Hours)</FieldLabel>
                              <input type="number" step="0.1" className="erp-input w-full" value={log.hours || ""} onChange={e => {
                                const newLogs = [...logs]; newLogs[i].hours = e.target.value; setExtra("timeLogs", newLogs);
                              }} />
                            </div>
                            <div>
                              <FieldLabel>Completed Qty</FieldLabel>
                              <input type="number" className="erp-input w-full" value={log.completedQty || ""} onChange={e => {
                                const newLogs = [...logs]; newLogs[i].completedQty = e.target.value; setExtra("timeLogs", newLogs);
                              }} />
                            </div>
                          </div>
                        </div>
                      ))}

                      <button type="button" onClick={() => {
                        const newLogs = [...logs, { id: Date.now().toString(), employeeId: form.assignedTo || "", fromTime: "", toTime: "", hours: "", completedQty: "" }];
                        setExtra("timeLogs", newLogs);
                      }} className="flex w-full items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                        + Add Time Log
                      </button>
                    </>
                  );
                })()}
              </div>
            </FormCard>
          )}

          {/* OUTPUT */}
          {activeSection === "output" && (
            <FormCard title="Production Output" icon={Target}>
              {/* Required fields banner */}
              {(() => {
                const missingNext = getMissingFields("Completed");
                const missingQC   = getMissingFields("QC Review");
                const missing = missingNext.length > 0 ? missingNext : missingQC;
                if (missing.length === 0) return null;
                return (
                  <div className="mb-4 p-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex gap-2">
                    <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
                    <div>
                      <p className="text-[11px] font-black text-amber-800 dark:text-amber-200 mb-1">Fill these fields before marking complete:</p>
                      <ul className="space-y-0.5">
                        {missing.map(f => (
                          <li key={f} className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
              {["Cutting", "Printing"].includes(dept.label) && (() => {
                const legacyMode = form.customData?.stockIssueId || form.customData?.fabricLength || form.customData?.perPcConsumption;
                const matRows = form.customData?.materialConsumptions || (legacyMode ? [{
                  id: "legacy",
                  partName: "Main Fabric",
                  stockIssueId: form.customData?.stockIssueId || "",
                  perPcConsumption: form.customData?.perPcConsumption || "",
                  foldLength: form.customData?.foldLength || "",
                  folds: form.customData?.folds || "",
                  fabricLength: form.customData?.fabricLength || "",
                  fabricWidth: form.customData?.fabricWidth || "",
                }] : [{
                  id: Date.now().toString(),
                  partName: "Print 1",
                  stockIssueId: "", perPcConsumption: "", foldLength: "", folds: "", fabricLength: "", fabricWidth: ""
                }]);

                const totalPerPc = matRows.reduce((sum: number, r: any) => sum + Number(r.perPcConsumption || 0), 0);
                const targetMeters = form.woQty ? (form.woQty * totalPerPc) : 0;

                const updateMat = (idx: number, updates: any) => {
                  const newMats = [...matRows];
                  newMats[idx] = { ...newMats[idx], ...updates };
                  
                  // Auto-calculate fabricLength if folds or foldLength changed
                  if (updates.folds !== undefined || updates.foldLength !== undefined) {
                      const fl = Number(newMats[idx].foldLength || 0);
                      const flds = Number(newMats[idx].folds || 0);
                      if (fl > 0 && flds > 0) newMats[idx].fabricLength = String((fl * flds) / 100);
                  }
                  
                  set({ customData: { ...form.customData, materialConsumptions: newMats, stockIssueId: newMats[0]?.stockIssueId, perPcConsumption: newMats[0]?.perPcConsumption, foldLength: newMats[0]?.foldLength, folds: newMats[0]?.folds, fabricLength: newMats[0]?.fabricLength, fabricWidth: newMats[0]?.fabricWidth, totalPerPcConsumption: totalPerPc } });
                };

                return (
                  <div className="mb-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Material Consumption</h4>
                      <button type="button" onClick={() => {
                        const newMats = [...matRows, { id: Date.now().toString(), partName: `Part ${matRows.length + 1}`, stockIssueId: "", perPcConsumption: "", foldLength: "", folds: "", fabricLength: "", fabricWidth: "" }];
                        set({ customData: { ...form.customData, materialConsumptions: newMats } });
                      }} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:opacity-80">
                        + Add Part
                      </button>
                    </div>

                    {matRows.map((row: any, idx: number) => (
                      <div key={row.id} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 relative">
                        {matRows.length > 1 && (
                          <button type="button" onClick={() => {
                            const newMats = matRows.filter((_: any, i: number) => i !== idx);
                            set({ customData: { ...form.customData, materialConsumptions: newMats } });
                          }} className="absolute -top-2 -right-2 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-red-200 dark:hover:bg-red-900/60 z-10">✕</button>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2 flex gap-2">
                            <div className="w-1/3">
                              <FieldLabel>Part Name</FieldLabel>
                              <input type="text" className="erp-input w-full font-bold"
                                value={row.partName || ""} onChange={e => updateMat(idx, { partName: e.target.value })} placeholder="e.g. Front / Back" />
                            </div>
                            <div className="w-2/3">
                              <FieldLabel>Stock Issue / Than / Roll No.</FieldLabel>
                              <input type="text" className="erp-input w-full"
                                value={row.stockIssueId || ""} onChange={e => updateMat(idx, { stockIssueId: e.target.value })} placeholder="e.g. ROLL-502 or THAAN-12" />
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Per Pc Cons. (m)</FieldLabel>
                            <input type="number" step="0.01" className="erp-input w-full"
                              value={row.perPcConsumption || ""} onChange={e => updateMat(idx, { perPcConsumption: e.target.value })} placeholder="e.g. 2.4" />
                          </div>
                          <div>
                            <FieldLabel>Target Qty (m)</FieldLabel>
                            <div className="erp-input bg-slate-100 dark:bg-slate-800/50 text-slate-500">
                              {form.woQty && row.perPcConsumption ? (form.woQty * Number(row.perPcConsumption)).toFixed(2) : "—"} m
                            </div>
                          </div>
                          <div>
                            <FieldLabel>Fold Length (cm)</FieldLabel>
                            <input type="number" step="0.1" className="erp-input w-full"
                              value={row.foldLength || ""} onChange={e => updateMat(idx, { foldLength: e.target.value })} placeholder="e.g. 95" />
                          </div>
                          <div>
                            <FieldLabel>Fabric Width (in)</FieldLabel>
                            <input type="number" className="erp-input w-full"
                              value={row.fabricWidth || ""} onChange={e => updateMat(idx, { fabricWidth: e.target.value })} placeholder="e.g. 44" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <FieldLabel>Total Order Target</FieldLabel>
                  <div className="erp-input bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs sm:text-sm">
                    {["Printing", "Dyeing", "Fabric Inspection"].includes(dept.label) ? (() => {
                      const mats = form.customData?.materialConsumptions || [{ perPcConsumption: form.customData?.perPcConsumption || 0 }];
                      const totalPerPc = mats.reduce((s: number, r: any) => s + Number(r.perPcConsumption || 0), 0);
                      const totalM = totalPerPc > 0 && form.woQty ? (form.woQty * totalPerPc).toFixed(1) : null;
                      return <><span className="font-black text-slate-600">{totalM ? `${totalM} Mtr` : `? Mtr`}</span> <span className="text-[10px] ml-1">({form.woQty} pcs)</span></>;
                    })() : (
                      <>{form.woQty || 0} pcs
                      {["Cutting"].includes(dept.label) ? (() => {
                        const mats = form.customData?.materialConsumptions || [{ perPcConsumption: form.customData?.perPcConsumption || 0 }];
                        const totalPerPc = mats.reduce((s: number, r: any) => s + Number(r.perPcConsumption || 0), 0);
                        return totalPerPc > 0 && form.woQty ? ` (${(form.woQty * totalPerPc).toFixed(1)} m)` : "";
                      })() : ""}</>
                    )}
                  </div>
                </div>
                <div>
                  <FieldLabel>{["Printing", "Dyeing", "Fabric Inspection"].includes(dept.label) ? "Received (Meters) ✓" : "Completed Qty ✓"}</FieldLabel>
                  <input type="number" min={0} step="0.1" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                    value={form.completedQuantity || ""} onChange={e => set({ completedQuantity: ["Printing", "Dyeing", "Fabric Inspection"].includes(dept.label) ? (parseFloat(e.target.value) || 0) : (parseInt(e.target.value) || 0) })} placeholder="0" />
                </div>
                <div>
                  <FieldLabel>Rejected {["Printing", "Dyeing", "Fabric Inspection"].includes(dept.label) ? "(Meters)" : "(Qty)"} ✗</FieldLabel>
                  <input type="number" min={0} step="0.1" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700 font-black"
                    value={form.rejectedQuantity || ""} onChange={e => set({ rejectedQuantity: ["Printing", "Dyeing", "Fabric Inspection"].includes(dept.label) ? (parseFloat(e.target.value) || 0) : (parseInt(e.target.value) || 0) })} placeholder="0" />
                </div>
              </div>

              {/* ── Cutting: bundle & layer output ── */}
              {dept.label === "Cutting" && (
                <div className="mb-4 mt-2 p-3 bg-rose-50/60 dark:bg-rose-900/20 rounded-xl border border-rose-200 dark:border-rose-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">✂️ Cutting Output — Bundles &amp; Lay Details</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Bundles Out 🗂️</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.bundlesOut || ""}
                        onChange={e => set({ customData: { ...form.customData, bundlesOut: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Pcs per Bundle (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-rose-700">
                        {(() => {
                          const bundles = Number(form.customData?.bundlesOut || 0);
                          const done = Number(form.completedQuantity || 0);
                          return bundles > 0 && done > 0 ? Math.round(done / bundles) + " pcs" : "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Layers Laid</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.layersLaid || ""}
                        onChange={e => set({ customData: { ...form.customData, layersLaid: e.target.value } })}
                        placeholder="e.g. 80" />
                    </div>
                    <div>
                      <FieldLabel>Waste Fabric (kg) ♻️</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full !bg-amber-50 dark:!bg-amber-950/20 !text-amber-700"
                        value={form.customData?.wasteKg || ""}
                        onChange={e => set({ customData: { ...form.customData, wasteKg: e.target.value } })}
                        placeholder="0.0" />
                    </div>
                    <div>
                      <FieldLabel>Cutting Table No.</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.tableNo || ""}
                        onChange={e => set({ customData: { ...form.customData, tableNo: e.target.value } })}
                        placeholder="Table 1" />
                    </div>
                    <div>
                      <FieldLabel>Short Cut (pcs) ⚠️</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-amber-700">
                        {(() => {
                          const target = Number(form.woQty || 0);
                          const done = Number(form.completedQuantity || 0);
                          const short = target - done;
                          return target > 0 ? (short > 0 ? `${short} pcs short` : short === 0 ? "✅ Exact" : `+${Math.abs(short)} excess`) : "—";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* ── Printing: Print Job Details (includes Stock Receipt + Job Work) ── */}
              {dept.label === "Printing" && (
                <div className="mb-4 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                  {/* Section header — ERPNext style grey bar */}
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Print Job Details</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !form.customData?.isJobWork;
                        set({
                          customData: { ...form.customData, isJobWork: next, vendor: next ? (form.customData?.vendor || "") : "" },
                          assignedTo: next ? "__vendor__" : "",
                        });
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                        form.customData?.isJobWork
                          ? "bg-orange-500 text-white border-orange-600"
                          : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:text-orange-600"
                      }`}>
                      {form.customData?.isJobWork ? "Job Work (Outer) ✓" : "Job Work (Outer)"}
                    </button>
                  </div>

                  {/* Fields — flat rows like ERPNext form */}
                  <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white dark:bg-slate-900">
                  {form.customData?.isJobWork ? (<>
                      <div className="col-span-2">
                        <FieldLabel>Supplier *</FieldLabel>
                        <input type="text" className="erp-input w-full"
                          value={form.customData?.vendor || ""}
                          onChange={e => set({ customData: { ...form.customData, vendor: e.target.value } })}
                          placeholder="e.g. Sai Screen Printers, Jaipur" />
                      </div>
                      <div>
                        <FieldLabel>Challan No.</FieldLabel>
                        <input type="text" className="erp-input w-full"
                          value={form.customData?.challanNo || ""}
                          onChange={e => set({ customData: { ...form.customData, challanNo: e.target.value } })}
                          placeholder="CH-PRINT-2024-120" />
                      </div>
                      <div>
                        <FieldLabel>Sent Qty (m)</FieldLabel>
                        <input type="number" className="erp-input w-full"
                          value={form.customData?.sentMeters || ""}
                          onChange={e => set({ customData: { ...form.customData, sentMeters: e.target.value } })}
                          placeholder="0" />
                      </div>
                      <div>
                        <FieldLabel>Fabric Issued (m)</FieldLabel>
                        <input type="number" step="0.1" className="erp-input w-full"
                          value={form.customData?.fabricIssuedMeters || (() => {
                            const mats = form.customData?.materialConsumptions || [];
                            const total = mats.reduce((s: number, r: any) => s + Number(r.fabricLength || 0), 0);
                            return total > 0 ? total : "";
                          })()}
                          onChange={e => set({ customData: { ...form.customData, fabricIssuedMeters: e.target.value } })}
                          placeholder="Total meters sent" />
                      </div>
                      <div>
                        <FieldLabel>Fold Length (cm)</FieldLabel>
                        <input type="number" step="0.1" className="erp-input w-full"
                          value={form.customData?.issuedFoldLength || (() => {
                            const mats = form.customData?.materialConsumptions || [];
                            return mats[0]?.foldLength || "";
                          })()}
                          onChange={e => set({ customData: { ...form.customData, issuedFoldLength: e.target.value } })}
                          placeholder="e.g. 100" />
                      </div>
                  </>) : (<>
                    {/* In-house: colours + fabric issued */}
                    <>
                      <div>
                        <FieldLabel>No. of Colours</FieldLabel>
                        <input type="number" className="erp-input w-full"
                          value={form.customData?.colorCount || ""}
                          onChange={e => set({ customData: { ...form.customData, colorCount: e.target.value } })}
                          placeholder="e.g. 4" />
                      </div>
                      <div>
                        <FieldLabel>Screens Used</FieldLabel>
                        <input type="number" className="erp-input w-full"
                          value={form.customData?.screensUsed || ""}
                          onChange={e => set({ customData: { ...form.customData, screensUsed: e.target.value } })}
                          placeholder="e.g. 4" />
                      </div>
                      <div>
                        <FieldLabel>Fabric Issued (m)</FieldLabel>
                        <input type="number" step="0.1" className="erp-input w-full"
                          value={form.customData?.fabricIssuedMeters || (() => {
                            const mats = form.customData?.materialConsumptions || [];
                            const total = mats.reduce((s: number, r: any) => s + Number(r.fabricLength || 0), 0);
                            return total > 0 ? total : "";
                          })()}
                          onChange={e => set({ customData: { ...form.customData, fabricIssuedMeters: e.target.value } })}
                          placeholder="Total meters issued" />
                      </div>
                      <div>
                        <FieldLabel>Fold Length (cm)</FieldLabel>
                        <input type="number" step="0.1" className="erp-input w-full"
                          value={form.customData?.issuedFoldLength || (() => {
                            const mats = form.customData?.materialConsumptions || [];
                            return mats[0]?.foldLength || "";
                          })()}
                          onChange={e => set({ customData: { ...form.customData, issuedFoldLength: e.target.value } })}
                          placeholder="e.g. 100" />
                      </div>
                    </>
                  </>)}
                  </div>

                  {/* ── Stock Receipt (Job Return) — sub-section inside Print Job Details ── */}
                  <div className="border-t border-slate-200 dark:border-slate-700">
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Stock Receipt (Job Return)</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white dark:bg-slate-900">
                      <div className="col-span-2">
                        <FieldLabel>Received Fabric (Meters) *</FieldLabel>
                        <input type="number" step="0.1"
                          className="erp-input w-full !border-emerald-300 dark:!border-emerald-700 !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                          value={form.customData?.receivedFabricMeters || ""}
                          onChange={e => set({
                            customData: { ...form.customData, receivedFabricMeters: e.target.value },
                            completedQuantity: parseFloat(e.target.value) || 0,
                          })}
                          placeholder="e.g. 145" />
                        <p className="text-[9px] text-emerald-600 mt-0.5 font-bold">↳ This sets Completed Meters automatically</p>
                      </div>
                      <div>
                        <FieldLabel>Received Fold Length (cm)</FieldLabel>
                        <input type="number" step="0.1" className="erp-input w-full"
                          value={form.customData?.receivedFoldLength || ""}
                          onChange={e => set({ customData: { ...form.customData, receivedFoldLength: e.target.value } })}
                          placeholder="e.g. 90" />
                      </div>
                      <div>
                        <FieldLabel>Shrinkage/Wastage</FieldLabel>
                        <div className="erp-input bg-slate-50 dark:bg-slate-900/50 text-slate-500 text-sm">
                          {(() => {
                            const issuedM  = Number(form.customData?.fabricIssuedMeters || 0);
                            const issuedFold = Number(form.customData?.issuedFoldLength || (() => {
                              const mats = form.customData?.materialConsumptions || [];
                              return mats[0]?.foldLength || 0;
                            })()) / 100; // cm → m
                            const recM    = Number(form.customData?.receivedFabricMeters || 0);
                            const recFold = Number(form.customData?.receivedFoldLength || 0) / 100;
                            // Area = meters × fold width (m); if no fold, use meters only
                            const issuedArea = issuedM > 0 ? (issuedFold > 0 ? issuedM * issuedFold : issuedM) : 0;
                            const recArea    = recM    > 0 ? (recFold    > 0 ? recM    * recFold    : recM)    : 0;
                            if (issuedArea > 0 && recArea > 0) {
                              const pct = ((issuedArea - recArea) / issuedArea * 100).toFixed(1);
                              return Number(pct) > 0 ? `${pct}% loss` : `+${Math.abs(Number(pct))}% gain`;
                            }
                            return "—";
                          })()}
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                        <div className="flex-1 pr-4">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Add to Ready Printed Fabric Stock?</p>
                          <p className="text-[9px] text-slate-500 mt-0.5">When Completed, this meterage will be added to available stock.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input type="checkbox" className="sr-only peer"
                            checked={form.customData?.addToReadyStock || false}
                            onChange={e => set({ customData: { ...form.customData, addToReadyStock: e.target.checked } })} />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Fabric Inspection: GRN / Store Receipt panel ── */}
              {dept.label === "Fabric Inspection" && (
                <div className="mb-4 mt-2 p-3 bg-lime-50/60 dark:bg-lime-900/20 rounded-xl border border-lime-200 dark:border-lime-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-lime-700 dark:text-lime-400">🏭 GRN — Store Receipt (Grey Fabric)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Total Meters Received</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full"
                        value={form.customData?.totalMeters || ""}
                        onChange={e => set({ customData: { ...form.customData, totalMeters: e.target.value } })}
                        placeholder="e.g. 500" />
                      {form.customData?.totalMeters && (
                        <p className="text-[9px] text-lime-600 dark:text-lime-400 font-bold mt-0.5">
                          ✓ Auto-filled from previous stage's receipt — edit if different
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel>Defect Meters (Reject)</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.defectMeters || ""}
                        onChange={e => set({ customData: { ...form.customData, defectMeters: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Accepted Meters ✓</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full !bg-lime-50 dark:!bg-lime-950/30 !text-lime-700 font-black"
                        value={form.customData?.acceptedMeters !== undefined ? form.customData.acceptedMeters : (() => {
                          const tot = Number(form.customData?.totalMeters || 0);
                          const def = Number(form.customData?.defectMeters || 0);
                          return tot > 0 ? String((tot - def).toFixed(1)) : "";
                        })()}
                        onChange={e => set({ customData: { ...form.customData, acceptedMeters: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>GRN No.</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.grnNo || ""}
                        onChange={e => set({ customData: { ...form.customData, grnNo: e.target.value } })}
                        placeholder="GRN-2024-001" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Store Location</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.warehouseLocation || ""}
                        onChange={e => set({ customData: { ...form.customData, warehouseLocation: e.target.value } })}
                        placeholder="Grey Fabric Godown – Row A" />
                    </div>
                    <div>
                      <FieldLabel>No. of Rolls / Thaans</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.rollCount || ""}
                        onChange={e => set({ customData: { ...form.customData, rollCount: e.target.value } })}
                        placeholder="e.g. 10" />
                    </div>
                    <div>
                      <FieldLabel>4-Point Score (per 100 sq.yd)</FieldLabel>
                      <input type="number" step="0.1" className={`erp-input w-full font-black ${Number(form.customData?.fourPointScore||0) > 40 ? "!bg-rose-50 dark:!bg-rose-950/30 !text-rose-700" : "!bg-lime-50 dark:!bg-lime-950/30 !text-lime-700"}`}
                        value={form.customData?.fourPointScore || ""}
                        onChange={e => set({ customData: { ...form.customData, fourPointScore: e.target.value } })}
                        placeholder="≤40 = pass" />
                    </div>
                    <div className="col-span-2 p-2 bg-white dark:bg-slate-900 rounded-lg border border-lime-200 dark:border-lime-800 text-[10px] text-lime-700 dark:text-lime-400 font-bold">
                      ✅ On "Completed" — accepted meters will auto-create a GRN Stock Entry in the Inventory module.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Dyeing: Vendor Return & Store Receipt panel ── */}
              {dept.label === "Dyeing" && (
                <div className="mb-4 mt-2 p-3 bg-pink-50/60 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-pink-700 dark:text-pink-400">🎨 Dyeing Job Return (Vendor Receipt)</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Sent to Vendor (Meters)</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full"
                        value={form.customData?.sentMeters || ""}
                        onChange={e => set({ customData: { ...form.customData, sentMeters: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Received Back (Meters)</FieldLabel>
                      <input type="number" step="0.1" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.receivedMeters || ""}
                        onChange={e => set({ customData: { ...form.customData, receivedMeters: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Shrinkage Loss (%)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 text-slate-500">
                        {(() => {
                          const s = Number(form.customData?.sentMeters || 0);
                          const r = Number(form.customData?.receivedMeters || 0);
                          if (s > 0 && r > 0) {
                            const pct = ((s - r) / s * 100).toFixed(1);
                            return Number(pct) > 0 ? `${pct}% loss` : `+${Math.abs(Number(pct))}% gain`;
                          }
                          return "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Shade Ref / Pantone</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.shadeRef || ""}
                        onChange={e => set({ customData: { ...form.customData, shadeRef: e.target.value } })}
                        placeholder="PMS 19-1664" />
                    </div>
                    <div>
                      <FieldLabel>Dye Recipe Ref 📋</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.dyeRecipeRef || ""}
                        onChange={e => set({ customData: { ...form.customData, dyeRecipeRef: e.target.value } })}
                        placeholder="RCP-042" />
                    </div>
                    <div>
                      <FieldLabel>Batch No.</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.batchNo || ""}
                        onChange={e => set({ customData: { ...form.customData, batchNo: e.target.value } })}
                        placeholder="BATCH-24-08A" />
                    </div>
                    <div className="col-span-2 flex items-center justify-between p-2 mt-1 bg-white dark:bg-slate-900 rounded-lg border border-pink-200 dark:border-pink-800">
                      <div className="flex-1 pr-4">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Add to Dyed Fabric Store on Completion?</p>
                        <p className="text-[9px] text-slate-500 leading-tight mt-0.5">Received meters will be added to Dyed Fabric Godown automatically.</p>
                      </div>
                      <select className="erp-input text-xs w-36 flex-shrink-0"
                        value={form.customData?.addToStore || "No"}
                        onChange={e => set({ customData: { ...form.customData, addToStore: e.target.value } })}>
                        <option>Yes – on completion</option>
                        <option>No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── QC Check: pass/fail summary ── */}
              {dept.label === "QC Check" && (
                <div className="mb-4 mt-2 p-3 bg-teal-50/60 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-teal-400">🛡️ QC Pass / Fail Summary</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <FieldLabel>Inspected Qty</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.inspectedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, inspectedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Pass Qty ✅</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.passQty || ""}
                        onChange={e => set({ customData: { ...form.customData, passQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Fail Qty ❌</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700 font-black"
                        value={form.customData?.failQty || ""}
                        onChange={e => set({ customData: { ...form.customData, failQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Sent for Alteration 🔄</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.alterationQty || ""}
                        onChange={e => set({ customData: { ...form.customData, alterationQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Pass Rate</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-teal-600">
                        {(() => {
                          const ins = Number(form.customData?.inspectedQty || 0);
                          const pass = Number(form.customData?.passQty || 0);
                          return ins > 0 ? `${(pass / ins * 100).toFixed(1)}%` : "—";
                        })()}
                      </div>
                    </div>
                    <div className="col-span-3">
                      <FieldLabel>Top Defect Category</FieldLabel>
                      <select className="erp-input w-full"
                        value={form.customData?.defectCategory || ""}
                        onChange={e => set({ customData: { ...form.customData, defectCategory: e.target.value } })}>
                        <option value="">– Select –</option>
                        {["Stitching Skip","Measurement Variation","Colour Bleeding","Broken Stitch","Label Missing","Embellishment Loose","Soiling / Stain","Other"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Hand Work: karigar return summary ── */}
              {dept.label === "Hand Work" && (
                <div className="mb-4 mt-2 p-3 bg-yellow-50/60 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-400">🤲 Karigar Return Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Sent to Karigar</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.sentQty || ""}
                        onChange={e => set({ customData: { ...form.customData, sentQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Received Back ✓</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.receivedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, receivedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Rejected ❌</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.rejectedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, rejectedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Accepted (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-yellow-700">
                        {Math.max(0, Number(form.customData?.receivedQty || 0) - Number(form.customData?.rejectedQty || 0)) || "—"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <FieldLabel>Trimmings / Materials Issued</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.trimItemsIssued || ""}
                        onChange={e => set({ customData: { ...form.customData, trimItemsIssued: e.target.value } })}
                        placeholder="e.g. 500 beads, 200 mirrors, 50 patches" />
                    </div>
                    <div>
                      <FieldLabel>Karigar Challan No. 📄</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.challanNo || ""}
                        onChange={e => set({ customData: { ...form.customData, challanNo: e.target.value } })}
                        placeholder="CH-HW-2024-012" />
                    </div>
                    <div>
                      <FieldLabel>Karigar Payment (auto ₹)</FieldLabel>
                      <div className="erp-input bg-emerald-50 dark:bg-emerald-950/30 font-black text-emerald-700">
                        {(() => {
                          const rate = Number(form.customData?.ratePerPc || 0);
                          const accepted = Math.max(0, Number(form.customData?.receivedQty || 0) - Number(form.customData?.rejectedQty || 0));
                          return rate > 0 && accepted > 0 ? `₹${(rate * accepted).toLocaleString()}` : "—";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Stitching: Line output summary ── */}
              {dept.label === "Stitching" && (
                <div className="mb-4 mt-2 p-3 bg-indigo-50/60 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-400">🧵 Stitching Output Log</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Bundles Received (Cutting)</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.bundlesReceived || ""}
                        onChange={e => set({ customData: { ...form.customData, bundlesReceived: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Pieces Issued to Line</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.pcsIssuedToLine || ""}
                        onChange={e => set({ customData: { ...form.customData, pcsIssuedToLine: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Defect Qty (Inline)</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.defectQty || ""}
                        onChange={e => set({ customData: { ...form.customData, defectQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Sent for Alteration 🔄</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.alterationQty || ""}
                        onChange={e => set({ customData: { ...form.customData, alterationQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Forwarded to Finishing ✓</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.forwardedToFinishing || ""}
                        onChange={e => set({ customData: { ...form.customData, forwardedToFinishing: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Actual Pcs/Hr 📊</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.actualPerHr || ""}
                        onChange={e => set({ customData: { ...form.customData, actualPerHr: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Efficiency % (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-indigo-600">
                        {(() => {
                          const target = Number(form.customData?.targetPerHr || 0);
                          const actual = Number(form.customData?.actualPerHr || 0);
                          return target > 0 && actual > 0 ? `${(actual / target * 100).toFixed(1)}%` : "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Stitching Line No.</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.lineNo || ""}
                        onChange={e => set({ customData: { ...form.customData, lineNo: e.target.value } })}
                        placeholder="Line 3" />
                    </div>
                    <div>
                      <FieldLabel>WIP to Next Dept (pcs)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-slate-500 text-xs">
                        {(() => {
                          const issued = Number(form.customData?.pcsIssuedToLine || 0);
                          const fwd = Number(form.customData?.forwardedToFinishing || 0);
                          const alt = Number(form.customData?.alterationQty || 0);
                          const wip = issued - fwd - alt;
                          return issued > 0 ? (wip > 0 ? `${wip} pcs still on line` : "✅ All cleared") : "—";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Embroidery: vendor output & stitch log ── */}
              {dept.label === "Embroidery" && (
                <div className="mb-4 mt-2 p-3 bg-violet-50/60 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-400">🌸 Embroidery Job Return</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Sent to Vendor (pcs) 📤</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.sentQty || ""}
                        onChange={e => set({ customData: { ...form.customData, sentQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Received Back (pcs) 📥</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.receivedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, receivedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Rejected / Rework ❌</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.rejectedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, rejectedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Net Accepted (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-violet-700">
                        {Math.max(0, Number(form.customData?.receivedQty || 0) - Number(form.customData?.rejectedQty || 0)) || "—"}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Challan No.</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.challanNo || ""}
                        onChange={e => set({ customData: { ...form.customData, challanNo: e.target.value } })}
                        placeholder="CH-EMB-2024-088" />
                    </div>
                    <div>
                      <FieldLabel>Still at Vendor (auto)</FieldLabel>
                      <div className="erp-input bg-amber-50 dark:bg-amber-950/20 font-black text-amber-700">
                        {Math.max(0, Number(form.customData?.sentQty || 0) - Number(form.customData?.receivedQty || 0)) || "—"} pcs
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Stitch Count (per pc)</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.stitchCount || ""}
                        onChange={e => set({ customData: { ...form.customData, stitchCount: e.target.value } })}
                        placeholder="e.g. 12500" />
                    </div>
                    <div>
                      <FieldLabel>Karigar Payment (auto ₹)</FieldLabel>
                      <div className="erp-input bg-emerald-50 dark:bg-emerald-950/30 font-black text-emerald-700">
                        {(() => {
                          const rate = Number(form.customData?.ratePerPc || 0);
                          const accepted = Math.max(0, Number(form.customData?.receivedQty || 0) - Number(form.customData?.rejectedQty || 0));
                          return rate > 0 && accepted > 0 ? `₹${(rate * accepted).toLocaleString()}` : "—";
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Washing: vendor return & QC ── */}
              {dept.label === "Washing" && (
                <div className="mb-4 mt-2 p-3 bg-cyan-50/60 dark:bg-cyan-900/20 rounded-xl border border-cyan-200 dark:border-cyan-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-400">🫧 Washing Output</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Sent to Vendor (pcs) 📤</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.sentQty || ""}
                        onChange={e => set({ customData: { ...form.customData, sentQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Received Back (pcs) 📥</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.receivedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, receivedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Rejected / Damaged ❌</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.rejectedQty || ""}
                        onChange={e => set({ customData: { ...form.customData, rejectedQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Shrinkage Loss % (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-cyan-700">
                        {(() => {
                          const s = Number(form.customData?.sentQty || 0);
                          const r = Number(form.customData?.receivedQty || 0);
                          if (s > 0 && r > 0) {
                            const pctLoss = ((s - r) / s * 100).toFixed(1);
                            return Number(pctLoss) > 0 ? `${pctLoss}% loss` : "No loss";
                          }
                          return "—";
                        })()}
                      </div>
                    </div>
                    <div>
                      <FieldLabel>Wash Type 🫧</FieldLabel>
                      <select className="erp-input w-full"
                        value={form.customData?.washType || ""}
                        onChange={e => set({ customData: { ...form.customData, washType: e.target.value } })}>
                        <option value="">— Select —</option>
                        {["Normal Garment Wash","Cold Wash","Stone Wash","Enzyme Wash","Acid Wash","Bleach Wash – Light","Bleach Wash – Heavy","Sand Blast / Sand Wash","Over-dye / Tint","DWR / Water-repellent Finish","Mixed / Multiple"].map(o => <option key={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Temperature (°C)</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.washTemp || ""}
                        onChange={e => set({ customData: { ...form.customData, washTemp: e.target.value } })}
                        placeholder="e.g. 60" />
                    </div>
                    <div>
                      <FieldLabel>Challan No.</FieldLabel>
                    </div>
                    <div>
                      <FieldLabel>Shade OK? ✅</FieldLabel>
                      <select className="erp-input w-full"
                        value={form.customData?.shadeConsistency || ""}
                        onChange={e => set({ customData: { ...form.customData, shadeConsistency: e.target.value } })}>
                        <option value="">— Select —</option>
                        <option>Consistent – All Batches Pass</option>
                        <option>Minor Variation – Acceptable</option>
                        <option>Major Variation – Hold for Re-wash</option>
                        <option>Not Checked Yet</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Finishing: ironing & label output ── */}
              {dept.label === "Finishing" && (
                <div className="mb-4 mt-2 p-3 bg-emerald-50/60 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">✨ Finishing Output</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Pieces Received (from Stitching)</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.pcsReceivedFromStitching || ""}
                        onChange={e => set({ customData: { ...form.customData, pcsReceivedFromStitching: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>QC Pass Qty ✅</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.qcPassQty || ""}
                        onChange={e => set({ customData: { ...form.customData, qcPassQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>QC Fail Qty ❌</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-rose-50 dark:!bg-rose-950/30 !text-rose-700"
                        value={form.customData?.qcFailQty || ""}
                        onChange={e => set({ customData: { ...form.customData, qcFailQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Sent for Alteration 🔄</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.alterationQty || ""}
                        onChange={e => set({ customData: { ...form.customData, alterationQty: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Forwarded to Packing ✓</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.forwardedToPacking || ""}
                        onChange={e => set({ customData: { ...form.customData, forwardedToPacking: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>QC Pass Rate (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-emerald-700">
                        {(() => {
                          const pass = Number(form.customData?.qcPassQty || 0);
                          const fail = Number(form.customData?.qcFailQty || 0);
                          return (pass + fail) > 0 ? `${(pass / (pass + fail) * 100).toFixed(1)}%` : "—";
                        })()}
                      </div>
                    </div>
                    <div className="col-span-2 flex flex-col gap-2 mt-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" className="rounded w-4 h-4 accent-emerald-600"
                          checked={form.customData?.threadTrimDone || false}
                          onChange={e => set({ customData: { ...form.customData, threadTrimDone: e.target.checked } })} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">✂️ Thread Trimming Done</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" className="rounded w-4 h-4 accent-emerald-600"
                          checked={form.customData?.taggingDone || false}
                          onChange={e => set({ customData: { ...form.customData, taggingDone: e.target.checked } })} />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">🏷️ Labels &amp; Tags Attached</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Packing: carton & dispatch output ── */}
              {dept.label === "Packing" && (
                <div className="mb-4 mt-2 p-3 bg-sky-50/60 dark:bg-sky-900/20 rounded-xl border border-sky-200 dark:border-sky-800 space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">📦 Packing Output</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Total Pieces Packed ✅</FieldLabel>
                      <input type="number" className="erp-input w-full !bg-emerald-50 dark:!bg-emerald-950/30 !text-emerald-700 font-black"
                        value={form.customData?.totalPacked || ""}
                        onChange={e => set({ customData: { ...form.customData, totalPacked: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Total Cartons</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.totalCartons || ""}
                        onChange={e => set({ customData: { ...form.customData, totalCartons: e.target.value } })}
                        placeholder="0" />
                    </div>
                    <div>
                      <FieldLabel>Pcs per Carton</FieldLabel>
                      <input type="number" className="erp-input w-full"
                        value={form.customData?.pcsPerCarton || ""}
                        onChange={e => set({ customData: { ...form.customData, pcsPerCarton: e.target.value } })}
                        placeholder="12" />
                    </div>
                    <div>
                      <FieldLabel>Barcode Scan Status</FieldLabel>
                      <select className="erp-input w-full"
                        value={form.customData?.barcodeScanned || ""}
                        onChange={e => set({ customData: { ...form.customData, barcodeScanned: e.target.value } })}>
                        <option value="">— Select —</option>
                        <option>100% Scanned – All Pass</option>
                        <option>Partial – In Progress</option>
                        <option>Failed – Reprint Needed</option>
                        <option>N/A – No Barcode</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>AQL Result</FieldLabel>
                      <select className="erp-input w-full"
                        value={form.customData?.aqlResult || ""}
                        onChange={e => set({ customData: { ...form.customData, aqlResult: e.target.value } })}>
                        <option value="">— Select —</option>
                        <option>Pass – AQL 1.5</option>
                        <option>Pass – AQL 2.5</option>
                        <option>Pass – AQL 4.0</option>
                        <option>Fail – 100% Recheck Ordered</option>
                        <option>Not Yet Done</option>
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Target Dispatch Date 🚚</FieldLabel>
                      <input type="date" className="erp-input w-full"
                        value={form.customData?.dispatchDate || ""}
                        onChange={e => set({ customData: { ...form.customData, dispatchDate: e.target.value } })} />
                    </div>
                    <div>
                      <FieldLabel>Size Ratio (S/M/L/XL)</FieldLabel>
                      <input type="text" className="erp-input w-full"
                        value={form.customData?.sizeRatio || ""}
                        onChange={e => set({ customData: { ...form.customData, sizeRatio: e.target.value } })}
                        placeholder="2/4/4/2 per carton" />
                    </div>
                    <div>
                      <FieldLabel>Short / Excess (auto)</FieldLabel>
                      <div className="erp-input bg-slate-50 dark:bg-slate-900/50 font-black text-sky-700">
                        {(() => {
                          const target = Number(form.woQty || 0);
                          const packed = Number(form.customData?.totalPacked || 0);
                          if (!target || !packed) return "—";
                          const diff = packed - target;
                          return diff === 0 ? "✅ Exact" : diff > 0 ? `+${diff} excess` : `${Math.abs(diff)} short`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

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
          {activeSection === "worker" && (
            <FormCard title={dept.label === "Printing" && form.customData?.isJobWork ? "Assigned Vendor (Job Work)" : "Assign Karigar (Worker)"} icon={Users}>
              {/* Printing Job Work — vendor assignment display */}
              {dept.label === "Printing" && form.customData?.isJobWork ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-700">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-lg shrink-0">🏭</div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-orange-700 dark:text-orange-300 truncate">
                        {form.customData?.vendor || "— Vendor not set —"}
                      </p>
                      <p className="text-[10px] text-orange-500 font-bold">Job Work / Outer</p>
                      {form.customData?.challanNo && (
                        <p className="text-[10px] text-slate-400 font-mono">Challan: {form.customData.challanNo}</p>
                      )}
                    </div>
                  </div>
                  {!form.customData?.vendor && (
                    <p className="text-[10px] text-orange-600 font-bold flex items-center gap-1">
                      ⚠️ Go to the <strong>Output</strong> tab → Print Job Details to enter vendor name.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => set({ customData: { ...form.customData, isJobWork: false }, assignedTo: "" })}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold underline underline-offset-2">
                    Switch to in-house / assign karigar instead
                  </button>
                </div>
              ) : karigars.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button type="button" onClick={() => set({ assignedTo: "" })}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all ${!form.assignedTo || form.assignedTo === "__vendor__" ? `${dept.tw.border} ${dept.tw.bg} ${dept.tw.text}` : "border-slate-200 dark:border-slate-700 text-slate-400"}`}>
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
              ) : (
                <p className="text-[11px] text-slate-400 font-bold">No workers added yet.</p>
              )}
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
            {(() => {
              // Dept-aware unit for "Completed" output quantity
              const isMeterDept = ["Printing", "Fabric Inspection", "Dyeing", "Washing"].includes(dept.label);
              const completedUnit = isMeterDept ? "m" : "pcs";
              const completedLabel = isMeterDept ? "Op Output" : "Completed";
              const completedVal = (() => {
                if (isMeterDept) {
                  // Prefer the dept-specific received meters field over generic completedQuantity
                  const meters =
                    form.customData?.receivedFabricMeters ||
                    form.customData?.acceptedMeters ||
                    form.customData?.receivedMeters ||
                    form.completedQuantity;
                  return meters ? `${meters} ${completedUnit}` : "—";
                }
                return form.completedQuantity ? `${form.completedQuantity} ${completedUnit}` : "—";
              })();
              return [
                { l: "Work Order", v: form.woId || "—" },
                { l: "Product",    v: form.woProduct || "—" },
                { l: "WO Qty",     v: form.woQty ? `${form.woQty} pcs` : "—" },
                { l: completedLabel, v: completedVal },
                { l: "Priority",   v: form.priority },
                { l: "Due Date",   v: form.dueDate ? fmtDate(form.dueDate) : "—" },
                { l: "Sub-tasks",  v: form.subTasks?.length ? `${form.subTasks.filter(s => s.status === "Done").length}/${form.subTasks.length} done` : "None" },
                { l: "Checklist",  v: form.checklist?.length ? `${form.checklist.filter(c => c.done).length}/${form.checklist.length} checked` : "None" },
              ];
            })().map(({ l, v }) => (
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

function extractPieceTag(opName: string): string | undefined {
  const m = opName.match(/\(([^)]+)\)$/);
  if (!m) return undefined;
  const tag = m[1].trim();
  // Only treat as piece tag if it's a known piece label or a short label (not a long phrase)
  if (tag.split(" ").length <= 3) return tag;
  return undefined;
}

function computePlannedDates(ops: any[], opIndex: number, woStartDate?: string): { plannedStartDate?: string; plannedDueDate?: string } {
  if (!woStartDate) return {};
  const workHrsPerDay = 8;
  let cumHoursBefore = 0;
  for (let i = 0; i < opIndex; i++) cumHoursBefore += (ops[i]?.plannedHours || 0);
  const thisOpHours = ops[opIndex]?.plannedHours || 0;
  const startDay = Math.floor(cumHoursBefore / workHrsPerDay);
  const endDay = Math.ceil((cumHoursBefore + thisOpHours) / workHrsPerDay);
  const startDate = new Date(woStartDate);
  startDate.setDate(startDate.getDate() + startDay);
  const endDate = new Date(woStartDate);
  endDate.setDate(endDate.getDate() + endDay);
  return {
    plannedStartDate: startDate.toISOString().split("T")[0],
    plannedDueDate: endDate.toISOString().split("T")[0],
  };
}

function enrichOp(op: any, wo: WorkOrder, opIndex: number): EnrichedTask {
  const rawState = (op.status || "Open") as string;
  // map legacy statuses to workflow states
  const stateMap: Record<string, WorkflowState> = {
    PENDING: "Open", OPEN: "Open", Open: "Open",
    IN_PROGRESS: "Work In Progress",
    COMPLETED: "Completed",
    SKIPPED: "Completed",
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
    pieceTag: extractPieceTag(op.name),
    ...computePlannedDates(wo.operations || [], opIndex, wo.startDate),
  };
}

// ─── Main TaskBoard ───────────────────────────────────────────────────────────

export default function TaskBoard({ taskName: tn, production, onUpdateWorkOrder, karigars = [], inventory = [], onUpdateInventory, onCreateGatePass }: TaskBoardProps) {
  const dept = getDept(tn);

  const [stateFilter, setStateFilter] = useState<StateFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const [editingTask, setEditingTask] = useState<EnrichedTask | null>(null);
  const [filterAssigned, setFilterAssigned] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBlocked, setShowBlocked] = useState(false);
  const [unlockedDepts, setUnlockedDepts] = useState<string[]>([]);

  const allTasks = useMemo<EnrichedTask[]>(() => {
    return production.flatMap(wo => {
      const ops = wo.operations || [];
      return ops
        .map((op, idx) => enrichOp(op, wo, idx))
        .filter(op => opBelongsToDept(op, tn))
        .map(op => {
          // ── Pipeline DAG gating (upgraded from simple prev-op check):
          // Uses pipelineWiring.computeBlockState which evaluates ALL predecessor
          // stages from the GARMENT_PIPELINE DAG, not just the immediately prior op.
          // e.g. Stitching is blocked until Cutting is done, even if op index is non-sequential.
          const globalIdx = ops.findIndex(
            (o, i) => `${wo.id}-${i}` === op._uid
          );
          const { blocked, blockedBy } = computeBlockState(ops, globalIdx);
          if (blocked) {
            return { ...op, _blocked: true, _blockedBy: blockedBy ?? "Previous step" };
          }
          return op;
        });
    });
  }, [production, tn]);

  // Sort: group by woId, then within WO group by pieceTag so multi-piece ops cluster
  const sortedTasks = useMemo(() => {
    return [...allTasks].sort((a, b) => {
      if (a.woId !== b.woId) return a.woId.localeCompare(b.woId);
      if (a.pieceTag && b.pieceTag && a.pieceTag !== b.pieceTag) return a.pieceTag.localeCompare(b.pieceTag);
      return a.opIndex - b.opIndex;
    });
  }, [allTasks]);

  const stateCounts = useMemo(() => {
    const visible = showBlocked ? sortedTasks : sortedTasks.filter(t => !t._blocked);
    const c: Record<string, number> = { ALL: visible.length };
    visible.forEach(t => { c[t.workflowState] = (c[t.workflowState] || 0) + 1; });
    return c;
  }, [sortedTasks, showBlocked]);

  const filteredTasks = useMemo(() => {
    return sortedTasks.filter(t => {
      if (!showBlocked && t._blocked) return false;
      if (stateFilter !== "ALL" && t.workflowState !== stateFilter) return false;
      if (filterAssigned && t.assignedTo !== filterAssigned) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return t.woId?.toLowerCase()?.includes(q) || t.woProduct?.toLowerCase()?.includes(q) || t.name?.toLowerCase()?.includes(q);
      }
      return true;
    });
  }, [sortedTasks, stateFilter, searchTerm, filterAssigned, filterPriority]);

  const saveTask = useCallback((updatedTask: EnrichedTask, opts?: { closeDrawer?: boolean; clearSelection?: boolean }) => {
    const { closeDrawer = true, clearSelection = true } = opts ?? {};
    const wo = production.find(w => w.id === updatedTask.woId);
    if (!wo) return;

    // map workflow state back to legacy status
    const stateToStatus: Record<WorkflowState, "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"> = {
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
      const taskTitle = (updatedTask.name || "").trim() || tn;
      newOps = [...(wo.operations || []), {
        id: `OP-${Date.now()}`,
        name: taskTitle,
        stage: deptNameToStageId(tn), // stage/dept routing stays tied to the dept tab — only the display name changes
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
        startedAt: updatedTask.startedAt,
        completedAt: updatedTask.completedAt,
        customData: updatedTask.customData || {},
        notes: updatedTask.notes,
      }];
    }

    const completedOps = newOps.filter(o => ["COMPLETED", "Completed"].includes((o.status as any) || "")).length;
    const progress = newOps.length > 0 ? Math.round(completedOps / newOps.length * 85) : wo.progress || 0;
    
    // ── Printing → Stock Receipt (Job Return) ────────────────────────────
    // Auto-sync receivedFabricMeters → completedQuantity (Printing works in meters, not pcs).
    if (updatedTask.workflowState === "Completed" && dept.label === "Printing" && !updatedTask.customData?.printReturnLogged) {
      const recMeters = Number(updatedTask.customData?.receivedFabricMeters || 0);
      const rejected = Number(updatedTask.customData?.rejectedQty || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && recMeters > 0) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: recMeters,
          customData: { ...newOps[opIdx].customData, printReturnLogged: true },
        };
        const vendorLabel = updatedTask.customData?.isJobWork && updatedTask.customData?.vendor
          ? ` (via ${updatedTask.customData.vendor})`
          : "";
        toast.success(`Printing Return ✅ — ${recMeters}m received${vendorLabel}${rejected > 0 ? `, ${rejected} pcs rejected` : ""}`);
      }
    }

    if (updatedTask.workflowState === "Completed" && dept.label === "Printing" && updatedTask.customData?.addToReadyStock && !updatedTask.customData?.addedToStock) {
      const recMeters = Number(updatedTask.customData?.receivedFabricMeters || 0);
      if (recMeters > 0 && typeof onUpdateInventory === 'function') {
        const itemName = `Printed Fabric (${wo.productName || 'Unknown'})`;
        const existingCode = inventory.find(i => i.name === itemName || i.id === updatedTask.customData?.stockIssueId);
        onUpdateInventory({
           id: existingCode?.id || `INV-${Date.now()}`,
           name: existingCode?.name || itemName,
           type: existingCode?.type || "PRINTED_FABRIC",
           doctype: "READY_STOCK",
           unit: existingCode?.unit || "METER",
           quantity: (existingCode?.quantity || 0) + recMeters,
           minStockLevel: existingCode?.minStockLevel || 10,
           pricePerUnit: existingCode?.pricePerUnit || 150,
           location: existingCode?.location || "Ready Fabric Godown",
           status: "AVAILABLE",
           latestEntry: `From Job Card ${wo.id} - ${recMeters}M`
        });
        const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
        if (opIdx >= 0) newOps[opIdx].customData = { ...newOps[opIdx].customData, addedToStock: true };

        // Shrinkage = (issued meters × fold) vs (received meters × received fold) — width excluded
        const mats = updatedTask.customData?.materialConsumptions || [{ fabricLength: updatedTask.customData?.fabricLength || 0, foldLength: updatedTask.customData?.foldLength || 0 }];
        const issuedArea = mats.reduce((s: number, r: any) => {
          const len = Number(r.fabricLength || 0);
          const fold = Number(r.foldLength || 0) / 100;
          return s + (fold > 0 ? len * fold : len);
        }, 0);
        const firstMat2 = mats[0] || {};
        const recFold2 = Number(updatedTask.customData?.receivedFoldLength || firstMat2.foldLength || 0) / 100;
        const recArea2 = recFold2 > 0 ? recMeters * recFold2 : recMeters;
        const shrinkPct = issuedArea > 0 && recArea2 > 0 ? ((issuedArea - recArea2) / issuedArea * 100).toFixed(1) : "–";

        toast.success(`GRN Created — ${recMeters}m of ${itemName} → Ready Fabric Warehouse (shrinkage ${shrinkPct}%)`);
      }
    }

    // ── Fabric Inspection → GRN / Store Receipt ────────────────────────────
    // When Fabric Inspection completes, add accepted meters to Grey Fabric store.
    if (updatedTask.workflowState === "Completed" && dept.label === "Fabric Inspection" && !updatedTask.customData?.grnCreated) {
      const acceptedMeters = Number(updatedTask.customData?.acceptedMeters || 0);
      const totalMeters = Number(updatedTask.customData?.totalMeters || 0);
      const metersToStore = acceptedMeters > 0 ? acceptedMeters : totalMeters;
      if (metersToStore > 0 && typeof onUpdateInventory === "function") {
        const shadeRef = updatedTask.customData?.shadeNo ? ` [${updatedTask.customData.shadeNo}]` : "";
        const itemName = `Grey Fabric – ${wo.productName || "Unknown"}${shadeRef}`;
        const existing = inventory.find((i: any) => i.name === itemName || i.lotNumber === updatedTask.customData?.grnNo);
        const grnNo = updatedTask.customData?.grnNo || `GRN-${Date.now()}`;
        onUpdateInventory({
          id: existing?.id || `INV-${Date.now()}`,
          name: existing?.name || itemName,
          type: existing?.type || "GREY_FABRIC",
          doctype: "READY_STOCK",
          unit: existing?.unit || "METER",
          quantity: (existing?.quantity || 0) + metersToStore,
          minStockLevel: existing?.minStockLevel || 50,
          pricePerUnit: existing?.pricePerUnit || 80,
          location: updatedTask.customData?.warehouseLocation || "Grey Fabric Godown",
          status: "AVAILABLE",
          lotNumber: grnNo,
          latestEntry: `GRN ${grnNo} – Received ${metersToStore}M from ${updatedTask.customData?.supplierName || "Supplier"}`,
        });
        const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
        if (opIdx >= 0) newOps[opIdx].customData = { ...newOps[opIdx].customData, grnCreated: true };
        toast.success(`GRN ${grnNo} — ${metersToStore}m ${itemName} → ${updatedTask.customData?.warehouseLocation || 'Grey Fabric Godown'}`);
      }
    }

    // ── Fabric Inspection → sync completedQuantity/rejectedQuantity ───────
    // BUG FIX: the GRN block above only updates inventory; nothing was ever
    // copying acceptedMeters/defectMeters into completedQuantity/rejectedQuantity,
    // so every dashboard (WIP, Analytics, SLA, rejection rate) read 0 for this
    // dept no matter what the user entered. Kept independent of onUpdateInventory
    // so it still fires even when that block's guard conditions don't.
    if (updatedTask.workflowState === "Completed" && dept.label === "Fabric Inspection" && !updatedTask.customData?.fabricInspectionQtyLogged) {
      const totalMeters = Number(updatedTask.customData?.totalMeters || 0);
      const defectMeters = Number(updatedTask.customData?.defectMeters || 0);
      const acceptedMeters = updatedTask.customData?.acceptedMeters !== undefined
        ? Number(updatedTask.customData.acceptedMeters)
        : Math.max(0, totalMeters - defectMeters);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && (acceptedMeters > 0 || defectMeters > 0)) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: acceptedMeters,
          rejectedQuantity: defectMeters,
          customData: { ...newOps[opIdx].customData, fabricInspectionQtyLogged: true },
        };
      }
    }

    // ── Dyeing → Dyed Fabric Store Receipt on completion ──────────────────
    if (updatedTask.workflowState === "Completed" && dept.label === "Dyeing" && !updatedTask.customData?.dyedStockAdded && updatedTask.customData?.addToStore === "Yes – on completion") {
      const receivedMeters = Number(updatedTask.customData?.receivedMeters || 0);
      if (receivedMeters > 0 && typeof onUpdateInventory === "function") {
        const shadeRef = updatedTask.customData?.shadeRef ? ` [${updatedTask.customData.shadeRef}]` : "";
        const itemName = `Dyed Fabric – ${wo.productName || "Unknown"}${shadeRef}`;
        const existing = inventory.find((i: any) => i.name === itemName);
        onUpdateInventory({
          id: existing?.id || `INV-${Date.now()}`,
          name: existing?.name || itemName,
          type: existing?.type || "DYED_FABRIC",
          doctype: "READY_STOCK",
          unit: existing?.unit || "METER",
          quantity: (existing?.quantity || 0) + receivedMeters,
          minStockLevel: existing?.minStockLevel || 20,
          pricePerUnit: existing?.pricePerUnit || 120,
          location: existing?.location || "Dyed Fabric Godown",
          status: "AVAILABLE",
          latestEntry: `Dyeing Return – WO ${wo.id} – ${receivedMeters}M – ${updatedTask.customData?.vendor || "Vendor"}`,
        });
        const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
        if (opIdx >= 0) newOps[opIdx].customData = { ...newOps[opIdx].customData, dyedStockAdded: true };
        const sentM = Number(updatedTask.customData?.sentMeters || 0);
        const shrink = sentM > 0 ? (((sentM - receivedMeters) / sentM) * 100).toFixed(1) : "–";
        toast.success(`Dyed Fabric — ${itemName}: ${receivedMeters}m received, shrinkage ${shrink}% (${updatedTask.customData?.vendor || '–'})`);
      }
    }

    // ── Dyeing → sync completedQuantity from Received Back (Meters) ───────
    // BUG FIX: the store-receipt block above only fires when the "Add to Store"
    // toggle is set to Yes (defaults to No) and only touches inventory — nothing
    // ever copied receivedMeters into completedQuantity, so every dashboard
    // read 0 for this dept regardless of what was entered.
    if (updatedTask.workflowState === "Completed" && dept.label === "Dyeing" && !updatedTask.customData?.dyeingQtyLogged) {
      const receivedMeters = Number(updatedTask.customData?.receivedMeters || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && receivedMeters > 0) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: receivedMeters,
          customData: { ...newOps[opIdx].customData, dyeingQtyLogged: true },
        };
      }
    }

    // ── Hand Work → Karigar Return – piece count update ───────────────────
    // BUG FIX: previously only set a "karigarReturnLogged" flag + toast; never
    // copied receivedQty/rejectedQty into completedQuantity/rejectedQuantity,
    // so this dept always showed 0 done pcs on every dashboard.
    if (updatedTask.workflowState === "Completed" && dept.label === "Hand Work" && !updatedTask.customData?.karigarReturnLogged) {
      const receivedQty = Number(updatedTask.customData?.receivedQty || 0);
      const rejectedQty = Number(updatedTask.customData?.rejectedQty || 0);
      if (receivedQty > 0) {
        const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
        if (opIdx >= 0) {
          newOps[opIdx] = {
            ...newOps[opIdx],
            completedQuantity: Math.max(0, receivedQty - rejectedQty),
            rejectedQuantity: rejectedQty,
            customData: { ...newOps[opIdx].customData, karigarReturnLogged: true },
          };
        }
        toast.success(`Karigar Return — ${updatedTask.customData?.karigarName || '–'}: ${receivedQty - rejectedQty} accepted, ${rejectedQty} rejected`);
      }
    }

    // ── QC Check → Alteration + Pass-to-Packing log ───────────────────────
    // BUG FIX: previously only set a "qcReportLogged" flag + toast; never copied
    // passQty/failQty into completedQuantity/rejectedQuantity, so this dept
    // always showed 0 done pcs on every dashboard.
    if (updatedTask.workflowState === "Completed" && dept.label === "QC Check" && !updatedTask.customData?.qcReportLogged) {
      const passQty = Number(updatedTask.customData?.passQty || 0);
      const failQty = Number(updatedTask.customData?.failQty || 0);
      const altQty = Number(updatedTask.customData?.alterationQty || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: passQty,
          rejectedQuantity: failQty,
          customData: { ...newOps[opIdx].customData, qcReportLogged: true },
        };
      }
      if (passQty > 0 || failQty > 0) {
        toast.success(`QC ${updatedTask.customData?.qcStage || 'Final QC'} — Pass: ${passQty} ✅  Fail: ${failQty} ❌  Alt: ${altQty} 🔄  (${updatedTask.customData?.defectCategory || 'No defect noted'})`);
      }
    }

    // Auto-consume fabric from inventory upon completion of Cutting
    if (updatedTask.workflowState === "Completed" && dept.label === "Cutting" && !updatedTask.customData?.stockConsumed) {
       const matRows = updatedTask.customData?.materialConsumptions || [];
       if (matRows.length > 0 && typeof onUpdateInventory === "function") {
         let consumedInfo = "";
         matRows.forEach((row: any) => {
            if (!row.stockIssueId) return;
            const existing = inventory.find((i: any) => i.id === row.stockIssueId || i.lotNumber === row.stockIssueId);
            if (existing) {
               const qtyToConsume = (wo.quantity || 0) * Number(row.perPcConsumption || 0);
               onUpdateInventory({
                 ...existing,
                 quantity: Math.max(0, existing.quantity - qtyToConsume),
                 latestEntry: `Consumed for WO ${wo.id} - ${qtyToConsume.toFixed(1)}M`
               });
               consumedInfo += `\n- ${qtyToConsume.toFixed(1)}M of ${existing.name}`;
            }
         });
         const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
         if (opIdx >= 0) newOps[opIdx].customData = { ...newOps[opIdx].customData, stockConsumed: true };
         if (consumedInfo) toast.success(`Cutting — stock deducted from Godown:${consumedInfo}`);
       }
    }

    // ── Stitching → Forward to Finishing ──────────────────────────────────
    // Auto-sync forwardedToFinishing → completedQuantity so the WO progress bar is correct.
    if (updatedTask.workflowState === "Completed" && dept.label === "Stitching") {
      const forwarded = Number(updatedTask.customData?.forwardedToFinishing || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && forwarded > 0 && !newOps[opIdx].customData?.stitchingForwardLogged) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: forwarded,
          customData: { ...newOps[opIdx].customData, stitchingForwardLogged: true },
        };
        toast.success(`Stitching ✅ — ${forwarded} pcs → Finishing (Line ${updatedTask.customData?.lineNo || '–'}, ${updatedTask.customData?.alterationQty || 0} alt, ${updatedTask.customData?.defectQty || 0} defects)`);
      }
    }

    // ── Embroidery → Vendor Return Log ───────────────────────────────────
    // Auto-sync receivedQty − rejectedQty → completedQuantity.
    if (updatedTask.workflowState === "Completed" && dept.label === "Embroidery" && !updatedTask.customData?.embReturnLogged) {
      const received = Number(updatedTask.customData?.receivedQty || 0);
      const rejected = Number(updatedTask.customData?.rejectedQty || 0);
      const accepted = Math.max(0, received - rejected);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && received > 0) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: accepted,
          customData: { ...newOps[opIdx].customData, embReturnLogged: true },
        };
        toast.success(`Embroidery Return ✅ — ${accepted} accepted, ${rejected} rejected (Challan: ${updatedTask.customData?.challanNo || '–'})`);
      }
    }

    // ── Washing → Vendor Return Log ───────────────────────────────────────
    // Auto-sync receivedQty → completedQuantity.
    if (updatedTask.workflowState === "Completed" && dept.label === "Washing" && !updatedTask.customData?.washReturnLogged) {
      const received = Number(updatedTask.customData?.receivedQty || 0);
      const rejected = Number(updatedTask.customData?.rejectedQty || 0);
      const sent = Number(updatedTask.customData?.sentQty || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && received > 0) {
        const shrinkPct = sent > 0 ? (((sent - received) / sent) * 100).toFixed(1) : "–";
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: received,
          customData: { ...newOps[opIdx].customData, washReturnLogged: true },
        };
        toast.success(`Washing Return ✅ — ${received} received, ${rejected} rejected, shrinkage ${shrinkPct}%`);
      }
    }

    // ── Finishing → Forward to Packing ───────────────────────────────────
    // Auto-sync forwardedToPacking → completedQuantity.
    if (updatedTask.workflowState === "Completed" && dept.label === "Finishing" && !updatedTask.customData?.finishingForwardLogged) {
      const forwarded = Number(updatedTask.customData?.forwardedToPacking || 0);
      const qcPass = Number(updatedTask.customData?.qcPassQty || 0);
      const qcFail = Number(updatedTask.customData?.qcFailQty || 0);
      const altQty = Number(updatedTask.customData?.alterationQty || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0) {
        const finalQty = forwarded > 0 ? forwarded : qcPass;
        if (finalQty > 0) {
          newOps[opIdx] = {
            ...newOps[opIdx],
            completedQuantity: finalQty,
            customData: { ...newOps[opIdx].customData, finishingForwardLogged: true },
          };
          const passRate = (qcPass + qcFail) > 0 ? `${(qcPass / (qcPass + qcFail) * 100).toFixed(1)}%` : "–";
          toast.success(`Finishing ✅ — ${finalQty} pcs → Packing/QC (Pass ${qcPass}, Fail ${qcFail}, pass rate ${passRate})`);
        }
      }
    }

    // ── Packing → Dispatch Confirmation ──────────────────────────────────
    // Auto-sync totalPacked → completedQuantity.
    if (updatedTask.workflowState === "Completed" && dept.label === "Packing" && !updatedTask.customData?.packingLogged) {
      const packed = Number(updatedTask.customData?.totalPacked || 0);
      const cartons = Number(updatedTask.customData?.totalCartons || 0);
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0 && packed > 0) {
        newOps[opIdx] = {
          ...newOps[opIdx],
          completedQuantity: packed,
          customData: { ...newOps[opIdx].customData, packingLogged: true },
        };
        toast.success(`Packing ✅ — ${packed} pcs in ${cartons} cartons | AQL: ${updatedTask.customData?.aqlResult || '–'} | PO: ${updatedTask.customData?.buyerPO || '–'}`);
      }
    }

    // ── Printing Job Work → Auto-create Returnable Gate Pass ─────────────
    // Fires when task moves to "Work In Progress" with isJobWork ON and
    // fabric has been issued (fabricIssuedMeters > 0), and no gate pass yet.
    if (
      dept.label === "Printing" &&
      updatedTask.customData?.isJobWork &&
      updatedTask.customData?.vendor &&
      updatedTask.workflowState === "Work In Progress" &&
      !updatedTask.customData?.gatePassCreated &&
      typeof onCreateGatePass === "function"
    ) {
      const issuedM   = Number(updatedTask.customData?.fabricIssuedMeters || 0);
      const foldLen   = Number(updatedTask.customData?.issuedFoldLength || 0);
      const challanNo = updatedTask.customData?.challanNo || `CH-PRINT-${Date.now()}`;
      const gpNo      = `GP-${wo.id}-${Date.now()}`;
      const gp = {
        id: `GP-${Date.now()}`,
        doctype: "GatePass",
        number: gpNo,
        date: new Date().toISOString().split("T")[0],
        type: "RETURNABLE",
        referenceId: wo.id,
        partyName: updatedTask.customData.vendor,
        challanNo,
        status: "OPEN",
        items: [
          {
            itemName: `Grey Fabric — ${wo.productName || "Fabric"}`,
            qty: issuedM,
            unit: "METER",
            purpose: `Printing Job Work — WO ${wo.id}${foldLen ? `, Fold ${foldLen}cm` : ""}`,
          },
        ],
      };
      onCreateGatePass(gp);
      // Mark gate pass created on the op so it doesn't re-fire
      const opIdx = newOps.findIndex(op => op.id === updatedTask.id);
      if (opIdx >= 0) newOps[opIdx].customData = { ...newOps[opIdx].customData, gatePassCreated: true, gatePassNo: gpNo };
      toast.success(`Gate Pass ${gpNo} created — ${issuedM}m fabric issued to ${updatedTask.customData.vendor} 📋`);
    }

    onUpdateWorkOrder({ ...wo, operations: newOps, progress: Math.max(wo.progress || 0, progress) });

    // ── Pipeline unlock detection ──────────────────────────────────────────
    // When a Completed transition happens, compute which downstream depts just unlocked.
    if (updatedTask.workflowState === "Completed") {
      const unlockedNow = getUnlockedDepts(newOps, updatedTask.opIndex);
      const forOtherDepts = unlockedNow.filter(d => d.toLowerCase() !== tn.toLowerCase());
      if (forOtherDepts.length > 0) {
        setUnlockedDepts(forOtherDepts);
        setTimeout(() => setUnlockedDepts([]), 5000);
      }
    }

    if (closeDrawer) setEditingTask(null);
    if (clearSelection) setSelectedIds([]);
  }, [production, tn, onUpdateWorkOrder, dept, inventory, onUpdateInventory, onCreateGatePass]);

  const deleteTask = useCallback((task: EnrichedTask) => {
    const wo = production.find(w => w.id === task.woId);
    if (!wo) return;
    const ok = window.confirm(`Delete "${task.name}"? This cannot be undone.`);
    if (!ok) return;
    const newOps = (wo.operations || []).filter((_, i) => i !== task.opIndex);
    onUpdateWorkOrder({ ...wo, operations: newOps });
    toast.success(`Deleted "${task.name}"`);
    setEditingTask(null);
    setSelectedIds(prev => prev.filter(id => id !== task._uid));
  }, [production, onUpdateWorkOrder]);

  const doTransition = useCallback((task: EnrichedTask, to: WorkflowState, opts?: { closeDrawer?: boolean; clearSelection?: boolean }) => {
    if (task._blocked) {
      toast.warn(`Cannot start task — complete: ${task._blockedBy} first`);
      return;
    }
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

  // BUG FIX: bulkComplete/bulkHold previously called doTransition (→ saveTask)
  // once per selected task in a synchronous loop. saveTask reads `wo` from the
  // `production` prop closure, which doesn't change mid-loop (React doesn't
  // re-render between forEach iterations) — so every iteration rebuilds
  // `operations` from the SAME stale snapshot and overwrites the previous
  // iteration's change. Any time 2+ selected tasks belong to the same work
  // order — which is the normal case for multi-piece WOs (Kurti/Pant/Dupatta
  // sets all share one woId) — only the last one processed actually survives;
  // every earlier selected task's completion was silently discarded. Fixed by
  // grouping selections by woId and writing one merged operations array per
  // WO in a single onUpdateWorkOrder call.
  const bulkTransition = (to: WorkflowState) => {
    const selected = filteredTasks.filter(t => selectedIds.includes(t._uid));
    const byWO = new Map<string, EnrichedTask[]>();
    selected.forEach(t => {
      if (!byWO.has(t.woId)) byWO.set(t.woId, []);
      byWO.get(t.woId)!.push(t);
    });
    const stateToStatus: Record<WorkflowState, "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED"> = {
      Draft: "PENDING", Open: "PENDING",
      "Work In Progress": "IN_PROGRESS",
      "QC Review": "IN_PROGRESS",
      Completed: "COMPLETED",
      "On Hold": "PENDING",
      Rejected: "PENDING",
    };
    byWO.forEach((tasks, woId) => {
      const wo = production.find(w => w.id === woId);
      if (!wo) return;
      const now = new Date().toISOString();
      const opIndexes = new Set(tasks.map(t => t.opIndex));
      const newOps = (wo.operations || []).map((op: any, i: number) => {
        if (!opIndexes.has(i)) return op;
        const entry: StateTransition = { time: now, from: op.workflowState, to, user: "Me" };
        return {
          ...op,
          status: stateToStatus[to],
          workflowState: to,
          stateHistory: [entry, ...(op.stateHistory || [])],
          startedAt: to === "Work In Progress" && !op.startedAt ? now : op.startedAt,
          completedAt: to === "Completed" ? now : op.completedAt,
        };
      });
      onUpdateWorkOrder({ ...wo, operations: newOps });
    });
    setSelectedIds([]);
  };

  const bulkComplete = () => bulkTransition("Completed");
  const bulkHold = () => bulkTransition("On Hold");

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
          production={production} taskName={tn}
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

      {/* Detail Form — popup modal overlay */}
      {editingTask && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingTask(null)}
          />
          {/* Modal panel */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
            <div className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-[600px] md:w-[800px] lg:w-[900px] max-w-full shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 pointer-events-auto animate-popUp">
              <DetailForm
                task={editingTask}
                dept={dept}
                karigars={karigars}
                production={production}
                taskName={tn}
                onSave={saveTask}
                onCancel={() => setEditingTask(null)}
                onDelete={deleteTask}
              />
            </div>
          </div>
          <style>{`
            @keyframes popUp {
              from { transform: scale(0.95) translateY(10px); opacity: 0; }
              to   { transform: scale(1) translateY(0);    opacity: 1; }
            }
            .animate-popUp { animation: popUp 0.22s cubic-bezier(0.22,1,0.36,1) both; }
          `}</style>
        </>
      )}

      {/* Pipeline unlock toast — shown when completing an op unlocks downstream depts */}
      <UnlockToast
        unlockedDepts={unlockedDepts}
        onDismiss={() => setUnlockedDepts([])}
      />
    </div>
  );
}