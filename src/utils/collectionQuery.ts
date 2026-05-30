/**
 * collectionQuery.ts — ERPNext-Style Generic Query Layer
 * ────────────────────────────────────────────────────────
 * Drop this file into src/utils/ alongside your existing indexedDB.ts.
 * Import queryCollection() and useCollection() anywhere in the app.
 *
 * Works transparently in all three modes:
 *   - Electron server  → reads from IndexedDB (already hydrated from vault)
 *   - LAN browser      → reads from vault snapshot cache via networkClient
 *   - Dev / web        → reads from IndexedDB fallback
 *
 * No changes needed to indexedDB.ts or networkClient.tsx.
 */

import { getItem } from './indexedDB';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SortDirection = 'asc' | 'desc';

export interface QueryFilter<T> {
  /** Field name to filter on */
  field: keyof T;
  /** Operator */
  op: 'eq' | 'neq' | 'contains' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn';
  /** Value to compare against */
  value: unknown;
}

export interface QueryOptions<T> {
  /** Array of filter conditions (AND-joined) */
  filters?: QueryFilter<T>[];
  /** Field to sort by */
  sortField?: keyof T;
  sortDir?: SortDirection;
  /** Pagination — 1-based page number */
  page?: number;
  /** Rows per page (default 50) */
  pageSize?: number;
  /** If true, include soft-deleted records (deleted: true) */
  includeDeleted?: boolean;
}

