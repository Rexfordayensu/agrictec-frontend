import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { ApplicationDetail } from '@/components/admin/loans/application-detail';

export const metadata: Metadata = { title: 'Loan application' };

/** One application. Guarded by loans.view; status changes need loans.manage. */
export default async function LoanDetailPage({ params }: PageProps<'/admin/loans/[id]'>) {
  const { id } = await params;
  return (
    <RequirePermission permission="loans.view">
      <ApplicationDetail id={id} />
    </RequirePermission>
  );
}
