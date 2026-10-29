// The admin overview's numbers (phase A6). Pure functions over the cached admin data, so the
// dashboard, its tests and a future backend all agree.

import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  differenceInHours,
  format,
  isBefore,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { APPROVED_LOAN_STATUSES, LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { can } from '@/lib/admin/permissions';
import { percentChange } from '@/lib/calculations/finance';
import type {
  AdminRole,
  FarmerAccount,
  FeatureFlags,
  LoanApplication,
  LoanStatus,
  Permission,
  RiskFlag,
  VerificationRequest,
} from '@/types/admin';

/** The farmers list filtered to one region (the region chart's bars link here). */
export const regionHref = (region: string) => `/admin/farmers?region=${encodeURIComponent(region)}`;

export type DateRange = '30d' | '90d' | '12m' | 'all';

export const DATE_RANGES: { value: DateRange; label: string; short: string }[] = [
  { value: '30d', label: 'Last 30 days', short: 'in 30 days' },
  { value: '90d', label: 'Last 90 days', short: 'in 90 days' },
  { value: '12m', label: 'Last 12 months', short: 'in 12 months' },
  { value: 'all', label: 'All time', short: 'all time' },
];

export interface RangeWindow {
  /** Null for all time. */
  start: Date | null;
  /** The equally long period just before `start`, for deltas (null for all time). */
  previousStart: Date | null;
  end: Date;
}

export function rangeWindow(range: DateRange, now = new Date()): RangeWindow {
  if (range === 'all') return { start: null, previousStart: null, end: now };
  const start = range === '12m' ? subMonths(now, 12) : subDays(now, range === '30d' ? 30 : 90);
  const length = now.getTime() - start.getTime();
  return { start, previousStart: new Date(start.getTime() - length), end: now };
}

const within = (iso: string, from: Date | null, to: Date) => {
  const time = Date.parse(iso);
  return (!from || time >= from.getTime()) && time < to.getTime();
};

const registered = (farmers: FarmerAccount[]) => farmers.filter((f) => !f.isGuest);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const approvedish = (a: LoanApplication) => APPROVED_LOAN_STATUSES.includes(a.status);

export interface OverviewKpis {
  totalFarmers: number;
  newInRange: number;
  /** % change of sign-ups vs the previous period; null for all time or no earlier sign-ups. */
  newDelta: number | null;
  active30: number;
  activeShare: number;
  averageScore: number;
  incomeTracked: number;
  /** Farmers with any income recorded. */
  earningFarmers: number;
  loanRequested: number;
  loanCount: number;
  loanDelta: number | null;
  /** Approved ÷ decided, among applications made in the range; null when none were decided. */
  approvalRate: number | null;
  approvedCount: number;
  decidedCount: number;
  pendingVerifications: number;
  /** Days the oldest pending verification has waited (null when none). */
  oldestPendingDays: number | null;
  openFlags: number;
  openHighFlags: number;
  /** Cumulative farmers per month over the last 12 months, for the sparkline. */
  farmersTrend: number[];
  /** Amount requested per month over the last 12 months. */
  loanTrend: number[];
}

export function overviewKpis(
  farmers: FarmerAccount[],
  apps: LoanApplication[],
  flags: RiskFlag[],
  verifications: VerificationRequest[],
  range: DateRange,
  now = new Date(),
): OverviewKpis {
  const people = registered(farmers);
  const { start, previousStart, end } = rangeWindow(range, now);
  const joined = (from: Date | null, to: Date) =>
    people.filter((f) => within(f.createdAt, from, to)).length;
  const newInRange = joined(start, end);
  const appsIn = (from: Date | null, to: Date) => apps.filter((a) => within(a.createdAt, from, to));
  const rangeApps = appsIn(start, end);
  const decided = rangeApps.filter((a) => approvedish(a) || a.status === 'rejected');
  const approved = rangeApps.filter(approvedish);
  const active30 = people.filter(
    (f) => f.lastActiveAt && differenceInCalendarDays(now, new Date(f.lastActiveAt)) <= 30,
  ).length;
  const pending = verifications.filter((v) => v.status === 'pending');
  const open = flags.filter((f) => f.status === 'open');
  const months = Array.from({ length: 12 }, (_, i) => startOfMonth(subMonths(now, 11 - i)));

  return {
    totalFarmers: people.length,
    newInRange,
    newDelta:
      start && previousStart ? percentChange(newInRange, joined(previousStart, start)) : null,
    active30,
    activeShare: people.length ? Math.round((active30 / people.length) * 100) : 0,
    averageScore: people.length
      ? Math.round(sum(people.map((f) => f.stats.score)) / people.length)
      : 0,
    incomeTracked: sum(people.map((f) => f.stats.income)),
    earningFarmers: people.filter((f) => f.stats.income > 0).length,
    loanRequested: sum(rangeApps.map((a) => a.amount)),
    loanCount: rangeApps.length,
    loanDelta:
      start && previousStart
        ? percentChange(
            sum(rangeApps.map((a) => a.amount)),
            sum(appsIn(previousStart, start).map((a) => a.amount)),
          )
        : null,
    approvalRate: decided.length ? Math.round((approved.length / decided.length) * 100) : null,
    approvedCount: approved.length,
    decidedCount: decided.length,
    pendingVerifications: pending.length,
    oldestPendingDays: pending.length
      ? Math.max(...pending.map((v) => differenceInCalendarDays(now, new Date(v.submittedAt))))
      : null,
    openFlags: open.length,
    openHighFlags: open.filter((f) => f.severity === 'high').length,
    farmersTrend: months.map(
      (month) => people.filter((f) => new Date(f.createdAt) < addMonths(month, 1)).length,
    ),
    loanTrend: months.map((month) => sum(appsIn(month, addMonths(month, 1)).map((a) => a.amount))),
  };
}

/**
 * Sign-ups over the range: daily for 30 days, weekly for 90 days, monthly for 12 months and
 * all time (from the first sign-up's month).
 */
export function signupSeries(
  farmers: FarmerAccount[],
  range: DateRange,
  now = new Date(),
): { labels: string[]; counts: number[]; unit: 'day' | 'week' | 'month' } {
  const people = registered(farmers);
  let buckets: { start: Date; end: Date; label: string }[];
  let unit: 'day' | 'week' | 'month';
  if (range === '30d') {
    unit = 'day';
    const first = startOfDay(subDays(now, 29));
    buckets = Array.from({ length: 30 }, (_, i) => {
      const start = addDays(first, i);
      return { start, end: addDays(start, 1), label: format(start, 'd MMM') };
    });
  } else if (range === '90d') {
    unit = 'week';
    const first = startOfWeek(subDays(now, 90), { weekStartsOn: 1 });
    const count = Math.ceil((now.getTime() - first.getTime()) / (7 * 86_400_000));
    buckets = Array.from({ length: count }, (_, i) => {
      const start = addDays(first, i * 7);
      return { start, end: addDays(start, 7), label: format(start, 'd MMM') };
    });
  } else {
    unit = 'month';
    const earliest = people.reduce<Date | null>((min, f) => {
      const date = new Date(f.createdAt);
      return !min || isBefore(date, min) ? date : min;
    }, null);
    const firstMonth =
      range === 'all' && earliest ? startOfMonth(earliest) : startOfMonth(subMonths(now, 11));
    const months = Math.max(
      2,
      (now.getFullYear() - firstMonth.getFullYear()) * 12 +
        now.getMonth() -
        firstMonth.getMonth() +
        1,
    );
    buckets = Array.from({ length: months }, (_, i) => {
      const start = addMonths(firstMonth, i);
      return { start, end: addMonths(start, 1), label: format(start, 'MMM yy') };
    });
  }
  return {
    labels: buckets.map((b) => b.label),
    counts: buckets.map((b) => people.filter((f) => within(f.createdAt, b.start, b.end)).length),
    unit,
  };
}

/** The main path through the pipeline; rejected and defaulted sit beside it. */
export const FUNNEL_STAGES: LoanStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'disbursed',
  'repaid',
];

