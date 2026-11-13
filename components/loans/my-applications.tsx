'use client';

import { useId, useState } from 'react';
import {
  Ban,
  BadgeCheck,
  Banknote,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Hourglass,
  Inbox,
  Landmark,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { loanUi } from '@/components/loans/loan-ui';
import { LenderLogo } from '@/components/shared/lender-logo';
import { EmptyState } from '@/components/ui/empty-state';
import { LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import { formatDate, formatGHS, formatGhanaDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useLoanStore } from '@/store/loan-store';
import { usePlatformStore } from '@/store/platform-store';
import type { LoanApplication, LoanStatus } from '@/types';

/** How each status looks to the farmer. */
const STATUS_STYLE: Record<LoanStatus, { color: BadgeColor; icon: LucideIcon; hint: string }> = {
  submitted: { color: 'blue', icon: Send, hint: 'Sent to the lender. A review starts soon.' },
  under_review: {
    color: 'gold',
    icon: Hourglass,
    hint: 'The lender is checking your records. They may call you.',
  },
  approved: { color: 'green', icon: BadgeCheck, hint: 'Approved. The lender will send the funds.' },
  rejected: { color: 'red', icon: Ban, hint: 'Not approved this time.' },
  disbursed: {
    color: 'purple',
    icon: Banknote,
    hint: 'Funds sent. Keep up your monthly repayments.',
  },
  repaid: { color: 'green', icon: CircleCheck, hint: 'Fully repaid. Well done!' },
  defaulted: {
    color: 'red',
    icon: CircleAlert,
    hint: 'Repayments are overdue. Contact your lender.',
  },
};

function ApplicationItem({ app }: { app: LoanApplication }) {
  // The name comes with the application; the logo only while the lender is still listed.
  const listed = usePlatformStore((s) => s.lenders.find((l) => l.id === app.partnerId));
  const name = app.partnerName ?? listed?.name ?? 'Lender';
  const [open, setOpen] = useState(false);
  const timelineId = useId();
  const style = STATUS_STYLE[app.status];
  const StatusIcon = style.icon;
  // Newest step first, so the latest news is at the top of the timeline.
  const steps = [...app.history].reverse();
  // The latest note (e.g. why it was not approved) is shown without opening the timeline.
  const latestNote = steps.find((step) => step.note)?.note;

  return (
    <li className="border-border bg-glass rounded-card border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <LenderLogo
          name={name}
          color={listed?.color ?? '#64748b'}
          logoPath={listed?.logoPath}
          size={40}
        />
        <div className="min-w-0 flex-1">
          <p className="text-text text-sm font-semibold wrap-break-word">{name}</p>
          <p className="text-text-mute text-xs">
            {app.purpose} · sent {formatGhanaDate(app.createdAt)}
          </p>
        </div>
        <Badge color={style.color} className="shrink-0">
          <StatusIcon size={11} aria-hidden="true" />
          {LOAN_STATUS_LABELS[app.status]}
        </Badge>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-text-mute">Amount</dt>
          <dd className="text-text text-sm font-bold tabular-nums">{formatGHS(app.amount)}</dd>
        </div>
        <div>
          <dt className="text-text-mute">Monthly</dt>
          <dd className="text-text text-sm font-bold tabular-nums">{formatGHS(app.monthly)}</dd>
        </div>
        <div>
          <dt className="text-text-mute">Term</dt>
          <dd className="text-text text-sm font-bold">
            {app.months} months
            <span className="text-text-mute block text-xs font-normal">{app.rate}% a year</span>
          </dd>
        </div>
      </dl>

      <p className="text-text-dim mt-3 text-xs">{style.hint}</p>
      {latestNote && (
        <p
          className={cn(
            'mt-2 rounded-xl border px-3 py-2 text-xs',
            app.status === 'rejected' || app.status === 'defaulted'
              ? 'border-danger/30 bg-danger/5 text-text'
              : 'border-border bg-glass-strong text-text',
          )}
        >
          <span className="text-text-mute font-semibold">Latest note: </span>
          {latestNote}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-text-mute font-mono text-xs">Ref {app.reference}</p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={timelineId}
          className="text-ink-green inline-flex min-h-9 items-center gap-1 text-xs font-semibold"
        >
          {open ? 'Hide timeline' : 'Show timeline'}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </button>
      </div>

      {open && (
        <ol id={timelineId} aria-label="Application timeline" className="mt-3 space-y-3">
          {steps.map((step, index) => {
            const stepStyle = STATUS_STYLE[step.status];
            const StepIcon = stepStyle.icon;
            return (
              <li key={`${step.status}-${step.at}`} className="relative flex gap-3">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="bg-border absolute top-7 bottom-[-0.75rem] left-3 w-px"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative inline-flex size-6 shrink-0 items-center justify-center rounded-full',
                    index === 0 ? 'bg-accent/20 text-ink-green' : 'bg-glass-strong text-text-mute',
                  )}
                >
                  <StepIcon size={12} />
                </span>
                <div className="min-w-0 pb-1">
                  <p className="text-text text-xs font-semibold">
                    {LOAN_STATUS_LABELS[step.status]}
                    <span className="text-text-mute font-normal">
                      {' '}
                      · {formatGhanaDate(step.at)}
                    </span>
                  </p>
                  {step.note && <p className="text-text-dim mt-0.5 text-xs">{step.note}</p>}
                  {step.disbursedOn && (
                    <p className="text-text-dim mt-0.5 text-xs">
                      Funds sent {formatDate(step.disbursedOn)}
                      {step.disbursementRef && ` · Ref ${step.disbursementRef}`}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </li>
  );
}

/** Applications the farmer has sent, newest first, with the status the lender/admin sets. */
export function MyApplications({ className }: { className?: string }) {
  const applications = useLoanStore((s) => s.applications);
  const setTab = useLoanStore((s) => s.setTab);
  const total = applications.reduce((sum, app) => sum + app.amount, 0);

  return (
    <section
      aria-labelledby="applications-title"
      className={cn(loanUi.panel, '@container', className)}
    >
      <div className="mb-5">
        <h3 id="applications-title" className={loanUi.title}>
          My applications
        </h3>
        <p className={loanUi.sub}>
          {applications.length > 0
            ? `${applications.length} sent · ${formatGHS(total)} requested in total`
            : 'Track what you have sent to lenders'}
        </p>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No applications yet"
          description="Applications you make through AgriCtec, and their status, appear here."
          action={
            <Button icon={Landmark} onClick={() => setTab('lenders')}>
              See lenders
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 @3xl:grid-cols-2">
          {applications.map((app) => (
            <ApplicationItem key={app.id} app={app} />
          ))}
        </ul>
      )}
    </section>
  );
}
