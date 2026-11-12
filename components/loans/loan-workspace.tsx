'use client';

import { useState } from 'react';
import { CreditTab } from '@/components/loans/credit-tab';
import { FarmerApplications } from '@/components/loans/farmer-applications';
import { LenderMarketplace } from '@/components/loans/lender-marketplace';
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
  // Applications prepared through AgriCtec (loaded by their tab) plus earlier recorded ones.
  const [prepared, setPrepared] = useState(0);

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
          { value: 'applications', label: 'Applications', count: applications.length + prepared },
        ]}
      />

      <div {...panel('credit')}>
        <CreditTab />
      </div>
      <div {...panel('lenders')} className="@container">
        <LenderMarketplace />
      </div>
      <div {...panel('applications')}>
        <FarmerApplications onCount={setPrepared} />
      </div>
    </section>
  );
}
