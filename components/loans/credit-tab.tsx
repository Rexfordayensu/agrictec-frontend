'use client';

import { Check, Clock } from 'lucide-react';
import { LoanActionLink, loanUi } from '@/components/loans/loan-ui';
import { ScoreFactors } from '@/components/loans/score-factors';
import { useCredit, useLoanPath, type Credit } from '@/hooks/use-credit';
import { RECORD_GRACE_DAYS } from '@/lib/calculations/credit-score';
import { formatGhanaDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SCORE_EXPLANATION, LOAN_REVIEW_EXPLANATION } from '@/lib/loans/score-policy';

const MIN = 300;
const MAX = 850;
const pct = (score: number) => ((Math.min(MAX, Math.max(MIN, score)) - MIN) / (MAX - MIN)) * 100;

/** "My credit": the path to a loan, then the score with who it reaches and what builds it. */
export function CreditTab() {
  const credit = useCredit();
  if (!credit) return null;
  return (
    <div className="@container space-y-5">
      <LoanPath credit={credit} />
      <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-2">
        <ScorePanel credit={credit} />
        <section aria-labelledby="factors-title" className={loanUi.panel}>
          <h3 id="factors-title" className={loanUi.title}>
            What builds your score
          </h3>
          <p className={loanUi.sub}>
            Five things from your records and profile. Your biggest gain is marked.
          </p>
          <div className="mt-5">
            <ScoreFactors steps={credit.steps} bestKey={credit.best?.key ?? null} />
          </div>
          <div className="border-border mt-5 flex gap-3 border-t pt-4">
            <Clock size={16} aria-hidden="true" className="text-ink-blue mt-0.5 shrink-0" />
            <p className="text-text-dim text-xs leading-relaxed">
              Entries build your score only when you log them within {RECORD_GRACE_DAYS} days of the
              day they happened. Older entries still count towards your profit.
              {credit.lateEntries > 0 && (
                <strong className="text-ink-gold mt-1 block font-semibold">
                  {credit.lateEntries} of your entries {credit.lateEntries === 1 ? 'was' : 'were'}{' '}
                  logged too late to count.
                </strong>
              )}
            </p>
          </div>
        </section>
      </div>
      <ScoreExplanation credit={credit} />
    </div>
  );
}

