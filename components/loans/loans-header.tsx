'use client';

import type { ReactNode } from 'react';
import { LoanActionButton, loanUi } from '@/components/loans/loan-ui';
import { StatementDownload } from '@/components/loans/statement-download';
import { useCredit, useLoanPath, useLoanTab } from '@/hooks/use-credit';
import { isOpenApplication } from '@/lib/loans/application-status';
import type { LoanAction } from '@/lib/loans/loan-path';
import { cn } from '@/lib/utils';
import { useApplicationsStore } from '@/store/applications-store';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import type { ApplicationStatus, ApplicationSummary } from '@/types/applications';

const MIN = 300;
const MAX = 850;

const BAND_TONE: Record<string, string> = {
  Building: 'bg-danger/80',
  Fair: 'bg-gold',
  Good: 'bg-accent/70',
  Excellent: 'bg-accent',
};

const AT_AGRICTEC: ApplicationStatus[] = ['submitted', 'in_review', 'approved_for_sending'];

/** The status card's one button, or the transaction-history download when no lender is listed. */
type Next = LoanAction | 'statement' | null;

/**
 * The top of /loans: what to do now (a short headline, one line, one button), then three
 * numbers. Driven by the farmer's applications, Ghana Card and whether lenders are listed.
 */
export function LoansHeader() {
  const credit = useCredit();
  const path = useLoanPath(credit);
  const applications = useApplicationsStore((s) => s.list);
  const lenderCount = usePlatformStore((s) => s.lenders.length);
  const tab = useLoanTab();
  if (!credit || !path) return null;

  const open = applications.filter((a) => isOpenApplication(a.status));
  const draft = applications.find((a) => a.status === 'draft');
  const latest = applications.find((a) => a.status !== 'draft');
  const remaining = path.steps.filter((s) => !s.done && s.key !== 'apply').length;
  const next = path.current >= 0 ? path.steps[path.current] : null;
  const lender = (a: ApplicationSummary) => a.lenderName ?? 'the lender';
  const go = (a: ApplicationSummary, label: string): LoanAction => ({
    label,
    href: `/loans/applications/${a.id}`,
  });

  let headline: string;
  let detail: string;
  let action: Next = null;
  let attention = false;
  if (credit.underReview) {
    attention = true;
    headline = 'Your account is under review';
    detail = 'You can apply again once AgriCtec finishes.';
  } else if (open.length > 0) {
    const app = open[0];
    if (app.status === 'changes_requested' || app.status === 'documents_requested') {
      attention = true;
      headline =
        app.status === 'changes_requested' ? 'Update your application' : 'Send more documents';
      detail = `${app.status === 'changes_requested' ? 'AgriCtec' : lender(app)} needs something from you.`;
      action = go(app, 'Open application');
    } else if (AT_AGRICTEC.includes(app.status)) {
      headline = 'AgriCtec is checking your application';
      detail = `${app.productName ?? 'Your loan'} · ${lender(app)}. We’ll notify you.`;
      action = go(app, 'Track');
    } else {
      headline = `Your application is with ${lender(app)}`;
      detail = `${app.statusLabel}. We’ll notify you of any update.`;
      action = go(app, 'Track');
    }
  } else if (draft && credit.ready) {
    headline = 'Finish your application';
    detail = `${draft.productName ?? 'Loan'} · ${lender(draft)}`;
    action = go(draft, 'Continue');
  } else if (credit.ready && lenderCount > 0) {
    headline = 'You’re ready to apply';
    detail = 'Pick a loan product from a verified lender.';
    action = { label: 'See lenders', run: 'lenders' };
  } else if (credit.ready) {
    headline = 'No lenders listed yet';
    detail = 'Take your transaction history to a bank yourself.';
    action = 'statement';
  } else {
    attention = true;
    headline = `${remaining} step${remaining === 1 ? '' : 's'} to get loan-ready`;
    detail = next ? `Next: ${next.title}` : '';
    action = next?.action ?? null;
  }

  // No button that only reopens the tab already on screen.
  const opensCurrentTab =
    action !== null && typeof action === 'object' && 'run' in action && action.run === tab;
  const pct = ((Math.min(MAX, Math.max(MIN, credit.score)) - MIN) / (MAX - MIN)) * 100;
  const submitted = applications.filter((a) => a.status !== 'draft').length;

  return (
    <header className="flex flex-col gap-3">
      <section
        aria-labelledby="loans-status-title"
        className={cn(
          'rounded-card border p-4 sm:p-5',
          attention ? 'border-gold/35 bg-gold/8' : 'border-accent/30 bg-accent/6',
        )}
      >
        <div className="flex flex-col gap-3 @xl:flex-row @xl:items-center @xl:justify-between @xl:gap-6">
          <div className="min-w-0">
            <h2
              id="loans-status-title"
              className="text-text text-display leading-tight font-semibold tracking-[-0.5px] wrap-break-word"
            >
              {headline}
            </h2>
            {detail && <p className="text-text-dim mt-1 text-sm">{detail}</p>}
          </div>
          {action === 'statement' ? (
            <StatementDownload compact />
          ) : (
            action &&
            !opensCurrentTab && <LoanActionButton action={action} className="w-full @xl:w-auto" />
          )}
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-2 sm:gap-3">
        <Tile label="Score">
          <Big>{credit.score}</Big>
          <div
            role="img"
            aria-label={`${credit.score} on a scale from ${MIN} to ${MAX}: ${credit.band}`}
            className="bg-glass-strong mt-2 h-1 overflow-hidden rounded-full"
          >
            <div
              className={cn('h-full rounded-full', BAND_TONE[credit.band] ?? 'bg-accent')}
              style={{ width: `${pct}%` }}
            />
          </div>
          <Small>{credit.band}</Small>
        </Tile>
        <Tile label="Records">
          <Big>{credit.totalEntries}</Big>
          <Small>
            <span className="text-ink-green font-semibold">
              {Math.round(credit.verifiedShare)}%
            </span>{' '}
            verified
          </Small>
        </Tile>
        <ApplicationsTile latest={latest} count={submitted} />
      </dl>
    </header>
  );
}

