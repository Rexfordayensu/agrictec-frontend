'use client';

import { ChevronRight } from 'lucide-react';
import { LoanActionButton, loanUi } from '@/components/loans/loan-ui';
import { useCredit, useLoanPath, useLoanTab } from '@/hooks/use-credit';
import { LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { ACTIVE_STATUSES, type LoanAction } from '@/lib/loans/loan-path';
import { cn } from '@/lib/utils';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import { LOAN_REVIEW_EXPLANATION } from '@/lib/loans/score-policy';

const MIN = 300;
const MAX = 850;

const BAND_TONE: Record<string, string> = {
  Building: 'bg-danger/80',
  Fair: 'bg-gold',
  Good: 'bg-accent/70',
  Excellent: 'bg-accent',
};

/**
 * Where the farmer stands, in one sentence and one next step, then the three numbers that
 * matter. Everything comes from the API's credit summary and the farmer's applications.
 */
export function LoansHeader() {
  const credit = useCredit();
  const path = useLoanPath(credit);
  const applications = useLoanStore((s) => s.applications);
  const setTab = useLoanStore((s) => s.setTab);
  const lenderCount = usePlatformStore((s) => s.lenders.length);
  const tab = useLoanTab();
  if (!credit || !path) return null;

  const lenderName = (app: { partnerName?: string }) => app.partnerName ?? 'the lender';
  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status));
  const latest = applications[0];
  const remaining = path.steps.filter((s) => !s.done && s.key !== 'apply').length;
  const next = path.current >= 0 ? path.steps[path.current] : null;

  let eyebrow: string;
  let headline: string;
  let detail: string;
  let action: LoanAction | null = null;
  if (credit.underReview) {
    eyebrow = 'Applications paused';
    headline = 'Your account is being reviewed';
    detail =
      'AgriCtec is checking your account. You can apply again once the review is complete. Meanwhile you can see lenders and keep your transaction history up to date.';
  } else if (active.length > 0) {
    eyebrow = 'Application in progress';
    headline =
      active.length === 1
        ? `Your application is with ${lenderName(active[0])}`
        : `${active.length} applications in progress`;
    detail =
      active.length === 1
        ? `Status: ${LOAN_STATUS_LABELS[active[0].status].toLowerCase()}. We'll notify you when the lender updates it.`
        : 'We will notify you when a lender updates one of them.';
    action = { label: 'Track application', run: 'applications' };
  } else if (credit.ready) {
    eyebrow = 'Ghana Card reviewed';
    headline = 'See what lenders ask for';
    detail = lenderCount
      ? LOAN_REVIEW_EXPLANATION
      : 'No verified lenders are on AgriCtec yet. Keep your records up to date: they will be ready when lenders are.';
    action = lenderCount ? { label: 'See lenders', run: 'lenders' } : null;
  } else {
    eyebrow = 'Preparing your records';
    headline = `${remaining} preparation step${remaining === 1 ? '' : 's'} remaining`;
    detail = next ? `Next: ${next.title.toLowerCase()}. ${next.detail}.` : '';
    action = next?.action ?? null;
  }

  // No button that only reopens the tab already on screen.
  const opensCurrentTab =
    action !== null &&
    'run' in action &&
    ((action.run === 'lenders' && tab === 'lenders') ||
      (action.run === 'applications' && tab === 'applications'));
  const pct = ((Math.min(MAX, Math.max(MIN, credit.score)) - MIN) / (MAX - MIN)) * 100;

  return (
    <header className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-6">
        <div className="min-w-0">
          <p className={cn(loanUi.eyebrow, credit.underReview && 'text-ink-gold')}>{eyebrow}</p>
          <h2 className="text-text mt-2 text-[clamp(24px,3vw,32px)] leading-tight font-semibold tracking-[-0.6px] wrap-break-word">
            {headline}
          </h2>
          {detail && (
            <p className="text-text-dim mt-2 max-w-2xl text-sm leading-relaxed">{detail}</p>
          )}
        </div>
        {action && !opensCurrentTab && (
          <LoanActionButton action={action} className="w-full @xl:w-auto" />
        )}
      </div>

      <dl className="border-border bg-glass rounded-card grid grid-cols-2 overflow-hidden border @3xl:grid-cols-3">
        <div className="border-border min-w-0 border-r p-4 sm:p-5">
          <dt className="text-text-dim text-xs font-semibold">AgriCtec score</dt>
          <dd className="mt-1.5">
            <p className="text-text text-[28px] leading-none font-semibold tracking-[-0.6px] tabular-nums">
              {credit.score}
              <span className="text-text-mute text-sm font-normal tracking-normal"> / {MAX}</span>
            </p>
            <div
              role="img"
              aria-label={`${credit.score} on a scale from ${MIN} to ${MAX}: ${credit.band}`}
              className="bg-glass-strong mt-3 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className={cn('h-full rounded-full', BAND_TONE[credit.band] ?? 'bg-accent')}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-text-mute mt-2 text-xs">{credit.band}</p>
          </dd>
        </div>
        <div className="border-border min-w-0 p-4 sm:p-5 @3xl:border-r">
          <dt className="text-text-dim text-xs font-semibold">Verified entries</dt>
          <dd className="mt-1.5">
            <p className="text-ink-green text-[22px] leading-tight font-semibold tabular-nums @lg:text-[28px] @lg:leading-none">
              {Math.round(credit.verifiedShare)}%
            </p>
            <p className="text-text-mute mt-2 text-xs leading-relaxed">
              {credit.verifiedEntries} of {credit.totalEntries} entries checked by AgriCtec from
              evidence
            </p>
          </dd>
        </div>
        <div className="border-border col-span-2 min-w-0 border-t @3xl:col-span-1 @3xl:border-t-0">
          <dt className="sr-only">Applications</dt>
          <dd className="h-full">
            <button
              type="button"
              onClick={() => setTab('applications')}
              className="hover:bg-glass-strong flex h-full w-full items-center gap-3 p-4 text-left transition-colors sm:p-5"
            >
              <span className="min-w-0 flex-1">
                <span className="text-text-dim block text-xs font-semibold" aria-hidden="true">
                  Applications
                </span>
                <span className="text-text mt-1.5 block text-[22px] leading-none font-semibold tabular-nums @lg:text-[28px]">
                  {applications.length || 'None'}
                  <span className="sr-only"> applications</span>
                </span>
                <span className="text-text-mute mt-2 block truncate text-xs">
                  {latest
                    ? `Latest: ${LOAN_STATUS_LABELS[latest.status]} · ${lenderName(latest)}`
                    : 'Applications you send appear here'}
                </span>
              </span>
              <ChevronRight size={18} aria-hidden="true" className="text-text-mute shrink-0" />
            </button>
          </dd>
        </div>
      </dl>
    </header>
  );
}
