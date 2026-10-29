import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Demo data | System Settings' };

export default function DemoDataPage() {
  return <SystemSettings section="demo" />;
}
