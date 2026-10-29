import {
  LayoutDashboard,
  Leaf,
  Smartphone,
  FileText,
  Bot,
  Stethoscope,
  Wheat,
  HandCoins,
  Store,
  CloudSun,
  UserCog,
  UserRound,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import type { FeatureFlags, FeatureKey } from '@/types/admin';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefix that counts as this item being active, when wider than `href`. */
  match?: string;
  /** The admin feature flag that switches this page on or off. */
  flag?: FeatureKey;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Farm Records', href: '/records', icon: Leaf },
      { label: 'MoMo Transactions', href: '/momo', icon: Smartphone },
      { label: 'Financial Reports', href: '/reports', icon: FileText },
    ],
  },
  {
    title: 'AI Powered',
    items: [
      { label: 'AI Assistant', href: '/assistant', icon: Bot, flag: 'aiAssistant' },
      { label: 'AI Crop Doctor', href: '/crop-doctor', icon: Stethoscope, flag: 'cropDoctor' },
      {
        label: 'AI Yield Predictor',
        href: '/yield-predictor',
        icon: Wheat,
        flag: 'yieldPredictor',
      },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Loans & Credit', href: '/loans', icon: HandCoins, flag: 'loans' },
      { label: 'Market Prices', href: '/market', icon: Store, flag: 'market' },
      { label: 'Weather', href: '/weather', icon: CloudSun, flag: 'market' },
    ],
  },
  {
    title: 'Account',
    items: [
      // Links straight to the first settings page: /settings is only a redirect, and
      // following it cost a second navigation. Active on every /settings/* page.
      { label: 'Profile & Settings', href: '/settings/profile', match: '/settings', icon: UserCog },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Welcome. Start building your digital financial identity.',
  },
  '/records': {
    title: 'Farm Records',
    subtitle: 'Track crops, activities, income and expenses.',
  },
  '/momo': {
    title: 'MoMo Transactions',
    subtitle: 'All your MoMo inflows and outflows.',
  },
  '/reports': {
    title: 'Financial Reports',
    subtitle: 'Generate income, expense, loan and tax reports you can share with lenders.',
  },
  '/assistant': {
    title: 'AI Assistant',
    subtitle: 'Ask anything about farming, finance and loans.',
  },
  '/crop-doctor': {
    title: 'AI Crop Doctor',
    subtitle: 'Upload a photo of your crop to detect diseases and get treatment advice.',
  },
  '/yield-predictor': {
    title: 'AI Yield Predictor',
    subtitle: 'Estimate your harvest and expected revenue before the season ends.',
  },
  '/loans': {
    title: 'Loans & Credit',
    subtitle: 'Check your credit score, compare lenders and apply for farm loans.',
  },
  '/market': {
    title: 'Market Prices',
    subtitle: 'Compare source-backed crop prices across Ghana.',
  },
  '/weather': {
    title: 'Weather',
    subtitle: 'Choose your location to view weather conditions and forecasts.',
  },
  '/settings': {
    title: 'Profile & Settings',
    subtitle: 'Manage your profile, verification, preferences and data.',
  },
};

/** True when `pathname` is the item's page or one of its nested routes. */
export const isNavActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

/** Whether a nav item is the current section (its `match` prefix, or else its `href`). */
export const isItemActive = (pathname: string, item: NavItem) =>
  isNavActive(pathname, item.match ?? item.href);

/** Mobile bottom bar: four direct destinations; the Menu button sits in the middle. */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Records', href: '/records', icon: Leaf },
  { label: 'Crop Doctor', href: '/crop-doctor', icon: Stethoscope, flag: 'cropDoctor' },
  { label: 'Profile', href: '/settings/profile', icon: UserRound },
];

/**
 * The mobile Menu sheet: every page not in the bottom bar, in sidebar order. The bar's
 * Profile opens the Profile settings page, so Settings here opens the Preferences page.
 */
export const MOBILE_MENU_ITEMS: NavItem[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items).filter(
    // Skip pages the bar already covers, including Settings, whose Profile page is in the bar.
    (item) =>
      !MOBILE_PRIMARY_NAV.some(
        (primary) => primary.href === item.href || primary.href.startsWith(`${item.href}/`),
      ),
  ),
  { label: 'Settings', href: '/settings/preferences', icon: Settings },
];

/** Whether a nav item's feature is switched on (items without a flag always are). */
export const isNavEnabled = (item: NavItem, flags: FeatureFlags) => !item.flag || flags[item.flag];

/** The sidebar sections with switched-off features removed (and any section left empty). */
export const enabledNavSections = (flags: FeatureFlags): NavSection[] =>
  NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => isNavEnabled(item, flags)),
  })).filter((section) => section.items.length > 0);

/**
 * The mobile bar and menu for the current flags. A switched-off bar destination is replaced by
 * the first enabled menu page, so the bar always keeps four destinations around the Menu button.
 */
export function mobileNavFor(flags: FeatureFlags): { primary: NavItem[]; menu: NavItem[] } {
  const menu = MOBILE_MENU_ITEMS.filter((item) => isNavEnabled(item, flags));
  const primary = MOBILE_PRIMARY_NAV.map((item) => {
    if (isNavEnabled(item, flags)) return item;
    return menu.shift() ?? null;
  }).filter((item): item is NavItem => item !== null);
  return { primary, menu };
}
