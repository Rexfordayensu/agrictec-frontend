'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { ScoreRing } from '@/components/ui/score-ring';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CreditScoreBreakdown } from '@/types';

const FACTORS: { key: Exclude<keyof CreditScoreBreakdown, 'score'>; label: string }[] = [
  { key: 'paymentHistory', label: 'Payment history' },
  { key: 'recordCompleteness', label: 'Record completeness' },
  { key: 'incomeStability', label: 'Income stability' },
  { key: 'momoActivity', label: 'MoMo activity' },
  { key: 'verification', label: 'Verification' },
];

/** Points between the lowest (300) and highest (850) score. */
const SCORE_RANGE = 550;

const barTone = (value: number) =>
  value >= 75 ? 'bg-accent' : value >= 40 ? 'bg-gold' : 'bg-danger';

/** The score breakdown under the current credit rules, beside the score at the last application. */
export function CreditTab({ data }: TabProps) {
  const { credit, creditConfig } = data.detail;
  const last = [...data.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const change = last ? credit.score - last.scoreAtApplication : null;
  const ChangeIcon = change === null || change === 0 ? Minus : change > 0 ? ArrowUp : ArrowDown;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="flex flex-col items-center text-center">
        <ScoreRing value={credit.score} max={850} label="Credit score" size={150} />
        <p className="text-text mt-3 font-semibold">
          {scoreLabel(credit.score, creditConfig.bands)}
        </p>
        <p className="text-text-mute text-xs">Credit rules version {creditConfig.version}</p>
        <div className="border-border mt-5 w-full border-t pt-4 text-left">
          <p className="text-text-dim text-xs font-semibold">Score at last loan application</p>
          {last ? (
            <>
              <p className="mt-1 flex items-center gap-2">
                <span className="font-display text-text text-2xl font-bold">
                  {last.scoreAtApplication}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-xs font-semibold',
                    !change ? 'text-text-mute' : change > 0 ? 'text-ink-green' : 'text-ink-red',
                  )}
                >
                  <ChangeIcon size={13} aria-hidden="true" />
                  {change === 0 ? 'no change' : `${Math.abs(change!)} since`}
                </span>
              </p>
              <p className="text-text-mute text-xs">
                <Link href={`/admin/loans/${last.id}`} className="text-ink-purple font-semibold">
                  {last.reference}
                </Link>{' '}
                · {formatDate(new Date(last.createdAt))}
              </p>
            </>
          ) : (
            <p className="text-text-mute mt-1 text-sm">No loan applications yet.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Score breakdown</CardTitle>
            <CardSub>The five factors, weighted by the current credit rules</CardSub>
          </div>
        </CardHeader>
        <ul className="space-y-4">
          {FACTORS.map((factor) => {
            const value = credit[factor.key];
            const weight = creditConfig.weights[factor.key];
            const max = Math.round((weight / 100) * SCORE_RANGE);
            return (
              <li key={factor.key}>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text font-semibold">{factor.label}</span>
                  <span className="bg-glass-strong text-text-mute rounded-full px-2 py-0.5 text-[10px] font-semibold">
                    {weight}%
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
                    className={cn('h-full rounded-full', barTone(value))}
                    style={{ width: `${value}%` }}
                  />
                </div>
                <p className="text-text-dim mt-1 text-right text-xs tabular-nums">
                  +{Math.round((value / 100) * max)} of {max} pts
                </p>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
