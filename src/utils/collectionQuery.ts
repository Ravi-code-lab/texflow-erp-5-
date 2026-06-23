export type QueryFilter = { field: string; operator: string; value: any };
export type SortDirection = 'asc' | 'desc';

export function useCollection<T>(collection: string | T[], config: any) {
    const data = Array.isArray(collection) ? collection : [];
    return {
        items: data,
        data: data,
        loading: false,
        error: null,
        refetch: () => {},
        setSearch: (v: string) => {},
        setSort: (field: string, dir: SortDirection) => {},
        setFilters: (f: QueryFilter[]) => {},
        setPage: (p: number) => {},
        page: 1,
        pageCount: 1,
        total: data.length,
        pagination: {
            page: 1,
            totalPages: 1,
            next: () => {},
            prev: () => {}
        }
    };
}