export interface FunnelStage {
  status: LoanStatus;
  label: string;
  /** Applications that ever reached this stage (from their history, not just current status). */
  reached: number;
  /** % of the previous stage that reached this one; null for the first stage or an empty step. */
  conversion: number | null;
}

/** How far applications made in the range got, plus how many ended rejected or defaulted. */
export function loanStageReach(
  apps: LoanApplication[],
  range: DateRange = 'all',
  now = new Date(),
): { stages: FunnelStage[]; rejected: number; defaulted: number; total: number } {
  const { start, end } = rangeWindow(range, now);
  const inRange = apps.filter((a) => within(a.createdAt, start, end));
  const reachedStage = (status: LoanStatus) =>
    inRange.filter((a) => a.status === status || a.history.some((h) => h.status === status)).length;
  const stages = FUNNEL_STAGES.map((status) => ({
    status,
    label: LOAN_STATUS_LABELS[status],
    reached: reachedStage(status),
  }));
  return {
    stages: stages.map((stage, i) => ({
      ...stage,
      conversion:
        i === 0 || stages[i - 1].reached === 0
          ? null
          : Math.round((stage.reached / stages[i - 1].reached) * 100),
    })),
    rejected: inRange.filter((a) => a.status === 'rejected').length,
    defaulted: inRange.filter((a) => a.status === 'defaulted').length,
    total: inRange.length,
  };
}

