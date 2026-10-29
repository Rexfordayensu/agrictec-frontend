'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { differenceInCalendarDays } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  FileX2,
  Minus,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import AdminLoading from '@/app/(admin)/admin/loading';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import {
  STATUS_ACTION,
  StatusChangeDialog,
  type StatusChange,
} from '@/components/admin/loans/status-change-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAdminRole } from '@/hooks/admin/use-can';
import { eligibilityChecks, totalCost } from '@/lib/admin/loan-pipeline';
import { DELETED_FARMER_LABEL, LOAN_STATUS_LABELS, nextStatuses } from '@/lib/admin/loan-status';
import { can } from '@/lib/admin/permissions';
import { bandTone } from '@/lib/admin/score-tone';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { formatDate, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { configService } from '@/services/admin/config.service';
import { farmersService } from '@/services/admin/farmers.service';
import { lendersService } from '@/services/admin/lenders.service';
import { loanApplicationsService } from '@/services/admin/loan-applications.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AdminRole, CreditConfig, FarmerDetail, Lender, LoanApplication } from '@/types/admin';

interface PageData {
  app: LoanApplication;
  /** Null when the role can't view farmers, or the farmer was deleted. */
  farmer: FarmerDetail | null;
  /** The farmer's account is gone: the application stays, but can only be closed out. */
  farmerDeleted: boolean;
  lender?: Lender;
  config: CreditConfig;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: PageData };

async function fetchLoanPage(id: string, role: AdminRole | undefined): Promise<LoadState> {
  try {
    const app = await loanApplicationsService.get(id);
    const [farmer, farmerDeleted, lenders, config] = await Promise.all([
      can(role, 'farmers.view')
        ? farmersService.getDetail(app.userId).catch(() => null)
        : Promise.resolve(null),
      loanApplicationsService.farmerExists(app.userId).then((exists) => !exists),
      lendersService.list({ includeInactive: true }),
      configService.getCreditConfig(),
    ]);
    return {
      status: 'ready',
      data: {
        app,
        farmer,
        farmerDeleted,
        lender: lenders.find((l) => l.id === app.partnerId),
        config,
      },
    };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : 'Could not load the application';
    return message === 'Loan application not found.'
      ? { status: 'missing' }
      : { status: 'error', message };
  }
}

/** A label over a value, for the facts grid. */
function Fact({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className={cn('text-text mt-0.5 tabular-nums', strong ? 'font-bold' : 'font-semibold')}>
        {value}
      </dd>
    </div>
  );
}

/** One application (phase A10): the facts, the farmer then and now, the rules today, the timeline. */
export function ApplicationDetail({ id }: { id: string }) {
  const role = useAdminRole();
  const canManage = can(role, 'loans.manage');
  const refreshConsole = useAdminDataStore((s) => s.refresh);
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [version, setVersion] = useState(0);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [change, setChange] = useState<StatusChange | null>(null);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let active = true;
    fetchLoanPage(id, role).then((next) => active && setState(next));
    return () => {
      active = false;
    };
  }, [id, role, version, syncVersion]);

  if (state.status === 'loading') return <AdminLoading />;

  if (state.status === 'missing' || state.status === 'error') {
    return (
      <Card className="mx-auto mt-6 max-w-lg">
        <EmptyState
          icon={FileX2}
          title={
            state.status === 'missing' ? 'Application not found' : 'Could not load the application'
          }
          description={
            state.status === 'missing'
              ? 'It may have been removed with its farmer, or the link is wrong.'
              : state.message
          }
          action={
            <Link
              href="/admin/loans"
              className="text-ink-purple inline-flex min-h-11 items-center gap-2 text-sm font-semibold"
            >
              <ArrowLeft size={16} aria-hidden="true" /> All applications
            </Link>
          }
        />
      </Card>
    );
  }

  const { app, farmer, farmerDeleted, lender, config } = state.data;
  const account = farmer?.account;
  const name = account
    ? account.profile.name || account.email
    : farmerDeleted
      ? DELETED_FARMER_LABEL
      : 'Farmer';
  const moves = canManage ? nextStatuses(app.status, farmerDeleted) : [];
  const cost = totalCost(app);
  const age = Math.max(0, differenceInCalendarDays(now, new Date(app.createdAt)));
  const scoreNow = account?.stats.score;
  const delta = scoreNow === undefined ? 0 : scoreNow - app.scoreAtApplication;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const checks = farmer
    ? eligibilityChecks({
        app,
        records: farmer.records,
        score: farmer.credit.score,
        lender,
        rules: config.eligibility,
      })
    : [];
  const failing = checks.filter((c) => !c.pass).length;
  const steps = [...app.history].reverse();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/loans"
          className="text-text-mute hover:text-text inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold"
        >
          <ArrowLeft size={15} aria-hidden="true" /> Loan applications
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-text text-2xl font-bold">{app.reference}</h1>
              <StatusBadge kind="loan" status={app.status} />
            </div>
            <p className="text-text-dim mt-1 text-sm">
              {app.purpose} · sent {formatDate(new Date(app.createdAt))} (
              {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`})
            </p>
          </div>
          {moves.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {moves.map((to) => (
                <Button
                  key={to}
                  onClick={() => setChange({ app, to })}
                  className={STATUS_ACTION[to].className}
                  icon={to === 'rejected' || to === 'defaulted' ? XCircle : ArrowRight}
                >
                  {STATUS_ACTION[to].label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="space-y-6">
          {/* The application */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Application</CardTitle>
                <CardSub>What the farmer asked for</CardSub>
              </div>
            </CardHeader>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <p className="font-display text-text text-3xl font-bold tabular-nums">
                {formatGHS(app.amount)}
              </p>
              <p className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="size-3 rounded-full"
                  style={{ backgroundColor: lender?.color ?? 'var(--text-mute)' }}
                />
                <span className="text-text font-semibold">{lender?.name ?? 'Unknown lender'}</span>
                {lender && !lender.active && <Badge color="gold">Inactive</Badge>}
              </p>
            </div>
            <dl className="border-border mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t pt-5 sm:grid-cols-3">
              <Fact label="Purpose" value={app.purpose} />
              <Fact label="Term" value={`${app.months} months`} />
              <Fact label="Rate" value={`${app.rate}% a year`} />
              <Fact label="Monthly payment" value={formatGHS(app.monthly)} strong />
              <Fact label="Total cost" value={formatGHS(cost.total)} strong />
              <Fact label="Interest" value={formatGHS(cost.interest)} />
            </dl>
            {app.disbursement && (
              <p className="border-purple/30 bg-purple/10 text-text mt-5 flex flex-wrap items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm">
                <Banknote size={16} aria-hidden="true" className="text-ink-purple" />
                Disbursed on {formatDate(app.disbursement.date)} · Ref{' '}
                <span className="font-mono">{app.disbursement.reference}</span>
              </p>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* The farmer */}
            <Card>
              <CardHeader>
                <CardTitle>Farmer</CardTitle>
              </CardHeader>
              {account ? (
                <div className="flex items-start gap-3.5">
                  <InitialsAvatar name={name} size="lg" />
                  <div className="min-w-0">
                    <p className="text-text truncate font-semibold">{name}</p>
                    <p className="text-text-mute text-xs">
                      {account.profile.region} · {account.profile.phone || 'No phone'}
                    </p>
                    <p className="text-text-mute text-xs">
                      {account.profile.farmName || 'Farm'} · {account.profile.acres} acres
                    </p>
                    <Link
                      href={`/admin/farmers/${account.userId}`}
                      className="text-ink-purple mt-2 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      Open full profile <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-text-mute text-sm">
                  {farmerDeleted
                    ? 'This farmer’s account was permanently deleted. The application stays on record for the lender; it can only be closed now.'
                    : 'Your role can’t view farmer profiles.'}
                </p>
              )}
            </Card>

            {/* Score then and now */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Credit score</CardTitle>
                  <CardSub>At application, and today</CardSub>
                </div>
              </CardHeader>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-text-mute text-xs">Then</p>
                  <p className="font-display text-text text-2xl font-bold tabular-nums">
                    {app.scoreAtApplication}
                  </p>
                  <p
                    className={cn(
                      'text-xs font-semibold',
                      bandTone(scoreLabel(app.scoreAtApplication, config.bands)).text,
                    )}
                  >
                    {scoreLabel(app.scoreAtApplication, config.bands)}
                  </p>
                </div>
                <span
                  className={cn(
                    'inline-flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-xs font-bold tabular-nums',
                    delta > 0
                      ? 'bg-accent/12 text-ink-green'
                      : delta < 0
                        ? 'bg-danger/12 text-ink-red'
                        : 'bg-glass-strong text-text-mute',
                  )}
                >
                  <DeltaIcon size={16} aria-hidden="true" />
                  {scoreNow === undefined ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                  <span className="sr-only">
                    {delta > 0 ? 'points up' : delta < 0 ? 'points down' : 'no change'}
                  </span>
                </span>
                <div>
                  <p className="text-text-mute text-xs">Now</p>
                  <p className="font-display text-text text-2xl font-bold tabular-nums">
                    {scoreNow ?? '—'}
                  </p>
                  {scoreNow !== undefined && (
                    <p
                      className={cn(
                        'text-xs font-semibold',
                        bandTone(scoreLabel(scoreNow, config.bands)).text,
                      )}
                    >
                      {scoreLabel(scoreNow, config.bands)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Eligibility, re-run */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Eligibility with today’s rules</CardTitle>
                <CardSub>
                  The same checks the farmer app runs, with the current credit rules
                </CardSub>
              </div>
              {checks.length > 0 && (
                <Badge color={failing ? 'red' : 'green'}>
                  {failing ? `Fails ${failing} of ${checks.length}` : `Passes all ${checks.length}`}
                </Badge>
              )}
            </CardHeader>
            {checks.length === 0 ? (
              <p className="text-text-mute text-sm">
                The farmer’s records are needed to re-run the checks.
              </p>
            ) : (
              <ul className="divide-border divide-y">
                {checks.map((check) => {
                  const Icon = check.pass ? CheckCircle2 : XCircle;
                  return (
                    <li key={check.key} className="flex items-center gap-3 py-2.5">
                      <Icon
                        size={18}
                        aria-hidden="true"
                        className={cn('shrink-0', check.pass ? 'text-ink-green' : 'text-ink-red')}
                      />
                      <span className="text-text min-w-0 flex-1 text-sm">
                        {check.label}
                        <span className="sr-only">{check.pass ? ': passes' : ': fails'}</span>
                      </span>
                      <span className="text-text-mute text-xs whitespace-nowrap">
                        {check.detail}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Timeline */}
        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle>Timeline</CardTitle>
              <CardSub>Newest first. The farmer sees these steps and notes.</CardSub>
            </div>
          </CardHeader>
          <ol aria-label="Status timeline" className="space-y-0">
            {steps.map((step, index) => (
              <li key={`${step.status}-${step.at}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="bg-border absolute top-6 bottom-0 left-[11px] w-px"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={cn(
                    'relative mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                    index === 0 ? 'border-purple bg-purple/20' : 'border-border bg-bg-2',
                  )}
                >
                  <span
                    className={cn(
                      'size-2 rounded-full',
                      index === 0 ? 'bg-purple' : 'bg-text-mute/60',
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text text-sm font-semibold">
                    {LOAN_STATUS_LABELS[step.status]}
                  </p>
                  <p className="text-text-mute text-xs">
                    {step.by} · {formatDate(new Date(step.at))}{' '}
                    {new Date(step.at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {step.note && (
                    <p className="border-border bg-bg-2/60 text-text-dim mt-2 rounded-lg border px-3 py-2 text-sm">
                      {step.note}
                    </p>
                  )}
                  {step.disbursedOn && (
                    <p className="text-text-dim mt-1.5 text-xs">
                      Funds sent {formatDate(step.disbursedOn)} · Ref{' '}
                      <span className="font-mono">{step.disbursementRef}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <StatusChangeDialog
        change={change}
        farmerName={name}
        lenderName={lender?.name ?? 'the lender'}
        onClose={() => setChange(null)}
        onDone={() => {
          setChange(null);
          setVersion((v) => v + 1);
          void refreshConsole();
        }}
      />
    </div>
  );
}
