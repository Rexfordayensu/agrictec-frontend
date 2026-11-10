'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import type { AdminTableState, SortDir, TableSort } from '@/hooks/admin/use-admin-table';
import { useDebounce } from '@/hooks/use-debounce';
import { replaceQuery } from '@/lib/url-state';

/** What the API answers for one page. */
export interface ServerPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ServerTableOptions<T, P extends ServerPage<T>> {
  getRowId: (row: T) => string;
  /** URL parameter names the API filters on (as in the table's URL: ?region=&status=…). */
  filterNames: readonly string[];
  /** Loads one page for these parameters (q, the filters, sort, dir, page, pageSize). */
  fetchPage: (params: Record<string, string>, signal: AbortSignal) => Promise<P>;
  initialSort: TableSort;
  pageSize?: number;
  canSelect?: (row: T) => boolean;
  /** Changes to reload the page with the same parameters (after an edit, another tab…). */
  reloadKey?: unknown;
}

/**
 * useAdminTable's state for a table the API searches, filters, sorts and pages: the browser only
 * ever holds the page on screen. Same URL parameters and the same returned shape, so the table,
 * filters and bulk actions work unchanged. `filteredRows` is the current page only (ask the API
 * for every matching ID when exporting everything).
 */
export function useServerTable<T, P extends ServerPage<T>>(options: ServerTableOptions<T, P>) {
  const {
    getRowId,
    filterNames,
    fetchPage,
    initialSort,
    pageSize = 25,
    canSelect = () => true,
    reloadKey,
  } = options;
  const pathname = usePathname();
  const params = useSearchParams();

  function updateParams(changes: Record<string, string | null>, resetPage = true): void {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete('page');
    replaceQuery(pathname, next);
  }

  const [query, setQuery] = useState(() => params.get('q') ?? '');
  const debouncedQuery = useDebounce(query, 250);
  const urlQuery = params.get('q') ?? '';
  useEffect(() => {
    if (debouncedQuery === urlQuery) return;
    const next = new URLSearchParams(params.toString());
    if (debouncedQuery) next.set('q', debouncedQuery);
    else next.delete('q');
    next.delete('page');
    replaceQuery(pathname, next);
  }, [debouncedQuery, urlQuery, params, pathname]);

  const filterValues: Record<string, string> = Object.fromEntries(
    filterNames.map((name) => [name, params.get(name) ?? '']),
  );
  const setFilter = (name: string, value: string | null) => updateParams({ [name]: value });
  const clearFilters = () => {
    setQuery('');
    updateParams({ q: null, ...Object.fromEntries(filterNames.map((name) => [name, null])) });
  };

  const sortKey = params.get('sort');
  const sort: TableSort = sortKey
    ? { key: sortKey, dir: params.get('dir') === 'desc' ? 'desc' : 'asc' }
    : initialSort;
  const setSort = (key: string, dir?: SortDir) => {
    const nextDir = dir ?? (sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc');
    updateParams({ sort: key, dir: nextDir }, false);
  };
  const requestedPage = Math.max(1, Number(params.get('page')) || 1);

  // What the API is asked for: exactly the URL's state.
  const request: Record<string, string> = {
    ...Object.fromEntries(Object.entries(filterValues).filter(([, value]) => value)),
    ...(urlQuery && { q: urlQuery }),
    sort: sort.key,
    dir: sort.dir,
    page: String(requestedPage),
    pageSize: String(pageSize),
  };
  const requestKey = JSON.stringify(request);

  const [result, setResult] = useState<{ key: string; data: P | null; error: string | null }>({
    key: '',
    data: null,
    error: null,
  });
  useEffect(() => {
    const controller = new AbortController();
    fetchPage(JSON.parse(requestKey) as Record<string, string>, controller.signal).then(
      (data) => setResult({ key: requestKey, data, error: null }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        setResult((current) => ({
          key: requestKey,
          data: current.data,
          error: error instanceof Error ? error.message : 'Could not load this list.',
        }));
      },
    );
    return () => controller.abort();
    // fetchPage is a stable service call; the request and reloadKey decide when to reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey, reloadKey]);

  const data = result.data;
  const pageRows = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;
  const page = data?.page ?? requestedPage;
  const setPage = (next: number) => updateParams({ page: next > 1 ? String(next) : null }, false);

  // Selection holds whole rows (other pages aren't in memory), forgetting none on paging.
  const [selectedMap, setSelectedMap] = useState<ReadonlyMap<string, T>>(() => new Map());
  const selected: ReadonlySet<string> = new Set(selectedMap.keys());
  const selectedRows = [...selectedMap.values()];
  const toggle = (id: string) =>
    setSelectedMap((current) => {
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else {
        const row = pageRows.find((r) => getRowId(r) === id);
        if (row && canSelect(row)) next.set(id, row);
      }
      return next;
    });
  const selectable = pageRows.filter(canSelect);
  const pageIds = selectable.map(getRowId);
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedMap.has(id));
  const toggleAllOnPage = () =>
    setSelectedMap((current) => {
      const next = new Map(current);
      for (const row of selectable) {
        const id = getRowId(row);
        if (allOnPageSelected) next.delete(id);
        else next.set(id, row);
      }
      return next;
    });
  const clearSelection = () => setSelectedMap(new Map());

  const state: AdminTableState<T> = {
    query,
    setQuery,
    filters: filterValues,
    setFilter,
    clearFilters,
    sort,
    setSort,
    page,
    setPage,
    pageCount,
    pageSize,
    pageRows,
    filteredRows: pageRows,
    total,
    selected,
    selectedRows,
    allOnPageSelected,
    toggle,
    toggleAllOnPage,
    clearSelection,
    canSelect,
    anySelectableOnPage: pageIds.length > 0,
  };
  return {
    table: state,
    /** The whole answer (with any extras the API adds, e.g. counts and filter options). */
    data,
    loading: result.key !== requestKey,
    error: result.key === requestKey ? result.error : null,
    /** The parameters of the page on screen (to ask the API for everything matching). */
    request,
  };
}
