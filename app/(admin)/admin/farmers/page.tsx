import { Suspense } from 'react';
import type { Metadata } from 'next';
import { FarmersTable } from '@/components/admin/farmers/farmers-table';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import AdminLoading from '@/app/(admin)/admin/loading';

export const metadata: Metadata = { title: 'All Farmers' };

/**
 * Guarded by farmers.view. The table keeps its filters in the URL (useSearchParams), so it
 * renders inside a Suspense boundary.
 */
export default function FarmersPage() {
  return (
    <RequirePermission permission="farmers.view">
      <Suspense fallback={<AdminLoading />}>
        <FarmersTable />
      </Suspense>
    </RequirePermission>
  );
}
