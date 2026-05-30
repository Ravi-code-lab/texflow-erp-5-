import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, X, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, MoreHorizontal, Trash2, Download,
  CheckSquare, Square, Columns, Check, SlidersHorizontal,
  ListX, Tag, RefreshCw, ArrowUpDown,
} from 'lucide-react';

// ─── Column definition ────────────────────────────────────────────────────────

export type ColumnAlign = 'left' | 'right' | 'center';

export interface ColumnDef<T> {
  /** Unique key — must match a field on T or be a custom render key */
  key: string;
  /** Header label */
  label: string;
  /** Fixed pixel width; omit to let column flex-grow */
  width?: number;
  align?: ColumnAlign;
  /** Render cell content. Receives the row and the currency symbol. */
  render: (row: T, currency: string) => React.ReactNode;
  /** Return a primitive for sorting. Omit to disable sort on this column. */
  sortValue?: (row: T) => string | number;
  /** Whether this column is hidden by default in the column chooser */
  defaultHidden?: boolean;
}

// ─── Tag filter definition ────────────────────────────────────────────────────

export interface TagFilter {
  key: string;
  label: string;
  /** Returns true when this tag is active and the row passes */
  match: (row: any) => boolean;
}

// ─── Bulk action definition ───────────────────────────────────────────────────

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick: (ids: string[]) => void;
}

// ─── ListPage props ───────────────────────────────────────────────────────────

export interface ListPageProps<T extends { id: string }> {
  /** DocType display name, e.g. "Sales Order" */
  doctype: string;
  /** All rows (unfiltered) */
  rows: T[];
  /** Column definitions in display order */
  columns: ColumnDef<T>[];
  /** Called when the user clicks a row */
  onRowClick?: (row: T) => void;
  /** Called when "+ New" is clicked */
  onNew?: () => void;
  /** Custom label for the New button */
  newLabel?: string;
  /** Extra buttons rendered in the top-right toolbar (alongside New) */
  toolbarRight?: React.ReactNode;
  /** Global text search: fields to search across */
  searchFields?: (keyof T)[];
  /** Tag filters rendered as pill toggles below the search bar */
  tagFilters?: TagFilter[];
  /** Bulk actions shown when rows are selected */
  bulkActions?: BulkAction[];
  /** Called when selected IDs change */
  onSelectionChange?: (ids: string[]) => void;
  /** Rows per page */
  pageSize?: number;
  /** Currency symbol for cell renderers */
  currency?: string;
  /** Empty state icon component */
  emptyIcon?: React.ComponentType<{ className?: string }>;
  /** Empty state message */
  emptyMessage?: string;
}

