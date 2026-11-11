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
import type { EligibilityRules } from '@/lib/calculations/loan';
import type { FarmRecord } from '@/types';
import type { FarmerAccount, LoanApplication, LoanStatus } from '@/types/admin';

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
  key: 'ghana-card' | 'records';
  label: string;
  pass: boolean;
  detail: string;
}

/**
 * What AgriCtec itself checks, with today's data (the same lines as app/domain/loans.py): the
 * Ghana Card, and its record-keeping guidance. The score is shown on its own, never as a gate.
 */
export function eligibilityChecks({
  records,
  ghanaCard,
  rules,
}: {
  records: FarmRecord[];
  ghanaCard: string;
  rules: EligibilityRules;
}): EligibilityCheck[] {
  return [
    {
      key: 'ghana-card',
      label: 'Ghana Card verified',
      pass: ghanaCard === 'verified',
      detail: ghanaCard.replace('_', ' '),
    },
    {
      key: 'records',
      label: `AgriCtec guidance: ${rules.minRecords}+ farm records`,
      pass: records.length >= rules.minRecords,
      detail: `${records.length} on file`,
    },
  ];
}

/** For the region filter and the farmer card. */
export const regionOfFarmer = (farmers: FarmerAccount[]) => {
  const byId = new Map(farmers.map((f) => [f.userId, f.profile.region]));
  return (app: LoanApplication) => byId.get(app.userId);
};
