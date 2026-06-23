/**
 * RoleAccessManager.tsx
 *
 * Full-featured Role-Based Access Control (RBAC) manager for TexFlow ERP.
 *
 * Features:
 *  - Role profiles: ADMIN, MANAGER, ACCOUNTANT, SALES, WORKER + custom roles
 *  - Per-module CRUD permissions (Read / Create / Update / Delete)
 *  - Preset templates with one-click apply
 *  - Visual role × module matrix
 *  - Inline badge on each module showing who can access
 *  - Export/import permissions as JSON
 */

import React, { useState, useMemo } from "react";
import {
  ShieldCheck, ShieldX, Shield, Plus, Trash2, Save, Copy,
  ChevronDown, ChevronUp, RotateCcw, Download, Upload,
  Eye, EyeOff, Edit3, FilePlus2, Eraser, Check, X,
  Users, Lock, Unlock, Info, Layers, BarChart2, Zap,
  Settings2, Workflow, AlertTriangle,
} from "lucide-react";
import type { RolePermission, UserRole } from "../types";
import { toast } from "../utils/toast";

// ─── Module catalogue (all navigable views) ────────────────────────────────

interface ModuleDef {
  id: string;
  label: string;
  group: string;
  sensitive?: boolean; // accounts/payroll etc
}

