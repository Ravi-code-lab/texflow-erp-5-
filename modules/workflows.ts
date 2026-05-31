import { ViewState } from '../types';

export interface WorkflowTransition {
  from: string;
  to: string;
  action: string;
  label: string;
  allowedRoles?: string[];
}

export interface WorkflowDefinition {
  view: ViewState;
  doctype: string;
  states: string[];
  transitions: WorkflowTransition[];
}

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    view: 'ORDERS',
    doctype: 'Sales Order',
    states: ['Draft', 'Confirmed', 'In Production', 'Dispatched', 'Closed', 'Cancelled'],
    transitions: [
      { from: 'Draft', to: 'Confirmed', action: 'confirm', label: 'Confirm Order' },
      { from: 'Confirmed', to: 'In Production', action: 'start_production', label: 'Start Production' },
      { from: 'In Production', to: 'Dispatched', action: 'dispatch', label: 'Dispatch' },
      { from: 'Dispatched', to: 'Closed', action: 'close', label: 'Close' },
      { from: 'Draft', to: 'Cancelled', action: 'cancel', label: 'Cancel' },
    ],
  },
  {
    view: 'PURCHASE_ORDER',
    doctype: 'Purchase Order',
    states: ['Draft', 'Ordered', 'Received', 'Closed', 'Cancelled'],
    transitions: [
      { from: 'Draft', to: 'Ordered', action: 'order', label: 'Place Order' },
      { from: 'Ordered', to: 'Received', action: 'receive', label: 'Mark Received' },
      { from: 'Received', to: 'Closed', action: 'close', label: 'Close' },
      { from: 'Draft', to: 'Cancelled', action: 'cancel', label: 'Cancel' },
    ],
  },
  {
    view: 'PRODUCTION',
    doctype: 'Production Order',
    states: ['Draft', 'In Progress', 'Quality Check', 'Completed', 'Cancelled'],
    transitions: [
      { from: 'Draft', to: 'In Progress', action: 'start', label: 'Start' },
      { from: 'In Progress', to: 'Quality Check', action: 'qc', label: 'Send to QC' },
      { from: 'Quality Check', to: 'Completed', action: 'approve', label: 'Approve' },
      { from: 'Quality Check', to: 'In Progress', action: 'rework', label: 'Rework' },
      { from: 'Draft', to: 'Cancelled', action: 'cancel', label: 'Cancel' },
    ],
  },
];

export function getWorkflowForView(view: ViewState): WorkflowDefinition | undefined {
  return WORKFLOW_DEFINITIONS.find((w) => w.view === view);
}

export function getAvailableTransitions(view: ViewState, currentStatus: string): WorkflowTransition[] {
  const workflow = getWorkflowForView(view);
  if (!workflow) return [];
  return workflow.transitions.filter((t) => t.from === currentStatus);
}
