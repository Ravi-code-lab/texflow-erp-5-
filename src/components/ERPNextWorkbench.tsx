import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart4,
  CheckCircle2,
  Database,
  FileText,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  Layers,
  Lock,
  PackageCheck,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ToggleLeft,
  Workflow,
} from 'lucide-react';
import { ViewState, UserRole } from '../types';
import { DOCTYPE_SCHEMAS } from '../modules/doctypes';
import { ERP_MODULE_GROUPS, ERPModuleGroupId } from '../modules/registry';
import { canAccessView } from '../modules/permissions';
import { WORKFLOW_DEFINITIONS } from '../modules/workflows';
import { DocTypeStat } from './DocTypeCenter';
import { getItem } from '../utils/networkClient';

interface ERPNextWorkbenchProps {
  stats: Partial<Record<ViewState, DocTypeStat>>;
  features: Record<string, boolean>;
  userRole?: UserRole;
  onNavigate: (view: ViewState) => void;
}

const roleList: UserRole[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'];

const moduleTone: Record<ERPModuleGroupId, string> = {
  workspace: 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
  selling: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
  buying: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
  manufacturing: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900',
  stock: 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900',
  accounts_hr: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900',
  masters: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  analytics: 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
};

// readCustomFieldCount is now async via getItem; callers use the hook below

const ERPNextWorkbench: React.FC<ERPNextWorkbenchProps> = ({
  stats,
  features,
  userRole = 'ADMIN',
  onNavigate,
}) => {
  const [activeModuleId, setActiveModuleId] = useState<ERPModuleGroupId>('workspace');
  const [query, setQuery] = useState('');

  const [customFieldCount, setCustomFieldCount] = useState(0);
  useEffect(() => {
    getItem<any[]>('erpnext_custom_fields').then(parsed => {
      setCustomFieldCount(Array.isArray(parsed) ? parsed.length : 0);
    }).catch(() => {});
  }, []);
  const activeModule = ERP_MODULE_GROUPS.find((group) => group.id === activeModuleId) || ERP_MODULE_GROUPS[0];
  const enabledItems = activeModule.items.filter((item) => features[item.id] !== false);
  const activeModuleSchemas = DOCTYPE_SCHEMAS.filter((schema) => enabledItems.some((item) => item.id === schema.view));

  const moduleCards = useMemo(() => ERP_MODULE_GROUPS.map((group) => {
    const enabled = group.items.filter((item) => features[item.id] !== false);
    const visible = enabled.filter((item) => canAccessView(userRole, item.id));
    const records = enabled.reduce((sum, item) => sum + (stats[item.id]?.total || 0), 0);
    const schemas = DOCTYPE_SCHEMAS.filter((schema) => enabled.some((item) => item.id === schema.view)).length;
    const workflows = WORKFLOW_DEFINITIONS.filter((workflow) => enabled.some((item) => item.id === workflow.view)).length;

    return {
      ...group,
      enabled: enabled.length,
      hidden: group.items.length - enabled.length,
      visible: visible.length,
      records,
      schemas,
      workflows,
      coverage: group.items.length ? Math.round((enabled.length / group.items.length) * 100) : 0,
    };
  }), [features, stats, userRole]);

  const filteredItems = enabledItems.filter((item) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [item.label, item.doctype, item.module, ...(item.keywords || [])].join(' ').toLowerCase().includes(normalized);
  });

  const totalRecords = moduleCards.reduce((sum, module) => sum + module.records, 0);
  const enabledModuleItems = moduleCards.reduce((sum, module) => sum + module.enabled, 0);
  const disabledModuleItems = moduleCards.reduce((sum, module) => sum + module.hidden, 0);
  const setupScore = Math.min(100, Math.round((
    (DOCTYPE_SCHEMAS.length ? 25 : 0) +
    (WORKFLOW_DEFINITIONS.length ? 25 : 0) +
    (customFieldCount ? 15 : 0) +
    (enabledModuleItems ? 25 : 0) +
    (totalRecords ? 10 : 0)
  )));

  const setupSteps = [
    { label: 'Module registry installed', complete: enabledModuleItems > 0, action: 'Open modules', view: 'SETTINGS' as ViewState },
    { label: 'DocType metadata mapped', complete: DOCTYPE_SCHEMAS.length >= 7, action: 'Inspect DocTypes', view: 'DOCTYPE_CENTER' as ViewState },
    { label: 'Approval workflows configured', complete: WORKFLOW_DEFINITIONS.length >= 4, action: 'Review inbox', view: 'WORKFLOW_INBOX' as ViewState },
    { label: 'Custom fields extended', complete: customFieldCount > 0, action: 'Customize', view: 'SETTINGS' as ViewState },
    { label: 'Reports ready for export', complete: totalRecords > 0, action: 'Build report', view: 'REPORT_BUILDER' as ViewState },
  ];

  return (
    <div className="space-y-5 text-left">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5 flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <Sparkles className="w-3 h-3" />
              ERPNext Control Plane
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Module Def / DocType / Workflow / Role Permission</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">ERPNext Desk</h1>
          <p className="text-sm text-slate-500 mt-1">Manage the installed ERP modules, metadata coverage, workflows, access, and setup progress from one workspace.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 min-w-full xl:min-w-[640px]">
          {[
            { label: 'Setup', value: `${setupScore}%`, icon: PackageCheck },
            { label: 'Modules', value: enabledModuleItems, icon: LayoutDashboard },
            { label: 'DocTypes', value: DOCTYPE_SCHEMAS.length, icon: Database },
            { label: 'Records', value: totalRecords, icon: Layers },
          ].map((item) => (
            <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-indigo-500" />
                Installed Modules
              </h2>
            </div>
            <div className="p-2 space-y-2">
              {moduleCards.map((module) => (
                <button
                  key={module.id}
                  onClick={() => setActiveModuleId(module.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    activeModuleId === module.id
                      ? `${moduleTone[module.id]}`
                      : 'bg-slate-50/70 dark:bg-slate-950/30 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">{module.title}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-0.5">{module.enabled} active / {module.hidden} hidden</p>
                    </div>
                    <module.icon className="w-4 h-4 shrink-0 mt-0.5" />
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-current" style={{ width: `${module.coverage}%` }} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Setup Checklist
            </h2>
            <div className="mt-4 space-y-2">
              {setupSteps.map((step) => (
                <button
                  key={step.label}
                  onClick={() => onNavigate(step.view)}
                  className="w-full flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {step.complete ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <ToggleLeft className="w-4 h-4 text-amber-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{step.label}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{step.action}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {[
              { label: 'Live Records', value: moduleCards.find((item) => item.id === activeModuleId)?.records || 0, icon: BarChart4 },
              { label: 'DocTypes', value: activeModuleSchemas.length, icon: FileText },
              { label: 'Workflows', value: WORKFLOW_DEFINITIONS.filter((workflow) => enabledItems.some((item) => item.id === workflow.view)).length, icon: Workflow },
              { label: 'Disabled', value: disabledModuleItems, icon: Lock },
            ].map((item) => (
              <div key={item.label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                  <item.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{activeModule.title} Workspace</h2>
                <p className="text-xs text-slate-500 mt-0.5">ERPNext-style shortcut cards with DocType links, workflow status, and role access.</p>
              </div>
              <div className="relative md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                  placeholder="Filter module entries..."
                />
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredItems.map((item) => {
                const schema = DOCTYPE_SCHEMAS.find((docType) => docType.view === item.id);
                const workflow = WORKFLOW_DEFINITIONS.find((definition) => definition.view === item.id);
                const itemStats = stats[item.id];
                const hasAccess = canAccessView(userRole, item.id);

                return (
                  <div key={item.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/70 dark:bg-slate-950/30">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate">{item.label}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">{item.doctype}</p>
                      </div>
                      <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-indigo-500" />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Records</p>
                        <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">{itemStats?.total || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Fields</p>
                        <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">{schema?.fields.length || 0}</p>
                      </div>
                      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Flow</p>
                        <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">{workflow?.states.length || 0}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      {schema && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-black uppercase tracking-widest">
                          <Database className="w-3 h-3" />
                          Schema
                        </span>
                      )}
                      {workflow && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                          <GitBranch className="w-3 h-3" />
                          Workflow
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${hasAccess ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'}`}>
                        <KeyRound className="w-3 h-3" />
                        {hasAccess ? userRole : 'No Access'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => onNavigate(item.id)}
                        disabled={!hasAccess}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:hover:bg-slate-200 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Open List
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onNavigate('DOCTYPE_CENTER')}
                        className="w-9 h-9 inline-flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                        title="Open DocType metadata"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              Role Permission Matrix
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs min-w-[680px]">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-widest text-slate-400">
                    <th className="py-2 pr-3">DocType</th>
                    {roleList.map((role) => <th key={role} className="py-2 px-3 text-center">{role}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {enabledItems.slice(0, 8).map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 pr-3 font-bold text-slate-700 dark:text-slate-300">{item.doctype}</td>
                      {roleList.map((role) => (
                        <td key={role} className="py-3 px-3 text-center">
                          {canAccessView(role, item.id) ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                          ) : (
                            <Lock className="w-4 h-4 text-slate-300 mx-auto" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ERPNextWorkbench;
