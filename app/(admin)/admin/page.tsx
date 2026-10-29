import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { AdminOverview } from '@/components/admin/overview/admin-overview';

export const metadata: Metadata = { title: 'Overview' };

/** The admin overview dashboard. Guarded by overview.view (every staff role has it). */
export default function AdminOverviewPage() {
  return (
    <RequirePermission permission="overview.view">
      <AdminOverview />
    </RequirePermission>
  );
}
