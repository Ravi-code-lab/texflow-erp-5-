import React, { useState, useMemo } from 'react';
import { RolePermission, UserRole } from '../types';
import { Shield, Check, X, Save, RotateCcw, Search, Info, AlertTriangle, ChevronDown } from 'lucide-react';

interface RolePermissionManagerProps {
  rolePermissions: RolePermission[];
  onAddRolePermission: (rp: RolePermission) => void;
  onUpdateRolePermission: (rp: RolePermission) => void;
  onDeleteRolePermission: (id: string) => void;
}

const ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'];

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  MANAGER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  ACCOUNTANT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SALES: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  WORKER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const MODULE_GROUPS: { group: string; modules: { id: string; label: string }[] }[] = [
  { group: 'Sales & Orders', modules: [
    { id: 'ORDERS', label: 'Orders' },
    { id: 'SALES_ORDER', label: 'Sales Orders' },
    { id: 'QUOTATIONS', label: 'Quotations' },
    { id: 'CUSTOMERS', label: 'Customers' },
    { id: 'DELIVERY_CHALLAN', label: 'Delivery Challan' },
    { id: 'PACKING_SLIPS', label: 'Packing Slips' },
  ]},
  { group: 'Purchase', modules: [
    { id: 'PURCHASE_ORDERS', label: 'Purchase Orders' },
    { id: 'PURCHASE_INVOICE', label: 'Purchase Invoice' },
    { id: 'SUPPLIERS', label: 'Suppliers' },
    { id: 'PURCHASE_RETURN', label: 'Purchase Returns' },
  ]},
  { group: 'Inventory & Production', modules: [
    { id: 'INVENTORY', label: 'Inventory' },
    { id: 'PRODUCTION', label: 'Production Jobs' },
    { id: 'WORK_ORDERS', label: 'Work Orders' },
    { id: 'MANUFACTURING', label: 'Manufacturing' },
    { id: 'SAMPLING', label: 'Sampling' },
    { id: 'QUALITY_CONTROL', label: 'Quality Control' },
    { id: 'DISPATCH_PLANNER', label: 'Dispatch Planner' },
  ]},
  { group: 'Accounting', modules: [
    { id: 'TRANSACTIONS', label: 'Transactions' },
    { id: 'CHART_OF_ACCOUNTS', label: 'Chart of Accounts' },
    { id: 'TALLY_INTEGRATION', label: 'Tally Integration' },
    { id: 'GST_SUITE', label: 'GST Suite' },
    { id: 'BANKING', label: 'Banking' },
  ]},
  { group: 'HR & Payroll', modules: [
    { id: 'EMPLOYEES', label: 'Employees' },
    { id: 'ATTENDANCE', label: 'Attendance' },
    { id: 'PAYROLL', label: 'Payroll' },
    { id: 'KARIGAR_KHATA', label: 'Karigar Khata' },
  ]},
  { group: 'Reports & Admin', modules: [
    { id: 'REPORTS', label: 'Reports & Analytics' },
    { id: 'SETTINGS', label: 'Settings' },
    { id: 'TEAM', label: 'Team Management' },
    { id: 'AUDIT_LOG', label: 'Audit Log' },
    { id: 'FABRIC_CONSUMPTION', label: 'Fabric Consumption' },
  ]},
];

// Default permissions per role — admin gets all, others get sensible defaults
const DEFAULT_PERMISSIONS: Record<UserRole, { canRead: boolean; canCreate: boolean; canUpdate: boolean; canDelete: boolean }> = {
  ADMIN:      { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: true  },
  MANAGER:    { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false },
  ACCOUNTANT: { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false },
  SALES:      { canRead: true,  canCreate: true,  canUpdate: true,  canDelete: false },
  WORKER:     { canRead: true,  canCreate: false, canUpdate: false, canDelete: false },
};

// Locked modules per role (always enforced regardless of toggle)
const LOCKED_READ_ONLY: Record<UserRole, string[]> = {
  ADMIN: [],
  MANAGER: [],
  ACCOUNTANT: ['SETTINGS', 'TEAM', 'AUDIT_LOG'],
  SALES: ['CHART_OF_ACCOUNTS', 'TRANSACTIONS', 'TALLY_INTEGRATION', 'GST_SUITE', 'BANKING', 'PAYROLL', 'SETTINGS', 'TEAM', 'AUDIT_LOG'],
  WORKER: ['CHART_OF_ACCOUNTS', 'TRANSACTIONS', 'TALLY_INTEGRATION', 'GST_SUITE', 'BANKING', 'PAYROLL', 'SETTINGS', 'TEAM', 'AUDIT_LOG', 'REPORTS', 'PURCHASE_ORDERS', 'PURCHASE_INVOICE', 'SUPPLIERS'],
};

