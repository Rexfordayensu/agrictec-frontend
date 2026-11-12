// The dashboard's one "farm insight": a sentence about the farmer's own figures for the period
// (GET /me/financial-summary). Nothing is estimated or invented: with no figures, it says how
// to start.

import { formatGHS } from '@/lib/format';
import type { DashboardSummary } from '@/lib/dashboard-summary';

/** Verified share (% of entries) below which verification is the most useful advice. */
const LOW_VERIFIED = 50;

export function farmInsight(summary: DashboardSummary): string {
  const period = `the last ${summary.months} months`;
  if (summary.financialRecordCount === 0)
    return 'Record your sales and farm expenses as they happen. Each entry builds the history a lender looks at.';
  if (summary.expenses > summary.income)
    return `Your recorded expenses (${formatGHS(summary.expenses)}) are higher than your income (${formatGHS(summary.income)}) over ${period}. Make sure every sale is recorded too.`;
  if (summary.verifiedShare.entries < LOW_VERIFIED)
    return `${summary.verifiedShare.entries}% of your entries are verified. Attach receipts or statements so AgriCtec can verify them: lenders trust verified records more.`;
  if (summary.insufficient)
    return `Your records cover ${summary.monthsWithRecords} of ${period}. Record something every month to show steady activity.`;
  return `Your income was ${formatGHS(summary.profit)} more than your expenses over ${period}. Keep recording consistently.`;
}
