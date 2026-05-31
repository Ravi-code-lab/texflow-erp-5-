import { ViewState, UserRole } from '../types';
import { ERPModuleItem } from './registry';

// Views accessible by each role
const ROLE_ACCESS: Record<UserRole, ViewState[]> = {
  ADMIN: ['*'] as any,
  MANAGER: [
    'DASHBOARD', 'ORDERS', 'INVENTORY', 'SUPPLIERS', 'CUSTOMERS', 'PRODUCTION',
    'QUALITY', 'REPORTS', 'PURCHASE_ORDER', 'PURCHASE_INWARD', 'DELIVERY_CHALLAN',
    'TAX_INVOICE', 'ATTENDANCE', 'ACCOUNTING', 'AGENTS', 'CRM', 'DISPATCH_PLANNER',
    'FABRIC_COSTING', 'JOB_WORK', 'KARIGARS', 'KARIGAR_KHATA', 'QUOTATION',
    'MATERIAL_REQUEST', 'TASKS', 'PROJECTS', 'NOTIFICATIONS', 'AUDIT_TRAIL',
    'CASH_BOOK', 'CHART_OF_ACCOUNTS', 'SETTINGS',
  ],
  ACCOUNTANT: [
    'DASHBOARD', 'ACCOUNTING', 'CASH_BOOK', 'CHART_OF_ACCOUNTS', 'REPORTS',
    'TAX_INVOICE', 'PURCHASE_INVOICE', 'CREDIT_NOTE', 'DEBIT_NOTE',
    'EXPENSE_CLAIM', 'PAYROLL', 'OPENING_STOCK', 'NOTIFICATIONS',
  ],
  SALES: [
    'DASHBOARD', 'ORDERS', 'CUSTOMERS', 'CRM', 'DELIVERY_CHALLAN', 'TAX_INVOICE',
    'QUOTATION', 'SALES_RETURN', 'CREDIT_NOTE', 'AGENTS', 'AGENT_KHATA',
    'DISPATCH_PLANNER', 'REPORTS', 'NOTIFICATIONS',
  ],
  WORKER: ['DASHBOARD', 'ATTENDANCE', 'PRODUCTION', 'NOTIFICATIONS'],
};

/**
 * Returns true if the given role can access the given view.
 */
export function canAccessView(role: UserRole | string | undefined, view: ViewState): boolean {
  if (!role) return false;
  const allowed = ROLE_ACCESS[role as UserRole];
  if (!allowed) return false;
  if ((allowed as any)[0] === '*') return true; // ADMIN
  return allowed.includes(view);
}

/**
 * Filters a list of ERPModuleItems to those accessible by the given role.
 */
export function filterViewsByRole(
  role: UserRole | string | undefined,
  items: ERPModuleItem[]
): ERPModuleItem[] {
  if (!role) return [];
  const allowed = ROLE_ACCESS[role as UserRole];
  if (!allowed) return [];
  if ((allowed as any)[0] === '*') return items; // ADMIN sees all
  return items.filter((item) => (allowed as ViewState[]).includes(item.id));
}