export const ALL_MODULES: ModuleDef[] = [
  // Workspace
  { id: "DASHBOARD",       label: "Dashboard",         group: "Workspace" },
  { id: "TASKS",           label: "Tasks",             group: "Workspace" },
  { id: "TIMESHEET",       label: "Timesheet",         group: "Workspace" },
  { id: "PROJECTS",        label: "Projects",          group: "Workspace" },
  { id: "NOTIFICATIONS",   label: "Notifications",     group: "Workspace" },
  { id: "WORKFLOW_INBOX",  label: "Workflow Inbox",    group: "Workspace" },
  { id: "REPORT_BUILDER",  label: "Report Builder",    group: "Workspace" },
  { id: "AUDIT_TRAIL",     label: "Audit Trail",       group: "Workspace", sensitive: true },
  { id: "DATA_IMPORT",     label: "Data Import",       group: "Workspace", sensitive: true },
  { id: "ERP_DESK",        label: "ERPNext Desk",      group: "Workspace" },
  { id: "DOCUMENT_DESK",   label: "Document Desk",     group: "Workspace" },
  // Selling
  { id: "CRM",             label: "CRM / Leads",       group: "Selling" },
  { id: "QUOTATION",       label: "Quotation",         group: "Selling" },
  { id: "ORDERS",          label: "Sales Order",       group: "Selling" },
  { id: "POS",             label: "Point of Sale",     group: "Selling" },
  { id: "DELIVERY_CHALLAN",label: "Delivery Note",     group: "Selling" },
  { id: "PACKING_SLIPS",   label: "Packing Slip",      group: "Selling" },
  { id: "TAX_INVOICE",     label: "Sales Invoice",     group: "Selling" },
  { id: "SALES_RETURN",    label: "Sales Return",      group: "Selling" },
  { id: "CREDIT_NOTE",     label: "Credit Note",       group: "Selling", sensitive: true },
  { id: "SUPPORT_TICKET",  label: "Support Ticket",    group: "Selling" },
  // Buying
  { id: "MATERIAL_REQUEST",   label: "Material Request",    group: "Buying" },
  { id: "SUPPLIER_QUOTATION", label: "Supplier Quotation",  group: "Buying" },
  { id: "PURCHASE_ORDER",     label: "Purchase Order",      group: "Buying" },
  { id: "PURCHASE_INWARD",    label: "Purchase Receipt",    group: "Buying" },
  { id: "PURCHASE_INVOICE",   label: "Purchase Invoice",    group: "Buying", sensitive: true },
  { id: "PURCHASE_RETURN",    label: "Purchase Return",     group: "Buying" },
  { id: "DEBIT_NOTE",         label: "Debit Note",          group: "Buying", sensitive: true },
  // Manufacturing
  { id: "PRODUCTION",          label: "Work Orders",           group: "Manufacturing" },
  { id: "WORK_ORDER_TASKS",    label: "Task Pages",            group: "Manufacturing" },
  { id: "DESIGN_RECIPE",       label: "Bill of Materials",     group: "Manufacturing" },
  { id: "SAMPLING",            label: "Sample Request",        group: "Manufacturing" },
  { id: "OPERATIONS_MASTER",   label: "Operations Master",     group: "Manufacturing" },
  { id: "ROUTING_MASTER",      label: "Routing Master",        group: "Manufacturing" },
  { id: "JOB_WORK",            label: "Job Work",              group: "Manufacturing" },
  { id: "QUALITY",             label: "Quality Inspection",    group: "Manufacturing" },
  { id: "TRACK_LOTS",          label: "Lot Tracking",          group: "Manufacturing" },
  { id: "FABRIC_COSTING",      label: "Garment Costing",       group: "Manufacturing" },
  // Stock
  { id: "INVENTORY",         label: "Item Master",           group: "Stock" },
  { id: "OPENING_STOCK",     label: "Opening Stock",         group: "Stock", sensitive: true },
  { id: "CATALOG",           label: "Product Catalog",       group: "Stock" },
  { id: "STOCK_TRANSFER",    label: "Stock Entry",           group: "Stock" },
  { id: "STOCK_AUDIT",       label: "Stock Reconciliation",  group: "Stock", sensitive: true },
  { id: "DISPATCH_PLANNER",  label: "Dispatch Planner",      group: "Stock" },
  { id: "ASSETS",            label: "Fixed Assets",          group: "Stock" },
  { id: "VEHICLES",          label: "Vehicle Log",           group: "Stock" },
  // Accounts & HR
  { id: "CHART_OF_ACCOUNTS", label: "Chart of Accounts",    group: "Accounts & HR", sensitive: true },
  { id: "ACCOUNTING",        label: "Journal Entry",         group: "Accounts & HR", sensitive: true },
  { id: "CASH_BOOK",         label: "Payment Entry",         group: "Accounts & HR", sensitive: true },
  { id: "TALLY_INTEGRATION", label: "Tally Sync",           group: "Accounts & HR", sensitive: true },
  { id: "KARIGAR_KHATA",     label: "Karigar Ledger",        group: "Accounts & HR", sensitive: true },
  { id: "AGENT_KHATA",       label: "Agent Ledger",          group: "Accounts & HR", sensitive: true },
  { id: "EXPENSE_CLAIM",     label: "Expense Claim",         group: "Accounts & HR" },
  { id: "ATTENDANCE",        label: "Attendance",            group: "Accounts & HR" },
  { id: "LEAVE_APP",         label: "Leave Application",     group: "Accounts & HR" },
  { id: "PAYROLL",           label: "Salary Slip",           group: "Accounts & HR", sensitive: true },
  // Masters
  { id: "CUSTOMERS",  label: "Customers",    group: "Masters" },
  { id: "SUPPLIERS",  label: "Suppliers",    group: "Masters" },
  { id: "TEAM",       label: "Team",         group: "Masters", sensitive: true },
  { id: "KARIGARS",   label: "Karigars",     group: "Masters" },
  { id: "AGENTS",     label: "Agents",       group: "Masters" },
  { id: "OFFICES",    label: "Offices",      group: "Masters" },
  // Settings (admin only defaults)
  { id: "SETTINGS",         label: "Settings",        group: "System", sensitive: true },
  { id: "DOCTYPE_CENTER",   label: "DocType Center",  group: "System", sensitive: true },
  { id: "UPGRADE",          label: "System Upgrade",  group: "System", sensitive: true },
  { id: "PRINT_FORMATS",    label: "Print Formats",   group: "System" },
];

