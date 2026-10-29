// The loan pipeline (phase A10): stats, status-change rules, table filters, the eligibility
// re-check and per-lender numbers. Pure, so the pages, the service and the tests agree.

import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { z } from 'zod';
import {
  APPROVED_LOAN_STATUSES,
  canTransition,
  CLOSING_STATUSES,
  DISBURSED_LOAN_STATUSES,
  LOAN_STATUS_LABELS,
  noteRequired,
} from '@/lib/admin/loan-status';
import { borrowingLimit, type EligibilityRules } from '@/lib/calculations/loan';
import { annualizedNetProfit } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import type { FarmRecord } from '@/types';
import type { FarmerAccount, Lender, LoanApplication, LoanStatus } from '@/types/admin';

// ---------- Stats ----------

export interface LoanStats {
  totalRequested: number;
  approvedAmount: number;
  disbursedAmount: number;
  /** defaulted ÷ (repaid + defaulted); null until a loan has closed. */
  defaultRate: number | null;
  closed: number;
}

export function loanStats(apps: LoanApplication[]): LoanStats {
  const sum = (statuses: readonly LoanStatus[]) =>
    apps.filter((a) => statuses.includes(a.status)).reduce((total, a) => total + a.amount, 0);
  const repaid = apps.filter((a) => a.status === 'repaid').length;
  const defaulted = apps.filter((a) => a.status === 'defaulted').length;
  const closed = repaid + defaulted;
  return {
    totalRequested: apps.reduce((total, a) => total + a.amount, 0),
    approvedAmount: sum(APPROVED_LOAN_STATUSES),
    disbursedAmount: sum(DISBURSED_LOAN_STATUSES),
    defaultRate: closed ? defaulted / closed : null,
    closed,
  };
}

/** Per lender: applications, how many are under review, and the approval rate of decided ones. */
export function lenderStats(apps: LoanApplication[], lenderId: string) {
  const mine = apps.filter((a) => a.partnerId === lenderId);
  const approved = mine.filter((a) => APPROVED_LOAN_STATUSES.includes(a.status)).length;
  const rejected = mine.filter((a) => a.status === 'rejected').length;
  return {
    applications: mine.length,
    underReview: mine.filter((a) => a.status === 'under_review').length,
    /** approved ÷ (approved + rejected); null before any decision. */
    approvalRate: approved + rejected ? approved / (approved + rejected) : null,
  };
}

/** "3 days" since the application was sent. */
export const ageInDays = (app: LoanApplication, now: Date) =>
  Math.max(0, differenceInCalendarDays(now, new Date(app.createdAt)));

/** Payments over the whole term, and the interest in them. */
export const totalCost = (app: Pick<LoanApplication, 'amount' | 'monthly' | 'months'>) => {
  const total = Math.round(app.monthly * app.months * 100) / 100;
  return { total, interest: Math.round((total - app.amount) * 100) / 100 };
};

// ---------- Status changes ----------

export interface StatusChangeInput {
  note?: string;
  /** "disbursed" only: "yyyy-MM-dd". */
  disbursedOn?: string;
  disbursementRef?: string;
}

/**
 * The rules for moving `app` to `to` (shared by the dialog and the service): the move must be
 * allowed; approved, rejected and defaulted need a note; disbursed needs the date the funds
 * went out (not in the future, not before the application) and a transfer reference.
 */
/** `farmerDeleted`: the farmer's account is gone, so only the moves that close it are valid. */
export function statusChangeSchema(
  app: LoanApplication,
  to: LoanStatus,
  now = new Date(),
  farmerDeleted = false,
) {
  const today = format(now, 'yyyy-MM-dd');
  const sent = format(new Date(app.createdAt), 'yyyy-MM-dd');
  return z
    .object({
      note: z.string().trim().max(500, 'Keep the note under 500 characters.').optional(),
      disbursedOn: z.string().optional(),
      disbursementRef: z
        .string()
        .trim()
        .max(40, 'Keep the reference under 40 characters.')
        .optional(),
    })
    .superRefine((value, ctx) => {
      if (!canTransition(app.status, to)) {
        ctx.addIssue({
          code: 'custom',
          path: ['status'],
          message: `An application can’t move from ${LOAN_STATUS_LABELS[app.status]} to ${LOAN_STATUS_LABELS[to]}.`,
        });
      } else if (farmerDeleted && !CLOSING_STATUSES.includes(to)) {
        ctx.addIssue({
          code: 'custom',
          path: ['status'],
          message: `This farmer’s account was deleted, so the application can only be closed, not moved to ${LOAN_STATUS_LABELS[to]}.`,
        });
      }
      if (noteRequired(to) && (value.note ?? '').trim().length < 3) {
        ctx.addIssue({
          code: 'custom',
          path: ['note'],
          message: `Add a note: the farmer sees why it was ${LOAN_STATUS_LABELS[to].toLowerCase()}.`,
        });
      }
      if (to === 'disbursed') {
        const date = value.disbursedOn ?? '';
        const parsed = parseISO(date);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isValid(parsed)) {
          ctx.addIssue({
            code: 'custom',
            path: ['disbursedOn'],
            message: 'Enter the disbursement date.',
          });
        } else if (date > today) {
          ctx.addIssue({
            code: 'custom',
            path: ['disbursedOn'],
            message: 'The date can’t be in the future.',
          });
        } else if (date < sent) {
          ctx.addIssue({
            code: 'custom',
            path: ['disbursedOn'],
            message: 'The date can’t be before the application was sent.',
          });
        }
        if ((value.disbursementRef ?? '').trim().length < 3) {
          ctx.addIssue({
            code: 'custom',
            path: ['disbursementRef'],
            message: 'Enter the transfer reference (at least 3 characters).',
          });
        }
      }
    });
}