export interface AttentionItem {
  key: 'maintenance' | 'risk' | 'verifications' | 'loans' | 'appeals';
  count: number;
  text: string;
  href: string;
  /** Red row (maintenance mode). */
  urgent?: boolean;
  /** False when the row is only informational for this role (it can’t act on it). */
  actionable: boolean;
}

/** Applications waiting longer than this for a decision are flagged. */
export const LOAN_WAIT_HOURS = 48;

/** A suspended farmer has appealed when tagged "appeal" or an admin note mentions an appeal. */
export const hasAppealed = (f: FarmerAccount) =>
  f.status === 'suspended' &&
  (f.tags.includes('appeal') || f.adminNotes.some((n) => /\bappeal/i.test(n.text)));

/**
 * The prioritized to-do list, only with what this role can act on. Maintenance mode always shows
 * (as a red row) because it affects every farmer; only a role that can change it gets a link.
 */
export function needsAttention(
  data: {
    farmers: FarmerAccount[];
    apps: LoanApplication[];
    flags: RiskFlag[];
    verifications: VerificationRequest[];
    featureFlags: FeatureFlags | null;
  },
  role: AdminRole | undefined,
  now = new Date(),
): AttentionItem[] {
  const allowed = (permission: Permission) => can(role, permission);
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const items: AttentionItem[] = [];

  if (data.featureFlags?.maintenanceMode) {
    items.push({
      key: 'maintenance',
      count: 1,
      text: 'Maintenance mode is ON. Farmers can’t use the app.',
      href: '/admin/settings',
      urgent: true,
      actionable: allowed('settings.manage'),
    });
  }

  const high = data.flags.filter((f) => f.status === 'open' && f.severity === 'high').length;
  if (high > 0 && allowed('risk.review')) {
    items.push({
      key: 'risk',
      count: high,
      text: `${high} high-risk ${plural(high, 'flag needs', 'flags need')} review`,
      href: '/admin/risk?severity=high&status=open',
      actionable: true,
    });
  }

  const pending = data.verifications.filter((v) => v.status === 'pending');
  if (pending.length > 0 && allowed('verifications.review')) {
    const oldest = Math.max(
      ...pending.map((v) => differenceInCalendarDays(now, new Date(v.submittedAt))),
    );
    items.push({
      key: 'verifications',
      count: pending.length,
      text: `${pending.length} ${plural(pending.length, 'verification', 'verifications')} pending (oldest ${oldest} ${plural(oldest, 'day', 'days')})`,
      href: '/admin/verifications',
      actionable: true,
    });
  }

  const waiting = data.apps.filter((a) => {
    if (a.status !== 'submitted' && a.status !== 'under_review') return false;
    const since = a.history.at(-1)?.at ?? a.createdAt;
    return differenceInHours(now, new Date(since)) >= LOAN_WAIT_HOURS;
  }).length;
  if (waiting > 0 && allowed('loans.manage')) {
    items.push({
      key: 'loans',
      count: waiting,
      text: `${waiting} loan ${plural(waiting, 'application', 'applications')} waiting more than ${LOAN_WAIT_HOURS}h`,
      href: '/admin/loans?status=submitted',
      actionable: true,
    });
  }

  const appeals = data.farmers.filter(hasAppealed).length;
  if (appeals > 0 && allowed('farmers.suspend')) {
    items.push({
      key: 'appeals',
      count: appeals,
      text: `${appeals} suspended ${plural(appeals, 'farmer', 'farmers')} appealed`,
      href: '/admin/farmers?status=suspended&tag=appeal',
      actionable: true,
    });
  }

  return items;
}
