import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Danger zone | System Settings' };

export default function DangerZonePage() {
  return <SystemSettings section="danger" />;
}
