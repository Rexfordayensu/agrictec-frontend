import { SYSTEM_SETTINGS_SECTIONS } from '@/constants/admin-settings';
import {
  LayoutDashboard,
  Users,
  BadgeCheck,
  ShieldAlert,
  ClipboardList,
  Landmark,
  SlidersHorizontal,
  Store,
  CloudSun,
  Wheat,
  Bot,
  Stethoscope,
  Megaphone,
  ChartColumn,
  UserCog,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import { can } from '@/lib/admin/permissions';
import type { Permission, Role } from '@/types/admin';

export type AdminBadgeKey = 'pendingVerifications' | 'openRisk' | 'newApplications';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** The item is hidden, and its pages show <NoAccess />, without this permission. */
  permission: Permission;
  /** Count shown next to the label. */
  badgeKey?: AdminBadgeKey;
  /** Active only on `href` itself, not its nested routes (for /admin, the parent of every page). */
  exact?: boolean;
}

export interface AdminNavSection {
  title: string;
  items: AdminNavItem[];
}

export const ADMIN_HOME = '/admin';

/** Admin spec Section 7. */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        label: 'Dashboard',
        href: ADMIN_HOME,
        icon: LayoutDashboard,
        permission: 'overview.view',
        exact: true,
      },
    ],
  },
  {
    title: 'Farmers',
    items: [
      { label: 'All Farmers', href: '/admin/farmers', icon: Users, permission: 'farmers.view' },
      {
        label: 'Verifications',
        href: '/admin/verifications',
        icon: BadgeCheck,
        permission: 'verifications.review',
        badgeKey: 'pendingVerifications',
      },
      {
        label: 'Risk & Fraud',
        href: '/admin/risk',
        icon: ShieldAlert,
        permission: 'risk.review',
        badgeKey: 'openRisk',
      },
    ],
  },
  {
    title: 'Lending',
    items: [
      {
        label: 'Loan Applications',
        href: '/admin/loans',
        icon: ClipboardList,
        permission: 'loans.view',
        badgeKey: 'newApplications',
      },
      { label: 'Lenders', href: '/admin/lenders', icon: Landmark, permission: 'lenders.manage' },
      {
        label: 'Credit Rules',
        href: '/admin/credit-rules',
        icon: SlidersHorizontal,
        permission: 'credit.configure',
      },
    ],
  },
  {
    title: 'Content',
    items: [
      {
        label: 'Market Price Management',
        href: '/admin/content/market',
        icon: Store,
        permission: 'content.manage',
      },
      {
        label: 'Weather',
        href: '/admin/content/weather',
        icon: CloudSun,
        permission: 'content.manage',
      },
      {
        label: 'Crops & Yields',
        href: '/admin/content/crops',
        icon: Wheat,
        permission: 'content.manage',
      },
      {
        label: 'AI Assistant',
        href: '/admin/content/assistant',
        icon: Bot,
        permission: 'content.manage',
      },
      {
        label: 'Crop Diagnoses',
        href: '/admin/content/diagnoses',
        icon: Stethoscope,
        permission: 'content.manage',
      },
      {
        label: 'Announcements',
        href: '/admin/announcements',
        icon: Megaphone,
        permission: 'announcements.send',
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        label: 'Reports & Analytics',
        href: '/admin/reports',
        icon: ChartColumn,
        permission: 'reports.export',
      },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Team & Roles', href: '/admin/team', icon: UserCog, permission: 'admins.manage' },
      { label: 'Audit Log', href: '/admin/audit-log', icon: ScrollText, permission: 'audit.view' },
      {
        label: 'System Settings',
        href: '/admin/settings',
        icon: Settings,
        permission: 'settings.manage',
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((s) => s.items);

/** Title and subtitle per admin route. Nested routes (e.g. /admin/farmers/[id]) use their parent's. */
export const ADMIN_PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/admin': {
    title: 'Overview',
    subtitle: 'Platform health, growth and activity at a glance.',
  },
  '/admin/farmers': {
    title: 'All Farmers',
    subtitle: 'Search, filter and manage every farmer account.',
  },
  '/admin/verifications': {
    title: 'Verifications',
    subtitle: 'Approve or reject phone, location and Ghana Card checks.',
  },
  '/admin/risk': {
    title: 'Risk & Fraud',
    subtitle: 'Review suspicious activity flagged by the detection rules.',
  },
  '/admin/loans': {
    title: 'Loan Applications',
    subtitle: 'Move applications through review, approval and repayment.',
  },
  '/admin/lenders': {
    title: 'Lenders',
    subtitle: 'Manage lending partners, their rates and limits.',
  },
  '/admin/credit-rules': {
    title: 'Credit Rules',
    subtitle: 'Tune credit score weights, bands and loan eligibility.',
  },
  '/admin/content/market': {
    title: 'Market Price Management',
    subtitle: 'Review and publish source-backed Ghana crop prices.',
  },
  '/admin/content/weather': {
    title: 'Weather',
    subtitle: 'View weather for your current location or another place in Ghana.',
  },
  '/admin/content/crops': {
    title: 'Crops & Yields',
    subtitle: 'Edit crop yields, prices and growing tips.',
  },
  '/admin/content/assistant': {
    title: 'AI Assistant',
    subtitle: 'Manage the keywords and replies the assistant uses.',
  },
  '/admin/content/diagnoses': {
    title: 'Crop Diagnoses',
    subtitle: 'Manage the diseases and treatments the crop doctor reports.',
  },
  '/admin/announcements': {
    title: 'Announcements',
    subtitle: 'Send banners to all farmers, or by region or crop.',
  },
  '/admin/reports': {
    title: 'Reports & Analytics',
    subtitle: 'Platform-wide analytics and data exports.',
  },
  '/admin/team': {
    title: 'Team & Roles',
    subtitle: 'Invite staff and control what each role can do.',
  },
  '/admin/audit-log': {
    title: 'Audit Log',
    subtitle: 'An append-only record of every admin action.',
  },
  '/admin/settings': {
    title: 'System Settings',
    subtitle: 'Feature flags, maintenance mode, plans and backups.',
  },
  ...Object.fromEntries(
    SYSTEM_SETTINGS_SECTIONS.map((section) => [
      section.href,
      { title: section.label, subtitle: section.description },
    ]),
  ),
};

/** True when `pathname` is the item's page or, unless `exact`, one of its nested routes. */
export function isAdminNavActive(pathname: string, item: AdminNavItem): boolean {
  return pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`));
}

/** The nav item a route belongs to (the most specific match), or undefined outside the nav. */
export function findAdminNavItem(pathname: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.filter((item) => isAdminNavActive(pathname, item)).sort(
    (a, b) => b.href.length - a.href.length,
  )[0];
}

/** Page meta for a route, falling back to its nearest parent route that has meta. */
export function getAdminPageMeta(pathname: string): { title: string; subtitle: string } {
  for (
    let path = pathname;
    path.startsWith(ADMIN_HOME);
    path = path.slice(0, path.lastIndexOf('/'))
  ) {
    const meta = ADMIN_PAGE_META[path];
    if (meta) return meta;
  }
  return ADMIN_PAGE_META[ADMIN_HOME];
}

/** The sections and items a role may see. Sections with no visible items are dropped. */
export function getAdminNavForRole(role: Role | null | undefined): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(role, item.permission)),
  })).filter((section) => section.items.length > 0);
}
