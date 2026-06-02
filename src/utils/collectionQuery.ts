import { useState, useMemo, useCallback, useEffect } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface QueryFilter<T = any> {
  field: keyof T;
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'startsWith';
  value: any;
}

export interface CollectionOptions<T> {
  filters?: QueryFilter<T>[];
  sortField?: keyof T;
  sortDir?: SortDirection;
  pageSize?: number;
}

// Global in-memory store keyed by collection name
const store: Record<string, any[]> = {};
const listeners: Record<string, Set<() => void>> = {};

function notify(key: string) {
  listeners[key]?.forEach((fn) => fn());
}

function applyFilter<T extends Record<string, any>>(item: T, filter: QueryFilter<T>): boolean {
  const val = item[filter.field as string];
  const fv = filter.value;
  switch (filter.op) {
    case 'eq': return val == fv;
    case 'neq': return val != fv;
    case 'gt': return val > fv;
    case 'lt': return val < fv;
    case 'gte': return val >= fv;
    case 'lte': return val <= fv;
    case 'contains': return String(val ?? '').toLowerCase().includes(String(fv).toLowerCase());
    case 'startsWith': return String(val ?? '').toLowerCase().startsWith(String(fv).toLowerCase());
    default: return true;
  }
}

/**
 * React hook for client-side filtering, sorting, and pagination of a named collection.
 * Mirrors the API expected by GenericListPage.
 */
export function useCollection<T extends Record<string, any>>(
  collectionKey: string,
  options: CollectionOptions<T> = {}
) {
  const { sortField, sortDir = 'desc', pageSize = 50 } = options;

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<QueryFilter<T>[]>(options.filters ?? []);
  const [, forceUpdate] = useState(0);

  // Subscribe to external store mutations
  useEffect(() => {
    if (!listeners[collectionKey]) listeners[collectionKey] = new Set();
    const fn = () => forceUpdate((n) => n + 1);
    listeners[collectionKey].add(fn);
    return () => { listeners[collectionKey].delete(fn); };
  }, [collectionKey]);

  const allData: T[] = store[collectionKey] ?? [];

  const filtered = useMemo(() => {
    let result = allData.filter((item) => !item.deleted);
    for (const f of filters) {
      result = result.filter((item) => applyFilter(item, f));
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = a[sortField as string];
        const bv = b[sortField as string];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [allData, filters, sortField, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const refetch = useCallback(() => forceUpdate((n) => n + 1), []);

  return {
    data: paged,
    total: filtered.length,
    page,
    pageCount,
    totalPages: pageCount,
    loading: false,
    error: null,
    setPage,
    setFilters,
    refetch,
  };
}

/** Seed or replace the entire collection (e.g. from IndexedDB hydration). */
export function setCollection<T>(key: string, data: T[]) {
  store[key] = data as any[];
  notify(key);
}
