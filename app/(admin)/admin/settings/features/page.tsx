import type { Metadata } from 'next';
import { SystemSettings } from '@/components/admin/settings/system-settings';

export const metadata: Metadata = { title: 'Feature flags | System Settings' };

export default function FeatureFlagsPage() {
  return <SystemSettings section="features" />;
}
