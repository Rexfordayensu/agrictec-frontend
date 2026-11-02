import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Error alerts | System Settings' };

export default function ErrorAlertsPage() {
  return <SystemSettings section="alerts" />;
}
