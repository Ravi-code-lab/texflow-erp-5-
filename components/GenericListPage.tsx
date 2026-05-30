/**
 * GenericListPage.tsx — ERPNext-Style Schema-Driven List View
 * ─────────────────────────────────────────────────────────────
 * Drop into src/components/GenericListPage.tsx
 *
 * Replaces the custom list/table in every module with a single
 * reusable component driven by DocType schema and collectionQuery.
 *
 * Features:
 *  - Columns auto-derived from DocType schema (or override with columnFields)
 *  - Search across all Data/Link fields
 *  - Per-column sort
 *  - Status filter pills (from schema.statuses)
 *  - Pagination
 *  - Bulk select + delete
 *  - "New" button → opens DynamicForm
 *  - Click row → opens DynamicForm in edit mode
 *  - Real-time update via useCollection (WebSocket push on LAN)
 *
 * Usage:
 *   <GenericListPage
 *     collectionKey="orders"
 *     schema={getDocTypeSchema('ORDERS')}
 *     onSave={async (doc) => { ... }}
 *     onDelete={async (ids) => { ... }}
 *     collections={{ customers, inventory }}
 *     currentUser={currentUser?.name}
 *   />
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Trash2, RefreshCw, Filter, X, FileText, Loader2,
} from 'lucide-react';
import { DocTypeSchema } from '../modules/doctypes';
import { useCollection, QueryFilter, SortDirection } from '../utils/collectionQuery';
import { DynamicForm } from './DynamicForm';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GenericListPageProps<T extends Record<string, any>> {
  /** Storage key for this collection (e.g. 'orders', 'inventory') */
  collectionKey: string;
  schema: DocTypeSchema | null | undefined;
  /** Called when a document is saved (create or update) — update your state here */
  onSave: (doc: T) => Promise<void>;
  /** Called with array of ids to delete — update your state here */
  onDelete?: (ids: string[]) => Promise<void>;
  /** Collections for Link field dropdowns in the form */
  collections?: Record<string, Array<{ id: string; name?: string; [k: string]: any }>>;
  currentUser?: string;
  /** Override which fields appear as columns (defaults to non-Table schema fields) */
  columnFields?: string[];
  /** Extra actions to render in the toolbar */
  extraActions?: React.ReactNode;
  pageSize?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status badge
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-amber-100 text-amber-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FULFILLED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  ACTIVE: 'bg-green-100 text-green-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
  RECEIVED: 'bg-teal-100 text-teal-700',
  PLANNED: 'bg-purple-100 text-purple-700',
};

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span className="text-gray-300">—</span>;
  const cls = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sort icon
// ─────────────────────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDirection }) {
  if (!active) return <ChevronsUpDown size={12} className="text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp size={12} className="text-indigo-500" />
    : <ChevronDown size={12} className="text-indigo-500" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell renderer
// ─────────────────────────────────────────────────────────────────────────────

