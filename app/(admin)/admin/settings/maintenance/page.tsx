import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Maintenance | System Settings' };

export default function MaintenancePage() {
  return <SystemSettings section="maintenance" />;
}
