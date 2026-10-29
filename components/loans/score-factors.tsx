'use client';

import { useFarmStats } from '@/hooks/use-farm-stats';
import { cn } from '@/lib/utils';
import type { CreditScoreBreakdown } from '@/types';
import type { CreditConfig } from '@/types/admin';

type FactorKey = Exclude<keyof CreditScoreBreakdown, 'score'>;

export interface ScoreFactor {
  key: FactorKey;
  label: string;
  /** % of the score, from the admin's credit rules. */
  weight: number;
  help: string;
}

/** The five factors with the admin's weights and targets (defaults: 30/25/25/10/10, 30 records). */
export function factorsFor(config: CreditConfig): ScoreFactor[] {
  const { weights, targets } = config;
  return [
    {
      key: 'paymentHistory',
      label: 'Payment History',
      weight: weights.paymentHistory,
      help: 'Record something every month',
    },
    {
      key: 'recordCompleteness',
      label: 'Record Completeness',
      weight: weights.recordCompleteness,
      help: `Aim for ${targets.recordsForFull}+ records`,
    },
    {
      key: 'incomeStability',
      label: 'Income Stability',
      weight: weights.incomeStability,
      help: 'Keep income above expenses',
    },
    {
      key: 'momoActivity',
      label: 'MoMo Activity',
      weight: weights.momoActivity,
      help: 'Log your Mobile Money transactions',
    },
    {
      key: 'verification',
      label: 'Verification',
      weight: weights.verification,
      help: 'Complete your profile and Ghana Card',
    },
  ];
}

export const SCORE_RANGE = 550; // 850 − 300

function barTone(value: number): string {
  if (value >= 75) return 'from-[#10b981] to-[#34d399]';
  if (value >= 40) return 'from-[#d97706] to-[#f5c451]';
  return 'from-[#dc2626] to-[#f87171]';
}

/** The five weighted factors behind the credit score, with how many points each adds. */
export function ScoreFactors() {
  const { credit, creditConfig } = useFarmStats();

  return (
    <ul className="space-y-4">
      {factorsFor(creditConfig).map((factor) => {
        const value = credit[factor.key];
        const max = Math.round((factor.weight / 100) * SCORE_RANGE);
        const points = Math.round((value / 100) * max);
        return (
          <li key={factor.key}>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-text font-semibold">{factor.label}</span>
              <span className="bg-glass-strong text-text-mute rounded-full px-2 py-0.5 text-[10px] font-semibold">
                {factor.weight}%
              </span>
              <span className="text-text ml-auto font-bold tabular-nums">{value}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={factor.label}
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              className="bg-glass-strong mt-1.5 h-2 overflow-hidden rounded-full"
            >
              <div
                className={cn(
                  'animate-progress-grow h-full rounded-full bg-linear-to-r',
                  barTone(value),
                )}
                style={{ width: `${value}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between gap-2 text-xs">
              <span className="text-text-mute">{factor.help}</span>
              <span className="text-text-dim shrink-0 tabular-nums">
                +{points} of {max} pts
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