function CellValue({ value, fieldtype }: { value: any; fieldtype?: string }) {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-300">—</span>;
  }
  if (fieldtype === 'Currency') {
    return <span>₹{Number(value).toLocaleString('en-IN')}</span>;
  }
  if (fieldtype === 'Date') {
    try {
      return <span>{new Date(value).toLocaleDateString('en-IN')}</span>;
    } catch {
      return <span>{String(value)}</span>;
    }
  }
  if (fieldtype === 'Check') {
    return <span>{value ? '✓' : '—'}</span>;
  }
  if (Array.isArray(value)) {
    return <span className="text-gray-400">{value.length} rows</span>;
  }
  return <span>{String(value)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function GenericListPage<T extends Record<string, any> & { id: string; status?: string }>({
  collectionKey,
  schema,
  onSave,
  onDelete,
  collections,
  currentUser,
  columnFields,
  extraActions,
  pageSize = 25,
}: GenericListPageProps<T>) {

  // ── UI state ──
  const [view, setView] = useState<'list' | 'new' | 'edit'>('list');
  const [editing, setEditing] = useState<Partial<T> | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortField, setSortFieldState] = useState<string>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [deleting, setDeleting] = useState(false);

  // ── Build filters for the query ──
  const queryFilters = useMemo<QueryFilter<T>[]>(() => {
    const f: QueryFilter<T>[] = [];
    if (statusFilter) {
      f.push({ field: 'status' as keyof T, op: 'eq', value: statusFilter });
    }
    // Search: filter on id or any 'name'/'customerName'/'supplierName' field
    if (searchText.trim()) {
      f.push({
        field: 'id' as keyof T,
        op: 'contains',
        value: searchText.trim(),
      });
    }
    return f;
  }, [statusFilter, searchText]);

  // ── Live data via useCollection ──
  const { data, total, page, pageCount, loading, error, refetch, setPage, setFilters } =
    useCollection<T>(collectionKey, {
      filters: queryFilters,
      sortField: sortField as keyof T,
      sortDir,
      pageSize,
    });

  // Apply filter changes when search/status changes
  React.useEffect(() => {
    setFilters(queryFilters);
  }, [queryFilters, setFilters]);

  // ── Column definitions from schema ──
  const columns = useMemo(() => {
    if (!schema) return [{ fieldname: 'id', label: 'ID', fieldtype: 'Data' }];
    const names = columnFields ?? schema.fields
      .filter(f => f.fieldtype !== 'Table')
      .map(f => f.fieldname)
      .slice(0, 6); // max 6 columns for readability

    return [
      { fieldname: 'id', label: schema.name + ' ID', fieldtype: 'Data' },
      ...schema.fields.filter(f => names.includes(f.fieldname)),
      ...(schema.statusField ? [{ fieldname: 'status', label: 'Status', fieldtype: 'Select' }] : []),
    ].filter((c, i, arr) => arr.findIndex(x => x.fieldname === c.fieldname) === i); // dedupe
  }, [schema, columnFields]);

  // ── Sort toggle ──
  const handleSort = useCallback((field: string) => {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldState(field);
      setSortDir('desc');
    }
  }, [sortField]);

  // ── Selection ──
  const allSelected = data.length > 0 && data.every(r => selectedIds.has(r.id));
  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.map(r => r.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Delete selected ──
  const handleDeleteSelected = async () => {
    if (!onDelete || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  // ── Save from form ──
  const handleSave = async (doc: T) => {
    await onSave(doc);
    setView('list');
    setEditing(undefined);
    refetch();
  };

  // ── Form views ──
  if (view === 'new' || view === 'edit') {
    return (
      <div className="p-4">
        <DynamicForm
          schema={schema}
          initialValues={view === 'edit' ? editing : undefined}
          onSave={handleSave}
          onCancel={() => { setView('list'); setEditing(undefined); }}
          collections={collections}
          currentUser={currentUser}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="flex flex-col h-full">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        {/* Doctype title */}
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {schema?.name ?? collectionKey}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} {total === 1 ? 'record' : 'records'} {statusFilter ? `· ${statusFilter}` : ''}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID…"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            className="pl-8 pr-3 py-1.5 text-xs w-44 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={11} />
            </button>
          )}
        </div>

        {/* Bulk delete */}
        {selectedIds.size > 0 && onDelete && (
          <button
            onClick={handleDeleteSelected}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700 transition-colors hover:bg-red-100"
          >
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Delete {selectedIds.size}
          </button>
        )}

        {/* Refresh */}
        <button
          onClick={refetch}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        {extraActions}

        {/* New button */}
        <button
          onClick={() => setView('new')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          <Plus size={13} /> New {schema?.name}
        </button>
      </div>

      {/* ── Status filter pills ── */}
      {schema?.statuses && schema.statuses.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none">
          <Filter size={12} className="text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setStatusFilter('')}
            className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
              !statusFilter
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {schema.statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? '' : s)}
              className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="m-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
        )}

        {!error && (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                {columns.map(col => (
                  <th
                    key={col.fieldname}
                    className="px-3 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors whitespace-nowrap"
                    onClick={() => handleSort(col.fieldname)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <SortIcon active={sortField === col.fieldname} dir={sortDir} />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="py-12 text-center">
                    <Loader2 size={20} className="animate-spin text-gray-300 mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="py-16 text-center">
                    <FileText size={28} className="text-gray-200 dark:text-gray-700 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">
                      {statusFilter || searchText ? 'No matching records' : `No ${schema?.name ?? collectionKey} yet`}
                    </p>
                    {!statusFilter && !searchText && (
                      <button
                        onClick={() => setView('new')}
                        className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        Create first {schema?.name}
                      </button>
                    )}
                  </td>
                </tr>
              )}
              {data.map(row => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors ${
                    selectedIds.has(row.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      className="rounded"
                    />
                  </td>
                  {columns.map(col => (
                    <td
                      key={col.fieldname}
                      className="px-3 py-2.5 text-sm text-gray-700 dark:text-gray-200"
                      onClick={() => {
                        setEditing(row as Partial<T>);
                        setView('edit');
                      }}
                    >
                      {col.fieldname === 'status'
                        ? <StatusPill status={row.status} />
                        : <CellValue value={row[col.fieldname]} fieldtype={col.fieldtype} />
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <span className="text-xs text-gray-400">
            Page {page} of {pageCount} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ←
            </button>
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              const p = Math.min(Math.max(1, page - 2), pageCount - 4) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= pageCount}
              className="px-2.5 py-1 text-xs rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
