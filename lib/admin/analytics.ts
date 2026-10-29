// Platform-wide aggregations for the admin overview and reports. Pure functions: no storage,
// no React. Guest accounts are left out, since they are not real farmers.

import { differenceInCalendarDays, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { REGIONS } from '@/constants/regions';
import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { percentChange } from '@/lib/calculations/finance';
import { APPROVED_LOAN_STATUSES, LOAN_STATUSES, LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import type {
  CreditConfig,
  FarmerAccount,
  LoanApplication,
  LoanStatus,
  RiskFlag,
  VerificationRequest,
} from '@/types/admin';

const registered = (farmers: FarmerAccount[]) => farmers.filter((f) => !f.isGuest);
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export interface PlatformKpis {
  totalFarmers: number;
  activeLast30Days: number;
  newThisMonth: number;
  newLastMonth: number;
  /** % change of new farmers vs last month; null when last month had none. */
  newChangePct: number | null;
  totalIncome: number;
  averageScore: number;
  loanRequested: number;
  loanApproved: number;
  /** Approved ÷ decided (approved or rejected), as a %; null when nothing is decided yet. */
  approvalRate: number | null;
  pendingVerifications: number;
  openHighRisk: number;
}

export function kpis(
  farmers: FarmerAccount[],
  apps: LoanApplication[],
  flags: RiskFlag[],
  verifs: VerificationRequest[],
  now = new Date(),
): PlatformKpis {
  const people = registered(farmers);
  const lastMonth = subMonths(now, 1);
  const newThisMonth = people.filter((f) => isSameMonth(new Date(f.createdAt), now)).length;
  const newLastMonth = people.filter((f) => isSameMonth(new Date(f.createdAt), lastMonth)).length;
  const approved = apps.filter((a) => APPROVED_LOAN_STATUSES.includes(a.status));
  const decided = approved.length + apps.filter((a) => a.status === 'rejected').length;

  return {
    totalFarmers: people.length,
    activeLast30Days: people.filter(
      (f) => f.lastActiveAt && differenceInCalendarDays(now, new Date(f.lastActiveAt)) <= 30,
    ).length,
    newThisMonth,
    newLastMonth,
    newChangePct: percentChange(newThisMonth, newLastMonth),
    totalIncome: sum(people.map((f) => f.stats.income)),
    averageScore: people.length
      ? Math.round(sum(people.map((f) => f.stats.score)) / people.length)
      : 0,
    loanRequested: sum(apps.map((a) => a.amount)),
    loanApproved: sum(approved.map((a) => a.amount)),
    approvalRate: decided ? Math.round((approved.length / decided) * 100) : null,
    pendingVerifications: verifs.filter((v) => v.status === 'pending').length,
    openHighRisk: flags.filter((f) => f.status === 'open' && f.severity === 'high').length,
  };
}

/** New sign-ups for each of the last `months` months, oldest first. */
export function signupsByMonth(
  farmers: FarmerAccount[],
  months = 12,
  now = new Date(),
): { labels: string[]; counts: number[] } {
  const starts = Array.from({ length: months }, (_, i) =>
    subMonths(startOfMonth(now), months - 1 - i),
  );
  const people = registered(farmers);
  return {
    labels: starts.map((month) => format(month, 'MMM yy')),
    counts: starts.map(
      (month) => people.filter((f) => isSameMonth(new Date(f.createdAt), month)).length,
    ),
  };
}

/** Every region (including those with no farmers), most farmers first. */
export function farmersByRegion(farmers: FarmerAccount[]): { region: string; count: number }[] {
  const counts = new Map<string, number>(REGIONS.map((region) => [region, 0]));
  for (const f of registered(farmers)) {
    counts.set(f.profile.region, (counts.get(f.profile.region) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count || a.region.localeCompare(b.region));
}

export interface ScoreBucket {
  /** Building, Fair, Good or Excellent. */
  band: string;
  /** e.g. "300–499". */
  label: string;
  min: number;
  max: number;
}

/** The four score bands from the admin's credit rules (default 300–499, 500–649, 650–749, 750–850). */
export function scoreBuckets(
  bands: CreditConfig['bands'] = DEFAULT_CREDIT_CONFIG.bands,
): ScoreBucket[] {
  const edges = [300, bands.fair, bands.good, bands.excellent, 851];
  return ['Building', 'Fair', 'Good', 'Excellent'].map((band, i) => ({
    band,
    label: `${edges[i]}–${edges[i + 1] - 1}`,
    min: edges[i],
    max: edges[i + 1] - 1,
  }));
}

export function scoreDistribution(
  farmers: FarmerAccount[],
  bands?: CreditConfig['bands'],
): (ScoreBucket & { count: number })[] {
  const people = registered(farmers);
  return scoreBuckets(bands).map((bucket) => ({
    ...bucket,
    count: people.filter((f) => f.stats.score >= bucket.min && f.stats.score <= bucket.max).length,
  }));
}

/** How many farmers list each crop as a primary crop, most popular first. */
export function cropPopularity(farmers: FarmerAccount[]): { crop: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const f of registered(farmers)) {
    for (const crop of new Set(f.profile.primaryCrops))
      counts.set(crop, (counts.get(crop) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([crop, count]) => ({ crop, count }))
    .sort((a, b) => b.count - a.count || a.crop.localeCompare(b.crop));
}

/** Applications at each status, in pipeline order. */
export function loanFunnel(
  apps: LoanApplication[],
): { status: LoanStatus; label: string; count: number }[] {
  return LOAN_STATUSES.map((status) => ({
    status,
    label: LOAN_STATUS_LABELS[status],
    count: apps.filter((a) => a.status === status).length,
  }));
}

/** Income tracked per region: the total and the average per farmer, highest total first. */
export function incomeByRegion(
  farmers: FarmerAccount[],
): { region: string; total: number; average: number; farmers: number }[] {
  const byRegion = new Map<string, number[]>(REGIONS.map((region) => [region, []]));
  for (const f of registered(farmers)) {
    byRegion.set(f.profile.region, [...(byRegion.get(f.profile.region) ?? []), f.stats.income]);
  }
  return [...byRegion.entries()]
    .map(([region, incomes]) => ({
      region,
      total: sum(incomes),
      average: incomes.length ? Math.round(sum(incomes) / incomes.length) : 0,
      farmers: incomes.length,
    }))
    .sort((a, b) => b.total - a.total || a.region.localeCompare(b.region));
}

/** The highest credit scores (income breaks ties). */
export function topFarmers(farmers: FarmerAccount[], n = 10): FarmerAccount[] {
  return [...registered(farmers)]
    .sort((a, b) => b.stats.score - a.stats.score || b.stats.income - a.stats.income)
    .slice(0, n);
}