export interface QueryResult<T> {
  data: T[];
  total: number;      // total matching rows (before pagination)
  page: number;
  pageSize: number;
  pageCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter engine
// ─────────────────────────────────────────────────────────────────────────────

function applyFilter<T>(record: T, filter: QueryFilter<T>): boolean {
  const raw = (record as any)[filter.field as string];
  const val = filter.value;

  switch (filter.op) {
    case 'eq':
      return raw === val;
    case 'neq':
      return raw !== val;
    case 'contains':
      return typeof raw === 'string' &&
        raw.toLowerCase().includes(String(val).toLowerCase());
    case 'gt':
      return raw > (val as number);
    case 'lt':
      return raw < (val as number);
    case 'gte':
      return raw >= (val as number);
    case 'lte':
      return raw <= (val as number);
    case 'in':
      return Array.isArray(val) && val.includes(raw);
    case 'notIn':
      return Array.isArray(val) && !val.includes(raw);
    default:
      return true;
  }
}

function applyAllFilters<T>(record: T, filters: QueryFilter<T>[]): boolean {
  return filters.every(f => applyFilter(record, f));
}

// ─────────────────────────────────────────────────────────────────────────────
// Core query function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * queryCollection — ERPNext-style list query on any collection key.
 *
 * @param key        The storage key (e.g. 'orders', 'inventory', 'customers')
 * @param options    Filters, sort, and pagination options
 * @returns          QueryResult with paginated data and total count
 *
 * @example
 * const result = await queryCollection<Order>('orders', {
 *   filters: [
 *     { field: 'status', op: 'eq', value: 'CONFIRMED' },
 *     { field: 'customerName', op: 'contains', value: 'Sharma' },
 *   ],
 *   sortField: 'orderDate',
 *   sortDir: 'desc',
 *   page: 1,
 *   pageSize: 20,
 * });
 */
export async function queryCollection<T extends { id?: string; deleted?: boolean }>(
  key: string,
  options: QueryOptions<T> = {}
): Promise<QueryResult<T>> {
  const {
    filters = [],
    sortField,
    sortDir = 'desc',
    page = 1,
    pageSize = 50,
    includeDeleted = false,
  } = options;

  // Load the raw collection from storage (IndexedDB or LAN vault)
  const raw = await getItem<T[]>(key);
  let records: T[] = Array.isArray(raw) ? raw : [];

  // Strip soft-deleted unless requested
  if (!includeDeleted) {
    records = records.filter(r => !(r as any).deleted);
  }

  // Apply filters
  if (filters.length > 0) {
    records = records.filter(r => applyAllFilters(r, filters));
  }

  const total = records.length;

  // Sort
  if (sortField) {
    const dir = sortDir === 'asc' ? 1 : -1;
    records = [...records].sort((a, b) => {
      const av = (a as any)[sortField as string] ?? '';
      const bv = (b as any)[sortField as string] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }

  // Paginate
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);
  const start = (safePage - 1) * pageSize;
  const data = records.slice(start, start + pageSize);

  return { data, total, page: safePage, pageSize, pageCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience helpers (mirrors ERPNext frappe.db.get_list style)
// ─────────────────────────────────────────────────────────────────────────────

/** Get a single record by id from any collection */
export async function getDoc<T extends { id: string }>(
  key: string,
  id: string
): Promise<T | null> {
  const raw = await getItem<T[]>(key);
  const records: T[] = Array.isArray(raw) ? raw : [];
  return records.find(r => r.id === id) ?? null;
}

/** Count records matching a set of filters */
export async function countDocs<T extends { deleted?: boolean }>(
  key: string,
  filters: QueryFilter<T>[] = []
): Promise<number> {
  const result = await queryCollection<T>(key, { filters, pageSize: 1 });
  return result.total;
}

/** Get distinct values for a field (like a GROUP BY) */
export async function distinctValues<T>(
  key: string,
  field: keyof T
): Promise<unknown[]> {
  const raw = await getItem<T[]>(key);
  const records: T[] = Array.isArray(raw) ? raw : [];
  const seen = new Set<unknown>();
  records.forEach(r => {
    const v = (r as any)[field as string];
    if (v !== undefined && v !== null && v !== '') seen.add(v);
  });
  return Array.from(seen).sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { onDataPush } from './networkClient';

interface UseCollectionState<T> extends QueryResult<T> {
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setPage: (page: number) => void;
  setFilters: (filters: QueryFilter<T>[]) => void;
  setSortField: (field: keyof T | undefined, dir?: SortDirection) => void;
}

/**
 * useCollection — React hook for ERPNext-style live list queries.
 *
 * Automatically re-fetches when:
 *   - options change (filters, sort, page)
 *   - a WebSocket data push arrives for this key (LAN mode)
 *
 * @example
 * const { data, total, loading, setPage, setFilters } = useCollection<Order>('orders', {
 *   filters: [{ field: 'status', op: 'eq', value: 'CONFIRMED' }],
 *   sortField: 'orderDate',
 *   sortDir: 'desc',
 * });
 */
export function useCollection<T extends { id?: string; deleted?: boolean }>(
  key: string,
  initialOptions: QueryOptions<T> = {}
): UseCollectionState<T> {
  const [options, setOptions] = useState<QueryOptions<T>>(initialOptions);
  const [result, setResult] = useState<QueryResult<T>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: initialOptions.pageSize ?? 50,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const fetch = useCallback(async (opts: QueryOptions<T>) => {
    const id = ++fetchId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await queryCollection<T>(key, opts);
      // Discard stale responses
      if (id === fetchId.current) {
        setResult(res);
      }
    } catch (e: any) {
      if (id === fetchId.current) setError(e?.message ?? 'Query failed');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [key]);

  // Initial load + re-fetch on options change
  useEffect(() => {
    fetch(options);
  }, [fetch, options]);

  // LAN WebSocket push — refetch when server pushes an update for this key
  useEffect(() => {
    const unsub = onDataPush((pushedKey) => {
      if (pushedKey === key || pushedKey === '__reconnect__') {
        fetch(options);
      }
    });
    return unsub;
  }, [key, fetch, options]);

  const refetch = useCallback(() => fetch(options), [fetch, options]);

  const setPage = useCallback((page: number) => {
    setOptions(prev => ({ ...prev, page }));
  }, []);

  const setFilters = useCallback((filters: QueryFilter<T>[]) => {
    setOptions(prev => ({ ...prev, filters, page: 1 }));
  }, []);

  const setSortField = useCallback(
    (field: keyof T | undefined, dir: SortDirection = 'desc') => {
      setOptions(prev => ({ ...prev, sortField: field, sortDir: dir, page: 1 }));
    },
    []
  );

  return { ...result, loading, error, refetch, setPage, setFilters, setSortField };
}