const LOCKED_NO_ACCESS: Record<UserRole, string[]> = {
  ADMIN: [],
  MANAGER: [],
  ACCOUNTANT: [],
  SALES: [],
  WORKER: [],
};

type PermKey = 'canRead' | 'canCreate' | 'canUpdate' | 'canDelete';

export const RolePermissionManager: React.FC<RolePermissionManagerProps> = ({
  rolePermissions, onAddRolePermission, onUpdateRolePermission, onDeleteRolePermission,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>('MANAGER');
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState<Record<string, RolePermission>>({});
  const [saved, setSaved] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(MODULE_GROUPS.map(g => [g.group, true]))
  );

  // Build a lookup of saved permissions for the active role
  const savedPerms = useMemo(() => {
    const m: Record<string, RolePermission> = {};
    rolePermissions.filter(rp => rp.role === activeRole).forEach(rp => { m[rp.module] = rp; });
    return m;
  }, [rolePermissions, activeRole]);

  // Merge dirty changes over saved
  const effectivePerms = useMemo(() => {
    const allModules = MODULE_GROUPS.flatMap(g => g.modules);
    const result: Record<string, RolePermission> = {};
    allModules.forEach(({ id }) => {
      const saved_ = savedPerms[id];
      const changed = dirty[`${activeRole}::${id}`];
      if (changed) { result[id] = changed; return; }
      if (saved_) { result[id] = saved_; return; }
      // Default: generate from defaults
      const def = DEFAULT_PERMISSIONS[activeRole];
      result[id] = {
        id: `rp-${activeRole}-${id}`,
        role: activeRole,
        module: id,
        ...def,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    return result;
  }, [savedPerms, dirty, activeRole]);

  const toggle = (module: string, key: PermKey) => {
    const dKey = `${activeRole}::${module}`;
    const current = dirty[dKey] || effectivePerms[module];
    // ADMIN always has full access — no toggles
    if (activeRole === 'ADMIN') return;
    // Locked modules can't be edited
    if (LOCKED_READ_ONLY[activeRole].includes(module) || LOCKED_NO_ACCESS[activeRole].includes(module)) return;
    // canRead must be true if any write perm is true
    let updated = { ...current, [key]: !current[key] };
    if (key !== 'canRead' && !current[key]) updated.canRead = true; // enabling write → enable read
    if (key === 'canRead' && !updated.canRead) { updated.canCreate = false; updated.canUpdate = false; updated.canDelete = false; } // removing read → remove writes
    setDirty(prev => ({ ...prev, [dKey]: { ...updated, updatedAt: new Date().toISOString() } }));
    setSaved(false);
  };

  const handleSaveAll = () => {
    Object.values(dirty).forEach((rp: any) => {
      const existing = rolePermissions.find(p => p.role === rp.role && p.module === rp.module);
      if (existing) onUpdateRolePermission({ ...(rp as any), id: existing.id });
      else onAddRolePermission(rp);
    });
    setDirty({});
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setDirty({});
    setSaved(false);
  };

  const applyPreset = (preset: 'full' | 'readonly' | 'none') => {
    if (activeRole === 'ADMIN') return;
    const allModules = MODULE_GROUPS.flatMap(g => g.modules);
    const newDirty: Record<string, RolePermission> = {};
    allModules.forEach(({ id }) => {
      const dKey = `${activeRole}::${id}`;
      const isLocked = LOCKED_READ_ONLY[activeRole].includes(id);
      newDirty[dKey] = {
        id: `rp-${activeRole}-${id}`,
        role: activeRole,
        module: id,
        canRead: preset !== 'none' || isLocked,
        canCreate: preset === 'full' && !isLocked,
        canUpdate: preset === 'full' && !isLocked,
        canDelete: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });
    setDirty(prev => ({ ...prev, ...newDirty }));
    setSaved(false);
  };

  const dirtyCount = Object.keys(dirty).filter(k => k.startsWith(activeRole + '::')).length;
  const filteredGroups = MODULE_GROUPS.map(g => ({
    ...g,
    modules: g.modules.filter(m => !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase())),
  })).filter(g => g.modules.length > 0);

  const PermCell = ({ module, pkey }: { module: string; pkey: PermKey }) => {
    const perm = effectivePerms[module];
    const val = perm?.[pkey] ?? false;
    const isAdmin = activeRole === 'ADMIN';
    const isLocked = LOCKED_READ_ONLY[activeRole].includes(module);
    const readonly = isAdmin || isLocked;
    return (
      <td className="px-3 py-2.5 text-center">
        <button
          onClick={() => !readonly && toggle(module, pkey)}
          disabled={readonly}
          className={`w-7 h-7 rounded-lg flex items-center justify-center mx-auto transition-all border ${
            val
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
          } ${readonly ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}`}>
          {val ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </button>
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full -mx-4 -my-5 lg:-m-6 bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-600 rounded-xl text-white shadow"><Shield className="w-5 h-5" /></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Role Permissions</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Module-level access control per role</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <span className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> {dirtyCount} unsaved
            </span>
          )}
          <button onClick={handleReset} disabled={dirtyCount === 0}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-40">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSaveAll}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide flex items-center gap-1.5 transition-all shadow ${saved ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-700 text-white'}`}>
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save All</>}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Role sidebar */}
        <div className="w-44 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto py-3">
          {ROLES.map(role => (
            <button key={role} onClick={() => setActiveRole(role)}
              className={`w-full text-left px-4 py-3 transition-colors flex flex-col gap-0.5 ${activeRole === role ? 'bg-violet-50 dark:bg-violet-900/20 border-r-2 border-violet-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded ${ROLE_COLORS[role]}`}>{role}</span>
              {role === 'ADMIN' && <span className="text-[9px] text-slate-400 ml-1">Full access</span>}
            </button>
          ))}
        </div>

        {/* Permission grid */}
        <div className="flex-1 overflow-y-auto">
          {/* Controls */}
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search module..."
                className="pl-7 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-violet-400 w-44" />
            </div>
            {activeRole !== 'ADMIN' && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick set:</span>
                {(['full','readonly','none'] as const).map(p => (
                  <button key={p} onClick={() => applyPreset(p)}
                    className="px-2.5 py-1 text-[10px] font-bold uppercase border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300">
                    {p === 'full' ? 'Full' : p === 'readonly' ? 'Read-only' : 'No access'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {activeRole === 'ADMIN' && (
            <div className="m-4 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              ADMIN role always has full access to all modules. Permissions cannot be restricted for ADMIN.
            </div>
          )}

          <div className="p-4 space-y-3">
            {filteredGroups.map(grp => (
              <div key={grp.group} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <button
                  onClick={() => setExpandedGroups(p => ({ ...p, [grp.group]: !p[grp.group] }))}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                  <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{grp.group}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedGroups[grp.group] ? '' : '-rotate-90'}`} />
                </button>
                {expandedGroups[grp.group] && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Module</th>
                        {(['canRead','canCreate','canUpdate','canDelete'] as PermKey[]).map(k => (
                          <th key={k} className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-20">
                            {k.replace('can','')}
                          </th>
                        ))}
                        <th className="px-3 py-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-wider w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {grp.modules.map(({ id, label }) => {
                        const locked = LOCKED_READ_ONLY[activeRole].includes(id);
                        const noAccess = LOCKED_NO_ACCESS[activeRole].includes(id);
                        const isDirty = !!dirty[`${activeRole}::${id}`];
                        return (
                          <tr key={id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{label}</span>
                                {locked && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">LOCKED</span>}
                                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />}
                              </div>
                            </td>
                            {(['canRead','canCreate','canUpdate','canDelete'] as PermKey[]).map(k => (
                              <PermCell key={k} module={id} pkey={k} />
                            ))}
                            <td className="px-3 py-2.5 text-center">
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                effectivePerms[id]?.canRead
                                  ? effectivePerms[id]?.canCreate ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {effectivePerms[id]?.canRead ? (effectivePerms[id]?.canCreate ? 'WRITE' : 'READ') : 'BLOCKED'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissionManager;
