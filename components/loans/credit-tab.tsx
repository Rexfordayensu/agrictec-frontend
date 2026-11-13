'use client';

import { Check, ChevronDown, FileDown, TrendingUp } from 'lucide-react';
import { LoanActionLink, loanUi } from '@/components/loans/loan-ui';
import { ScoreFactors } from '@/components/loans/score-factors';
import { StatementDownload } from '@/components/loans/statement-download';
import { useCredit, useLoanPath, type Credit } from '@/hooks/use-credit';
import { formatGhanaDate } from '@/lib/format';
import { SCORE_EXPLANATION } from '@/lib/loans/score-policy';
import { cn } from '@/lib/utils';

/**
 * The Overview tab, built to be scanned: a checklist to become loan-ready (one action per
 * step), the two quickest ways to raise the score, and the full score breakdown folded away.
 */
export function CreditTab() {
  const credit = useCredit();
  if (!credit) return null;
  return (
    <div className="@container space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Checklist credit={credit} />
        <div className="space-y-4">
          <Boosts credit={credit} />
          <History credit={credit} />
        </div>
      </div>
      <ScoreDetails credit={credit} />
    </div>
  );
}

/** The four steps to a loan as a checklist: done, or one button to do it. */
function Checklist({ credit }: { credit: Credit }) {
  const path = useLoanPath(credit);
  if (!path) return null;
  const { steps, current } = path;
  const done = steps.filter((s) => s.done).length;
  return (
    <section aria-labelledby="checklist-title" className={loanUi.panel}>
      <div className="flex items-center justify-between gap-3">
        <h3 id="checklist-title" className={loanUi.title}>
          Get loan-ready
        </h3>
        <span className="text-text-mute text-xs tabular-nums">
          {done}/{steps.length} done
        </span>
      </div>
      <div aria-hidden="true" className="bg-glass-strong mt-3 h-1.5 overflow-hidden rounded-full">
        <div
          className="bg-accent h-full rounded-full transition-[width]"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>
      <ol className="divide-border mt-2 divide-y">
        {steps.map((step, i) => {
          const isCurrent = i === current;
          return (
            <li key={step.key} className="flex items-center gap-3 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  step.done
                    ? 'bg-accent text-[#022c22]'
                    : isCurrent
                      ? 'border-accent text-ink-green border-2'
                      : 'border-border text-text-mute border',
                )}
              >
                {step.done ? <Check size={15} strokeWidth={3} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn('text-sm font-semibold', step.done ? 'text-text-dim' : 'text-text')}
                >
                  {step.title}
                  <span className="sr-only">
                    {step.done ? ' (done)' : isCurrent ? ' (next)' : ''}
                  </span>
                </p>
                <p className="text-text-mute truncate text-xs">{step.detail}</p>
              </div>
              {!step.done && step.action && (
                <LoanActionLink
                  action={step.action}
                  className={cn('min-h-9 shrink-0 text-xs', !isCurrent && 'text-text-dim')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The two factors with the most points still to gain, each with its one action. */
function Boosts({ credit }: { credit: Credit }) {
  const top = [...credit.steps]
    .filter((s) => s.available > 0)
    .sort((a, b) => b.available - a.available)
    .slice(0, 2);
  return (
    <section aria-labelledby="boost-title" className={loanUi.panel}>
      <h3 id="boost-title" className={cn(loanUi.title, 'flex items-center gap-2')}>
        <TrendingUp size={18} aria-hidden="true" className="text-ink-green" />
        Raise your score
      </h3>
      {top.length === 0 ? (
        <p className="text-text-dim mt-3 text-sm">
          Every factor is at its maximum. Keep recording.
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {top.map((step) => (
            <li key={step.key} className="border-border rounded-2xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-text text-sm font-semibold">{step.label}</p>
                <span className="bg-accent/15 text-ink-green rounded-full px-2 py-0.5 text-xs font-bold tabular-nums">
                  +{step.available} pts
                </span>
              </div>
              <p className="text-text-mute mt-0.5 text-xs">{step.help}</p>
              <LoanActionLink
                action={{ label: step.action, href: step.href }}
                className="min-h-9 text-xs"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The farmer's transaction history as a PDF, always one tap away (proof for any lender). */
function History({ credit }: { credit: Credit }) {
  return (
    <section aria-labelledby="history-title" className={loanUi.panel}>
      <h3 id="history-title" className={cn(loanUi.title, 'flex items-center gap-2')}>
        <FileDown size={18} aria-hidden="true" className="text-ink-green" />
        Your transaction history
      </h3>
      <p className="text-text-mute mt-1 text-xs">
        {credit.totalEntries} {credit.totalEntries === 1 ? 'entry' : 'entries'} as a PDF: proof of
        your income and expenses for any bank or lender.
      </p>
      <div className="mt-3">
        <StatementDownload compact />
      </div>
    </section>
  );
}

/** Everything behind the score, closed until the farmer asks for it. */
function ScoreDetails({ credit }: { credit: Credit }) {
  const { summary } = credit;
  return (
    <details className={cn(loanUi.panel, 'group')}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 select-none [&::-webkit-details-marker]:hidden">
        <span>
          <span className={cn(loanUi.title, 'block')}>How your score is worked out</span>
          <span className="text-text-mute text-xs">
            {credit.score} · {credit.band}
            {credit.missing.length > 0 && ` · ${credit.missing.length} things missing`}
          </span>
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className="text-text-mute shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-5 grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ScoreFactors
          steps={credit.steps}
          bestKey={credit.best?.key ?? null}
          details={credit.factors}
        />
        <div className="space-y-4">
          {credit.missing.length > 0 && (
            <div>
              <p className="text-text text-sm font-semibold">Still missing</p>
              <ul className="mt-2 space-y-1.5">
                {credit.missing.map((item) => (
                  <li key={item} className="text-text-dim flex gap-2 text-xs leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="bg-gold mt-1.5 size-1.5 shrink-0 rounded-full"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-text-mute text-xs leading-relaxed">
            {SCORE_EXPLANATION}
            {summary.computedAt ? ` Updated ${formatGhanaDate(summary.computedAt)}.` : ''}
          </p>
        </div>
      </div>
    </details>
  );
}
