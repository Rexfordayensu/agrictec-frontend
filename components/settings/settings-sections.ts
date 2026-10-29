import {
  BadgeCheck,
  CreditCard,
  Info,
  ShieldCheck,
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

/** The pages inside Profile & Settings, in menu order. Each is its own route. */
export const SETTINGS_PAGES: SettingsPageMeta[] = [
  {
    href: '/settings/plans',
    label: 'Plans & billing',
    description: 'Compare plans and view your AI usage',
    icon: CreditCard,
  },
  {
    href: '/settings/profile',
    label: 'Profile',
    description: 'Who you are and what you farm',
    icon: UserRound,
  },
  {
    href: '/settings/verification',
    label: 'Verification',
    description: 'Checks that build lender trust',
    icon: BadgeCheck,
  },
  {
    href: '/settings/preferences',
    label: 'Preferences',
    description: 'Theme, language and alerts',
    icon: SlidersHorizontal,
  },
  {
    href: '/settings/account',
    label: 'Account & data',
    description: 'Your plan, backups and data',
    icon: ShieldCheck,
  },
  {
    href: '/settings/about',
    label: 'About',
    description: 'Version and how your data is stored',
    icon: Info,
  },
];
