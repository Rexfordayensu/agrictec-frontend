'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { ScoreRing } from '@/components/ui/score-ring';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { healthChecks } from '@/lib/reports/health-checks';
import { cn } from '@/lib/utils';

function band(health: number): { label: string; color: BadgeColor } {
  if (health >= 80) return { label: 'Healthy', color: 'green' };
  if (health >= 60) return { label: 'Fair', color: 'gold' };
  return { label: 'Needs attention', color: 'red' };
}

/** Health score (20–100) plus the five checks a lender would look at. */
export function HealthCard({ className }: { className?: string }) {
  const stats = useFarmStats();
  const { label, color } = band(stats.health);
  const checks = healthChecks(stats);
  const passed = checks.filter((c) => c.pass).length;
  const nextStep = checks.find((c) => !c.pass);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Financial Health</CardTitle>
          <CardSub>What a lender checks first</CardSub>
        </div>
        <Badge color={color}>{label}</Badge>
      </CardHeader>

      <div className="flex items-center gap-4">
        <ScoreRing value={stats.health} max={100} label="Health" size={112} />
        <div>
          <p className="text-text text-3xl font-extrabold">
            {passed}
            <span className="text-text-mute text-lg font-semibold">/{checks.length}</span>
          </p>
          <p className="text-text-dim text-sm">checks passed</p>
          <div className="mt-2 flex gap-1" aria-hidden="true">
            {checks.map((c) => (
              <span
                key={c.key}
                className={cn('h-1.5 w-6 rounded-full', c.pass ? 'bg-accent' : 'bg-glass-strong')}
              />
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {checks.map((check) => {
          const Icon = check.pass ? CheckCircle2 : XCircle;
          return (
            <li key={check.key} className="flex items-start gap-3">
              <Icon
                size={18}
                aria-hidden="true"
                className={cn('mt-0.5 shrink-0', check.pass ? 'text-ink-green' : 'text-text-mute')}
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    check.pass ? 'text-text' : 'text-text-dim',
                  )}
                >
                  {check.label}
                  <span className="sr-only">{check.pass ? ' (passed)' : ' (not yet)'}</span>
                </p>
                <p className="text-text-mute text-xs">{check.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* mt-auto: sits at the bottom when the card is stretched beside the report library. */}
      <div className="mt-auto pt-5">
        <div
          className={cn(
            'rounded-2xl border p-4',
            nextStep ? 'border-gold/30 bg-gold/10' : 'border-accent/30 bg-accent/10',
          )}
        >
          <p
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase',
              nextStep ? 'text-ink-gold' : 'text-ink-green',
            )}
          >
            {nextStep ? (
              <Lightbulb size={14} aria-hidden="true" />
            ) : (
              <BadgeCheck size={14} aria-hidden="true" />
            )}
            {nextStep ? 'Next step' : 'You’re loan ready'}
          </p>
          <p className="text-text mt-1 text-sm">
            {nextStep
              ? `${nextStep.label}: ${nextStep.detail}`
              : 'All five checks pass. Compare lender offers and apply with your report.'}
          </p>
          <Link
            href={nextStep ? nextStep.action.href : '/loans'}
            className="group text-ink-green mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold"
          >
            {nextStep ? nextStep.action.label : 'See loan offers'}
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </div>
    </Card>
  );
}
