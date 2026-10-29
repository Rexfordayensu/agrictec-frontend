import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { ApplyConfirmModal } from '@/components/loans/apply-confirm-modal';
import { GhanaCardLock } from '@/components/loans/ghana-card-lock';
import { LoansHero } from '@/components/loans/loans-hero';
import { LoanWorkspace } from '@/components/loans/loan-workspace';

export const metadata: Metadata = { title: 'Loans & Credit' };

/**
 * Loan hub: credit summary on top, then tabs for building a loan, the credit score and
 * applications. `@container`: layouts respond to the content width, not the window.
 */
export default function LoansPage() {
  return (
    <FeatureGate flag="loans">
      <div className="@container space-y-4">
        <LoansHero />
        <GhanaCardLock />
        <LoanWorkspace />
        <ApplyConfirmModal />
      </div>
    </FeatureGate>
  );
}
