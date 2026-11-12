import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { ApplicationEditor } from '@/components/loans/application-editor';

export const metadata: Metadata = { title: 'Loan application' };

/** One loan application: prepared here, checked by AgriCtec, sent to the lender. */
export default async function LoanApplicationPage({ params }: PageProps<'/loans/applications/[id]'>) {
  const { id } = await params;
  return (
    <FeatureGate flag="loans">
      <ApplicationEditor id={decodeURIComponent(id)} />
    </FeatureGate>
  );
}
