import React from 'react';
import { STAGE_MAP, StageId } from '../pipelineWiring';

// BUG FIX: this module previously exported stub no-ops —
// `DEFAULT_ROUTING_TEMPLATES = []` and `getProcessMeta() => {}` — while
// WorkOrderPage.tsx actively imports and depends on both as if they were
// real (8 call sites use getProcessMeta(...).label/.bg/.color/.border/.icon,
// and `templates` state is seeded directly from DEFAULT_ROUTING_TEMPLATES).
// The result: every "Current Stage" label on a Work Order card rendered
// blank, the active step in the routing-progress pill lost its color/icon
// highlight (className literally contained the string "undefined"), and a
// fresh install had zero default routing templates to apply.
//
// Production.tsx's own loader comments explicitly say "Always prefer
// RoutingMaster templates as the authoritative source" — confirming this
// was meant to be the shared, centralized definition. Restored from the
// equivalent data that already exists (and still works) locally inside
// Production.tsx, so both pages are now backed by the same source.

export const ROUTING_STORAGE_KEY = 'ROUTING_TEMPLATES';

export const PROCESS_STAGES = [
  { id: 'CUTTING',   label: 'Cutting',   color: 'blue',    icon: '✂️' },
  { id: 'JOBWORK',   label: 'Jobwork',   color: 'purple',  icon: '🤝' },
  { id: 'STITCHING', label: 'Stitching', color: 'indigo',  icon: '🧵' },
  { id: 'FINISHING', label: 'Finishing', color: 'pink',    icon: '✨' },
  { id: 'READY',     label: 'Ready',     color: 'emerald', icon: '✅' },
] as const;

const PROCESS_META_BY_ID: Record<string, { label: string; color: string; icon: string; bg: string; border: string }> =
  PROCESS_STAGES.reduce((acc, s) => {
    acc[s.id] = { label: s.label, color: `text-${s.color}-600`, bg: `bg-${s.color}-50`, border: `border-${s.color}-200`, icon: s.icon };
    return acc;
  }, {} as Record<string, { label: string; color: string; icon: string; bg: string; border: string }>);

/** Returns display metadata (label/colors/icon) for a routing stage id.
 *  Resolves both the legacy 5-stage set (CUTTING/JOBWORK/STITCHING/FINISHING/READY)
 *  and real GARMENT_PIPELINE StageIds (FABRIC_INSPECTION, EMBROIDERY_GARMENT, etc.) —
 *  routing templates now emit the latter so DeptTaskPage can route ops to the
 *  correct department tab; this keeps WorkOrderPage's stage labels in sync. */
export function getProcessMeta(process: string): { label: string; color: string; icon: string; bg: string; border: string } {
  const key = (process || '').toUpperCase();
  if (PROCESS_META_BY_ID[key]) return PROCESS_META_BY_ID[key];

  const pipelineStage = STAGE_MAP.get(process as StageId);
  if (pipelineStage) {
    const c = pipelineStage.accentColor || 'slate';
    return { label: pipelineStage.label, color: `text-${c}-600`, bg: `bg-${c}-50`, border: `border-${c}-200`, icon: pipelineStage.icon || '⚙️' };
  }

  return { label: process || '—', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '⚙️' };
}

export const DEFAULT_ROUTING_TEMPLATES: any[] = [
  {
    id: 'ROUTE-KURTI-STD',
    name: 'Kurti Standard Route',
    category: 'Kurti',
    operations: [
      // NOTE: `stage` must be a valid GARMENT_PIPELINE StageId (see pipelineWiring.ts)
      // so DeptTaskPage/TaskBoard route each op to the correct department tab.
      // Using the old CUTTING/JOBWORK/STITCHING/FINISHING/READY values here
      // caused ops to either land in the wrong tab (fuzzy name match picking
      // an unintended dept) or vanish from every tab (no match at all).
      { id: 'OP-FABRIC-ISSUE', name: 'Fabric Issue', stage: 'FABRIC_INSPECTION', processType: 'IN_HOUSE', workstationType: 'Store', plannedHours: 1, qualityCheckpoint: false },
      { id: 'OP-CUTTING', name: 'Panel Cutting', stage: 'CUTTING', processType: 'IN_HOUSE', workstationType: 'Cutting Table', plannedHours: 4, qualityCheckpoint: true },
      { id: 'OP-EMBROIDERY', name: 'Embroidery / Print', stage: 'EMBROIDERY_GARMENT', processType: 'JOB_WORK', workstationType: 'Vendor', plannedHours: 24, qualityCheckpoint: true },
      { id: 'OP-STITCHING', name: 'Stitching', stage: 'STITCHING', processType: 'IN_HOUSE', workstationType: 'Stitching Line', plannedHours: 8, qualityCheckpoint: true },
      { id: 'OP-FINISHING', name: 'Thread Cutting & Finishing', stage: 'FINISHING', processType: 'IN_HOUSE', workstationType: 'Finishing Table', plannedHours: 3, qualityCheckpoint: true },
      { id: 'OP-PACKING', name: 'Pressing & Packing', stage: 'PACKING', processType: 'IN_HOUSE', workstationType: 'Packing', plannedHours: 2, qualityCheckpoint: false },
    ],
  },
  {
    id: 'ROUTE-FABRIC-STD',
    name: 'Fabric Processing Route',
    category: 'FABRIC',
    operations: [
      { id: 'OP-GREY-ISSUE', name: 'Grey Fabric Issue', stage: 'FABRIC_INSPECTION', processType: 'IN_HOUSE', workstationType: 'Store', plannedHours: 1, qualityCheckpoint: false },
      { id: 'OP-DYEING', name: 'Dyeing', stage: 'DYEING', processType: 'JOB_WORK', workstationType: 'Dyeing Vendor', plannedHours: 48, qualityCheckpoint: true },
      { id: 'OP-PRINTING', name: 'Printing', stage: 'FABRIC_PRINTING', processType: 'JOB_WORK', workstationType: 'Printing Vendor', plannedHours: 24, qualityCheckpoint: true },
      { id: 'OP-FABRIC-QC', name: 'Fabric QC & Folding', stage: 'FABRIC_INSPECTION', processType: 'IN_HOUSE', workstationType: 'Inspection Table', plannedHours: 4, qualityCheckpoint: true },
    ],
  },
];

const RoutingMaster = (props: any) => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Routing Master</h1>
      <p>This module is under development.</p>
    </div>
  );
};

export default RoutingMaster;
