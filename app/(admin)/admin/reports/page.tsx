import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { ReportsCenter } from '@/components/admin/reports/reports-center';

export const metadata: Metadata = { title: 'Reports & Analytics' };

/** Guarded by reports.export (every export checks it again and is audited). */
export default function ReportsPage() {
  return (
    <RequirePermission permission="reports.export">
      <ReportsCenter />
    </RequirePermission>
  );
}
