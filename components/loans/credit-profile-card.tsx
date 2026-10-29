'use client';

import Link from 'next/link';
import { ArrowRight, Target } from 'lucide-react';
import { factorsFor, SCORE_RANGE, ScoreFactors } from '@/components/loans/score-factors';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { cn } from '@/lib/utils';

const LABEL_COLOR: Record<string, BadgeColor> = {
  Building: 'red',
  Fair: 'gold',
  Good: 'green',
  Excellent: 'purple',
};

/** Where to send the farmer to improve each factor. */
const FACTOR_LINKS: Record<string, string> = {
  paymentHistory: '/records',
  recordCompleteness: '/records',
  incomeStability: '/records',
  momoActivity: '/momo',
  verification: '/settings/verification',
};

/**
 * The factors behind the score (the same calculateCreditScore result as the dashboard),
 * plus the single change that would add the most points.
 */
export function CreditProfileCard({ className }: { className?: string }) {
  const { credit, creditLabel, creditConfig } = useFarmStats();

  const opportunities = factorsFor(creditConfig)
    .map((factor) => {
      const max = Math.round((factor.weight / 100) * SCORE_RANGE);
      const earned = Math.round((credit[factor.key] / 100) * max);
      return { ...factor, available: max - earned };
    })
    .sort((a, b) => b.available - a.available);
  const top = opportunities[0];

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Understand your credit score</CardTitle>
          <CardSub>Your farm records and profile help build this app&apos;s score.</CardSub>
        </div>
        <Badge color={LABEL_COLOR[creditLabel] ?? 'blue'}>{creditLabel}</Badge>
      </CardHeader>

      <div className="mb-5 flex items-end gap-2">
        <span className="text-text text-4xl leading-none font-extrabold tracking-tight">
          {credit.score}
        </span>
        <span className="text-text-mute pb-1 text-sm">/ 850 credit score</span>
      </div>

      <p className="text-text-dim text-sm">
        Scores range from 300 to 850. Each lender has its own requirements, and your score alone
        does not guarantee a loan.
      </p>

      {top && top.available > 0 && (
        <div className="border-gold/30 bg-gold/10 mt-5 rounded-2xl border p-4">
          <p className="text-ink-gold flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
            <Target size={14} aria-hidden="true" /> Your next step
          </p>
          <p className="text-text mt-1 text-sm">
            {top.help}. Focus on <strong>{top.label.toLowerCase()}</strong> to help improve your
            score.
          </p>
          <Link
            href={FACTOR_LINKS[top.key]}
            className="group text-ink-green mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold"
          >
            Improve {top.label.toLowerCase()}
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      )}
      <details className="border-border mt-5 rounded-xl border p-4">
        <summary className="text-text focus-visible:outline-accent cursor-pointer rounded text-sm font-semibold">
          See how your score is calculated
        </summary>
        <div className="mt-4">
          <ScoreFactors />
        </div>
      </details>
    </Card>
  );
}