const Big = ({ children }: { children: ReactNode }) => (
  <span className="text-text block text-2xl leading-none font-semibold tracking-[-0.5px] tabular-nums sm:text-2xl">
    {children}
  </span>
);

const Small = ({ children }: { children: ReactNode }) => (
  <span className="text-text-mute mt-1.5 block truncate text-xs sm:text-xs">{children}</span>
);

function Tile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="border-border bg-glass rounded-card min-w-0 border p-3 sm:p-4">
      <dt className="text-text-dim text-xs font-semibold sm:text-xs">{label}</dt>
      <dd className="mt-1.5">{children}</dd>
    </div>
  );
}

function ApplicationsTile({ latest, count }: { latest?: ApplicationSummary; count: number }) {
  const setTab = useLoanStore((s) => s.setTab);
  return (
    <div className="border-border bg-glass rounded-card min-w-0 border">
      <dt className="sr-only">Applications</dt>
      <dd className="h-full">
        <button
          type="button"
          onClick={() => setTab('applications')}
          className="hover:bg-glass-strong rounded-card flex h-full w-full flex-col items-start p-3 text-left transition-colors sm:p-4"
        >
          <span className="text-text-dim block text-xs font-semibold sm:text-xs" aria-hidden="true">
            Applications
          </span>
          <span className="mt-1.5 block">
            <Big>
              {count}
              <span className="sr-only"> submitted</span>
            </Big>
          </span>
          <span className={cn(loanUi.sub, 'mt-1.5 block truncate text-xs sm:text-xs')}>
            {latest ? latest.statusLabel : 'None yet'}
          </span>
        </button>
      </dd>
    </div>
  );
}
