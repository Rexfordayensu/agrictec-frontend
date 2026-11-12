import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ApplicationsReview } from '@/components/admin/applications/applications-review';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import AdminLoading from '@/app/(admin)/admin/loading';

export const metadata: Metadata = { title: 'Loan Applications' };

/** Farmers' applications by stage (the stage is in the URL, so this renders inside Suspense). */
export default function ApplicationsPage() {
  return (
    <RequirePermission permission="loans.view">
      <Suspense fallback={<AdminLoading />}>
        <ApplicationsReview />
      </Suspense>
    </RequirePermission>
  );
}