export const MODULE_GROUPS = Array.from(new Set(ALL_MODULES.map(m => m.group)));

// ─── Role colours ──────────────────────────────────────────────────────────

export const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  ADMIN:      { label: "Admin",      color: "text-rose-700",   bg: "bg-rose-50",    border: "border-rose-200",   icon: "👑" },
  MANAGER:    { label: "Manager",    color: "text-indigo-700", bg: "bg-indigo-50",  border: "border-indigo-200", icon: "🧩" },
  ACCOUNTANT: { label: "Accountant", color: "text-emerald-700",bg: "bg-emerald-50", border: "border-emerald-200",icon: "📊" },
  SALES:      { label: "Sales",      color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  icon: "🛒" },
  WORKER:     { label: "Worker",     color: "text-cyan-700",   bg: "bg-cyan-50",    border: "border-cyan-200",   icon: "🔧" },
};

const DEFAULT_ROLES: UserRole[] = ["MANAGER", "ACCOUNTANT", "SALES", "WORKER"];

// ─── Preset templates ──────────────────────────────────────────────────────

type CRUDPreset = { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean };

const FULL: CRUDPreset    = { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: true  };
const READ_ONLY: CRUDPreset = { canRead: true, canCreate: false, canUpdate: false, canDelete: false };
const NO_ACCESS: CRUDPreset = { canRead: false, canCreate: false, canUpdate: false, canDelete: false };
const READ_WRITE: CRUDPreset = { canRead: true, canCreate: true,  canUpdate: true,  canDelete: false };

