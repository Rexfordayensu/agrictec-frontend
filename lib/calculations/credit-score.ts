import { isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { parseISODate } from '@/lib/format';
import { profitMargin, totalExpenses, totalIncome } from '@/lib/calculations/finance';
import type { CreditScoreBreakdown, FarmRecord, MomoTransaction, Profile } from '@/types';
import type { CreditConfig } from '@/types/admin';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** A profile is complete when name, phone, farm name and acres are all filled in. */
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return (
    profile.name.trim() !== '' &&
    profile.phone.trim() !== '' &&
    profile.farmName.trim() !== '' &&
    profile.acres > 0
  );
}

/** How many of the last `months` months (including this one) have a record or MoMo entry. */
function activeMonths(records: FarmRecord[], momo: MomoTransaction[], months: number): number {
  const dates = [...records, ...momo].map((item) => parseISODate(item.date));
  const thisMonth = startOfMonth(new Date());
  let active = 0;
  for (let i = 0; i < months; i++) {
    const month = subMonths(thisMonth, i);
    if (dates.some((date) => isSameMonth(date, month))) active++;
  }
  return active;
}

function incomeStabilityFactor(records: FarmRecord[]): number {
  const income = totalIncome(records);
  if (income <= 0) return 0;
  const expenses = totalExpenses(records);
  if (income >= expenses) return Math.min(100, 50 + profitMargin(records));
  return Math.max(0, 50 - (expenses / income - 1) * 100);
}

/**
 * THE single credit score used everywhere (dashboard, loans, reports, admin).
 * Five factors from 0 to 100 are weighted by the admin's credit rules, then mapped onto 300–850.
 * The default config reproduces the original fixed weights exactly (30/25/25/10/10).
 */
export function calculateCreditScore(
  records: FarmRecord[],
  momo: MomoTransaction[],
  profile: Profile | null,
  config: CreditConfig = DEFAULT_CREDIT_CONFIG,
): CreditScoreBreakdown {
  const { weights, targets } = config;
  const window = Math.max(1, targets.monthsWindow);
  const paymentHistory = (activeMonths(records, momo, window) / window) * 100;
  const recordCompleteness = Math.min(
    100,
    ((records.length + momo.length) / targets.recordsForFull) * 100,
  );
  const incomeStability = incomeStabilityFactor(records);
  const momoActivity = Math.min(100, (momo.length / targets.momoForFull) * 100);

  const checks = [
    isProfileComplete(profile),
    profile?.verification.phone ?? false,
    // A map pin counts for the location; the Ghana Card only once an admin has verified it.
    Boolean(profile?.gps) || (profile?.verification.location ?? false),
    profile?.ghanaCard.status === 'verified',
  ];
  const verification = (checks.filter(Boolean).length / checks.length) * 100;

  return scoreFromFactors(
    { paymentHistory, recordCompleteness, incomeStability, momoActivity, verification },
    weights,
  );
}

export type CreditFactors = Omit<CreditScoreBreakdown, 'score'>;

/** Weights the five factors (0–100 each) and maps the result onto 300–850. */
export function scoreFromFactors(
  factors: CreditFactors,
  weights: CreditConfig['weights'],
): CreditScoreBreakdown {
  const weighted =
    factors.paymentHistory * (weights.paymentHistory / 100) +
    factors.recordCompleteness * (weights.recordCompleteness / 100) +
    factors.incomeStability * (weights.incomeStability / 100) +
    factors.momoActivity * (weights.momoActivity / 100) +
    factors.verification * (weights.verification / 100); // 0–100
  const score = Math.round(300 + (clamp(weighted, 0, 100) / 100) * 550); // 300–850

  return {
    score,
    paymentHistory: Math.round(factors.paymentHistory),
    recordCompleteness: Math.round(factors.recordCompleteness),
    incomeStability: Math.round(factors.incomeStability),
    momoActivity: Math.round(factors.momoActivity),
    verification: Math.round(factors.verification),
  };
}

/** The raw quantities behind a score, for trying out numbers without real records. */
export interface ScoreCounts {
  /** Months with any record or MoMo entry, counted back from this month. */
  activeMonths: number;
  records: number;
  momo: number;
  income: number;
  expenses: number;
  /** Of profile complete, phone, location and Ghana Card (0–4). */
  verifiedChecks: number;
}

/** The five factors for custom numbers, under a config's targets (same rules as real data). */
export function factorsFromCounts(counts: ScoreCounts, config: CreditConfig): CreditFactors {
  const { targets } = config;
  const window = Math.max(1, targets.monthsWindow);
  const income = Math.max(0, counts.income);
  const expenses = Math.max(0, counts.expenses);
  let incomeStability = 0;
  if (income > 0) {
    incomeStability =
      income >= expenses
        ? // The same 1-decimal profit margin as finance.profitMargin.
          Math.min(100, 50 + Math.round(((income - expenses) / income) * 1000) / 10)
        : Math.max(0, 50 - (expenses / income - 1) * 100);
  }
  return {
    paymentHistory: (clamp(counts.activeMonths, 0, window) / window) * 100,
    recordCompleteness: Math.min(
      100,
      ((Math.max(0, counts.records) + Math.max(0, counts.momo)) / targets.recordsForFull) * 100,
    ),
    incomeStability,
    momoActivity: Math.min(100, (Math.max(0, counts.momo) / targets.momoForFull) * 100),
    verification: (clamp(counts.verifiedChecks, 0, 4) / 4) * 100,
  };
}

/** Points each factor adds on the 300–850 scale (they sum, with 300, to about the score). */
export function factorPoints(
  factors: CreditFactors,
  weights: CreditConfig['weights'],
): Record<keyof CreditFactors, number> {
  const points = (key: keyof CreditFactors) =>
    Math.round(factors[key] * (weights[key] / 100) * 5.5 * 10) / 10;
  return {
    paymentHistory: points('paymentHistory'),
    recordCompleteness: points('recordCompleteness'),
    incomeStability: points('incomeStability'),
    momoActivity: points('momoActivity'),
    verification: points('verification'),
  };
}

export type ScoreLabel = 'Building' | 'Fair' | 'Good' | 'Excellent';

/** The band a score falls in, using the admin's thresholds (default 500 / 650 / 750). */
export function scoreLabel(
  score: number,
  bands: CreditConfig['bands'] = DEFAULT_CREDIT_CONFIG.bands,
): ScoreLabel {
  if (score < bands.fair) return 'Building';
  if (score < bands.good) return 'Fair';
  if (score < bands.excellent) return 'Good';
  return 'Excellent';
}