// ---------- Table filters (?status=&lender=&min=&max=&from=&to=&region=) ----------

export const LOAN_FILTERS = ['status', 'lender', 'min', 'max', 'from', 'to', 'region'] as const;
export type LoanFilterName = (typeof LOAN_FILTERS)[number];

export function loanFilterFns(
  regionOf: (app: LoanApplication) => string | undefined,
): Record<LoanFilterName, (app: LoanApplication, value: string) => boolean> {
  const amount = (value: string) => Number(value.replace(/[^\d.]/g, ''));
  return {
    status: (a, value) => value.split(',').includes(a.status),
    lender: (a, value) => a.partnerId === value,
    min: (a, value) => !(amount(value) > 0) || a.amount >= amount(value),
    max: (a, value) => !(amount(value) > 0) || a.amount <= amount(value),
    // Dates are "yyyy-MM-dd"; both ends are inclusive.
    from: (a, value) => a.createdAt.slice(0, 10) >= value,
    to: (a, value) => a.createdAt.slice(0, 10) <= value,
    region: (a, value) => regionOf(a) === value,
  };
}

// ---------- Eligibility, re-run with today's rules ----------

export interface EligibilityCheck {
  key: 'records' | 'affordability' | 'score' | 'lender-max' | 'term';
  label: string;
  pass: boolean;
  detail: string;
}

/** Every rule the farmer app applies, as ✓/✗ lines (with the current credit rules and lender). */
export function eligibilityChecks({
  app,
  records,
  score,
  lender,
  rules,
}: {
  app: Pick<LoanApplication, 'amount' | 'months'>;
  records: FarmRecord[];
  score: number;
  lender?: Lender;
  rules: EligibilityRules;
}): EligibilityCheck[] {
  const limit = borrowingLimit(annualizedNetProfit(records), rules);
  const minScore = lender?.minScore ?? rules.minScore;
  const checks: EligibilityCheck[] = [
    {
      key: 'records',
      label: `At least ${rules.minRecords} farm records`,
      pass: records.length >= rules.minRecords,
      detail: `${records.length} on file`,
    },
    {
      key: 'affordability',
      label: `Within ${rules.maxProfitMultiplier}× yearly profit`,
      pass: app.amount <= limit,
      detail: `Limit ${formatGHS(limit)}`,
    },
    {
      key: 'score',
      label: `Credit score ${minScore}+`,
      pass: score >= minScore,
      detail: `Now ${score}`,
    },
  ];
  if (lender) {
    checks.push(
      {
        key: 'lender-max',
        label: `${lender.name} lends up to ${formatGHS(lender.maxAmount)}`,
        pass: app.amount <= lender.maxAmount,
        detail: `Asked ${formatGHS(app.amount)}`,
      },
      {
        key: 'term',
        label: `Term of ${lender.minMonths}–${lender.maxMonths} months`,
        pass: app.months >= lender.minMonths && app.months <= lender.maxMonths,
        detail: `${app.months} months`,
      },
    );
  }
  return checks;
}

// ---------- Lenders ----------

/** Why a lender can't be switched off right now (null = it can). */
export function deactivateBlock(lender: Lender, apps: LoanApplication[]): string | null {
  if (!lender.active) return null;
  const reviewing = lenderStats(apps, lender.id).underReview;
  return reviewing
    ? `${lender.name} has ${reviewing} application${reviewing === 1 ? '' : 's'} under review. Approve or reject ${reviewing === 1 ? 'it' : 'them'} first, so no farmer is left waiting on a hidden lender.`
    : null;
}

/** Why a lender can't be deleted (null = it can): any application keeps its history. */
export function deleteBlock(lender: Lender, apps: LoanApplication[]): string | null {
  const count = lenderStats(apps, lender.id).applications;
  return count
    ? `${lender.name} has ${count} application${count === 1 ? '' : 's'} on record, and deleting it would break their history. Deactivate it instead.`
    : null;
}

/** For the region filter and the farmer card. */
export const regionOfFarmer = (farmers: FarmerAccount[]) => {
  const byId = new Map(farmers.map((f) => [f.userId, f.profile.region]));
  return (app: LoanApplication) => byId.get(app.userId);
};
