import {
  ShieldCheck as VerifyIcon,
  CreditCard,
  Database,
  Info,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export interface SettingsPageMeta {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * The pages inside Profile & Settings, in menu order. Each is its own route; /settings opens
 * the first one (Profile).
 */
export const SETTINGS_PAGES: SettingsPageMeta[] = [
  {
    href: '/settings/profile',
    label: 'Profile',
    description: 'Your personal and farm information',
    icon: UserRound,
  },
  {
    href: '/settings/verification',
    label: 'Verification',
    description: 'Verify your identity and farm',
    icon: VerifyIcon,
  },
  {
    href: '/settings/preferences',
    label: 'Preferences',
    description: 'App settings, alerts and language',
    icon: SlidersHorizontal,
  },
  {
    href: '/settings/plans',
    label: 'Plans & Billing',
    description: 'Your plan, credits and payments',
    icon: CreditCard,
  },
  {
    href: '/settings/account',
    label: 'Account & Data',
    description: 'Backups, export and delete account',
    icon: Database,
  },
  {
    href: '/settings/about',
    label: 'About',
    description: 'What AgriCtec is and our policies',
    icon: Info,
  },
];
