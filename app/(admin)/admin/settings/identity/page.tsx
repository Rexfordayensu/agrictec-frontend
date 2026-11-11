import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Identity requirements | System Settings' };

export default function IdentityRequirementsPage() {
  return <SystemSettings section="identity" />;
}