// ─── Status badge helper (exported for reuse in column defs) ─────────────────

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  // positive / complete
  DELIVERED:  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  COMPLETED:  { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  ACTIVE:     { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  APPROVED:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  RECEIVED:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PAID:       { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PASSED:     { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  ACCEPTED:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  SUBMITTED:  { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  SHIPPED:    { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  SENT:       { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  IN_PROGRESS:{ bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  // warning / pending
  PENDING:    { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  DRAFT:      { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  OPEN:       { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  ON_LEAVE:   { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  // negative
  CANCELLED:  { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  REJECTED:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  INACTIVE:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  FAILED:     { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f4f5f6', text: '#525c66', border: '#d1d8dd' };
  const display = label ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return (
    <span
      style={{
        background: c.bg, color: c.text,
        border: `1px solid ${c.border}`,
        padding: '1px 8px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
        whiteSpace: 'nowrap', display: 'inline-block',
      }}
    >
      {display}
    </span>
  );
}

// ─── ListPage component ───────────────────────────────────────────────────────

function ListPage<T extends { id: string }>({
  doctype,
  rows,
  columns,
  onRowClick,
  onNew,
  newLabel,
  toolbarRight,
  searchFields = [],
  tagFilters = [],
  bulkActions = [],
  onSelectionChange,
  pageSize = 20,
  currency = '₹',
  emptyIcon: EmptyIcon = ListX,
  emptyMessage,
}: ListPageProps<T>) {

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
  );
  const [showColChooser, setShowColChooser] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const searchRef = useRef<HTMLInputElement>(null);
  const colChooserRef = useRef<HTMLDivElement>(null);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  // Auto-detect grouping fields based on what properties exist in this DocType
  const statusField = useMemo(() => {
    if (rows.length === 0) return 'status';
    const sample = rows[0] as any;
    if ('status' in sample) return 'status';
    if ('docstatus' in sample) return 'docstatus';
    if ('paymentStatus' in sample) return 'paymentStatus';
    if ('priority' in sample) return 'priority';
    if ('statusStage' in sample) return 'statusStage';
    return 'status';
  }, [rows]);

  // Derive all unique active stages present or pre-map common workflows
  const kanbanColumns = useMemo(() => {
    const activeValues = new Set<string>();
    rows.forEach(r => {
      const v = (r as any)[statusField];
      if (v !== undefined && v !== null) {
        activeValues.add(String(v));
      }
    });

    const list = Array.from(activeValues);
    if (list.length === 0) {
      if (statusField === 'docstatus') return ['0', '1', '2'];
      return ['DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED'];
    }
    
    // Sort logically where possible
    const priorityMap: Record<string, number> = {
      '0': 0, '1': 1, '2': 2,
      'DRAFT': 0, 'OPEN': 1, 'PENDING': 2, 'TODO': 2, 'IN_PROGRESS': 3,
      'APPROVED': 4, 'PASSED': 4, 'ACTIVE': 4, 'COMPLETED': 5, 'DELIVERED': 5,
      'CANCELLED': 6, 'REJECTED': 6, 'FAILED': 6
    };
    return list.sort((a, b) => {
      const pa = priorityMap[a.toUpperCase()] ?? 99;
      const pb = priorityMap[b.toUpperCase()] ?? 99;
      return pa - pb;
    });
  }, [rows, statusField]);

  const visibleCols = useMemo(() =>
    columns.filter(c => !hiddenCols.has(c.key)),
    [columns, hiddenCols]
  );

  // ── Search + tag filtering ──
  const filtered = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row =>
        searchFields.some(f => {
          const v = row[f];
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }

    if (activeTags.size > 0) {
      result = result.filter(row =>
        [...activeTags].every(key => {
          const tf = tagFilters.find(t => t.key === key);
          return tf ? tf.match(row) : true;
        })
      );
    }

    return result;
  }, [rows, search, activeTags, tagFilters, searchFields]);

  // ── Sorting ──
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => { setPage(1); }, [search, activeTags, sortKey]);

  // ── Selection ──
  const allPageChecked = pageRows.length > 0 && pageRows.every(r => checkedIds.has(r.id));
  const someChecked = checkedIds.size > 0;

  const toggleAll = () => {
    const next = new Set(checkedIds);
    if (allPageChecked) pageRows.forEach(r => next.delete(r.id));
    else pageRows.forEach(r => next.add(r.id));
    setCheckedIds(next);
    onSelectionChange?.([...next]);
  };

  const toggleRow = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      onSelectionChange?.([...next]);
      return next;
    });
  }, [onSelectionChange]);

  // ── Sort toggle ──
  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ── Outside click ──
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colChooserRef.current && !colChooserRef.current.contains(e.target as Node))
        setShowColChooser(false);
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node))
        setShowBulkMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = (key: string) => {
    setActiveTags(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // ── CSV export ──
  const handleExport = () => {
    const exportRows = checkedIds.size > 0
      ? sorted.filter(r => checkedIds.has(r.id))
      : sorted;
    const headers = visibleCols.map(c => c.label).join(',');
    const csvRows = exportRows.map(row =>
      visibleCols.map(c => {
        const cell = c.render(row, currency);
        const text = typeof cell === 'string' || typeof cell === 'number'
          ? String(cell)
          : (row as any)[c.key] ?? '';
        return `"${String(text).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${doctype.replace(/\s+/g, '_')}_export.csv`;
    a.click();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const startRow = sorted.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sorted.length);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] dark:bg-[#0d0d10] font-sans antialiased text-[#1c2126] dark:text-slate-100 absolute inset-0 overflow-hidden">

      {/* ── Bulk action bar (slides in when rows selected) ── */}
      <AnimatePresence>
        {someChecked && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 40, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="h-10 bg-indigo-600 flex items-center gap-3 px-6">
              <button
                onClick={() => { setCheckedIds(new Set()); onSelectionChange?.([]); }}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <span className="text-white text-[13px] font-semibold">
                {checkedIds.size} selected
              </span>
              <div className="h-4 w-px bg-white/20 mx-1" />
              {bulkActions.map(action => (
                <button
                  key={action.key}
                  onClick={() => {
                    action.onClick([...checkedIds]);
                    if (action.danger) { setCheckedIds(new Set()); onSelectionChange?.([]); }
                    setShowBulkMenu(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                    action.danger
                      ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/40'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {action.icon && <action.icon className="w-3.5 h-3.5" />}
                  {action.label}
                </button>
              ))}
              <div className="ml-auto">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-white text-[12px] font-medium hover:bg-white/20 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex-none bg-white dark:bg-[#13131a] border-b border-[#d1d8dd] dark:border-white/[0.06] px-6 py-3 sticky top-0 z-20">
        {/* Row 1: title + buttons */}
        <div className="flex justify-between items-center h-8">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] text-[#1c2126] dark:text-slate-100 font-bold tracking-tight">{doctype}</span>
            <span className="text-[11px] text-[#525c66] dark:text-slate-400 bg-[#f4f5f6] dark:bg-white/[0.06] px-2 py-0.5 rounded-full font-medium tabular-nums">
              {sorted.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Dual View Selector (List vs Kanban) */}
            <div className="flex border border-[#d1d8dd] dark:border-white/10 rounded overflow-hidden mr-1">
              <button
                onClick={() => setViewMode('list')}
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] font-bold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-white/[0.04] text-[#525c66] dark:text-slate-400 hover:bg-[#f4f5f6] dark:hover:bg-white/10'
                }`}
                title="List View"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden md:inline">List</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] font-bold transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-white/[0.04] text-[#525c66] dark:text-slate-400 hover:bg-[#f4f5f6] dark:hover:bg-white/10'
                }`}
                title="Kanban Board"
              >
                <Columns className="w-3 h-3" />
                <span className="hidden md:inline">Kanban</span>
              </button>
            </div>

            {toolbarRight}
            <button
              onClick={handleExport}
              className="h-7 w-7 flex items-center justify-center bg-white dark:bg-white/[0.04] hover:bg-[#f4f5f6] dark:hover:bg-white/10 border border-[#d1d8dd] dark:border-white/10 rounded text-[#525c66] dark:text-slate-400 transition-colors"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {onNew && (
              <button
                onClick={onNew}
                className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                {newLabel ?? `New ${doctype}`}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: filter bar */}
        <div className="flex justify-between items-center mt-2.5 h-7">
          <div className="flex items-center gap-1.5">
            {/* Column chooser */}
            <div className="relative" ref={colChooserRef}>
              <button
                onClick={() => setShowColChooser(v => !v)}
                className="h-7 px-2 flex items-center gap-1.5 bg-white dark:bg-white/[0.04] border border-[#d1d8dd] dark:border-white/10 hover:bg-[#f4f5f6] dark:hover:bg-white/10 rounded text-[12px] font-medium text-[#525c66] dark:text-slate-400 transition-colors"
                title="Choose columns"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showColChooser && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute top-8 left-0 z-50 bg-white dark:bg-[#1a1a24] border border-[#d1d8dd] dark:border-white/10 rounded-lg shadow-lg min-w-[180px] py-1 overflow-hidden"
                  >
                    <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8d99a6] dark:text-slate-500">Columns</p>
                    {columns.map(col => {
                      const hidden = hiddenCols.has(col.key);
                      return (
                        <button
                          key={col.key}
                          onClick={() => setHiddenCols(prev => {
                            const next = new Set(prev);
                            if (next.has(col.key)) next.delete(col.key);
                            else next.add(col.key);
                            return next;
                          })}
                          className="w-full flex items-center gap-2.5 px-3 py-[5px] text-[13px] text-[#1c2126] dark:text-slate-300 hover:bg-[#f4f5f6] dark:hover:bg-white/5 transition-colors"
                        >
                          <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0 ${!hidden ? 'bg-[#2490ef] border-[#2490ef]' : 'border-[#d1d8dd] dark:border-white/20'}`}>
                            {!hidden && <Check className="w-2.5 h-2.5 text-white" />}
                          </span>
                          {col.label}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                placeholder={`Search ${doctype}…`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-7 w-[260px] pl-7 pr-6 text-[13px] bg-white dark:bg-white/[0.04] border border-[#d1d8dd] dark:border-white/10 rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6] dark:text-slate-200"
              />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] hover:text-[#525c66]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Tag filters */}
            {tagFilters.map(tf => {
              const active = activeTags.has(tf.key);
              return (
                <button
                  key={tf.key}
                  onClick={() => toggleTag(tf.key)}
                  className={`h-7 px-2.5 flex items-center gap-1.5 rounded text-[12px] font-medium border transition-all ${
                    active
                      ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300'
                      : 'bg-white dark:bg-white/[0.04] border-[#d1d8dd] dark:border-white/10 text-[#525c66] dark:text-slate-400 hover:bg-[#f4f5f6] dark:hover:bg-white/10'
                  }`}
                >
                  {active && <Tag className="w-3 h-3" />}
                  {tf.label}
                </button>
              );
            })}

            {/* Clear filters */}
            {(search || activeTags.size > 0) && (
              <button
                onClick={() => { setSearch(''); setActiveTags(new Set()); }}
                className="h-7 px-2 flex items-center gap-1 text-[12px] text-[#525c66] dark:text-slate-400 hover:text-[#1c2126] dark:hover:text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {sortKey && (
              <button
                onClick={() => setSortKey(null)}
                className="h-7 px-2 flex items-center gap-1 text-[12px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition-colors"
                title="Clear sort"
              >
                <ArrowUpDown className="w-3 h-3" /> {columns.find(c => c.key === sortKey)?.label}
                <X className="w-3 h-3" />
              </button>
            )}
            <span className="text-[13px] text-[#525c66] dark:text-slate-400 tabular-nums">
              {sorted.length === 0 ? '0 of 0' : `${startRow}–${endRow} of ${sorted.length}`}
            </span>
            <div className="flex border border-[#d1d8dd] dark:border-white/10 rounded overflow-hidden">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-7 px-2 bg-white dark:bg-white/[0.04] hover:bg-[#f4f5f6] dark:hover:bg-white/10 text-[#1c2126] dark:text-slate-300 border-r border-[#d1d8dd] dark:border-white/10 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-7 px-2 bg-white dark:bg-white/[0.04] hover:bg-[#f4f5f6] dark:hover:bg-white/10 text-[#1c2126] dark:text-slate-300 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table or Kanban View ── */}
      <div className="flex-1 overflow-auto p-4 pb-10">
        {viewMode === 'kanban' ? (
          <div className="flex gap-4 items-start h-full pb-4 select-none min-w-full overflow-x-auto custom-scrollbar">
            {kanbanColumns.map(colName => {
              const displayColName = String(colName);
              const colRows = sorted.filter(r => {
                const rowValue = String((r as any)[statusField] ?? '');
                return rowValue.toUpperCase() === displayColName.toUpperCase();
              });
              const badgeLabel = displayColName === '0' ? 'Draft' : displayColName === '1' ? 'Submitted' : displayColName === '2' ? 'Cancelled' : displayColName;
              
              return (
                <div key={displayColName} className="w-[300px] shrink-0 bg-white/50 dark:bg-[#13131a]/70 border border-slate-200 dark:border-white/[0.05] rounded-xl flex flex-col max-h-full shadow-sm">
                  {/* Column Header */}
                  <div className="p-3 bg-slate-100/50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.05] flex justify-between items-center shrink-0 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={displayColName.toUpperCase()} label={badgeLabel} />
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500 tabular-nums">({colRows.length})</span>
                    </div>
                  </div>

                  {/* Column Body */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-3 custom-scrollbar min-h-[350px]">
                    {colRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-[#8d99a6] dark:text-slate-600 border border-dashed border-slate-200 dark:border-white/[0.04] rounded-lg">
                        <EmptyIcon className="w-6 h-6 mb-1 opacity-30 text-slate-400" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Empty Stage</span>
                      </div>
                    ) : (
                      colRows.map(row => (
                        <div
                          key={row.id}
                          onClick={() => onRowClick?.(row)}
                          className="bg-white dark:bg-[#1a1a24] p-3 border border-slate-200 dark:border-white/[0.05] hover:border-indigo-500 hover:ring-1 hover:ring-indigo-500/50 dark:hover:border-indigo-500 rounded-lg hover:shadow transition-all cursor-pointer group flex flex-col gap-2 relative shadow-sm"
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="font-bold text-[#1c2126] dark:text-slate-200 text-xs sm:text-[13px] group-hover:text-[#2490ef] dark:group-hover:text-indigo-400 transition-colors truncate">
                              {columns[0].render(row, currency)}
                            </span>
                            <span className="text-[10px] sm:text-[10.5px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                              {row.id.split('-').pop() || row.id}
                            </span>
                          </div>

                          {/* Quick details */}
                          <div className="space-y-1 mt-1 border-t border-slate-100 dark:border-white/[0.03] pt-2">
                            {columns.slice(1, 4).map(c => {
                              const rendered = c.render(row, currency);
                              if (rendered === undefined || rendered === null || (typeof rendered === 'string' && !rendered)) return null;
                              return (
                                <div key={c.key} className="flex items-center justify-between gap-1 text-[11px]">
                                  <span className="text-slate-400 dark:text-slate-500 font-medium truncate">{c.label}:</span>
                                  <span className="text-slate-600 dark:text-slate-300 font-bold truncate max-w-[160px] text-right">{rendered}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#13131a] border border-[#d1d8dd] dark:border-white/[0.06] rounded-lg shadow-sm flex flex-col" style={{ minWidth: 760 }}>

            {/* Table header row */}
            <div className="flex items-center border-b border-[#d1d8dd] dark:border-white/[0.06] bg-[#f4f5f6] dark:bg-white/[0.03] px-4 py-2.5 text-[11px] text-[#525c66] dark:text-slate-500 font-semibold uppercase tracking-wide select-none rounded-t-lg">
              {/* Checkbox */}
              <div className="w-8 flex shrink-0">
                <button
                  onClick={toggleAll}
                  className="text-[#525c66] dark:text-slate-500 hover:text-[#2490ef] dark:hover:text-indigo-400 transition-colors"
                >
                  {allPageChecked
                    ? <CheckSquare className="w-3.5 h-3.5 text-[#2490ef]" />
                    : <Square className="w-3.5 h-3.5" />}
                </button>
              </div>

              {visibleCols.map(col => {
                const canSort = !!col.sortValue;
                const isActive = sortKey === col.key;
                return (
                  <div
                    key={col.key}
                    className={`${col.width ? '' : 'flex-1 min-w-0'} flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''} ${canSort ? 'cursor-pointer group hover:text-[#1c2126] dark:hover:text-slate-200 transition-colors' : ''}`}
                    style={col.width ? { width: col.width, flexShrink: 0 } : {}}
                    onClick={canSort ? () => handleSort(col.key) : undefined}
                  >
                    {col.label}
                    {canSort && (
                      <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                        {isActive && sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Row actions spacer */}
              <div className="w-8 shrink-0" />
            </div>

            {/* Table body */}
            <div className="divide-y divide-[#d1d8dd]/50 dark:divide-white/[0.04]">
              {pageRows.length === 0 ? (
                <div className="px-4 py-16 flex flex-col items-center justify-center text-[#525c66] dark:text-slate-500">
                  <EmptyIcon className="w-10 h-10 text-[#d1d8dd] dark:text-white/10 mb-3" />
                  <p className="text-[13px] font-medium">{emptyMessage ?? `No ${doctype}s found`}</p>
                  {(search || activeTags.size > 0) && (
                    <button
                      onClick={() => { setSearch(''); setActiveTags(new Set()); }}
                      className="mt-3 text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                pageRows.map(row => {
                  const checked = checkedIds.has(row.id);
                  return (
                    <div
                      key={row.id}
                      onClick={() => onRowClick?.(row)}
                      className={`group flex items-center px-4 py-[8px] text-[13px] cursor-pointer transition-colors ${
                        checked
                          ? 'bg-indigo-50/60 dark:bg-indigo-500/[0.06]'
                          : 'hover:bg-[#f4f5f6] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="w-8 shrink-0" onClick={e => { e.stopPropagation(); toggleRow(row.id); }}>
                        <button className="text-[#525c66] dark:text-slate-500 hover:text-[#2490ef] transition-colors">
                          {checked
                            ? <CheckSquare className="w-3.5 h-3.5 text-[#2490ef]" />
                            : <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        </button>
                      </div>

                      {visibleCols.map((col, ci) => (
                        <div
                          key={col.key}
                          className={`${col.width ? 'shrink-0 pr-3' : 'flex-1 min-w-0'} ${col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : ''} truncate`}
                          style={col.width ? { width: col.width } : {}}
                        >
                          {ci === 0 ? (
                            <span className="font-semibold text-[#1c2126] dark:text-slate-200 group-hover:text-[#2490ef] dark:group-hover:text-indigo-400 transition-colors truncate">
                              {col.render(row, currency)}
                            </span>
                          ) : (
                            <span className="text-[#525c66] dark:text-slate-400 truncate">
                              {col.render(row, currency)}
                            </span>
                          )}
                        </div>
                      ))}

                      {/* Row action: edit on hover */}
                      <div className="w-8 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); onRowClick?.(row); }}
                          className="p-1 rounded text-[#8d99a6] hover:text-[#1c2126] dark:hover:text-slate-200 hover:bg-[#eaecee] dark:hover:bg-white/10 transition-all"
                          title="Open"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: page size info */}
            {sorted.length > pageSize && (
              <div className="border-t border-[#d1d8dd] dark:border-white/[0.06] px-4 py-2 flex items-center justify-between rounded-b-lg bg-[#f4f5f6] dark:bg-white/[0.02]">
                <span className="text-[11px] text-[#525c66] dark:text-slate-500">
                  Page {safePage} of {totalPages}
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-6 h-6 rounded text-[11px] font-medium transition-colors ${
                        p === safePage
                          ? 'bg-[#2490ef] text-white'
                          : 'text-[#525c66] dark:text-slate-400 hover:bg-[#eaecee] dark:hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 7 && <span className="text-[#525c66] text-[11px] px-1 self-center">…</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ListPage;
