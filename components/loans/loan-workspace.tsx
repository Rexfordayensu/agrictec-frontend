'use client';

import { CreditTab } from '@/components/loans/credit-tab';
import { LenderMarketplace } from '@/components/loans/lender-marketplace';
import { MyApplications } from '@/components/loans/my-applications';
import { Tabs } from '@/components/ui/tabs';
import { useLoanTab } from '@/hooks/use-credit';
import type { LoanTab } from '@/lib/loans/loan-path';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';

const ID = 'loan-workspace';

/**
 * The three jobs on this page as tabs. It opens on the tab a link asked for (?tab=), else on
 * "Lenders" when the server says the farmer is ready, else on "My credit".
 */
export function LoanWorkspace() {
  const setTab = useLoanStore((s) => s.setTab);
  const applications = useLoanStore((s) => s.applications);
  const lenderCount = usePlatformStore((s) => s.lenders.length);
  const tab = useLoanTab();

  const panel = (value: LoanTab) => ({
    id: `${ID}-panel-${value}`,
    role: 'tabpanel' as const,
    'aria-labelledby': `${ID}-tab-${value}`,
    hidden: tab !== value,
  });

  return (
    <section id={ID} aria-label="Loans and credit" className="scroll-mt-28 space-y-5">
      <Tabs
        fullWidth
        label="Loans and credit"
        idPrefix={ID}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'credit', label: 'My credit' },
          { value: 'lenders', label: 'Lenders', count: lenderCount },
          { value: 'applications', label: 'Applications', count: applications.length },
        ]}
      />

      <div {...panel('credit')}>
        <CreditTab />
      </div>
      <div {...panel('lenders')} className="@container">
        <LenderMarketplace />
      </div>
      <div {...panel('applications')}>
        <MyApplications />
      </div>
    </section>
  );
}
