'use client';

import { useEffect } from 'react';
import { PageHeader } from '@/components/admin/layout/page-header';
import { RiskSummary } from '@/components/admin/risk/risk-summary';
import { RiskTable } from '@/components/admin/risk/risk-table';
import { RulesReference } from '@/components/admin/risk/rules-reference';
import { ScanButton } from '@/components/admin/risk/scan-button';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

/**
 * Risk & fraud monitoring (phase A13): automatic detection with a scan, then a human decision
 * on each flag. Confirmed flags put the red "Risk" tag on the farmer across the console and
 * "Account under review" on their lender-facing report.
 */
export function RiskMonitor() {
  const flags = useAdminDataStore((s) => s.riskFlags);
  const farmers = useAdminDataStore((s) => s.farmers);
  const status = useAdminDataStore((s) => s.status);
  const refresh = useAdminDataStore((s) => s.refresh);

  // Fresh data on arrival (flags may have changed in another tab or by another admin).
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Risk & fraud"
        description="Suspicious activity is flagged automatically; a person decides on each flag. Lenders trust the records because of this review."
        actions={<ScanButton onDone={() => void refresh()} />}
      />
      <RiskSummary flags={flags} farmers={farmers} />
      <RulesReference />
      <RiskTable
        flags={flags}
        farmers={farmers}
        loading={status === 'loading'}
        onChanged={() => void refresh()}
      />
    </div>
  );
}
