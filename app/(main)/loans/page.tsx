import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoansSkeleton, LoansView } from '@/components/loans/loans-view';
import { FeatureGate } from '@/components/shared/feature-gate';

export const metadata: Metadata = { title: 'Loans & Credit' };

/** Loan hub: where the farmer stands, then tabs for the AgriCtec score, lenders and applications. */
export default function LoansPage() {
  return (
    <FeatureGate flag="loans">
      {/* The open tab can come from ?tab= in the link. */}
      <Suspense fallback={<LoansSkeleton />}>
        <LoansView />
      </Suspense>
    </FeatureGate>
  );
}
