import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Plans | System Settings' };

export default function PlansPage() {
  return <SystemSettings section="plans" />;
}
