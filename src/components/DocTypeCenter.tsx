import React, { useMemo, useState } from 'react';
import { ArrowRight, Database, FileText, GitBranch, KeyRound, Layers, Search, ShieldCheck, Plus, Edit2, Save, X, Trash2 } from 'lucide-react';
import { ViewState, UserRole } from '../types';
import { DOCTYPE_SCHEMAS, DocTypeSchema, DocField, saveCustomDocTypeSchema } from '../modules/doctypes';
import { ERP_MODULE_ITEMS, MODULE_COLOR_MAP } from '../modules/registry';
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
  
  const [editingSchema, setEditingSchema] = useState<DocTypeSchema | null>(null);

  const modules = useMemo(() => ['All', ...Array.from(new Set(DOCTYPE_SCHEMAS.map((schema) => schema.module)))], [DOCTYPE_SCHEMAS.length]);

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
  }, [query, activeModule, DOCTYPE_SCHEMAS]);

  const selectedSchema = DOCTYPE_SCHEMAS.find((schema) => schema.view === selectedView) || filteredSchemas[0] || DOCTYPE_SCHEMAS[0];
  const selectedStat = selectedSchema ? stats[selectedSchema.view] || emptyStat : emptyStat;
  const selectedWorkflow = selectedSchema ? getWorkflowForView(selectedSchema.view) : undefined;
  const totalRecords = Object.values(stats).reduce((sum, item) => sum + (item?.total || 0), 0);
  const schemaCoverage = ERP_MODULE_ITEMS.filter((item) => item.module !== 'core').length;

  const handleSaveSchema = () => {
    if (editingSchema) {
      if (!editingSchema.view) {
         // Create a generic view state name
         editingSchema.view = editingSchema.name.toUpperCase().replace(/\s+/g, '_') as ViewState;
      }
      saveCustomDocTypeSchema(editingSchema);
      setSelectedView(editingSchema.view);
      setEditingSchema(null);
    }
  };

  if (editingSchema) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-black text-slate-800 dark:text-white">
            {editingSchema.name ? `Edit Schema: ${editingSchema.name}` : 'New DocType Schema'}
          </h2>
          <div className="flex gap-2">
            <button onClick={() => setEditingSchema(null)} className="px-4 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold shadow-sm">Cancel</button>
            <button onClick={handleSaveSchema} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-indigo-700"><Save className="w-4 h-4"/> Save DocType</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">DocType Name</label>
             <input type="text" value={editingSchema.name} onChange={e => setEditingSchema({...editingSchema, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Module</label>
             <select value={editingSchema.module} onChange={e => setEditingSchema({...editingSchema, module: e.target.value})} className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none">
                {Object.keys(MODULE_COLOR_MAP).map(m => (
                    <option key={m} value={m.charAt(0).toUpperCase() + m.slice(1)}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
             </select>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Naming Series</label>
             <input type="text" value={editingSchema.namingSeries} onChange={e => setEditingSchema({...editingSchema, namingSeries: e.target.value})} placeholder="e.g. INV-.YYYY.-.####" className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium font-mono focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Statuses (Comma separated)</label>
             <input type="text" value={editingSchema.statuses?.join(', ') || ''} onChange={e => setEditingSchema({...editingSchema, statuses: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="DRAFT, COMPLETED" className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-800 text-sm font-medium focus:ring-1 focus:ring-indigo-500 outline-none"/>
           </div>
        </div>

        <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden mt-6">
           <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Fields</h3>
             <button onClick={() => setEditingSchema({
                 ...editingSchema,
                 fields: [...editingSchema.fields, {fieldname: '', label: '', fieldtype: 'Data'}]
             })} className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded flex items-center gap-1 hover:bg-indigo-100"><Plus className="w-3 h-3"/> Add Field</button>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Label</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Fieldname</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Type</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Mandatory</th>
                        <th className="px-4 py-3 font-bold text-slate-500 text-xs uppercase tracking-widest">Options / Link</th>
                        <th className="px-4 py-3"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {editingSchema.fields.map((field, idx) => (
                        <tr key={idx}>
                            <td className="px-4 py-2">
                                <input type="text" value={field.label} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].label = e.target.value;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} placeholder="e.g. Customer Name" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none"/>
                            </td>
                            <td className="px-4 py-2">
                                <input type="text" value={field.fieldname} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].fieldname = e.target.value.replace(/\s+/g, '_').toLowerCase();
                                    setEditingSchema({...editingSchema, fields: next});
                                }} placeholder="customer_name" className="w-full px-2 py-1 font-mono text-xs border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none"/>
                            </td>
                            <td className="px-4 py-2">
                                <select value={field.fieldtype} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].fieldtype = e.target.value as any;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 focus:ring-indigo-500 outline-none">
                                    {Object.keys(fieldTone).map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </td>
                            <td className="px-4 py-2 text-center">
                                <input type="checkbox" checked={field.required || false} onChange={e => {
                                    const next = [...editingSchema.fields];
                                    next[idx].required = e.target.checked;
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="rounded text-indigo-600 focus:ring-indigo-500"/>
                            </td>
                            <td className="px-4 py-2">
                                {field.fieldtype === 'Select' && (
                                   <input type="text" value={field.options?.join(', ') || ''} onChange={e => {
                                       const next = [...editingSchema.fields];
                                       next[idx].options = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                       setEditingSchema({...editingSchema, fields: next});
                                   }} placeholder="A, B, C" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 outline-none text-xs"/>
                                )}
                                {field.fieldtype === 'Link' && (
                                   <input type="text" value={field.linkTo || ''} onChange={e => {
                                       const next = [...editingSchema.fields];
                                       next[idx].linkTo = e.target.value;
                                       setEditingSchema({...editingSchema, fields: next});
                                   }} placeholder="DocType Name" className="w-full px-2 py-1 border border-slate-200 dark:border-slate-800 rounded bg-transparent focus:ring-1 outline-none text-xs"/>
                                )}
                            </td>
                            <td className="px-4 py-2 text-right">
                                <button onClick={() => {
                                    const next = [...editingSchema.fields];
                                    next.splice(idx, 1);
                                    setEditingSchema({...editingSchema, fields: next});
                                }} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                    {editingSchema.fields.length === 0 && (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">No fields defined yet.</td></tr>
                    )}
                </tbody>
             </table>
           </div>
        </div>
      </div>
    );
  }

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
          <p className="text-sm text-slate-500 mt-1">Explore schemas, naming series, workflows, permissions, and build new forms visually.</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setEditingSchema({
              name: '',
              view: '' as any,
              module: 'Workspace',
              namingSeries: '',
              fields: []
          })} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors">
            <Plus className="w-4 h-4" />
            New DocType
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[800px]">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-indigo-500"
                placeholder="Search DocType, field, module..."
              />
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {modules.map((module) => (
                <button
                  key={module}
                  onClick={() => setActiveModule(module)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-colors ${
                    activeModule === module
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  {module}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
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
                      ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900 shadow-sm'
                      : 'bg-white dark:bg-slate-950/30 border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white truncate">{schema.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{schema.module}</p>
                    </div>
                    {itemStat.total > 0 && <span className="text-[10px] font-black text-indigo-600 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 px-2 py-0.5 rounded-full tabular-nums shrink-0">{itemStat.total}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedSchema && (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/30 inline-block px-2 py-0.5 rounded-sm">{selectedSchema.module}</p>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-2 flex items-center gap-3">
                      {selectedSchema.name}
                      <button onClick={() => setEditingSchema(selectedSchema)} className="p-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-md transition-colors group">
                          <Edit2 className="w-4 h-4"/>
                          <span className="sr-only">Edit Schema</span>
                      </button>
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-1">Series: {selectedSchema.namingSeries}</p>
                </div>
                <button
                  onClick={() => onNavigate(selectedSchema.view)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors"
                >
                  View Records
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
                {[
                  { label: 'Total', value: selectedStat.total },
                  { label: 'Draft', value: selectedStat.draft },
                  { label: 'Submitted', value: selectedStat.submitted },
                  { label: 'Cancelled', value: selectedStat.cancelled },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col shadow-sm h-[600px] overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Data Dictionary ({selectedSchema.fields.length})
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/50 dark:bg-slate-950/20">
                  {selectedSchema.fields.map((field) => (
                    <div key={field.fieldname} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{field.label}</p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{field.fieldname}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide border border-transparent ${fieldTone[field.fieldtype] || fieldTone.Data}`}>
                            {field.fieldtype}
                            {field.fieldtype === 'Link' && field.linkTo && ` → ${field.linkTo}`}
                        </span>
                        {field.options && field.options.length > 0 && (
                            <span className="text-[9px] text-slate-400 uppercase font-black truncate max-w-[100px]">{field.options.length} options</span>
                        )}
                        {field.required && <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">MANDATORY</span>}
                      </div>
                    </div>
                  ))}
                  {selectedSchema.fields.length === 0 && (
                      <p className="text-sm text-center text-slate-500 py-10">No fields configured.</p>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-500" />
                    Lifecycle Workflow
                  </h3>
                  {selectedWorkflow ? (
                    <div className="mt-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkflow.states.map((state) => (
                          <span key={state} className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              state === 'DRAFT' || state === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              state === 'COMPLETED' || state === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              state === 'CANCELLED' || state === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}>{state}</span>
                        ))}
                      </div>
                      <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-950 p-2 overflow-hidden">
                        {selectedWorkflow.transitions.map((transition, index) => (
                          <div key={`${transition.from}-${transition.to}-${index}`} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800 rounded p-2.5">
                            <span className="font-bold text-slate-500">{transition.from}</span>
                            <div className="flex-1 border-t-2 border-dashed border-slate-200 dark:border-slate-700 mx-2 relative">
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-50 dark:bg-slate-950 px-1 text-indigo-600 dark:text-indigo-400 font-black tracking-widest text-[9px] uppercase">{transition.action}</span>
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">{transition.to}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 p-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-lg text-center">
                        <p className="text-sm text-slate-500">Standard CRUD operations only. No active workflow defined.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-500" />
                    Role Based Access Control
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                    {(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'WORKER'] as UserRole[]).map((role) => (
                      <div key={role} className={`rounded-lg border p-2 text-center transition-colors ${
                        canAccessView(role, selectedSchema.view)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-950 dark:border-slate-800 opacity-60'
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
