'use client';

import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLoanStore } from '@/store/loan-store';

interface Step {
  title: string;
  detail: string;
  done: boolean;
  action: { label: string; href: string };
}

/** Four steps from "no history" to "applied", highlighting where the farmer is now. */
export function LoanJourney() {
  const { recordCount, credit, annualizedProfit, borrowingPower, loanRules } = useFarmStats();
  const { minRecords, minScore } = loanRules;
  const applications = useLoanStore((s) => s.applications);
  const setTab = useLoanStore((s) => s.setTab);

  const steps: Step[] = [
    {
      title: 'Build your records',
      detail: `${Math.min(recordCount, minRecords)} of ${minRecords} farm records`,
      done: recordCount >= minRecords,
      action: { label: 'Add records', href: '/records' },
    },
    {
      title: `Reach a ${minScore} score`,
      detail: `Your score is ${credit.score}`,
      done: credit.score >= minScore,
      action: { label: 'Improve score', href: '/settings/verification' },
    },
    {
      title: 'Show a profit',
      detail:
        annualizedProfit > 0
          ? `Borrow up to ${formatGHS(borrowingPower)}`
          : 'No profit recorded yet',
      done: annualizedProfit > 0,
      action: { label: 'Record sales', href: '/records' },
    },
    {
      title: 'Apply to a lender',
      detail: applications.length
        ? `${applications.length} application${applications.length === 1 ? '' : 's'} sent`
        : 'Not applied yet',
      done: applications.length > 0,
      action: { label: 'Build my loan', href: '#apply' },
    },
  ];
  const current = steps.findIndex((s) => !s.done);

  return (
    <nav
      aria-label="Your path to a loan"
      className="border-border bg-glass @container rounded-3xl border p-5 sm:p-6"
    >
      <p className="text-text-mute mb-4 text-[11px] font-semibold tracking-wider uppercase">
        Your path to a loan
      </p>
      <ol className="grid grid-cols-1 gap-4 @2xl:grid-cols-4 @2xl:gap-0">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li key={step.title} className="relative flex gap-3 @2xl:flex-col @2xl:pr-4">
              {/* Connector to the next step (wide layout only) */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-5 left-12 hidden h-0.5 w-[calc(100%-3.5rem)] rounded-full @2xl:block',
                    step.done ? 'bg-accent' : 'bg-border',
                  )}
                />
              )}
              <span
                className={cn(
                  'relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold',
                  step.done &&
                    'border-transparent bg-linear-to-br from-[#10b981] to-[#34d399] text-[#022c22]',
                  isCurrent && 'animate-pulse-soft border-accent bg-accent/15 text-ink-green',
                  !step.done && !isCurrent && 'border-border bg-glass text-text-mute',
                )}
                aria-hidden="true"
              >
                {step.done ? <Check size={18} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-bold',
                    step.done || isCurrent ? 'text-text' : 'text-text-dim',
                  )}
                >
                  {step.title}
                  <span className="sr-only">
                    {step.done ? ' (done)' : isCurrent ? ' (current step)' : ''}
                  </span>
                </p>
                <p className="text-text-mute text-xs">{step.detail}</p>
                {isCurrent && step.action.href === '#apply' && (
                  <button
                    type="button"
                    onClick={() => setTab('apply')}
                    className="group text-ink-green mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-semibold"
                  >
                    {step.action.label}
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                )}
                {isCurrent && step.action.href !== '#apply' && (
                  <Link
                    href={step.action.href}
                    className="group text-ink-green mt-1 inline-flex min-h-8 items-center gap-1 text-xs font-semibold"
                  >
                    {step.action.label}
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
