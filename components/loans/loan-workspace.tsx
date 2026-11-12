'use client';

import { CreditTab } from '@/components/loans/credit-tab';
import { FarmerApplications } from '@/components/loans/farmer-applications';
import { LenderMarketplace } from '@/components/loans/lender-marketplace';
import { Tabs } from '@/components/ui/tabs';
import { useLoanTab } from '@/hooks/use-credit';
import type { LoanTab } from '@/lib/loans/loan-path';
import { useApplicationsStore } from '@/store/applications-store';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';

const ID = 'loan-workspace';

/**
 * The three jobs on this page as tabs. It opens on the tab a link asked for (?tab=), else on
 * "Lenders" when the server says the farmer is ready, else on "Overview".
 */
export function LoanWorkspace() {
  const setTab = useLoanStore((s) => s.setTab);
  const earlier = useLoanStore((s) => s.applications.length);
  const prepared = useApplicationsStore((s) => s.list.length);
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
          { value: 'credit', label: 'Overview' },
          { value: 'lenders', label: 'Lenders', count: lenderCount },
          { value: 'applications', label: 'Applications', count: prepared + earlier },
        ]}
      />

      <div {...panel('credit')}>
        <CreditTab />
      </div>
      <div {...panel('lenders')} className="@container">
        <LenderMarketplace />
      </div>
      <div {...panel('applications')}>
        <FarmerApplications />
      </div>
    </section>
  );
}
