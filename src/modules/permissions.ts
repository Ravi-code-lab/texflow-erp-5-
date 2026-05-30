import { UserRole, ViewState } from '../types';
import { ERP_MODULE_GROUPS, ERP_MODULE_ITEMS, ERPModuleGroupId } from './registry';

type PermissionAction = 'read' | 'write' | 'submit' | 'cancel';

export interface RolePermission {
  role: UserRole;
  modules: Array<ERPModuleGroupId | 'core'> | 'all';
  actions: PermissionAction[];
}

export const ROLE_PERMISSIONS: RolePermission[] = [
  { role: 'ADMIN', modules: 'all', actions: ['read', 'write', 'submit', 'cancel'] },
  { role: 'MANAGER', modules: 'all', actions: ['read', 'write', 'submit'] },
  { role: 'ACCOUNTANT', modules: ['selling', 'buying', 'accounts_hr', 'masters'], actions: ['read', 'write', 'submit'] },
  { role: 'SALES', modules: ['selling', 'stock', 'masters', 'workspace'], actions: ['read', 'write'] },
  { role: 'WORKER', modules: ['manufacturing', 'stock', 'workspace'], actions: ['read', 'write'] },
];

const getModuleForView = (view: ViewState) =>
  ERP_MODULE_ITEMS.find((item) => item.id === view)?.module ||
  ERP_MODULE_GROUPS.find((group) => group.items.some((item) => item.id === view))?.id;

export const canAccessView = (
  role: UserRole = 'ADMIN',
  view: ViewState,
  action: PermissionAction = 'read'
) => {
  const rule = ROLE_PERMISSIONS.find((permission) => permission.role === role);
  const module = getModuleForView(view);

  if (!rule || !module) return false;
  if (!rule.actions.includes(action)) return false;
  return rule.modules === 'all' || rule.modules.includes(module);
};

export const filterViewsByRole = <T extends { id: ViewState }>(
  role: UserRole = 'ADMIN',
  items: T[],
  action: PermissionAction = 'read'
) => items.filter((item) => canAccessView(role, item.id, action));
