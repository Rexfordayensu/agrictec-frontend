'use client';

import { CreditProfileCard } from '@/components/loans/credit-profile-card';
import { LoanApplicationForm } from '@/components/loans/loan-application-form';
import { LoanJourney } from '@/components/loans/loan-journey';
import { MyApplications } from '@/components/loans/my-applications';
import { ScoreLadder } from '@/components/loans/score-ladder';
import { Tabs } from '@/components/ui/tabs';
import { useLoanStore, type LoanTab } from '@/store/loan-store';

const ID = 'loan-workspace';

/**
 * The three jobs on this page as tabs: build a loan, understand the credit score, track
 * applications. Panels stay mounted (only hidden), so the loan being built survives a tab
 * switch.
 */
export function LoanWorkspace() {
  const tab = useLoanStore((s) => s.tab);
  const setTab = useLoanStore((s) => s.setTab);
  const applications = useLoanStore((s) => s.applications);

  const panel = (value: LoanTab) => ({
    id: `${ID}-panel-${value}`,
    role: 'tabpanel' as const,
    'aria-labelledby': `${ID}-tab-${value}`,
    hidden: tab !== value,
  });

  return (
    <section id={ID} aria-label="Loan workspace" className="scroll-mt-28 space-y-5">
      <Tabs
        fullWidth
        label="Loans and credit"
        idPrefix={ID}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'apply', label: 'Compare loans' },
          { value: 'credit', label: 'My credit score' },
          { value: 'applications', label: 'My applications', count: applications.length },
        ]}
      />

      <div {...panel('apply')}>
        <LoanApplicationForm />
      </div>

      <div {...panel('credit')} className="space-y-6">
        <CreditProfileCard />
        <LoanJourney />
        <details className="border-border bg-glass rounded-2xl border p-4">
          <summary className="text-text focus-visible:outline-accent cursor-pointer rounded text-sm font-semibold">
            Compare score bands and lender requirements
          </summary>
          <div className="mt-4">
            <ScoreLadder />
          </div>
        </details>
      </div>

      <div {...panel('applications')}>
        <MyApplications />
      </div>
    </section>
  );
}