/** How the AgriCtec score works, from the live rules, and what the server found missing. */
function ScoreExplanation({ credit }: { credit: Credit }) {
  const { summary } = credit;
  return (
    <section aria-labelledby="score-how-title" className={cn(loanUi.panel, 'space-y-4')}>
      <div>
        <h3 id="score-how-title" className={loanUi.title}>
          How your AgriCtec score works
        </h3>
        <p className={loanUi.sub}>
          {SCORE_EXPLANATION} {LOAN_REVIEW_EXPLANATION}
        </p>
      </div>
      {credit.factors.length > 0 && (
        <ul className="grid grid-cols-1 gap-3 @3xl:grid-cols-2">
          {credit.factors.map((f) => (
            <li key={f.key} className="border-border rounded-2xl border p-3">
              <p className="text-text text-sm font-semibold">
                {f.label}{' '}
                <span className="text-text-mute font-normal">
                  · {f.weight}% · {f.points} of {f.maxPoints} points
                </span>
              </p>
              <p className="text-text-dim mt-1 text-xs">Measures: {f.measures}.</p>
              <p className="text-text-mute mt-0.5 text-xs">To raise it: {f.improve}.</p>
            </li>
          ))}
        </ul>
      )}
      {credit.missing.length > 0 && (
        <div>
          <p className="text-text text-sm font-semibold">What is missing</p>
          <ul className="text-text-dim mt-1.5 list-disc space-y-0.5 pl-5 text-sm">
            {credit.missing.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-text-mute text-xs">
        Updated whenever your records change
        {summary.computedAt ? ` (last worked out ${formatGhanaDate(summary.computedAt)})` : ''}
        {summary.methodologyVersion ? ` · rules version ${summary.methodologyVersion}` : ''}.
      </p>
    </section>
  );
}

function LoanPath({ credit }: { credit: Credit }) {
  const path = useLoanPath(credit);
  if (!path) return null;
  const { steps, current } = path;
  const done = steps.filter((s) => s.done).length;

  return (
    <nav aria-labelledby="loan-path-title" className={cn(loanUi.panel, '@container')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="loan-path-title" className={loanUi.title}>
          Your path to a loan
        </h3>
        <p className="text-text-mute text-xs tabular-nums">
          {done} of {steps.length} done
        </p>
      </div>
      <ol className="mt-5 grid grid-cols-1 gap-4 @3xl:grid-cols-4 @3xl:gap-0">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li key={step.key} className="relative flex gap-3 @3xl:flex-col @3xl:pr-4">
              {i < steps.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-4.5 left-11 hidden h-0.5 w-[calc(100%-3rem)] rounded-full @3xl:block',
                    step.done ? 'bg-accent' : 'bg-border',
                  )}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                  step.done && 'bg-accent border-transparent text-[#022c22]',
                  isCurrent && 'border-accent bg-accent/15 text-ink-green',
                  !step.done && !isCurrent && 'border-border bg-glass text-text-mute',
                )}
              >
                {step.done ? <Check size={16} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'text-sm font-semibold',
                    step.done || isCurrent ? 'text-text' : 'text-text-dim',
                  )}
                >
                  {step.title}
                  <span className="sr-only">
                    {step.done ? ' (done)' : isCurrent ? ' (next step)' : ''}
                  </span>
                </p>
                <p className="text-text-mute mt-0.5 text-xs">{step.detail}</p>
                {isCurrent && step.action && (
                  <LoanActionLink action={step.action} className="min-h-9 text-xs" />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const bandsFor = ({ fair, good, excellent }: Credit['config']['bands']) => [
  { label: 'Building', from: MIN, to: fair, tone: 'bg-danger/70' },
  { label: 'Fair', from: fair, to: good, tone: 'bg-gold/80' },
  { label: 'Good', from: good, to: excellent, tone: 'bg-accent/60' },
  { label: 'Excellent', from: excellent, to: MAX, tone: 'bg-accent' },
];

/** The 300–850 scale with the farmer's score and the admin's bands. */
function ScorePanel({ credit }: { credit: Credit }) {
  const bands = bandsFor(credit.config.bands);

  return (
    <section aria-labelledby="score-title" className={loanUi.panel}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="score-title" className={loanUi.title}>
            Your AgriCtec score
          </h3>
          <p className={loanUi.sub}>Calculated by AgriCtec from your saved records and profile.</p>
        </div>
        <span className="border-border text-text-dim shrink-0 rounded-lg border px-2.5 py-1 text-xs">
          {credit.band}
        </span>
      </div>

      <p className="text-text mt-5 text-[40px] leading-none font-semibold tracking-[-1px] tabular-nums">
        {credit.score}
        <span className="text-text-mute text-base font-normal tracking-normal"> / {MAX}</span>
      </p>

      <div
        role="img"
        aria-label={`Your score ${credit.score} on a scale from ${MIN} to ${MAX}: ${credit.band}.`}
        className="relative mt-4 pt-7 pb-6"
      >
        <span
          aria-hidden="true"
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${pct(credit.score)}%` }}
        >
          <span className="bg-accent rounded-full px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#022c22]">
            You
          </span>
          <span className="bg-accent h-2.5 w-0.5" />
        </span>
        <div className="flex h-2.5 overflow-hidden rounded-full">
          {bands.map((band) => (
            <span
              key={band.label}
              className={band.tone}
              style={{ width: `${((band.to - band.from) / (MAX - MIN)) * 100}%` }}
            />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="text-text-mute absolute inset-x-0 bottom-0 flex text-[10px]"
        >
          {bands.map((band) => (
            <span
              key={band.label}
              className="truncate text-center"
              style={{ width: `${((band.to - band.from) / (MAX - MIN)) * 100}%` }}
            >
              {band.label}
            </span>
          ))}
        </div>
      </div>

      <p className="text-text-dim mt-5 text-xs leading-relaxed">
        {SCORE_EXPLANATION}
      </p>
    </section>
  );
}