type PresetTemplate = { id: string; label: string; description: string; icon: string; permissions: Record<string, Record<string, CRUDPreset>> };

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    id: "FLOOR_SUPERVISOR",
    label: "Floor Supervisor",
    description: "Full mfg access, no accounts or settings",
    icon: "🏭",
    permissions: {
      MANAGER: {
        ...Object.fromEntries(ALL_MODULES.filter(m => m.group === "Manufacturing").map(m => [m.id, FULL])),
        ...Object.fromEntries(ALL_MODULES.filter(m => m.group === "Stock").map(m => [m.id, READ_WRITE])),
        ...Object.fromEntries(ALL_MODULES.filter(m => ["Accounts & HR", "System"].includes(m.group)).map(m => [m.id, NO_ACCESS])),
        SETTINGS: NO_ACCESS, TEAM: READ_ONLY, PAYROLL: NO_ACCESS,
      },
    },
  },
  {
    id: "SALES_EXEC",
    label: "Sales Executive",
    description: "Selling, CRM, Quotation — no buying or accounts",
    icon: "🛒",
    permissions: {
      SALES: {
        ...Object.fromEntries(ALL_MODULES.filter(m => m.group === "Selling").map(m => [m.id, READ_WRITE])),
        DASHBOARD: FULL, TASKS: FULL, CUSTOMERS: READ_WRITE,
        ...Object.fromEntries(ALL_MODULES.filter(m => ["Buying", "Accounts & HR", "System"].includes(m.group)).map(m => [m.id, NO_ACCESS])),
      },
    },
  },
  {
    id: "ACCOUNTANT_ROLE",
    label: "Accounts Only",
    description: "Full accounts, read-only everything else",
    icon: "📊",
    permissions: {
      ACCOUNTANT: {
        ...Object.fromEntries(ALL_MODULES.filter(m => m.group === "Accounts & HR" && m.sensitive).map(m => [m.id, FULL])),
        ...Object.fromEntries(ALL_MODULES.filter(m => !["Accounts & HR", "System"].includes(m.group)).map(m => [m.id, READ_ONLY])),
        SETTINGS: NO_ACCESS, AUDIT_TRAIL: NO_ACCESS, DATA_IMPORT: NO_ACCESS,
      },
    },
  },
  {
    id: "WORKER_ROLE",
    label: "Shop Floor Worker",
    description: "Task pages & timesheet only",
    icon: "🔧",
    permissions: {
      WORKER: {
        DASHBOARD: READ_ONLY,
        WORK_ORDER_TASKS: FULL,
        TIMESHEET: FULL,
        ATTENDANCE: READ_ONLY,
        NOTIFICATIONS: READ_ONLY,
        ...Object.fromEntries(
          ALL_MODULES
            .filter(m => !["DASHBOARD","WORK_ORDER_TASKS","TIMESHEET","ATTENDANCE","NOTIFICATIONS"].includes(m.id))
            .map(m => [m.id, NO_ACCESS])
        ),
      },
    },
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeBlankPerms(role: string): RolePermission[] {
  return ALL_MODULES.map(m => ({
    id: `rp_${role}_${m.id}`,
    role,
    module: m.id,
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canDelete: true,
  }));
}

function getOrDefault(perms: RolePermission[], role: string, mod: string): CRUDPreset {
  const found = perms.find(p => p.role === role && p.module === mod);
  if (found) return { canRead: found.canRead, canCreate: found.canCreate, canUpdate: found.canUpdate, canDelete: found.canDelete };
  return FULL; // default: full access if no explicit rule
}

function applyPreset(
  current: RolePermission[],
  role: string,
  modulePerms: Record<string, CRUDPreset>
): RolePermission[] {
  const next = current.filter(p => p.role !== role);
  Object.entries(modulePerms).forEach(([mod, crud]) => {
    next.push({
      id: `rp_${role}_${mod}_${Date.now()}`,
      role,
      module: mod,
      ...crud,
    });
  });
  return next;
}

// ─── CRUD Toggle row ────────────────────────────────────────────────────────

const CRUD_KEYS = ["canRead", "canCreate", "canUpdate", "canDelete"] as const;
const CRUD_LABELS: Record<typeof CRUD_KEYS[number], { short: string; icon: React.ReactNode; color: string }> = {
  canRead:   { short: "Read",   icon: <Eye className="w-3 h-3" />,      color: "bg-sky-500" },
  canCreate: { short: "Create", icon: <FilePlus2 className="w-3 h-3" />, color: "bg-emerald-500" },
  canUpdate: { short: "Edit",   icon: <Edit3 className="w-3 h-3" />,     color: "bg-amber-500" },
  canDelete: { short: "Delete", icon: <Eraser className="w-3 h-3" />,    color: "bg-rose-500" },
};

interface CRUDRowProps {
  modId: string;
  modLabel: string;
  sensitive?: boolean;
  perms: CRUDPreset;
  onChange: (key: typeof CRUD_KEYS[number], val: boolean) => void;
}

function CRUDRow({ modId, modLabel, sensitive, perms, onChange }: CRUDRowProps) {
  const locked = !perms.canRead;
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${locked ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-100 hover:border-slate-200"}`}>
      {/* Module name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700 truncate">{modLabel}</span>
          {sensitive && (
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-full">sensitive</span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono">{modId}</span>
      </div>

      {/* CRUD toggles */}
      <div className="flex items-center gap-1.5">
        {CRUD_KEYS.map(key => {
          const active = perms[key];
          const disabled = key !== "canRead" && !perms.canRead;
          const meta = CRUD_LABELS[key];
          return (
            <button
              key={key}
              title={meta.short}
              disabled={disabled}
              onClick={() => onChange(key, !active)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all
                ${active
                  ? `${meta.color} text-white border-transparent`
                  : "bg-slate-100 text-slate-400 border-slate-200 hover:border-slate-300"
                }
                ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"}
              `}
            >
              {meta.icon}
              <span className="hidden sm:inline">{meta.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Summary pill ─────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] || { label: role, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200", icon: "👤" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${meta.bg} ${meta.color} ${meta.border}`}>
      <span>{meta.icon}</span> {meta.label}
    </span>
  );
}

// ─── Matrix view ───────────────────────────────────────────────────────────

function MatrixView({ roles, perms }: { roles: string[]; perms: RolePermission[] }) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-3 text-slate-500 font-black uppercase tracking-widest text-[10px] w-48 sticky left-0 bg-slate-50 z-10">Module</th>
            {roles.map(role => {
              const meta = ROLE_META[role] || { label: role, color: "text-slate-600", icon: "👤" };
              return (
                <th key={role} className="px-3 py-3 text-center min-w-[100px]">
                  <div className={`text-[11px] font-black ${meta.color}`}>{meta.icon} {meta.label}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ALL_MODULES.map(mod => (
            <tr key={mod.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-2 sticky left-0 bg-white z-10">
                <div className="font-semibold text-slate-700">{mod.label}</div>
                <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{mod.group}</div>
              </td>
              {roles.map(role => {
                const p = getOrDefault(perms, role, mod.id);
                const dots = [
                  p.canRead    ? "R" : "-",
                  p.canCreate  ? "C" : "-",
                  p.canUpdate  ? "U" : "-",
                  p.canDelete  ? "D" : "-",
                ];
                const allOn = p.canRead && p.canCreate && p.canUpdate && p.canDelete;
                const allOff = !p.canRead;
                return (
                  <td key={role} className="px-3 py-2 text-center">
                    {allOff ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[10px] font-black">
                        <EyeOff className="w-3 h-3" /> No Access
                      </span>
                    ) : allOn ? (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black">
                        <Check className="w-3 h-3" /> Full
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-slate-500 tracking-widest">{dots.join("")}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

interface RoleAccessManagerProps {
  rolePermissions: RolePermission[];
  onAddRolePermission: (rp: RolePermission) => void;
  onUpdateRolePermission: (rp: RolePermission) => void;
  onDeleteRolePermission: (id: string) => void;
}

export default function RoleAccessManager({
  rolePermissions,
  onAddRolePermission,
  onUpdateRolePermission,
  onDeleteRolePermission,
}: RoleAccessManagerProps) {
  const [selectedRole, setSelectedRole] = useState<string>("MANAGER");
  const [filterGroup, setFilterGroup] = useState<string>("ALL");
  const [searchQ, setSearchQ] = useState("");
  const [viewMode, setViewMode] = useState<"editor" | "matrix">("editor");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, CRUDPreset>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const roles = DEFAULT_ROLES;

  const toggleGroup = (g: string) => setExpandedGroups(prev => ({ ...prev, [g]: !prev[g] }));

  // Effective perms for selected role (merging unsaved changes)
  const effectivePerms = useMemo<Record<string, CRUDPreset>>(() => {
    const base: Record<string, CRUDPreset> = {};
    ALL_MODULES.forEach(m => {
      base[m.id] = unsavedChanges[m.id] ?? getOrDefault(rolePermissions, selectedRole, m.id);
    });
    return base;
  }, [rolePermissions, selectedRole, unsavedChanges]);

  const handleChange = (modId: string, key: typeof CRUD_KEYS[number], val: boolean) => {
    setUnsavedChanges(prev => {
      const current = prev[modId] ?? effectivePerms[modId];
      const next = { ...current, [key]: val };
      // If read is turned off, kill everything
      if (key === "canRead" && !val) {
        next.canCreate = false;
        next.canUpdate = false;
        next.canDelete = false;
      }
      return { ...prev, [modId]: next };
    });
  };

  const handleSave = () => {
    setSaveStatus("saving");
    Object.entries(unsavedChanges).forEach(([modId, crud]) => {
      const existing = rolePermissions.find(p => p.role === selectedRole && p.module === modId);
      if (existing) {
        onUpdateRolePermission({ ...(existing as any), ...(crud as any) });
      } else {
        onAddRolePermission({
          id: `rp_${selectedRole}_${modId}_${Date.now()}`,
          role: selectedRole as UserRole,
          module: modId,
          ...(crud as any),
        });
      }
    });
    setUnsavedChanges({});
    setTimeout(() => setSaveStatus("saved"), 400);
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleReset = () => setUnsavedChanges({});

  const handleApplyPreset = (preset: PresetTemplate) => {
    const rolePerms = preset.permissions[selectedRole];
    if (!rolePerms) {
      toast.warn(`This preset doesn't have config for role: ${selectedRole}`);
      return;
    }
    const changes: Record<string, CRUDPreset> = {};
    ALL_MODULES.forEach(m => {
      changes[m.id] = rolePerms[m.id] ?? FULL;
    });
    setUnsavedChanges(changes);
  };

  const handleGrantAll = () => {
    const changes: Record<string, CRUDPreset> = {};
    ALL_MODULES.forEach(m => { changes[m.id] = FULL; });
    setUnsavedChanges(changes);
  };

  const handleRevokeAll = () => {
    const changes: Record<string, CRUDPreset> = {};
    ALL_MODULES.forEach(m => { changes[m.id] = NO_ACCESS; });
    setUnsavedChanges(changes);
  };

  const handleExport = () => {
    const data = JSON.stringify({ role: selectedRole, permissions: effectivePerms }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `texflow_rbac_${selectedRole.toLowerCase()}.json`;
    a.click();
  };

  const filteredModules = useMemo(() => {
    return ALL_MODULES.filter(m => {
      if (filterGroup !== "ALL" && m.group !== filterGroup) return false;
      if (searchQ && !m.label?.toLowerCase()?.includes(searchQ.toLowerCase()) && !m.id?.toLowerCase()?.includes(searchQ.toLowerCase())) return false;
      return true;
    });
  }, [filterGroup, searchQ]);

  const groupedModules = useMemo(() => {
    const groups: Record<string, ModuleDef[]> = {};
    filteredModules.forEach(m => {
      if (!groups[m.group]) groups[m.group] = [];
      groups[m.group].push(m);
    });
    return groups;
  }, [filteredModules]);

  const dirtyCount = Object.keys(unsavedChanges).length;
  const roleMeta = ROLE_META[selectedRole] || { label: selectedRole, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: "👤" };

  // Stats
  const accessCount = ALL_MODULES.filter(m => effectivePerms[m.id]?.canRead !== false).length;
  const fullCount   = ALL_MODULES.filter(m => {
    const p = effectivePerms[m.id];
    return p?.canRead && p?.canCreate && p?.canUpdate && p?.canDelete;
  }).length;
  const noCount     = ALL_MODULES.filter(m => !effectivePerms[m.id]?.canRead).length;

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen">

      {/* ── Header ── */}
      <div className="flex-none bg-white border-b border-slate-200 px-5 py-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight">Role Access Manager</h1>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-widest">Control what each role can read, create, edit, or delete</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode("editor")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "editor" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Shield className="w-3.5 h-3.5" /> Editor
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${viewMode === "matrix" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                <Layers className="w-3.5 h-3.5" /> Matrix
              </button>
            </div>

            <button onClick={handleExport} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Export JSON">
              <Download className="w-4 h-4" />
            </button>

            {dirtyCount > 0 && (
              <>
                <button onClick={handleReset} className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Discard ({dirtyCount})
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : `Save (${dirtyCount})`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {viewMode === "matrix" ? (
        <div className="flex-1 overflow-auto p-5">
          <MatrixView roles={roles} perms={rolePermissions} />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Role selector ── */}
          <div className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select Role</p>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-1">
              {roles.map(role => {
                const meta = ROLE_META[role] || { label: role, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: "👤" };
                const isSelected = selectedRole === role;
                const rpCount = ALL_MODULES.filter(m => {
                  const p = getOrDefault(rolePermissions, role, m.id);
                  return !p.canRead;
                }).length;
                return (
                  <button
                    key={role}
                    onClick={() => { setSelectedRole(role); setUnsavedChanges({}); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all
                      ${isSelected
                        ? `${meta.bg} ${meta.border} ${meta.color} shadow-sm`
                        : "border-transparent hover:bg-slate-50 text-slate-600"
                      }`}
                  >
                    <span className="text-lg leading-none">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-black truncate">{meta.label}</div>
                      {rpCount > 0 && (
                        <div className="text-[10px] text-slate-400">{rpCount} restricted</div>
                      )}
                    </div>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />}
                  </button>
                );
              })}
            </div>

            {/* Presets */}
            <div className="border-t border-slate-100 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Quick Presets</p>
              <div className="space-y-1">
                {PRESET_TEMPLATES.filter(pt => pt.permissions[selectedRole]).map(pt => (
                  <button
                    key={pt.id}
                    onClick={() => handleApplyPreset(pt)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-indigo-50 text-left transition-colors"
                    title={pt.description}
                  >
                    <span className="text-base leading-none">{pt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-700 truncate">{pt.label}</div>
                      <div className="text-[10px] text-slate-400 truncate">{pt.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: Permissions editor ── */}
          <div className="flex-1 flex flex-col overflow-hidden">

            {/* Role header + stats */}
            <div className={`flex-none ${roleMeta.bg} border-b ${roleMeta.border} px-5 py-3`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{roleMeta.icon}</span>
                  <div>
                    <h2 className={`text-sm font-black uppercase tracking-wider ${roleMeta.color}`}>{roleMeta.label}</h2>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-slate-500 font-bold">{accessCount} modules accessible</span>
                      <span className="text-[10px] text-emerald-600 font-bold">{fullCount} full access</span>
                      {noCount > 0 && <span className="text-[10px] text-rose-600 font-bold">{noCount} blocked</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleGrantAll} className="px-3 py-1.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1">
                    <Unlock className="w-3 h-3" /> Grant All
                  </button>
                  <button onClick={handleRevokeAll} className="px-3 py-1.5 text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Revoke All
                  </button>
                </div>
              </div>
            </div>

            {/* Search + group filter */}
            <div className="flex-none bg-white border-b border-slate-200 px-5 py-3 flex gap-3">
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search modules…"
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-400 bg-white"
              />
              <select
                value={filterGroup}
                onChange={e => setFilterGroup(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 bg-white"
              >
                <option value="ALL">All Groups</option>
                {MODULE_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Module list */}
            <div className="flex-1 overflow-auto p-5 space-y-4">
              {Object.entries(groupedModules).map(([group, mods]: [string, ModuleDef[]]) => {
                const isOpen = expandedGroups[group] !== false; // default open
                const noAccessInGroup = mods.filter(m => !effectivePerms[m.id]?.canRead).length;
                return (
                  <div key={group} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-600">{group}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{mods.length} modules</span>
                        {noAccessInGroup > 0 && (
                          <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-100 px-1.5 py-0.5 rounded-full font-black">{noAccessInGroup} blocked</span>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>
                    {isOpen && (
                      <div className="p-3 space-y-1.5">
                        {mods.map(mod => {
                          const p = effectivePerms[mod.id];
                          const isDirty = !!unsavedChanges[mod.id];
                          return (
                            <div key={mod.id} className={`relative ${isDirty ? "ring-1 ring-indigo-300 rounded-xl" : ""}`}>
                              {isDirty && (
                                <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-500 rounded-full z-10 border-2 border-white" />
                              )}
                              <CRUDRow
                                modId={mod.id}
                                modLabel={mod.label}
                                sensitive={mod.sensitive}
                                perms={p}
                                onChange={(key, val) => handleChange(mod.id, key, val)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN notice */}
      <div className="flex-none bg-amber-50 border-t border-amber-100 px-5 py-2 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-[11px] text-amber-700 font-semibold">
          ADMIN role always has full access to all modules and cannot be restricted.
          Changes here apply to non-admin users only and take effect on next page navigation.
        </p>
      </div>
    </div>
  );
}
