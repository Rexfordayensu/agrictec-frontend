// "Financial record readiness" on the Financial Reports page: what a lender usually looks for
// in a farmer's records, checked against the server's figures for the period
// (GET /me/financial-summary) and the farmer's Ghana Card status. Nothing is estimated.

import type { FinancialSummary } from '@/types/financial';

export interface ReadinessCheck {
  key: 'history' | 'incomeExpenses' | 'verified' | 'evidence' | 'identity';
  label: string;
  done: boolean;
  /** Where to fix it. */
  href: string;
}

/** Share of entries (by count) a reviewer verified from evidence, for the "verified" check. */
export const VERIFIED_TARGET = 50;

export function reportReadiness(
  summary: FinancialSummary,
  ghanaCard: 'verified' | 'pending' | 'rejected' | 'not_provided' | undefined,
): { checks: ReadinessCheck[]; percent: number } {
  const months = summary.period.months;
  const checks: ReadinessCheck[] = [
    {
      key: 'history',
      label: `Transaction history (${months} months)`,
      done: !summary.insufficient,
      href: '/records',
    },
    {
      key: 'incomeExpenses',
      label: 'Income and expenses recorded',
      done: Number(summary.farm.income.total) > 0 && Number(summary.farm.expenses.total) > 0,
      href: '/records',
    },
    {
      key: 'verified',
      label: `At least ${VERIFIED_TARGET}% verified transactions`,
      done: Number(summary.verifiedShare.byCount) >= VERIFIED_TARGET,
      href: '/records',
    },
    {
      key: 'evidence',
      label: 'Supporting evidence (receipts/statements)',
      done: (summary.recordReadiness?.entriesWithEvidence ?? 0) > 0,
      href: '/records',
    },
    {
      key: 'identity',
      label: 'Identity verification (Ghana Card)',
      done: summary.recordReadiness?.identityVerified ?? ghanaCard === 'verified',
      href: '/settings/verification',
    },
  ];
  const percent = Math.round((checks.filter((c) => c.done).length / checks.length) * 100);
  return { checks, percent };
}
