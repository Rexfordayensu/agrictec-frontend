'use client';

import { useSearchParams } from 'next/navigation';
import { bestScoreStep, scoreSteps, withServerPoints } from '@/lib/calculations/score-steps';
import { defaultLoanTab, loanPath, type LoanTab } from '@/lib/loans/loan-path';
import { useApplicationsStore } from '@/store/applications-store';
import { useCreditStore } from '@/store/credit-store';
import { useFarmStore } from '@/store/farm-store';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { EligibilityIssueCode } from '@/types';

/**
 * The farmer's credit as the API reports it (GET /me/credit and its eligibility check), with
 * the admin's live rules (GET /platform) to put it in words. Null until both have answered,
 * so nothing is ever shown from built-in defaults.
 */
export function useCredit() {
  const summary = useCreditStore((s) => s.summary);
  const gate = useCreditStore((s) => s.gate);
  const config = usePlatformStore((s) => s.creditConfig);
  const profile = useProfileStore((s) => s.profile);
  const platformReady = usePlatformStore((s) => s.status === 'ready');
  const records = useFarmStore((s) => s.records);
  if (!summary || !gate || !platformReady) return null;

  const steps = withServerPoints(scoreSteps(summary.credit, config, profile), summary.factors ?? []);
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
    totalEntries: summary.evidence?.total ?? 0,
    verifiedShare: Number(summary.evidence?.verifiedShare ?? '0'),
    factors: summary.factors ?? [],
    missing: summary.missing ?? [],
    config,
    rules: config.eligibility,
    steps,
    best: bestScoreStep(steps),
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
  // Applications prepared through AgriCtec: submitted ones count, drafts are "started".
  const applicationCount = useApplicationsStore(
    (s) => s.list.filter((a) => a.status !== 'draft' && a.status !== 'withdrawn').length,
  );
  const draftCount = useApplicationsStore((s) => s.list.filter((a) => a.status === 'draft').length);
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
    draftCount,
    lenderCount,
  });
  return { steps, current: steps.findIndex((step) => !step.done) };
}
