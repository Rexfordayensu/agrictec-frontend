'use client';

import Link from 'next/link';
import { ArrowRight, Check, FileText } from 'lucide-react';
import { loanUi } from '@/components/loans/loan-ui';
import { MyApplications } from '@/components/loans/my-applications';
import { Badge } from '@/components/ui/badge';
import { LogoLoader } from '@/components/ui/logo-loader';
import {
  APPLICATION_STAGES,
  APPLICATION_STATUS,
  applicationProgress,
} from '@/lib/loans/application-status';
import { cn } from '@/lib/utils';
import { useApplicationsStore } from '@/store/applications-store';
import { useLoanStore } from '@/store/loan-store';
import type { ApplicationSummary } from '@/types/applications';

const money = (value: string) =>
  `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The farmer's applications prepared through AgriCtec, each with where it has got to, then
 * (only if there are any) earlier applications recorded before this process, read-only.
 */
export function FarmerApplications() {
  const earlier = useLoanStore((s) => s.applications);
  const apps = useApplicationsStore((s) => s.list);
  const status = useApplicationsStore((s) => s.status);
  const error = useApplicationsStore((s) => s.error);

  return (
    <div className="space-y-5">
      {status === 'error' ? (
        <p role="alert" className={cn(loanUi.panel, 'text-ink-red text-sm')}>
          {error}
        </p>
      ) : status !== 'ready' && apps.length === 0 ? (
        <LogoLoader center label="Loading your applications" className="min-h-32" />
      ) : apps.length === 0 ? (
        <section className={cn(loanUi.panel, 'flex flex-col items-center gap-3 py-10 text-center')}>
          <span className="bg-glass-strong text-text-mute inline-flex size-12 items-center justify-center rounded-2xl">
            <FileText size={22} aria-hidden="true" />
          </span>
          <h3 className={loanUi.title}>No applications yet</h3>
          <p className="text-text-dim max-w-md text-sm">
            Open a lender’s loan product and choose “Start your application”. AgriCtec checks it
            against your records, then sends it to the lender with your consent.
          </p>
        </section>
      ) : (
        <ul className="space-y-3" aria-label="Your applications">
          {apps.map((app) => (
            <li key={app.id}>
              <ApplicationCard app={app} />
            </li>
          ))}
        </ul>
      )}
      {earlier.length > 0 && (
        <div>
          <p className="text-text-mute mb-2 px-1 text-xs">
            Earlier applications, recorded before applications were prepared through AgriCtec
            (read-only):
          </p>
          <MyApplications />
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ app }: { app: ApplicationSummary }) {
  const { done, current } = applicationProgress(app.status);
  const style = APPLICATION_STATUS[app.status];
  const ended = app.status === 'withdrawn';
  return (
    <Link
      href={`/loans/applications/${app.id}`}
      className={cn(loanUi.panel, 'hover:border-accent/40 group block transition-colors')}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-text font-semibold">
            {app.productName} <span className="text-text-dim font-normal">· {app.lenderName}</span>
          </p>
          <p className="text-text-mute mt-0.5 text-xs">
            {money(app.amount)} · {app.months} months · {app.reference}
          </p>
        </div>
        <Badge color={style.color}>{app.statusLabel}</Badge>
      </div>

      {!ended && (
        <ol className="mt-4 grid grid-cols-4 gap-1.5" aria-label="Progress">
          {APPLICATION_STAGES.map((stage, i) => {
            const isDone = i < done;
            const isCurrent = i === current;
            return (
              <li key={stage} className="min-w-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    'block h-1.5 rounded-full',
                    isDone ? 'bg-accent' : isCurrent ? 'bg-accent/40' : 'bg-glass-strong',
                    app.status === 'rejected_by_lender' && i === 3 && 'bg-danger/70',
                  )}
                />
                <span
                  className={cn(
                    'mt-1.5 hidden items-center gap-1 truncate text-[11px] sm:flex',
                    isDone || isCurrent ? 'text-text-dim' : 'text-text-mute',
                  )}
                >
                  {isDone && (
                    <Check size={11} aria-hidden="true" className="text-ink-green shrink-0" />
                  )}
                  <span className="truncate">{stage}</span>
                  <span className="sr-only">
                    {isDone ? ' (done)' : isCurrent ? ' (in progress)' : ''}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {!ended && current >= 0 && (
        <p className="text-text-mute mt-1.5 text-[11px] sm:hidden">
          Stage {current + 1} of {APPLICATION_STAGES.length}: {APPLICATION_STAGES[current]}
        </p>
      )}

      <p className="text-text-dim mt-3 flex items-center justify-between gap-2 text-sm">
        <span>{style.farmerHint}</span>
        <ArrowRight
          size={15}
          aria-hidden="true"
          className="text-text-mute shrink-0 transition-transform group-hover:translate-x-0.5"
        />
      </p>
    </Link>
  );
}
