'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScoreRing } from '@/components/ui/score-ring';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { cn } from '@/lib/utils';

const LABEL_COLOR: Record<string, BadgeColor> = {
  Building: 'red',
  Fair: 'gold',
  Good: 'green',
  Excellent: 'purple',
};

/** Credit score ring + the 5-step loan readiness checklist. */
export function LoanReadinessCard({ className }: { className?: string }) {
  const { credit, creditLabel, readiness } = useFarmStats();
  const done = readiness.filter((item) => item.done).length;

  return (
    <Card className={cn('@container flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Loan Readiness</CardTitle>
          <CardSub>AI-computed eligibility</CardSub>
        </div>
        <Badge color={LABEL_COLOR[creditLabel] ?? 'blue'}>{creditLabel}</Badge>
      </CardHeader>

      {/* Narrow (side column): ring above the list. Wide (stacked on tablets): side by side. */}
      <div className="flex flex-1 flex-col gap-5 @md:flex-row @md:items-center">
        <div className="flex justify-center">
          <ScoreRing value={credit.score} max={850} label="Credit score" size={148} />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <Progress
            value={(done / readiness.length) * 100}
            label={`${done} of ${readiness.length} steps complete`}
          />
          <ul className="space-y-2.5">
            {readiness.map((item) => (
              <li key={item.key} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                    item.done
                      ? 'border-transparent bg-linear-to-br from-[#10b981] to-[#34d399] text-[#022c22]'
                      : 'border-border bg-glass-strong',
                  )}
                >
                  {item.done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn('text-sm font-medium', item.done ? 'text-text' : 'text-text-dim')}
                  >
                    {item.label}
                    <span className="sr-only">{item.done ? ' (done)' : ' (pending)'}</span>
                  </p>
                  {!item.done && <p className="text-text-mute text-xs">{item.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        href="/loans"
        className="group border-border bg-glass text-ink-green hover:border-accent/50 hover:bg-glass-strong mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors"
      >
        View credit details
        <ArrowRight
          size={16}
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </Card>
  );
}
