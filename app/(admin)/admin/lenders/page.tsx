import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { LendersTable } from '@/components/admin/lenders/lenders-table';
import AdminLoading from '@/app/(admin)/admin/loading';

export const metadata: Metadata = { title: 'Lenders' };

/**
 * Guarded by lenders.manage (the service checks it again on every change). The table keeps its
 * search and sort in the URL (useSearchParams), so it renders inside Suspense.
 */
export default function LendersPage() {
  return (
    <RequirePermission permission="lenders.manage">
      <Suspense fallback={<AdminLoading />}>
        <LendersTable />
      </Suspense>
    </RequirePermission>
  );
}
