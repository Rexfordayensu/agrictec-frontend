// Credit rules (phase A11): factor copy, draft validation, the change list and the impact of a
// draft on every farmer. Pure, so the editors, the preview, the publish dialog, the service and
// the tests all apply exactly the same rules.

import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { calculateCreditScore, scoreLabel, type ScoreLabel } from '@/lib/calculations/credit-score';
import { mapInChunks, type ChunkOptions } from '@/lib/chunked';
import type { FarmRecord, MomoTransaction, Profile } from '@/types';
import type { CreditConfig, CreditConfigInput } from '@/types/admin';

export type WeightKey = keyof CreditConfig['weights'];

/** The five factors, in the order the editors show them. */
export const FACTORS: { key: WeightKey; label: string; description: string }[] = [
  {
    key: 'paymentHistory',
    label: 'Payment history',
    description: 'Months with any record or MoMo activity, within the consistency window.',
  },
  {
    key: 'recordCompleteness',
    label: 'Record completeness',
    description: 'Records and MoMo entries kept, up to the number needed for full marks.',
  },
  {
    key: 'incomeStability',
    label: 'Income stability',
    description: 'Profit margin: income above expenses scores higher; losses score lower.',
  },
  {
    key: 'momoActivity',
    label: 'MoMo activity',
    description: 'Mobile Money transactions logged, up to the number needed for full marks.',
  },
  {
    key: 'verification',
    label: 'Verification',
    description: 'Profile complete, phone, farm location and Ghana Card verified.',
  },
];

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** Allowed ranges for the numeric settings (the service's schema enforces the same). */
export const LIMITS = {
  recordsForFull: { min: 1, max: 1000 },
  momoForFull: { min: 1, max: 1000 },
  monthsWindow: { min: 1, max: 24 },
  minRecords: { min: 0, max: 1000 },
  maxProfitMultiplier: { min: 0.5, max: 20 },
} as const;

export const weightTotal = (weights: CreditConfig['weights']) =>
  Object.values(weights).reduce((sum, value) => sum + value, 0);

/** Only the editable values of a config. */
export const configValues = ({
  weights,
  targets,
  bands,
  eligibility,
}: CreditConfigInput): CreditConfigInput => ({ weights, targets, bands, eligibility });

// ---------- Validation ----------

export interface DraftIssues {
  weights?: string;
  targets?: string;
  bands?: string;
  eligibility?: string;
}

const inRange = (value: number, { min, max }: { min: number; max: number }) =>
  Number.isFinite(value) && value >= min && value <= max;

/** What stops a draft from being published, per section (empty = ready). */
export function draftIssues(draft: CreditConfigInput): DraftIssues {
  const issues: DraftIssues = {};
  const total = weightTotal(draft.weights);
  if (Object.values(draft.weights).some((w) => !Number.isInteger(w) || w < 0 || w > 100)) {
    issues.weights = 'Each weight must be a whole number from 0 to 100.';
  } else if (total !== 100) {
    issues.weights = `Total is ${total}%. Must be 100%.`;
  }

  const t = draft.targets;
  if (
    !Number.isInteger(t.recordsForFull) ||
    !Number.isInteger(t.momoForFull) ||
    !Number.isInteger(t.monthsWindow) ||
    !inRange(t.recordsForFull, LIMITS.recordsForFull) ||
    !inRange(t.momoForFull, LIMITS.momoForFull) ||
    !inRange(t.monthsWindow, LIMITS.monthsWindow)
  ) {
    issues.targets = 'Records and MoMo targets are 1–1000; the window is 1–24 months.';
  }

  const { fair, good, excellent } = draft.bands;
  if (![fair, good, excellent].every((b) => Number.isInteger(b))) {
    issues.bands = 'Thresholds must be whole numbers.';
  } else if (fair <= SCORE_MIN || excellent > SCORE_MAX) {
    // Building runs from 300 up to Fair, so Fair starts above 300; Excellent ends at 850.
    issues.bands = `Thresholds must sit between ${SCORE_MIN + 1} and ${SCORE_MAX}.`;
  } else if (!(fair < good && good < excellent)) {
    issues.bands = 'Thresholds must rise: Fair < Good < Excellent.';
  }

  const e = draft.eligibility;
  if (!Number.isInteger(e.minRecords) || !inRange(e.minRecords, LIMITS.minRecords)) {
    issues.eligibility = 'Minimum records must be a whole number from 0 to 1000.';
  } else if (!Number.isInteger(e.minScore) || e.minScore < SCORE_MIN || e.minScore > SCORE_MAX) {
    issues.eligibility = `Minimum score must be ${SCORE_MIN}–${SCORE_MAX}.`;
  } else if (!inRange(e.maxProfitMultiplier, LIMITS.maxProfitMultiplier)) {
    issues.eligibility = 'The loan multiple must be 0.5× to 20× yearly profit.';
  }
  return issues;
}

export const isPublishable = (draft: CreditConfigInput) =>
  Object.keys(draftIssues(draft)).length === 0;

// ---------- Changes ----------

export interface ConfigChange {
  section: 'Weights' | 'Targets' | 'Bands' | 'Eligibility';
  label: string;
  from: string;
  to: string;
}

const TARGET_LABELS: Record<keyof CreditConfig['targets'], [string, (v: number) => string]> = {
  recordsForFull: ['Records for full completeness', (v) => `${v}`],
  momoForFull: ['MoMo for full activity', (v) => `${v}`],
  monthsWindow: ['Consistency window', (v) => `${v} months`],
};
const BAND_LABELS: Record<keyof CreditConfig['bands'], string> = {
  fair: 'Fair from',
  good: 'Good from',
  excellent: 'Excellent from',
};
const ELIGIBILITY_LABELS: Record<
  keyof CreditConfig['eligibility'],
  [string, (v: number) => string]
> = {
  minRecords: ['Minimum records', (v) => `${v}`],
  minScore: ['Minimum score', (v) => `${v}`],
  maxProfitMultiplier: ['Max loan', (v) => `${v}× yearly profit`],
};

/** Every value that differs between two configs, in editor order. */
export function configChanges(from: CreditConfigInput, to: CreditConfigInput): ConfigChange[] {
  const changes: ConfigChange[] = [];
  for (const f of FACTORS) {
    if (from.weights[f.key] !== to.weights[f.key])
      changes.push({
        section: 'Weights',
        label: f.label,
        from: `${from.weights[f.key]}%`,
        to: `${to.weights[f.key]}%`,
      });
  }
  for (const key of Object.keys(TARGET_LABELS) as (keyof CreditConfig['targets'])[]) {
    const [label, show] = TARGET_LABELS[key];
    if (from.targets[key] !== to.targets[key])
      changes.push({
        section: 'Targets',
        label,
        from: show(from.targets[key]),
        to: show(to.targets[key]),
      });
  }
  for (const key of Object.keys(BAND_LABELS) as (keyof CreditConfig['bands'])[]) {
    if (from.bands[key] !== to.bands[key])
      changes.push({
        section: 'Bands',
        label: BAND_LABELS[key],
        from: `${from.bands[key]}`,
        to: `${to.bands[key]}`,
      });
  }
  for (const key of Object.keys(ELIGIBILITY_LABELS) as (keyof CreditConfig['eligibility'])[]) {
    const [label, show] = ELIGIBILITY_LABELS[key];
    if (from.eligibility[key] !== to.eligibility[key])
      changes.push({
        section: 'Eligibility',
        label,
        from: show(from.eligibility[key]),
        to: show(to.eligibility[key]),
      });
  }
  return changes;
}

// ---------- Impact on every farmer ----------

/** What the score needs for one farmer (read once; scored many times while editing). */
export interface ScoringInput {
  userId: string;
  name: string;
  region: string;
  records: FarmRecord[];
  momo: MomoTransaction[];
  profile: Profile;
}

export interface FarmerImpact {
  userId: string;
  name: string;
  region: string;
  current: number;
  draft: number;
  delta: number;
  currentBand: ScoreLabel;
  draftBand: ScoreLabel;
  eligibleNow: boolean;
  eligibleDraft: boolean;
}

export const BANDS: ScoreLabel[] = ['Building', 'Fair', 'Good', 'Excellent'];

/** Loan eligibility a farmer can have before choosing an amount: enough records and score. */
export const meetsEligibility = (
  input: Pick<ScoringInput, 'records'>,
  score: number,
  config: CreditConfigInput,
) => input.records.length >= config.eligibility.minRecords && score >= config.eligibility.minScore;

export interface Impact {
  farmers: FarmerImpact[];
  averageCurrent: number;
  averageDraft: number;
  bandsCurrent: Record<ScoreLabel, number>;
  bandsDraft: Record<ScoreLabel, number>;
  gained: FarmerImpact[];
  lost: FarmerImpact[];
  /** The 10 biggest moves, up or down. */
  biggest: FarmerImpact[];
  changedScores: number;
}

const asConfig = (values: CreditConfigInput): CreditConfig => ({
  ...DEFAULT_CREDIT_CONFIG,
  ...values,
});

/** One farmer scored under the live rules and the draft. */
function scoreImpact(input: ScoringInput, live: CreditConfig, next: CreditConfig): FarmerImpact {
  const now = calculateCreditScore(input.records, input.momo, input.profile, live).score;
  const then = calculateCreditScore(input.records, input.momo, input.profile, next).score;
  return {
    userId: input.userId,
    name: input.name,
    region: input.region,
    current: now,
    draft: then,
    delta: then - now,
    currentBand: scoreLabel(now, live.bands),
    draftBand: scoreLabel(then, next.bands),
    eligibleNow: meetsEligibility(input, now, live),
    eligibleDraft: meetsEligibility(input, then, next),
  };
}

/** The totals over every scored farmer. */
function summarizeImpact(farmers: FarmerImpact[]): Impact {
  const average = (pick: (f: FarmerImpact) => number) =>
    farmers.length ? Math.round(farmers.reduce((s, f) => s + pick(f), 0) / farmers.length) : 0;
  const count = (pick: (f: FarmerImpact) => ScoreLabel) =>
    Object.fromEntries(
      BANDS.map((b) => [b, farmers.filter((f) => pick(f) === b).length]),
    ) as Record<ScoreLabel, number>;
  return {
    farmers,
    averageCurrent: average((f) => f.current),
    averageDraft: average((f) => f.draft),
    bandsCurrent: count((f) => f.currentBand),
    bandsDraft: count((f) => f.draftBand),
    gained: farmers.filter((f) => !f.eligibleNow && f.eligibleDraft),
    lost: farmers.filter((f) => f.eligibleNow && !f.eligibleDraft),
    biggest: farmers
      .filter((f) => f.delta !== 0)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name))
      .slice(0, 10),
    changedScores: farmers.filter((f) => f.delta !== 0).length,
  };
}

/** Re-scores every farmer under the live rules and the draft (nothing is saved). */
export function impactOf(
  inputs: ScoringInput[],
  current: CreditConfigInput,
  draft: CreditConfigInput,
): Impact {
  const live = asConfig(current);
  const next = asConfig(draft);
  return summarizeImpact(inputs.map((input) => scoreImpact(input, live, next)));
}

/**
 * impactOf, a few farmers at a time with the browser free in between (the preview recalculates as
 * the admin types). Same result; throws an AbortError when `signal` aborts.
 */
export async function impactInChunks(
  inputs: ScoringInput[],
  current: CreditConfigInput,
  draft: CreditConfigInput,
  options: ChunkOptions = {},
): Promise<Impact> {
  const live = asConfig(current);
  const next = asConfig(draft);
  const farmers = await mapInChunks(inputs, (input) => scoreImpact(input, live, next), options);
  return summarizeImpact(farmers);
}
