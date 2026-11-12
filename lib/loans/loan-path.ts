// What the Loans & Credit page tells a farmer to do next. Every input is the API's answer
// (GET /me/credit, POST /me/loans/eligibility, GET /platform/lenders) or the farmer's own saved
// data: these helpers only put it in order and in words.

import type { EligibilityIssueCode, GhanaCardStatus, LoanStatus } from '@/types';

/** The tabs of /loans, also accepted as ?tab= in links. */
export type LoanTab = 'credit' | 'lenders' | 'applications';
export const LOAN_TABS: readonly LoanTab[] = ['credit', 'lenders', 'applications'];

/** A link to another page, or something done on this page. */
export type LoanAction =
  | { label: string; href: string }
  | { label: string; run: 'ghana-card' | 'lenders' | 'applications' };

export const ACCOUNT_REVIEW_MESSAGE =
  'Your account is being reviewed by AgriCtec. You can apply for a loan once the review is complete.';

/** Statuses where the lender is still deciding or paying out. */
export const ACTIVE_STATUSES: readonly LoanStatus[] = ['submitted', 'under_review', 'approved'];

export interface PathStep {
  key: 'records' | 'evidence' | 'ghana-card' | 'apply';
  title: string;
  detail: string;
  done: boolean;
  /** Null while someone else has to act (a card or an account under review). */
  action: LoanAction | null;
}

/**
 * The AgriCtec score and AgriCtec's own limits never decide a loan, so none of these steps is a
 * score or amount threshold: they prepare the records a lender will look at. Each lender's own
 * requirements are shown with its loan products.
 */
export interface LoanPathInput {
  /** Codes the server's identity check still fails (only "ghana-card" now). */
  failing: ReadonlySet<EligibilityIssueCode>;
  recordCount: number;
  /** AgriCtec's record-keeping guidance target, not a lender rule. */
  minRecords: number;
  /** Entries an AgriCtec reviewer verified from evidence. */
  verifiedEntries: number;
  /** Entries with a receipt or statement attached. */
  entriesWithEvidence: number;
  ghanaCard: GhanaCardStatus;
  underReview: boolean;
  /** Applications submitted through AgriCtec (drafts not included). */
  applicationCount: number;
  /** Applications started but not yet submitted. */
  draftCount?: number;
  /** Lenders farmers can see right now (published, licence checked, listing authorised). */
  lenderCount: number;
}

const ghanaCardDetail: Record<GhanaCardStatus, string> = {
  verified: 'Verified',
  pending: 'Being reviewed by AgriCtec',
  rejected: 'Rejected: please resubmit it',
  not_provided: 'Not submitted yet',
};

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

function applyDetail(input: LoanPathInput): string {
  if (input.underReview) return 'Paused while your account is reviewed';
  if (input.applicationCount) return `${plural(input.applicationCount, 'application')} submitted`;
  if (input.draftCount) return 'Started: finish and submit it';
  if (input.lenderCount) return `${plural(input.lenderCount, 'verified lender')} on AgriCtec`;
  return 'No lenders listed yet';
}

/** The four steps from "no history" to "applied", in order. */
export function loanPath(input: LoanPathInput): PathStep[] {
  const { failing, minRecords, ghanaCard, underReview, applicationCount } = input;
  return [
    {
      key: 'records',
      title: 'Build your records',
      detail: `${Math.min(input.recordCount, minRecords)} of ${minRecords} records`,
      done: input.recordCount >= minRecords,
      action: { label: 'Add records', href: '/records' },
    },
    {
      key: 'evidence',
      title: 'Back them with evidence',
      detail: input.verifiedEntries
        ? `${plural(input.verifiedEntries, 'entry', 'entries')} verified`
        : input.entriesWithEvidence
          ? `${plural(input.entriesWithEvidence, 'entry', 'entries')} with evidence, none verified yet`
          : 'No receipts or statements attached yet',
      done: input.verifiedEntries > 0,
      action: { label: 'Attach evidence', href: '/records' },
    },
    {
      key: 'ghana-card',
      title: 'Verify your Ghana Card',
      detail: ghanaCardDetail[ghanaCard],
      done: !failing.has('ghana-card'),
      action: ghanaCard === 'pending' ? null : { label: 'Verify now', run: 'ghana-card' },
    },
    {
      key: 'apply',
      title: 'Apply through AgriCtec',
      detail: applyDetail(input),
      done: applicationCount > 0,
      action: underReview
        ? null
        : input.draftCount && !applicationCount
          ? { label: 'Continue your application', run: 'applications' }
          : input.lenderCount
            ? { label: 'See lenders', run: 'lenders' }
            : null,
    },
  ];
}

/**
 * The tab /loans opens on: the one a link asked for, else "Lenders" for a farmer the server
 * says is ready, else "Overview" (what to do first).
 */
export function defaultLoanTab(requested: string | null, ready: boolean): LoanTab {
  if (requested && (LOAN_TABS as readonly string[]).includes(requested))
    return requested as LoanTab;
  return ready ? 'lenders' : 'credit';
}

/** Lenders whose name, type or region contains every word typed (case-insensitive). */
export function searchLenders<
  T extends { name: string; region?: string; institutionType: string; registeredName?: string },
>(lenders: T[], query: string, typeLabel: (type: string) => string): T[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return lenders;
  return lenders.filter((l) => {
    const text = [l.name, l.registeredName, l.region, typeLabel(l.institutionType)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return words.every((w) => text.includes(w));
  });
}
