import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { VerificationTable } from '@/components/admin/verifications/verification-table';
import AdminLoading from '@/app/(admin)/admin/loading';

export const metadata: Metadata = { title: 'Verifications' };

/**
 * Guarded by verifications.review (the service checks it again on every call). The queue keeps
 * its tab, filters and sort in the URL (useSearchParams), so it renders inside Suspense.
 */
export default function VerificationsPage() {
  return (
    <RequirePermission permission="verifications.review">
      <Suspense fallback={<AdminLoading />}>
        <VerificationTable />
      </Suspense>
    </RequirePermission>
  );
}
