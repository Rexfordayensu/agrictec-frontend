import type { Metadata } from 'next';
import { AuditLogView } from '@/components/admin/audit-log/audit-log-view';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Audit Log' };

/** Guarded by audit.view. Read-only: the log has no edit or delete anywhere. */
export default function AuditLogPage() {
  return (
    <RequirePermission permission="audit.view">
      <AuditLogView />
    </RequirePermission>
  );
}
