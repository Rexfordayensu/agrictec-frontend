import {
  BadgeDollarSign,
  Construction,
  DatabaseBackup,
  Skull,
  Sparkles,
  ToggleRight,
} from 'lucide-react';

export const SYSTEM_SETTINGS_SECTIONS = [
  {
    id: 'features',
    href: '/admin/settings/features',
    label: 'Feature flags',
    icon: ToggleRight,
    description: 'Choose which features farmers can use.',
  },
  {
    id: 'maintenance',
    href: '/admin/settings/maintenance',
    label: 'Maintenance',
    icon: Construction,
    description: 'Manage maintenance mode and the message farmers see.',
  },
  {
    id: 'plans',
    href: '/admin/settings/plans',
    label: 'Plans',
    icon: BadgeDollarSign,
    description: 'Manage subscription prices and included features.',
  },
  {
    id: 'backup',
    href: '/admin/settings/backup',
    label: 'Backup & restore',
    icon: DatabaseBackup,
    description: 'Download a platform backup or restore a saved backup.',
  },
  {
    id: 'demo',
    href: '/admin/settings/demo',
    label: 'Demo data',
    icon: Sparkles,
    description: 'Manage the demo data used to explore the platform.',
  },
  {
    id: 'danger',
    href: '/admin/settings/danger',
    label: 'Danger zone',
    icon: Skull,
    description: 'Manage permanent platform data deletion.',
  },
] as const;

export type SystemSettingsSection = (typeof SYSTEM_SETTINGS_SECTIONS)[number]['id'];
