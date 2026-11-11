'use client';

import Link from 'next/link';
import { ArrowRight, BadgeCheck, CheckCircle2, Lightbulb, XCircle } from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { ScoreRing } from '@/components/ui/score-ring';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { loanReadinessCheck } from '@/lib/reports/build-report-data';
import { healthChecks } from '@/lib/reports/health-checks';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

/** The badge for how many of the checks pass (the ring shows the same share). */
function band(
  passed: number,
  total: number,
  hasData: boolean,
): { label: string; color: BadgeColor } {
  if (!hasData) return { label: 'Not started', color: 'blue' };
  const share = passed / total;
  if (share >= 0.8) return { label: 'Healthy', color: 'green' };
  if (share >= 0.6) return { label: 'Fair', color: 'gold' };
  return { label: 'Needs attention', color: 'red' };
}

/**
 * The five checks a lender would look at. The ring is simply the share that pass, so the
 * number and the list beside it always agree. "Loan ready" also needs the loan rules (records,
 * score, a verified Ghana Card): the same test as the loan report.
 */
export function HealthCard({ className }: { className?: string }) {
  const stats = useFarmStats();
  const records = useFarmStore((s) => s.records);
  const profile = useProfileStore((s) => s.profile);
  const underReview = usePlatformStore((s) => s.underReview);
  const checks = healthChecks(stats);
  const passed = checks.filter((c) => c.pass).length;
  const health = Math.round((passed / checks.length) * 100);
  const { label, color } = band(passed, checks.length, stats.hasData);
  const nextStep = checks.find((c) => !c.pass);
  const { ready, eligibility } = loanReadinessCheck({ records, profile, stats, underReview });
  // Healthy finances but a loan rule still missing (e.g. the Ghana Card): say what is missing.
  const loanGap =
    !nextStep && !ready
      ? underReview
        ? 'Your account is being reviewed. Loan recommendations resume once it is done.'
        : (eligibility.reasons[0] ?? 'Complete the loan requirements to apply.')
      : null;

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
        <ScoreRing value={health} max={100} label="Health" size={112} />
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
            nextStep || loanGap ? 'border-gold/30 bg-gold/10' : 'border-accent/30 bg-accent/10',
          )}
        >
          <p
            className={cn(
              'flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase',
              nextStep || loanGap ? 'text-ink-gold' : 'text-ink-green',
            )}
          >
            {nextStep || loanGap ? (
              <Lightbulb size={14} aria-hidden="true" />
            ) : (
              <BadgeCheck size={14} aria-hidden="true" />
            )}
            {nextStep ? 'Next step' : loanGap ? 'Finances look healthy' : 'You’re loan ready'}
          </p>
          <p className="text-text mt-1 text-sm">
            {nextStep
              ? `${nextStep.label}: ${nextStep.detail}`
              : (loanGap ??
                'All five checks pass. Compare lender offers and apply with your report.')}
          </p>
          <Link
            href={nextStep ? nextStep.action.href : '/loans'}
            className="group text-ink-green mt-2 inline-flex min-h-9 items-center gap-1 text-sm font-semibold"
          >
            {nextStep ? nextStep.action.label : loanGap ? 'See what’s missing' : 'See loan offers'}
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
