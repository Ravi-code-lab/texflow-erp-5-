import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, GitBranch, Search, ShieldAlert, XCircle } from 'lucide-react';
import { BaseEntity, UserRole, ViewState } from '../types';
import { canAccessView } from '../modules/permissions';
import { getERPModuleByView } from '../modules/registry';
import { getAvailableTransitions, getWorkflowForView, WorkflowTransition } from '../modules/workflows';

export interface WorkflowInboxCollection<T extends BaseEntity & Record<string, any> = BaseEntity & Record<string, any>> {
  view: ViewState;
  label: string;
  documents: T[];
  onUpdate: (document: T) => void;
}

interface WorkflowInboxProps {
  collections: WorkflowInboxCollection[];
  userRole?: UserRole;
  onNavigate: (view: ViewState) => void;
}

interface WorkflowRow {
  id: string;
  view: ViewState;
  doctype: string;
  module: string;
  label: string;
  document: BaseEntity & Record<string, any>;
  currentState: string;
  transitions: WorkflowTransition[];
  onUpdate: (document: any) => void;
}

const stateTone = (state: string) => {
  if (['CANCELLED', 'REJECTED', 'FAILED'].includes(state)) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900';
  if (['FULFILLED', 'COMPLETED', 'RECEIVED'].includes(state)) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900';
  if (['DRAFT', 'PLANNED'].includes(state)) return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800';
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900';
};

const resolveTitle = (doc: Record<string, any>) =>
  doc.customerName ||
  doc.supplierName ||
  doc.productName ||
  doc.requestedBy ||
  doc.name ||
  doc.id;

const transitionAction = (transition: WorkflowTransition) =>
  transition.to === 'CANCELLED' || transition.to === 'REJECTED' ? 'cancel' : 'submit';

const WorkflowInbox: React.FC<WorkflowInboxProps> = ({ collections, userRole = 'ADMIN', onNavigate }) => {
  const [query, setQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');

  const rows = useMemo<WorkflowRow[]>(() => collections.flatMap((collection) => {
    const workflow = getWorkflowForView(collection.view);
    const meta = getERPModuleByView(collection.view);
    if (!workflow) return [];

    return collection.documents
      .filter((doc) => !doc.deleted)
      .map((doc) => {
        const currentState = String(doc[workflow.stateField] || 'DRAFT');
        return {
          id: `${collection.view}-${doc.id}`,
          view: collection.view,
          doctype: meta?.doctype || collection.label,
          module: meta?.module || 'workspace',
          label: collection.label,
          document: doc,
          currentState,
          transitions: getAvailableTransitions(collection.view, currentState),
          onUpdate: collection.onUpdate,
        };
      });
  }), [collections]);

  const modules = useMemo(() => ['All', ...Array.from(new Set(rows.map((row) => row.module)))], [rows]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows
      .filter((row) => moduleFilter === 'All' || row.module === moduleFilter)
      .filter((row) => row.transitions.length > 0)
      .filter((row) => {
        if (!normalized) return true;
        return [
          row.doctype,
          row.label,
          row.document.id,
          row.currentState,
          resolveTitle(row.document),
        ].join(' ').toLowerCase().includes(normalized);
      })
      .sort((a, b) => String(b.document.updatedAt || b.document.createdAt || '').localeCompare(String(a.document.updatedAt || a.document.createdAt || '')));
  }, [rows, query, moduleFilter]);

  const completedCount = rows.filter((row) => row.transitions.length === 0).length;
  const blockedCount = visibleRows.reduce((sum, row) => sum + row.transitions.filter((transition) => !canAccessView(userRole, row.view, transitionAction(transition))).length, 0);

  const applyTransition = (row: WorkflowRow, transition: WorkflowTransition) => {
    if (!canAccessView(userRole, row.view, transitionAction(transition))) return;

    const workflow = getWorkflowForView(row.view);
    if (!workflow) return;

    row.onUpdate({
      ...row.document,
      [workflow.stateField]: transition.to,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-100 dark:border-amber-900 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md">
              <GitBranch className="w-3 h-3" />
              Workflow Actions
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Central approvals and state changes</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-2 tracking-tight">Workflow Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">Advance Sales Orders, Purchase Orders, Material Requests, and Work Orders from one desk.</p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-full sm:min-w-[500px]">
          {[
            { label: 'Pending', value: visibleRows.length, icon: Clock },
            { label: 'Closed', value: completedCount, icon: CheckCircle2 },
            { label: 'Blocked', value: blockedCount, icon: ShieldAlert },
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none focus:border-amber-500"
              placeholder="Search document, status, customer, supplier..."
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {modules.map((module) => (
              <button
                key={module}
                onClick={() => setModuleFilter(module)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border ${
                  moduleFilter === module
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-200 dark:border-slate-800'
                }`}
              >
                {module}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visibleRows.map((row) => (
            <div key={row.id} className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{row.doctype}</p>
                    <span className={`border px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${stateTone(row.currentState)}`}>
                      {row.currentState}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 truncate">{resolveTitle(row.document)}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-1">{row.document.id}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => onNavigate(row.view)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  >
                    Open
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  {row.transitions.map((transition) => {
                    const allowed = canAccessView(userRole, row.view, transitionAction(transition));
                    const isCancel = transition.to === 'CANCELLED' || transition.to === 'REJECTED';

                    return (
                      <button
                        key={`${transition.from}-${transition.to}-${transition.action}`}
                        onClick={() => applyTransition(row, transition)}
                        disabled={!allowed}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isCancel
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-300'
                            : 'bg-amber-500 text-white hover:bg-amber-600'
                        }`}
                      >
                        {isCancel ? <XCircle className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        {transition.action}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {visibleRows.length === 0 && (
            <div className="px-4 py-16 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">No pending workflow actions</p>
              <p className="text-xs mt-1">Documents with available workflow transitions will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowInbox;
