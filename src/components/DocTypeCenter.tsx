import React, { useMemo, useState } from 'react';
import { ArrowRight, Database, FileText, GitBranch, KeyRound, Layers, Search, ShieldCheck } from 'lucide-react';
import { ViewState, UserRole } from '../types';
import { DOCTYPE_SCHEMAS, DocTypeSchema } from '../modules/doctypes';
import { ERP_MODULE_ITEMS } from '../modules/registry';
import { canAccessView } from '../modules/permissions';
import { getWorkflowForView } from '../modules/workflows';

export interface DocTypeStat {
  total: number;
  draft: number;
  submitted: number;
  cancelled: number;
  statusCounts: Record<string, number>;
}

interface DocTypeCenterProps {
  stats: Partial<Record<ViewState, DocTypeStat>>;
  userRole?: UserRole;
  onNavigate: (view: ViewState) => void;
}

const emptyStat: DocTypeStat = {
  total: 0,
  draft: 0,
  submitted: 0,
  cancelled: 0,
  statusCounts: {},
};

const fieldTone: Record<string, string> = {
  Data: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  Date: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  Currency: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  Float: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Int: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
  Select: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  Table: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  Link: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  Check: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

const getMeta = (schema: DocTypeSchema) =>
  ERP_MODULE_ITEMS.find((item) => item.id === schema.view);

const DocTypeCenter: React.FC<DocTypeCenterProps> = ({ stats, userRole = 'ADMIN', onNavigate }) => {
  const [query, setQuery] = useState('');
  const [activeModule, setActiveModule] = useState('All');
  const [selectedView, setSelectedView] = useState<ViewState>(DOCTYPE_SCHEMAS[0]?.view || 'DASHBOARD');

  const modules = useMemo(() => ['All', ...Array.from(new Set(DOCTYPE_SCHEMAS.map((schema) => schema.module)))], []);

  const filteredSchemas = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return DOCTYPE_SCHEMAS.filter((schema) => activeModule === 'All' || schema.module === activeModule)
      .filter((schema) => {
        if (!normalized) return true;
        return [
          schema.name,
          schema.module,
          schema.namingSeries,
          getMeta(schema)?.label,
          ...schema.fields.map((field) => field.label),
        ].join(' ').toLowerCase().includes(normalized);
      });
  }, [query, activeModule]);

  const selectedSchema = DOCTYPE_SCHEMAS.find((schema) => schema.view === selectedView) || filteredSchemas[0] || DOCTYPE_SCHEMAS[0];
  const selectedStat = selectedSchema ? stats[selectedSchema.view] || emptyStat : emptyStat;
  const selectedWorkflow = selectedSchema ? getWorkflowForView(selectedSchema.view) : undefined;
  const totalRecords = Object.values(stats).reduce((sum, item) => sum + (item?.total || 0), 0);
  const schemaCoverage = ERP_MODULE_ITEMS.filter((item) => item.module !== 'core').length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <Database className="w-3 h-3" />
              Meta Desk
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">ERPNext-style DocType registry</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">DocType Center</h1>
          <p className="text-sm text-slate-500 mt-1">Explore schemas, naming series, workflows, permissions, and live document volumes.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[500px]">
          {[
            { label: 'Schemas', value: DOCTYPE_SCHEMAS.length, icon: FileText },
            { label: 'Records', value: totalRecords, icon: Layers },
            { label: 'Coverage', value: `${DOCTYPE_SCHEMAS.length}/${schemaCoverage}`, icon: ShieldCheck },
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

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="Search DocType, field, module..."
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => setActiveModule(module)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                    activeModule === module
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {module}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[650px] overflow-y-auto custom-scrollbar p-2">
            {filteredSchemas.map((schema) => {
              const meta = getMeta(schema);
              const itemStat = stats[schema.view] || emptyStat;
              const isSelected = selectedSchema?.view === schema.view;

              return (
                <button
                  key={schema.name}
                  onClick={() => setSelectedView(schema.view)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors mb-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900'
                      : 'bg-slate-50/70 dark:bg-slate-950/30 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{schema.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{schema.module} / {meta?.label || schema.view}</p>
                    </div>
                    <span className="text-xs font-black text-slate-500 tabular-nums">{itemStat.total}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-0.5">{schema.namingSeries}</span>
                    {canAccessView(userRole, schema.view) && (
                      <span className="text-[10px] font-bold text-emerald-600">Access</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedSchema && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{selectedSchema.module}</p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">{selectedSchema.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">Series {selectedSchema.namingSeries}</p>
                </div>
                <button
                  onClick={() => onNavigate(selectedSchema.view)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Open List
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                {[
                  { label: 'Total', value: selectedStat.total },
                  { label: 'Draft', value: selectedStat.draft },
                  { label: 'Submitted', value: selectedStat.submitted },
                  { label: 'Cancelled', value: selectedStat.cancelled },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Fields
                </h3>
                <div className="mt-4 space-y-2">
                  {selectedSchema.fields.map((field) => (
                    <div key={field.fieldname} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{field.label}</p>
                        <p className="text-[10px] font-mono text-slate-400">{field.fieldname}{field.linkTo ? ` -> ${field.linkTo}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {field.required && <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Req</span>}
                        <span className={`px-2 py-1 rounded text-[10px] font-black ${fieldTone[field.fieldtype] || fieldTone.Data}`}>{field.fieldtype}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-500" />
                    Workflow
                  </h3>
                  {selectedWorkflow ? (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkflow.states.map((state) => (
                          <span key={state} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">{state}</span>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {selectedWorkflow.transitions.map((transition, index) => (
                          <div key={`${transition.from}-${transition.to}-${index}`} className="flex items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3">
                            <span className="font-bold text-slate-600 dark:text-slate-300">{transition.from}</span>
                            <span className="text-indigo-600 font-black">{transition.action}</span>
                            <span className="font-bold text-slate-900 dark:text-white">{transition.to}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400">No workflow defined yet for this DocType.</p>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    Role Access
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
                    {(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'] as UserRole[]).map((role) => (
                      <div key={role} className={`rounded-lg border p-2 text-center ${
                        canAccessView(role, selectedSchema.view)
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300'
                          : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800'
                      }`}>
                        <p className="text-[10px] font-black uppercase tracking-widest">{role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocTypeCenter;
