import React, { useState } from 'react';
import { ViewState } from '../types';
import { getWorkflowForView, getAvailableTransitions } from '../modules/workflows';
import { Inbox, ChevronRight, RefreshCw } from 'lucide-react';

export interface WorkflowInboxCollection {
  view: ViewState;
  label: string;
  documents: any[];
  onUpdate: (document: any) => void;
}

interface WorkflowInboxProps {
  collections: WorkflowInboxCollection[];
  userRole?: string;
  onNavigate?: (view: ViewState) => void;
}

const WorkflowInbox: React.FC<WorkflowInboxProps> = ({ collections, userRole, onNavigate }) => {
  const [activeView, setActiveView] = useState<ViewState | null>(null);

  const pendingItems = collections.flatMap((col) =>
    col.documents
      .filter((doc) => doc.docstatus === 0 || doc.status === 'Draft' || doc.status === 'Pending')
      .map((doc) => ({ ...doc, _collection: col }))
  );

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Inbox className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Workflow Inbox</h2>
          <p className="text-xs text-slate-500">{pendingItems.length} document{pendingItems.length !== 1 ? 's' : ''} awaiting action</p>
        </div>
      </div>

      {/* Collection tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setActiveView(null)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === null ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All ({pendingItems.length})
        </button>
        {collections.map((col) => {
          const count = col.documents.filter(
            (d) => d.docstatus === 0 || d.status === 'Draft' || d.status === 'Pending'
          ).length;
          return (
            <button
              key={col.view}
              onClick={() => setActiveView(col.view)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === col.view ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {col.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {(activeView
          ? pendingItems.filter((item) => item._collection.view === activeView)
          : pendingItems
        ).map((item, idx) => {
          const col: WorkflowInboxCollection = item._collection;
          const transitions = getAvailableTransitions(col.view, item.status || 'Draft');
          return (
            <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      {col.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      item.status === 'Draft' ? 'bg-amber-50 text-amber-700' :
                      item.status === 'Pending' ? 'bg-orange-50 text-orange-700' :
                      'bg-slate-50 text-slate-600'
                    }`}>
                      {item.status || 'Draft'}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm truncate">
                    {item.id || item.name || `${col.label} #${idx + 1}`}
                  </p>
                  {(item.customer || item.supplier || item.party) && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.customer || item.supplier || item.party}
                    </p>
                  )}
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate(col.view)}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>

              {transitions.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {transitions.map((t) => (
                    <button
                      key={t.action}
                      onClick={() => col.onUpdate({ ...item, status: t.to })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {pendingItems.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs mt-1">No documents awaiting action.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowInbox;
