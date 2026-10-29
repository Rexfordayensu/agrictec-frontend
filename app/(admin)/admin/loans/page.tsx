import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { LoanApplications } from '@/components/admin/loans/loan-applications';
import AdminLoading from '@/app/(admin)/admin/loading';

export const metadata: Metadata = { title: 'Loan Applications' };

/**
 * Guarded by loans.view; moving applications needs loans.manage (hidden otherwise, and checked
 * again by the service). Filters and the view live in the URL, so it renders inside Suspense.
 */
export default function LoansPage() {
  return (
    <RequirePermission permission="loans.view">
      <Suspense fallback={<AdminLoading />}>
        <LoanApplications />
      </Suspense>
    </RequirePermission>
  );
}
