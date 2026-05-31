import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Filter, X, ChevronLeft, ChevronRight,
  ChevronUp, ChevronDown, MoreHorizontal, Trash2, Download,
  CheckSquare, Square, Columns, Check, SlidersHorizontal,
  ListX, Tag, RefreshCw, ArrowUpDown, Copy, Star,
} from 'lucide-react';

export type ColumnAlign = 'left' | 'right' | 'center';

export interface ColumnDef<T> {
  key: string;
  label: string;
  width?: number;
  align?: ColumnAlign;
  render: (row: T, currency: string) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  defaultHidden?: boolean;
}

export interface TagFilter {
  key: string;
  label: string;
  count?: number;
  match: (row: any) => boolean;
}

export interface BulkAction {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  onClick: (ids: string[]) => void;
}

export interface ListPageProps<T extends { id: string }> {
  doctype: string;
  rows: T[];
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  onNew?: () => void;
  newLabel?: string;
  toolbarRight?: React.ReactNode;
  searchFields?: (keyof T)[];
  tagFilters?: TagFilter[];
  bulkActions?: BulkAction[];
  onSelectionChange?: (ids: string[]) => void;
  pageSize?: number;
  currency?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  emptyMessage?: string;
  onDuplicate?: (row: T) => void;
}

export const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DELIVERED:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  COMPLETED:   { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  ACTIVE:      { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  APPROVED:    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  RECEIVED:    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PAID:        { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  PASSED:      { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  ACCEPTED:    { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  SUBMITTED:   { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  SHIPPED:     { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  SENT:        { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  IN_PROGRESS: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  PENDING:     { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  DRAFT:       { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  OPEN:        { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  ON_LEAVE:    { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  UNPAID:      { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  CANCELLED:   { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  REJECTED:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  INACTIVE:    { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  FAILED:      { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f4f5f6', text: '#525c66', border: '#d1d8dd' };
  const display = label ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return (
    <span style={{
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em',
      whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {display}
    </span>
  );
}

// ── Stat Cards ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number | string;
  color?: string;
  active?: boolean;
  onClick?: () => void;
}

function StatCard({ label, value, color = '#2490ef', active, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 min-w-[110px] text-left px-4 py-3 border rounded-lg transition-all ${
        active
          ? 'border-[#2490ef] bg-[#eff6ff]'
          : 'border-[#d1d8dd] bg-white hover:bg-[#f8fafc] hover:border-[#adc8e8]'
      }`}
    >
      <p className="text-[11px] font-medium text-[#8d99a6] mb-1 truncate">{label}</p>
      <p className="text-xl font-bold tabular-nums" style={{ color: active ? color : '#1c2126' }}>{value}</p>
    </button>
  );
}

// ── ListPage component ────────────────────────────────────────────────────────

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
  pageSize = 25,
  currency = '₹',
  emptyIcon: EmptyIcon = ListX,
  emptyMessage,
  onDuplicate,
}: ListPageProps<T>) {

  const [search, setSearch] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [activeStatFilter, setActiveStatFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    new Set(columns.filter(c => c.defaultHidden).map(c => c.key))
  );
  const [showColChooser, setShowColChooser] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const colChooserRef = useRef<HTMLDivElement>(null);

  // ── Stat cards derived counts ──
  const statCards = useMemo(() => {
    const cards: { key: string; label: string; count: number; filterFn: (r: T) => boolean }[] = [];
    // "This Month"
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    cards.push({ key: 'thisMonth', label: 'This Month', count: rows.filter(r => {
      const d = (r as any).orderDate || (r as any).date || '';
      return String(d).startsWith(ym);
    }).length, filterFn: r => {
      const d = (r as any).orderDate || (r as any).date || '';
      return String(d).startsWith(ym);
    }});
    cards.push({ key: 'SHIPPED',    label: 'Shipped',    count: rows.filter(r => (r as any).status === 'SHIPPED').length,    filterFn: r => (r as any).status === 'SHIPPED' });
    cards.push({ key: 'UNPAID',     label: 'Unpaid',     count: rows.filter(r => (r as any).paymentStatus === 'UNPAID').length, filterFn: r => (r as any).paymentStatus === 'UNPAID' });
    cards.push({ key: 'CANCELLED',  label: 'Cancelled',  count: rows.filter(r => (r as any).status === 'CANCELLED').length,  filterFn: r => (r as any).status === 'CANCELLED' });
    return cards;
  }, [rows]);

  // ── Kanban grouping ──
  const statusField = useMemo(() => {
    if (rows.length === 0) return 'status';
    const s = rows[0] as any;
    for (const f of ['status','docstatus','paymentStatus','priority','statusStage']) if (f in s) return f;
    return 'status';
  }, [rows]);

  const kanbanColumns = useMemo(() => {
    const vals = new Set<string>();
    rows.forEach(r => { const v = (r as any)[statusField]; if (v != null) vals.add(String(v)); });
    const list = [...vals];
    if (!list.length) return ['DRAFT','PENDING','COMPLETED','CANCELLED'];
    const pm: Record<string,number> = { '0':0,'1':1,'2':2, DRAFT:0,OPEN:1,PENDING:2,TODO:2,IN_PROGRESS:3, APPROVED:4,PASSED:4,ACTIVE:4,COMPLETED:5,DELIVERED:5, CANCELLED:6,REJECTED:6,FAILED:6 };
    return list.sort((a,b) => (pm[a.toUpperCase()]??99)-(pm[b.toUpperCase()]??99));
  }, [rows, statusField]);

  const visibleCols = useMemo(() => columns.filter(c => !hiddenCols.has(c.key)), [columns, hiddenCols]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let result = rows;
    // Stat card filter
    if (activeStatFilter) {
      const card = statCards.find(s => s.key === activeStatFilter);
      if (card) result = result.filter(card.filterFn);
    }
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(row => searchFields.some(f => { const v = row[f]; return v != null && String(v).toLowerCase().includes(q); }));
    }
    // Tag filters
    if (activeTags.size > 0) {
      result = result.filter(row => [...activeTags].every(key => {
        const tf = tagFilters.find(t => t.key === key);
        return tf ? tf.match(row) : true;
      }));
    }
    return result;
  }, [rows, search, activeTags, tagFilters, searchFields, activeStatFilter, statCards]);

  // ── Sorting ──
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const col = columns.find(c => c.key === sortKey);
    if (!col?.sortValue) return filtered;
    return [...filtered].sort((a,b) => {
      const av = col.sortValue!(a), bv = col.sortValue!(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, columns]);

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage-1)*pageSize, safePage*pageSize);

  useEffect(() => { setPage(1); }, [search, activeTags, sortKey, activeStatFilter]);

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

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colChooserRef.current && !colChooserRef.current.contains(e.target as Node))
        setShowColChooser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTag = (key: string) => {
    setActiveTags(prev => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };

  const handleExport = () => {
    const exportRows = checkedIds.size > 0 ? sorted.filter(r => checkedIds.has(r.id)) : sorted;
    const headers = visibleCols.map(c => c.label).join(',');
    const csvRows = exportRows.map(row =>
      visibleCols.map(c => {
        const cell = c.render(row, currency);
        const text = typeof cell === 'string' || typeof cell === 'number' ? String(cell) : (row as any)[c.key] ?? '';
        return `"${String(text).replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...csvRows].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${doctype.replace(/\s+/g,'_')}_export.csv`;
    a.click();
  };

  const startRow = sorted.length === 0 ? 0 : (safePage-1)*pageSize+1;
  const endRow = Math.min(safePage*pageSize, sorted.length);

  return (
    <div className="flex flex-col h-full bg-[#f4f5f6] font-sans antialiased text-[#1c2126] absolute inset-0 overflow-hidden">

      {/* ── Bulk action bar ── */}
      <AnimatePresence>
        {someChecked && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 40, opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} className="shrink-0 overflow-hidden">
            <div className="h-10 bg-[#2490ef] flex items-center gap-3 px-6">
              <button onClick={() => { setCheckedIds(new Set()); onSelectionChange?.([]); }} className="text-white/80 hover:text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
              <span className="text-white text-[13px] font-semibold">{checkedIds.size} selected</span>
              <div className="h-4 w-px bg-white/20 mx-1" />
              {bulkActions.map(action => (
                <button key={action.key} onClick={() => { action.onClick([...checkedIds]); if (action.danger) { setCheckedIds(new Set()); onSelectionChange?.([]); } }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${action.danger ? 'bg-rose-500/20 text-rose-200 hover:bg-rose-500/40' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                  {action.icon && <action.icon className="w-3.5 h-3.5" />}{action.label}
                </button>
              ))}
              <div className="ml-auto">
                <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-white text-[12px] font-medium hover:bg-white/20 transition-colors">
                  <Download className="w-3.5 h-3.5" />Export
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <div className="flex-none bg-white border-b border-[#d1d8dd] px-6 py-3 sticky top-0 z-20">
        {/* Row 1: title + buttons */}
        <div className="flex justify-between items-center h-8">
          <div className="flex items-center gap-2.5">
            <span className="text-[18px] text-[#1c2126] font-bold tracking-tight">{doctype}</span>
            <span className="text-[11px] text-[#525c66] bg-[#f4f5f6] px-2 py-0.5 rounded-full font-medium tabular-nums">{sorted.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex border border-[#d1d8dd] rounded overflow-hidden mr-1">
              <button onClick={() => setViewMode('list')} title="List View"
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] font-bold transition-colors ${viewMode==='list' ? 'bg-[#2490ef] text-white' : 'bg-white text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                <SlidersHorizontal className="w-3 h-3" /><span className="hidden md:inline">List</span>
              </button>
              <button onClick={() => setViewMode('kanban')} title="Kanban"
                className={`h-7 px-2.5 flex items-center gap-1 text-[11px] font-bold transition-colors ${viewMode==='kanban' ? 'bg-[#2490ef] text-white' : 'bg-white text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                <Columns className="w-3 h-3" /><span className="hidden md:inline">Kanban</span>
              </button>
            </div>
            {toolbarRight}
            <button onClick={handleExport} title="Export CSV"
              className="h-7 w-7 flex items-center justify-center bg-white hover:bg-[#f4f5f6] border border-[#d1d8dd] rounded text-[#525c66] transition-colors">
              <Download className="w-3.5 h-3.5" />
            </button>
            {onNew && (
              <button onClick={onNew} className="h-7 px-3 flex items-center gap-1.5 bg-[#2490ef] hover:bg-[#2081d6] text-white rounded text-[13px] font-medium shadow-sm transition-all">
                <Plus className="w-3.5 h-3.5" />{newLabel ?? `New ${doctype}`}
              </button>
            )}
          </div>
        </div>

        {/* Stat Cards */}
        <div className="flex gap-2 mt-3">
          {statCards.map(card => (
            <StatCard
              key={card.key}
              label={card.label}
              value={card.count}
              active={activeStatFilter === card.key}
              onClick={() => setActiveStatFilter(prev => prev === card.key ? null : card.key)}
            />
          ))}
        </div>

        {/* Row 2: filter bar */}
        <div className="flex justify-between items-center mt-3 h-7">
          <div className="flex items-center gap-1.5">
            {/* Column chooser */}
            <div className="relative" ref={colChooserRef}>
              <button onClick={() => setShowColChooser(v => !v)} title="Choose columns"
                className="h-7 px-2 flex items-center gap-1.5 bg-white border border-[#d1d8dd] hover:bg-[#f4f5f6] rounded text-[12px] font-medium text-[#525c66] transition-colors">
                <Columns className="w-3.5 h-3.5" />
              </button>
              <AnimatePresence>
                {showColChooser && (
                  <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }} transition={{ duration:0.12 }}
                    className="absolute top-8 left-0 z-50 bg-white border border-[#d1d8dd] rounded-lg shadow-lg min-w-[180px] py-1">
                    <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8d99a6]">Columns</p>
                    {columns.map(col => {
                      const hidden = hiddenCols.has(col.key);
                      return (
                        <button key={col.key} onClick={() => setHiddenCols(prev => { const next = new Set(prev); if (next.has(col.key)) next.delete(col.key); else next.add(col.key); return next; })}
                          className="w-full flex items-center gap-2.5 px-3 py-[5px] text-[13px] text-[#1c2126] hover:bg-[#f4f5f6] transition-colors">
                          <span className={`w-3.5 h-3.5 border rounded flex items-center justify-center shrink-0 ${!hidden ? 'bg-[#2490ef] border-[#2490ef]' : 'border-[#d1d8dd]'}`}>
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
              <input ref={searchRef} type="text" placeholder={`Search ${doctype}…`} value={search} onChange={e => setSearch(e.target.value)}
                className="h-7 w-[260px] pl-7 pr-6 text-[13px] bg-white border border-[#d1d8dd] rounded focus:outline-none focus:border-[#2490ef] focus:ring-1 focus:ring-[#2490ef] transition-all placeholder-[#8d99a6]" />
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8d99a6]" />
              {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8d99a6] hover:text-[#525c66]"><X className="w-3 h-3" /></button>}
            </div>

            {/* Tag filters */}
            {tagFilters.map(tf => {
              const active = activeTags.has(tf.key);
              return (
                <button key={tf.key} onClick={() => toggleTag(tf.key)}
                  className={`h-7 px-2.5 flex items-center gap-1.5 rounded text-[12px] font-medium border transition-all ${
                    active ? 'bg-[#eff6ff] border-[#2490ef]/40 text-[#2490ef]' : 'bg-white border-[#d1d8dd] text-[#525c66] hover:bg-[#f4f5f6]'}`}>
                  {active && <Tag className="w-3 h-3" />}
                  {tf.label}
                  {tf.count !== undefined && <span className="ml-0.5 text-[10px] opacity-70">({tf.count})</span>}
                </button>
              );
            })}

            {(search || activeTags.size > 0 || activeStatFilter) && (
              <button onClick={() => { setSearch(''); setActiveTags(new Set()); setActiveStatFilter(null); }}
                className="h-7 px-2 flex items-center gap-1 text-[12px] text-[#525c66] hover:text-[#1c2126] transition-colors">
                <RefreshCw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            {sortKey && (
              <button onClick={() => setSortKey(null)}
                className="h-7 px-2 flex items-center gap-1 text-[12px] text-[#2490ef] hover:text-[#2081d6] transition-colors">
                <ArrowUpDown className="w-3 h-3" />{columns.find(c => c.key===sortKey)?.label}<X className="w-3 h-3" />
              </button>
            )}
            <span className="text-[13px] text-[#525c66] tabular-nums">
              {sorted.length === 0 ? '0 of 0' : `${startRow}–${endRow} of ${sorted.length}`}
            </span>
            <div className="flex border border-[#d1d8dd] rounded overflow-hidden">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={safePage<=1}
                className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] border-r border-[#d1d8dd] disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={safePage>=totalPages}
                className="h-7 px-2 bg-white hover:bg-[#f4f5f6] text-[#1c2126] disabled:opacity-40 transition-colors">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table or Kanban ── */}
      <div className="flex-1 overflow-auto p-4 pb-10">
        {viewMode === 'kanban' ? (
          <div className="flex gap-4 items-start h-full pb-4 min-w-full overflow-x-auto">
            {kanbanColumns.map(colName => {
              const colRows = sorted.filter(r => String((r as any)[statusField]??'').toUpperCase() === String(colName).toUpperCase());
              const badgeLabel = colName==='0'?'Draft':colName==='1'?'Submitted':colName==='2'?'Cancelled':colName;
              return (
                <div key={colName} className="w-[300px] shrink-0 bg-white/60 border border-[#d1d8dd] rounded-xl flex flex-col max-h-full shadow-sm">
                  <div className="p-3 bg-[#f4f5f6]/60 border-b border-[#d1d8dd] flex justify-between items-center shrink-0 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={String(colName).toUpperCase()} label={badgeLabel} />
                      <span className="text-xs font-black text-[#8d99a6] tabular-nums">({colRows.length})</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2.5 p-3 min-h-[350px]">
                    {colRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-[#8d99a6] border border-dashed border-[#d1d8dd] rounded-lg">
                        <EmptyIcon className="w-6 h-6 mb-1 opacity-30" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">Empty</span>
                      </div>
                    ) : colRows.map(row => (
                      <div key={row.id} onClick={() => onRowClick?.(row)}
                        className="bg-white p-3 border border-[#d1d8dd] hover:border-[#2490ef] hover:ring-1 hover:ring-[#2490ef]/30 rounded-lg hover:shadow-sm transition-all cursor-pointer group flex flex-col gap-2">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-[#1c2126] text-[13px] group-hover:text-[#2490ef] transition-colors truncate">{columns[0].render(row, currency)}</span>
                          <span className="text-[10px] font-mono text-[#8d99a6] shrink-0">{row.id.split('-').pop()}</span>
                        </div>
                        <div className="space-y-1 border-t border-[#d1d8dd]/50 pt-2">
                          {columns.slice(1,4).map(c => {
                            const rendered = c.render(row, currency);
                            if (!rendered) return null;
                            return (
                              <div key={c.key} className="flex items-center justify-between gap-1 text-[11px]">
                                <span className="text-[#8d99a6] font-medium truncate">{c.label}:</span>
                                <span className="text-[#525c66] font-bold truncate max-w-[160px] text-right">{rendered}</span>
                              </div>
                            );
                          })}
                        </div>
                        {/* Payment badge in Kanban */}
                        {(row as any).paymentStatus && (
                          <div className="pt-1 border-t border-[#d1d8dd]/30 flex items-center justify-between">
                            <StatusBadge status={(row as any).paymentStatus} />
                            {(row as any).agentName && <span className="text-[10px] text-[#8d99a6]">{(row as any).agentName}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#d1d8dd] rounded-lg shadow-sm flex flex-col" style={{ minWidth: 760 }}>
            {/* Table header */}
            <div className="flex items-center border-b border-[#d1d8dd] bg-[#f4f5f6] px-4 py-2.5 text-[11px] text-[#525c66] font-semibold uppercase tracking-wide select-none rounded-t-lg">
              <div className="w-8 flex shrink-0">
                <button onClick={toggleAll} className="text-[#525c66] hover:text-[#2490ef] transition-colors">
                  {allPageChecked ? <CheckSquare className="w-3.5 h-3.5 text-[#2490ef]" /> : <Square className="w-3.5 h-3.5" />}
                </button>
              </div>
              {visibleCols.map(col => {
                const canSort = !!col.sortValue;
                const isActive = sortKey === col.key;
                return (
                  <div key={col.key}
                    className={`${col.width ? '' : 'flex-1 min-w-0'} flex items-center gap-1 ${col.align==='right'?'justify-end':col.align==='center'?'justify-center':''} ${canSort ? 'cursor-pointer group hover:text-[#1c2126] transition-colors' : ''}`}
                    style={col.width ? { width: col.width, flexShrink: 0 } : {}}
                    onClick={canSort ? () => handleSort(col.key) : undefined}>
                    {col.label}
                    {canSort && (
                      <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
                        {isActive && sortDir==='asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                );
              })}
              {/* Duplicate spacer */}
              {onDuplicate && <div className="w-8 shrink-0" />}
              <div className="w-8 shrink-0" />
            </div>

            {/* Table body */}
            <div className="divide-y divide-[#d1d8dd]/50">
              {pageRows.length === 0 ? (
                <div className="px-4 py-16 flex flex-col items-center justify-center text-[#525c66]">
                  <EmptyIcon className="w-10 h-10 text-[#d1d8dd] mb-3" />
                  <p className="text-[13px] font-medium">{emptyMessage ?? `No ${doctype}s found`}</p>
                  {(search || activeTags.size > 0 || activeStatFilter) && (
                    <button onClick={() => { setSearch(''); setActiveTags(new Set()); setActiveStatFilter(null); }}
                      className="mt-3 text-[12px] text-[#2490ef] hover:underline">Clear filters</button>
                  )}
                </div>
              ) : pageRows.map(row => {
                const checked = checkedIds.has(row.id);
                const hovered = hoveredRowId === row.id;
                return (
                  <div key={row.id} onClick={() => onRowClick?.(row)}
                    onMouseEnter={() => setHoveredRowId(row.id)}
                    onMouseLeave={() => setHoveredRowId(null)}
                    className={`group flex items-center px-4 py-[8px] text-[13px] cursor-pointer transition-colors relative ${
                      checked ? 'bg-[#eff6ff]' : 'hover:bg-[#f4f5f6]'}`}>
                    {/* Checkbox */}
                    <div className="w-8 shrink-0" onClick={e => { e.stopPropagation(); toggleRow(row.id); }}>
                      <button className="text-[#525c66] hover:text-[#2490ef] transition-colors">
                        {checked ? <CheckSquare className="w-3.5 h-3.5 text-[#2490ef]" /> : <Square className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </button>
                    </div>

                    {visibleCols.map((col, ci) => (
                      <div key={col.key}
                        className={`${col.width ? 'shrink-0 pr-3' : 'flex-1 min-w-0'} ${col.align==='right'?'text-right tabular-nums':col.align==='center'?'text-center':''} truncate`}
                        style={col.width ? { width: col.width } : {}}>
                        {ci === 0 ? (
                          <span className="font-semibold text-[#1c2126] group-hover:text-[#2490ef] transition-colors truncate">{col.render(row, currency)}</span>
                        ) : (
                          <span className="text-[#525c66] truncate">{col.render(row, currency)}</span>
                        )}
                      </div>
                    ))}

                    {/* Duplicate button on hover */}
                    {onDuplicate && (
                      <div className="w-8 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); onDuplicate(row); }} title="Duplicate"
                          className="p-1 rounded text-[#8d99a6] hover:text-[#1c2126] hover:bg-[#eaecee] transition-all">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Open arrow */}
                    <div className="w-8 shrink-0 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); onRowClick?.(row); }} title="Open"
                        className="p-1 rounded text-[#8d99a6] hover:text-[#1c2126] hover:bg-[#eaecee] transition-all">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer pagination */}
            {sorted.length > pageSize && (
              <div className="border-t border-[#d1d8dd] px-4 py-2 flex items-center justify-between rounded-b-lg bg-[#f4f5f6]">
                <span className="text-[11px] text-[#525c66]">Page {safePage} of {totalPages}</span>
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_,i) => i+1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-6 h-6 rounded text-[11px] font-medium transition-colors ${p===safePage ? 'bg-[#2490ef] text-white' : 'text-[#525c66] hover:bg-[#eaecee]'}`}>
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
