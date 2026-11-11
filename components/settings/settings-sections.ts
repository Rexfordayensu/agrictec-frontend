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

/**
 * The pages inside Profile & Settings, in menu order. Each is its own route; /settings opens
 * the first one (Profile).
 */
export const SETTINGS_PAGES: SettingsPageMeta[] = [
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
    href: '/settings/plans',
    label: 'Plans & billing',
    description: 'Your plan and AI credits',
    icon: CreditCard,
  },
  {
    href: '/settings/account',
    label: 'Account & data',
    description: 'Sign-in, backups and your data',
    icon: ShieldCheck,
  },
  {
    href: '/settings/about',
    label: 'About',
    description: 'What AgriCtec is and our policies',
    icon: Info,
  },
];
