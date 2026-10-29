import {
  ADMIN_NAV_SECTIONS,
  findAdminNavItem,
  getAdminPageMeta,
} from '@/constants/admin-navigation';
import type { FarmerAccount, LoanApplication } from '@/types/admin';

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Section / page, plus the record on detail pages ("Farmers / All Farmers / Akosua Mensah").
 * Detail names come from the cached admin data; an unknown ID shows a short form of itself.
 */
export function adminBreadcrumbs(
  pathname: string,
  data: { farmers: FarmerAccount[]; applications: LoanApplication[] },
): Crumb[] {
  const item = findAdminNavItem(pathname);
  if (!item) return [{ label: getAdminPageMeta(pathname).title }];
  const section = ADMIN_NAV_SECTIONS.find((s) => s.items.includes(item));
  const crumbs: Crumb[] = section && section.title !== item.label ? [{ label: section.title }] : [];
  if (pathname === item.href) return [...crumbs, { label: item.label }];

  const id = decodeURIComponent(pathname.slice(item.href.length + 1).split('/')[0]);
  const detail =
    item.href === '/admin/settings'
      ? getAdminPageMeta(pathname).title
      : item.href === '/admin/farmers'
        ? data.farmers.find((f) => f.userId === id)?.profile.name
        : item.href === '/admin/loans'
          ? data.applications.find((a) => a.id === id)?.reference
          : undefined;
  return [
    ...crumbs,
    { label: item.label, href: item.href },
    { label: detail || (id.length > 12 ? `${id.slice(0, 8)}…` : id) },
  ];
}
