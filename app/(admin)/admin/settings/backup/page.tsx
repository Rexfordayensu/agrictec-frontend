import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Backup & restore | System Settings' };

export default function BackupPage() {
  return <SystemSettings section="backup" />;
}
