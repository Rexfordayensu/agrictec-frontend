import { differenceInCalendarDays, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { parseISODate } from '@/lib/format';
import type { CreditScoreBreakdown, FarmRecord, MomoTransaction, Profile } from '@/types';
import type { CreditConfig } from '@/types/admin';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * How long after the day it describes an entry may be typed in and still build the score
 * (app/domain/credit.py RECORD_GRACE_DAYS). Back-dated entries are kept and count for income,
 * but months of "history" can't be made in one sitting.
 */
export const RECORD_GRACE_DAYS = 45;

/** Entered within RECORD_GRACE_DAYS of its own date. */
export function recordedOnTime(item: { date: string; createdAt: string }): boolean {
  const entered = new Date(item.createdAt);
  if (Number.isNaN(entered.getTime())) return false;
  return differenceInCalendarDays(entered, parseISODate(item.date)) <= RECORD_GRACE_DAYS;
}

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

/** Rules saved before the setting existed count unchecked entries at 50%. */
export const DEFAULT_UNVERIFIED_WEIGHT = 50;

/** Statuses that take an entry out of the score: AgriCtec rejected it, or it is in dispute. */
const NOT_COUNTED = new Set(['rejected', 'disputed']);

/**
 * How much one entry counts (app/domain/credit.py entry_weight): 1 when AgriCtec verified it
 * from its receipt, 0 when rejected or disputed, and `unverifiedWeight`% while nobody has
 * checked it (self-reported or waiting for review).
 */
export function entryWeight(
  item: { verificationStatus?: string },
  unverifiedWeight: number = DEFAULT_UNVERIFIED_WEIGHT,
): number {
  const status = item.verificationStatus ?? 'self_reported';
  if (status === 'verified') return 1;
  if (NOT_COUNTED.has(status)) return 0;
  return clamp(unverifiedWeight, 0, 100) / 100;
}

/**
 * The last `months` months (including this one) with an entry: a month counts in full when one
 * of its entries is verified, and by the best of its weights otherwise.
 */
function activeMonths(
  items: (FarmRecord | MomoTransaction)[],
  unverifiedWeight: number,
  months: number,
): number {
  const thisMonth = startOfMonth(new Date());
  let active = 0;
  for (let i = 0; i < months; i++) {
    const month = subMonths(thisMonth, i);
    let best = 0;
    for (const item of items)
      if (isSameMonth(parseISODate(item.date), month))
        best = Math.max(best, entryWeight(item, unverifiedWeight));
    active += best;
  }
  return active;
}

/** Income counts by its entry's weight; costs count in full unless rejected or disputed. */
function incomeStabilityFactor(records: FarmRecord[], unverifiedWeight: number): number {
  const income = records.reduce(
    (sum, r) => sum + (r.type === 'income' ? r.amount * entryWeight(r, unverifiedWeight) : 0),
    0,
  );
  if (income <= 0) return 0;
  const expenses = records.reduce(
    (sum, r) =>
      sum +
      (r.type === 'expense' && !NOT_COUNTED.has(r.verificationStatus ?? 'self_reported')
        ? r.amount
        : 0),
    0,
  );
  if (income >= expenses)
    // The same 1-decimal profit margin as finance.profitMargin.
    return Math.min(100, 50 + Math.round(((income - expenses) / income) * 1000) / 10);
  return Math.max(0, 50 - (expenses / income - 1) * 100);
}

/**
 * THE single credit score used everywhere (dashboard, loans, reports, admin).
 * Five factors from 0 to 100 are weighted by the admin's credit rules, then mapped onto 300–850.
 * The default config reproduces the original fixed weights exactly (30/25/25/10/10).
 * Entries count by what AgriCtec checked (entryWeight): typed-in sales that never happened
 * can't buy a good score.
 */
export function calculateCreditScore(
  records: FarmRecord[],
  momo: MomoTransaction[],
  profile: Profile | null,
  config: CreditConfig = DEFAULT_CREDIT_CONFIG,
): CreditScoreBreakdown {
  const { weights, targets } = config;
  const window = Math.max(1, targets.monthsWindow);
  const unverified = targets.unverifiedWeight ?? DEFAULT_UNVERIFIED_WEIGHT;
  // Only entries typed in on time build history, completeness and MoMo activity.
  const timelyRecords = records.filter(recordedOnTime);
  const timelyMomo = momo.filter(recordedOnTime);
  const counted = (items: (FarmRecord | MomoTransaction)[]) =>
    items.reduce((sum, item) => sum + entryWeight(item, unverified), 0);
  const countedMomo = counted(timelyMomo);
  const paymentHistory =
    (activeMonths([...timelyRecords, ...timelyMomo], unverified, window) / window) * 100;
  const recordCompleteness = Math.min(
    100,
    ((counted(timelyRecords) + countedMomo) / targets.recordsForFull) * 100,
  );
  const incomeStability = incomeStabilityFactor(records, unverified);
  const momoActivity = Math.min(100, (countedMomo / targets.momoForFull) * 100);

  const checks = [
    isProfileComplete(profile),
    profile?.verification.phone ?? false,
    // The farm location and the Ghana Card count once an admin has verified them (a bare map
    // pin doesn't: anyone can drop one).
    profile?.verification.location ?? false,
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
