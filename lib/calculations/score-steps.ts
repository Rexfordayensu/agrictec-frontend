import { isProfileComplete, RECORD_GRACE_DAYS } from '@/lib/calculations/credit-score';
import type { CreditScoreBreakdown, Profile } from '@/types';
import type { CreditConfig } from '@/types/admin';

export type FactorKey = Exclude<keyof CreditScoreBreakdown, 'score'>;

/** The score runs from 300 to 850: 550 points shared out by the factor weights. */
export const SCORE_RANGE = 550;

export interface ScoreStep {
  key: FactorKey;
  label: string;
  /** % of the score, from the admin's credit rules. */
  weight: number;
  /** 0–100 for this factor. */
  value: number;
  /** Points this factor can add, and has added. */
  max: number;
  earned: number;
  available: number;
  /** What builds this factor, in the farmer's words. */
  help: string;
  /** Where to go to improve it. */
  href: string;
  action: string;
}

/** What is still missing from the verification factor (the four checks in calculateCreditScore). */
export function verificationTodo(profile: Profile | null): string[] {
  const todo: string[] = [];
  if (!isProfileComplete(profile)) todo.push('complete your profile');
  if (!profile?.verification.phone) todo.push('verify your phone by SMS');
  if (!profile?.verification.location) todo.push('get your farm location verified');
  const card = profile?.ghanaCard.status;
  if (card !== 'verified')
    todo.push(card === 'pending' ? 'wait for your Ghana Card review' : 'verify your Ghana Card');
  return todo;
}

const sentence = (items: string[]) =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * The five score factors with the admin's weights, how many points each has earned, and the
 * page that improves it. The same rules as calculateCreditScore (and app/domain/credit.py).
 */
export function scoreSteps(
  credit: CreditScoreBreakdown,
  config: CreditConfig,
  profile: Profile | null,
): ScoreStep[] {
  const { weights, targets } = config;
  const todo = verificationTodo(profile);
  const profileFirst = !isProfileComplete(profile);
  const rows: Omit<ScoreStep, 'value' | 'max' | 'earned' | 'available'>[] = [
    {
      key: 'paymentHistory',
      label: 'Payment history',
      weight: weights.paymentHistory,
      help: `Log at least one entry in each of the last ${targets.monthsWindow} months`,
      href: '/records',
      action: 'Add a record',
    },
    {
      key: 'recordCompleteness',
      label: 'Record completeness',
      weight: weights.recordCompleteness,
      help: `Aim for ${targets.recordsForFull}+ records and MoMo entries, each logged within ${RECORD_GRACE_DAYS} days`,
      href: '/records',
      action: 'Add records',
    },
    {
      key: 'incomeStability',
      label: 'Income stability',
      weight: weights.incomeStability,
      help: 'Keep your recorded income above your costs',
      href: '/records',
      action: 'Record your sales',
    },
    {
      key: 'momoActivity',
      label: 'MoMo activity',
      weight: weights.momoActivity,
      help: `Log ${targets.momoForFull}+ Mobile Money transactions`,
      href: '/momo',
      action: 'Log MoMo',
    },
    {
      key: 'verification',
      label: 'Verification',
      weight: weights.verification,
      help: todo.length
        ? `Still to do: ${sentence(todo)}`
        : 'Profile, phone, farm location and Ghana Card all verified',
      href: profileFirst ? '/settings/profile' : '/settings/verification',
      action: profileFirst ? 'Complete profile' : 'Verify now',
    },
  ];
  return rows.map((row) => {
    const value = credit[row.key];
    const max = Math.round((row.weight / 100) * SCORE_RANGE);
    const earned = Math.round((value / 100) * max);
    return { ...row, value, max, earned, available: max - earned };
  });
}

/** The factor that would add the most points, or null when every factor is full. */
export function bestScoreStep(steps: ScoreStep[]): ScoreStep | null {
  const best = [...steps].sort((a, b) => b.available - a.available)[0];
  return best && best.available > 0 ? best : null;
}
