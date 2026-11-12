'use client';

import { LoanActionLink } from '@/components/loans/loan-ui';
import type { FactorKey, ScoreStep } from '@/lib/calculations/score-steps';
import { cn } from '@/lib/utils';
import type { ScoreFactor } from '@/services/loans.service';

function barTone(value: number): string {
  if (value >= 75) return 'bg-accent';
  if (value >= 40) return 'bg-gold';
  return 'bg-danger';
}

/**
 * The five weighted factors of the server's score, with the points each adds. The factor with
 * the most points still to gain carries its own action, so the advice is given once, in place.
 */
export function ScoreFactors({
  steps,
  bestKey,
  details = [],
}: {
  steps: ScoreStep[];
  bestKey: FactorKey | null;
  /** The server's own wording of what each factor measures and how to raise it. */
  details?: ScoreFactor[];
}) {
  return (
    <ul className="space-y-4">
      {steps.map((factor) => {
        const best = factor.key === bestKey;
        // The server names factors in snake_case (payment_history), the app in camelCase.
        const about = details.find(
          (d) => d.key.replace(/_/g, '').toLowerCase() === factor.key.toLowerCase(),
        );
        return (
          <li
            key={factor.key}
            className={cn(best && 'border-gold/35 bg-gold/8 -mx-3 rounded-2xl border px-3 py-3')}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className="text-text font-semibold">{factor.label}</span>
              <span className="text-text-mute text-[11px]">{factor.weight}% of score</span>
              <span className="text-text ml-auto font-semibold tabular-nums">
                {factor.earned}
                <span className="text-text-mute font-normal"> / {factor.max}</span>
              </span>
            </div>
            <div
              role="progressbar"
              aria-label={`${factor.label}: ${factor.earned} of ${factor.max} points`}
              aria-valuenow={factor.value}
              aria-valuemin={0}
              aria-valuemax={100}
              className="bg-glass-strong mt-1.5 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className={cn('animate-progress-grow h-full rounded-full', barTone(factor.value))}
                style={{ width: `${factor.value}%` }}
              />
            </div>
            <p className="text-text-mute mt-1 text-xs">{factor.help}</p>
            {about && (
              <details className="group mt-1">
                <summary className="text-text-dim hover:text-text cursor-pointer text-[11px] font-semibold select-none">
                  How it’s measured
                </summary>
                <p className="text-text-dim mt-1 text-xs">Measures: {about.measures}.</p>
                <p className="text-text-mute mt-0.5 text-xs">To raise it: {about.improve}.</p>
              </details>
            )}
            {best && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3">
                <span className="bg-gold/15 text-ink-gold rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  Biggest gain · +{factor.available} pts
                </span>
                <LoanActionLink
                  action={{ label: factor.action, href: factor.href }}
                  className="min-h-9 text-xs"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
