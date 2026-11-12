import type { Metadata } from 'next';
import { ApplicationReview } from '@/components/admin/applications/application-review';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Loan application' };

/** One farmer's application: tally, documents and the next step. Actions need loans.manage. */
export default async function ApplicationPage({ params }: PageProps<'/admin/applications/[id]'>) {
  const { id } = await params;
  return (
    <RequirePermission permission="loans.view">
      <ApplicationReview id={decodeURIComponent(id)} />
    </RequirePermission>
  );
}
