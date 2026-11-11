'use client';

import { useSearchParams } from 'next/navigation';
import { recordedOnTime } from '@/lib/calculations/credit-score';
import { bestScoreStep, scoreSteps } from '@/lib/calculations/score-steps';
import { defaultLoanTab, loanPath, type LoanTab } from '@/lib/loans/loan-path';
import { useCreditStore } from '@/store/credit-store';
import { useFarmStore } from '@/store/farm-store';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { EligibilityIssueCode } from '@/types';

/**
 * The farmer's credit as the API reports it (GET /me/credit and its eligibility check), with
 * the admin's live rules to put it in words. Null until the server has answered.
 */
export function useCredit() {
  const summary = useCreditStore((s) => s.summary);
  const gate = useCreditStore((s) => s.gate);
  const config = usePlatformStore((s) => s.creditConfig);
  const profile = useProfileStore((s) => s.profile);
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  if (!summary || !gate) return null;

  const steps = scoreSteps(summary.credit, config, profile);
  const failing = new Set<EligibilityIssueCode>(gate.issues.map((issue) => issue.code));
  return {
    summary,
    gate,
    failing,
    score: summary.credit.score,
    band: summary.band,
    underReview: summary.underReview,
    /** AgriCtec's own check passes (a verified Ghana Card) and the account isn't on hold. The
     * score never decides a loan; lenders' product requirements do. */
    ready: gate.eligible && !summary.underReview,
    verifiedEntries: summary.evidence?.verified ?? 0,
    entriesWithEvidence: summary.evidence?.withEvidence ?? 0,
    totalEntries: summary.evidence?.total ?? records.length + momo.length,
    verifiedShare: Number(summary.evidence?.verifiedShare ?? '0'),
    factors: summary.factors ?? [],
    missing: summary.missing ?? [],
    config,
    rules: config.eligibility,
    steps,
    best: bestScoreStep(steps),
    /** Saved entries logged too late to build the score (they still count towards profit). */
    lateEntries:
      records.filter((r) => !recordedOnTime(r)).length +
      momo.filter((t) => !recordedOnTime(t)).length,
    ghanaCard: profile?.ghanaCard.status ?? 'not_provided',
    rejectedReason: profile?.ghanaCard.rejectedReason,
    recordCount: records.length,
  };
}

export type Credit = NonNullable<ReturnType<typeof useCredit>>;

/** The open tab of /loans: the farmer's pick, else a ?tab= link, else what fits them now. */
export function useLoanTab(): LoanTab {
  const picked = useLoanStore((s) => s.tab);
  const credit = useCredit();
  const requested = useSearchParams().get('tab');
  return picked ?? defaultLoanTab(requested, credit?.ready ?? false);
}

/** The four steps to a loan for this farmer, and the first one still to do (-1: all done). */
export function useLoanPath(credit: Credit | null) {
  const applicationCount = useLoanStore((s) => s.applications.length);
  const lenderCount = usePlatformStore((s) => s.lenders.length);
  if (!credit) return null;
  const steps = loanPath({
    failing: credit.failing,
    recordCount: credit.recordCount,
    minRecords: credit.rules.minRecords,
    verifiedEntries: credit.verifiedEntries,
    entriesWithEvidence: credit.entriesWithEvidence,
    ghanaCard: credit.ghanaCard,
    underReview: credit.underReview,
    applicationCount,
    lenderCount,
  });
  return { steps, current: steps.findIndex((step) => !step.done) };
}
