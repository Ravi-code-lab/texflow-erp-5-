/**
 * WorkOrderTaskHub.tsx
 *
 * ERPNext-style horizontal top-tab navigation for all Work Order task pages.
 * Includes: dept task pages + Operations Master + Routing Master sections.
 */

import React, { useState, useEffect } from "react";
import DeptTaskPage from "./DeptTaskPage";
import OperationsMaster from "./OperationsMaster";
import RoutingMaster from "./RoutingMaster";
import type { ProductionJob as WorkOrder, Karigar } from "../../types";
import { opBelongsToDept as pipelineOpBelongsToDept } from "../pipelineWiring";

interface Props {
  production: WorkOrder[];
  onUpdateWorkOrder: (w: WorkOrder) => void;
  karigars: Karigar[];
  initialTab?: string;
  inventory?: any[];
  onUpdateInventory?: (item: any) => void;
  onCreateGatePass?: (gp: any) => void;
}

// Tab types: "dept" = DeptTaskPage, "operations" = OperationsMaster, "routing" = RoutingMaster
interface Tab {
  id: string;
  label: string;
  icon: string;
  type: "dept" | "operations" | "routing";
  section: "tasks" | "masters";
}

const TABS: Tab[] = [
  // ── Task Pages ──────────────────────────────────────────────────
  { id: "Fabric Inspection", label: "Fabric Insp",  icon: "🔍", type: "dept",       section: "tasks" },
  { id: "Dyeing",            label: "Dyeing",        icon: "🎨", type: "dept",       section: "tasks" },
  { id: "Cutting",           label: "Cutting",       icon: "✂️", type: "dept",       section: "tasks" },
  { id: "Stitching",         label: "Stitching",     icon: "🧵", type: "dept",       section: "tasks" },
  { id: "Embroidery",        label: "Embroidery",    icon: "🌸", type: "dept",       section: "tasks" },
  { id: "Printing",          label: "Printing",      icon: "🖨️", type: "dept",       section: "tasks" },
  { id: "Washing",           label: "Washing",       icon: "🫧", type: "dept",       section: "tasks" },
  { id: "Hand Work",         label: "Hand Work",     icon: "🤲", type: "dept",       section: "tasks" },
  { id: "Finishing",         label: "Finishing",     icon: "✨", type: "dept",       section: "tasks" },
  { id: "QC Check",          label: "QC Check",      icon: "🛡️", type: "dept",       section: "tasks" },
  { id: "Packing",           label: "Packing",       icon: "📦", type: "dept",       section: "tasks" },
  // ── Masters ─────────────────────────────────────────────────────
  { id: "operations",        label: "Operations",    icon: "⚙️", type: "operations", section: "masters" },
  { id: "routing",           label: "Routing Master",icon: "🔀", type: "routing",    section: "masters" },
];

const SECTION_LABELS: Record<string, string> = {
  tasks:   "Task Pages",
  masters: "Masters",
};

// Tab badge counts use pipelineWiring as single source of truth

export default function WorkOrderTaskHub({ production, onUpdateWorkOrder, karigars, initialTab, inventory = [], onUpdateInventory, onCreateGatePass }: Props) {
  const [activeTab, setActiveTab] = useState<string>(initialTab ?? TABS[0].id);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const currentTab = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  const pendingCount = (taskName: string): number =>
    production.reduce((total, wo) => {
      const ops = (wo.operations || []).filter(
        (op: any) =>
          pipelineOpBelongsToDept(op, taskName) &&
          (op.status || "PENDING").toUpperCase() !== "COMPLETED" &&
          (op.workflowState || "").toLowerCase() !== "completed"
      );
      return total + ops.length;
    }, 0);

  // Group tabs by section for rendering dividers
  const sections = ["tasks", "masters"] as const;

  return (
    <div className="flex flex-col h-full -mt-5 -mx-4 lg:-mx-6">

      {/* ── Top Header + Tab Bar ─────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 shrink-0">

        {/* Title row */}
        <div className="px-5 pt-4 pb-0 flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-lg text-lg leading-none">
            {currentTab.icon}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 tracking-tight">
              Work Orders · {SECTION_LABELS[currentTab.section]}
            </h2>
            <p className="text-[11px] text-slate-400 font-medium">
              Switch departments or masters using the tabs below
            </p>
          </div>
        </div>

        {/* Scrollable tab strip with section dividers */}
        <div className="overflow-x-auto">
          <div className="flex items-end gap-0 px-5 pt-3 min-w-max">
            {sections.map((section, sIdx) => {
              const sectionTabs = TABS.filter((t) => t.section === section);
              return (
                <React.Fragment key={section}>
                  {/* Section label divider (not the first) */}
                  {sIdx > 0 && (
                    <div className="flex items-center self-center mx-2 pb-0.5">
                      <div className="w-px h-5 bg-slate-200" />
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                        {SECTION_LABELS[section]}
                      </span>
                    </div>
                  )}

                  {sectionTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const pending = tab.type === "dept" ? pendingCount(tab.id) : 0;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`
                          relative flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold
                          border-b-2 whitespace-nowrap transition-all duration-150
                          ${
                            isActive
                              ? tab.section === "masters"
                                ? "border-violet-600 text-violet-700"
                                : "border-indigo-600 text-indigo-700"
                              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                          }
                        `}
                      >
                        <span className="text-sm leading-none">{tab.icon}</span>
                        <span>{tab.label}</span>
                        {pending > 0 && (
                          <span
                            className={`
                              inline-flex items-center justify-center min-w-[17px] h-[17px] px-1
                              rounded-full text-[9px] font-bold
                              ${isActive ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-600"}
                            `}
                          >
                            {pending > 99 ? "99+" : pending}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content Area ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {currentTab.type === "dept" && (
          <DeptTaskPage
            key={activeTab}
            taskName={activeTab}
            production={production}
            onUpdateWorkOrder={onUpdateWorkOrder}
            karigars={karigars}
            inventory={inventory}
            onUpdateInventory={onUpdateInventory}
            onCreateGatePass={onCreateGatePass}
          />
        )}
        {currentTab.type === "operations" && <OperationsMaster />}
        {currentTab.type === "routing" && <RoutingMaster />}
      </div>
    </div>
  );
}
