'use client';

import { usePathname } from 'next/navigation';

/**
 * The console page's path, decoded. ADMIN_PATH may hold characters such as "$" that the browser
 * shows encoded ("%24"), while the console's own links (lib/admin-path.ts) hold them plainly:
 * comparing the two needs the decoded form (the active menu item, breadcrumbs, page titles).
 */
export function useAdminPathname(): string {
  const pathname = usePathname();
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}
