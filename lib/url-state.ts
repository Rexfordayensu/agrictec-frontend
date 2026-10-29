/**
 * Replaces the address bar's query (filters, tabs, sort, page) without a navigation.
 *
 * Next.js syncs useSearchParams and usePathname with native history calls, so the UI updates at
 * once with no server round trip. (A router.replace per change fetched the route again; quick
 * changes overlapped and could leave a segment suspended mid-render.)
 */
export function replaceQuery(pathname: string, query: URLSearchParams | string): void {
  const search = query.toString();
  window.history.replaceState(null, '', search ? `${pathname}?${search}` : pathname);
}
