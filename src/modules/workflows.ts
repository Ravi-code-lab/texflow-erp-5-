import { ViewState } from '../types';

export interface WorkflowTransition {
  from: string;
  to: string;
  action: string;
}

export interface WorkflowDefinition {
  view: ViewState;
  stateField: string;
  states: string[];
  transitions: WorkflowTransition[];
}

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    view: 'ORDERS',
    stateField: 'status',
    states: ['DRAFT', 'PENDING', 'CONFIRMED', 'FULFILLED', 'CANCELLED'],
    transitions: [
      { from: 'DRAFT', to: 'PENDING', action: 'Submit' },
      { from: 'PENDING', to: 'CONFIRMED', action: 'Confirm' },
      { from: 'CONFIRMED', to: 'FULFILLED', action: 'Fulfill' },
      { from: 'DRAFT', to: 'CANCELLED', action: 'Cancel' },
      { from: 'PENDING', to: 'CANCELLED', action: 'Cancel' },
      { from: 'CONFIRMED', to: 'CANCELLED', action: 'Cancel' },
    ],
  },
  {
    view: 'PRODUCTION',
    stateField: 'status',
    states: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    transitions: [
      { from: 'PLANNED', to: 'IN_PROGRESS', action: 'Start' },
      { from: 'IN_PROGRESS', to: 'COMPLETED', action: 'Complete' },
      { from: 'PLANNED', to: 'CANCELLED', action: 'Cancel' },
      { from: 'IN_PROGRESS', to: 'CANCELLED', action: 'Cancel' },
    ],
  },
  {
    view: 'PURCHASE_ORDER',
    stateField: 'status',
    states: ['DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'],
    transitions: [
      { from: 'DRAFT', to: 'SENT', action: 'Submit' },
      { from: 'SENT', to: 'RECEIVED', action: 'Receive' },
      { from: 'DRAFT', to: 'CANCELLED', action: 'Cancel' },
      { from: 'SENT', to: 'CANCELLED', action: 'Cancel' },
    ],
  },
  {
    view: 'MATERIAL_REQUEST',
    stateField: 'status',
    states: ['DRAFT', 'PENDING', 'ORDERED', 'RECEIVED', 'REJECTED'],
    transitions: [
      { from: 'DRAFT', to: 'PENDING', action: 'Submit' },
      { from: 'PENDING', to: 'ORDERED', action: 'Order' },
      { from: 'ORDERED', to: 'RECEIVED', action: 'Receive' },
      { from: 'PENDING', to: 'REJECTED', action: 'Reject' },
    ],
  },
];

export const getWorkflowForView = (view: ViewState) =>
  WORKFLOW_DEFINITIONS.find((workflow) => workflow.view === view);

export const getAvailableTransitions = (view: ViewState, currentState?: string) => {
  const workflow = getWorkflowForView(view);
  if (!workflow || !currentState) return [];
  return workflow.transitions.filter((transition) => transition.from === currentState);
};

export const canTransition = (view: ViewState, from?: string, to?: string) => {
  if (!from || !to || from === to) return true;
  return getAvailableTransitions(view, from).some((transition) => transition.to === to);
};

