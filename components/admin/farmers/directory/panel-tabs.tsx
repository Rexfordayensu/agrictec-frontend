'use client';

import { adminPath } from '@/lib/admin-path';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChartNoAxesColumn,
  Check,
  CircleCheck,
  Clock,
  Database,
  History,
  IdCard,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sprout,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CheckView } from '@/components/admin/farmers/directory/farmer-cells';
import { farmPlace } from '@/components/admin/farmers/directory/farmer-cells';
import type { TimelineItem } from '@/components/admin/farmers/directory/panel-timeline';
import { RejectDialog } from '@/components/admin/verifications/reject-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { KIND_LABEL } from '@/lib/admin/verification-queue';
import { formatDate } from '@/lib/format';
import { cropNames, formatFarmSize } from '@/lib/profile';
import { cn } from '@/lib/utils';
import { verificationsService } from '@/services/admin/verifications.service';
import type { FarmerAccount, FarmerDetail, VerificationRequest } from '@/types/admin';

/** A bordered block with an outline icon beside its title, as in the panel's design. */
export function PanelSection({
  icon: Icon,
  title,
  sub,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-border bg-bg-2 rounded-2xl border p-3.5">
      <div className="mb-2.5 flex items-start gap-2.5">
        <Icon size={18} aria-hidden="true" className="text-text mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="text-text text-base font-bold">{title}</h3>
          {sub && <p className="text-text-dim mt-0.5 text-xs">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] items-start gap-3 py-1 text-sm">
      <dt className="text-text-dim">{label}</dt>
      <dd className="text-text min-w-0 break-words">{children}</dd>
    </div>
  );
}

const CHECK_PILL: Record<CheckView['state'], { label: string; className: string }> = {
  verified: { label: 'Verified', className: 'bg-accent/15 text-ink-green' },
  pending: { label: 'Waiting', className: 'bg-gold/15 text-ink-gold' },
  rejected: { label: 'Rejected', className: 'bg-danger/12 text-ink-red' },
  missing: { label: 'Not verified', className: 'bg-glass-strong text-text-dim' },
};

const CHECK_TITLE: Record<CheckView['kind'], string> = {
  phone: 'Phone verified',
  location: 'Farm location verified',
  ghanaCard: 'Ghana Card review (AgriCtec)',
};

/** The three checks, each with its stored state. */
export function ChecksList({ checks }: { checks: CheckView[] }) {
  const allDone = checks.every((c) => c.state === 'verified');
  return (
    <ul className={cn('space-y-1 rounded-xl p-2', allDone ? 'bg-accent/8' : 'bg-glass-strong/50')}>
      {checks.map((check) => {
        const pill = CHECK_PILL[check.state];
        const Icon =
          check.state === 'verified'
            ? Check
            : check.state === 'pending'
              ? Clock
              : check.state === 'rejected'
                ? X
                : { phone: Smartphone, location: MapPin, ghanaCard: IdCard }[check.kind];
        return (
          <li
            key={check.kind}
            title={check.description}
            className="flex items-center gap-3 px-1.5 py-1.5"
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded-full',
                check.state === 'verified' && 'bg-accent text-white',
                check.state === 'pending' && 'bg-gold/20 text-ink-gold',
                check.state === 'rejected' && 'bg-danger/15 text-ink-red',
                check.state === 'missing' && 'border-border text-text-mute border',
              )}
            >
              <Icon size={11} strokeWidth={check.state === 'verified' ? 3.5 : 2} />
            </span>
            <span className="text-text min-w-0 flex-1 text-sm">
              {check.state === 'verified' ? CHECK_TITLE[check.kind] : check.label}
              <span className="sr-only">: {check.description}</span>
            </span>
            <span className={cn('rounded-md px-2 py-0.5 text-xs font-semibold', pill.className)}>
              {pill.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3">
          {index < items.length - 1 && (
            <span
              aria-hidden="true"
              className="bg-border absolute top-4 bottom-[-1rem] left-[3px] w-px"
            />
          )}
          <span
            aria-hidden="true"
            className={cn(
              'relative mt-1.5 size-2 shrink-0 rounded-full',
              item.tone === 'purple' && 'bg-purple',
              item.tone === 'green' && 'bg-accent',
              item.tone === 'red' && 'bg-danger',
              item.tone === 'grey' && 'bg-text-mute/60',
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-text text-sm font-semibold">{item.title}</p>
              <time
                dateTime={item.at}
                title={new Date(item.at).toLocaleString()}
                className="text-text-dim shrink-0 text-xs"
              >
                {formatDate(new Date(item.at))}
              </time>
            </div>
            {item.detail && (
              <p className="text-text-dim mt-0.5 text-xs break-words">{item.detail}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

const statusCount = (detail: FarmerDetail | null, ...keys: string[]) =>
  detail ? keys.reduce((sum, key) => sum + (detail.transactionStatusCounts?.[key] ?? 0), 0) : null;

// ---------- Overview ----------

export function OverviewPanel({
  farmer,
  detail,
  checks,
  timeline,
  onViewActivity,
}: {
  farmer: FarmerAccount;
  detail: FarmerDetail | null;
  checks: CheckView[];
  timeline: TimelineItem[] | null;
  onViewActivity: () => void;
}) {
  const p = farmer.profile;
  const crops = cropNames(p);
  const verified = statusCount(detail, 'verified');
  const waiting = statusCount(detail, 'verification_pending', 'disputed');
  return (
    <div className="space-y-3">
      <PanelSection icon={UserRound} title="Farmer details">
        <dl>
          <DetailLine label="Phone">
            {p.phone || <span className="text-text-mute">Not given</span>}
          </DetailLine>
          {p.farmName && <DetailLine label="Farm">{p.farmName}</DetailLine>}
          <DetailLine label="Farm location">
            {farmPlace(farmer) || <span className="text-text-mute">Not given</span>}
            {p.community ? ` · ${p.community}` : ''}
          </DetailLine>
          {p.acres > 0 && (
            <DetailLine label="Farm size">{formatFarmSize(p.acres, p.sizeUnit)}</DetailLine>
          )}
          <DetailLine label="Crops">
            {crops.length === 0 ? (
              <span className="text-text-mute">None yet</span>
            ) : (
              <span className="flex flex-wrap gap-1.5">
                {crops.map((crop) => (
                  <span
                    key={crop}
                    className="bg-accent/12 text-ink-green inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  >
                    <Sprout size={12} aria-hidden="true" />
                    {crop}
                  </span>
                ))}
              </span>
            )}
          </DetailLine>
        </dl>
      </PanelSection>

      <PanelSection icon={ShieldCheck} title="Verification status">
        <ChecksList checks={checks} />
      </PanelSection>

      <PanelSection
        icon={ChartNoAxesColumn}
        title="Records summary"
        sub="Counts only: amounts are seen in Transactions review"
      >
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              ['Farm records', Database, farmer.stats.records.toLocaleString()],
              ['MoMo entries', ReceiptText, farmer.stats.momo.toLocaleString()],
            ] as const
          ).map(([label, Icon, value]) => (
            <div key={label} className="bg-glass-strong/50 flex items-center gap-3 rounded-xl p-3">
              <span
                aria-hidden="true"
                className="bg-purple/12 text-ink-purple inline-flex size-10 shrink-0 items-center justify-center rounded-full"
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="text-text-dim block text-xs">{label}</span>
                <span className="font-display text-text block text-lg font-bold break-words tabular-nums sm:text-xl">
                  {value}
                </span>
              </span>
            </div>
          ))}
        </div>
        <div className="text-text-dim mt-2.5 text-xs">
          {verified === null ? (
            <Skeleton className="h-4 w-48" />
          ) : (
            <>
              {verified} entr{verified === 1 ? 'y' : 'ies'} verified with evidence · {waiting}{' '}
              waiting for review
            </>
          )}
        </div>
      </PanelSection>

      <PanelSection
        icon={History}
        title="Recent activity"
        action={
          timeline && timeline.length > 2 ? (
            <button
              type="button"
              onClick={onViewActivity}
              className="text-ink-purple inline-flex min-h-7 items-center gap-1 text-xs font-semibold hover:underline"
            >
              View all <ArrowRight size={13} aria-hidden="true" />
            </button>
          ) : undefined
        }
      >
        {timeline ? (
          <Timeline items={timeline.slice(0, 2)} />
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </PanelSection>
    </div>
  );
}

// ---------- Records ----------

const ENTRY_STATES: { keys: string[]; label: string; bar: string }[] = [
  { keys: ['verified'], label: 'Verified with evidence', bar: 'bg-accent' },
  { keys: ['verification_pending', 'disputed'], label: 'Waiting for review', bar: 'bg-gold' },
  { keys: ['evidence_submitted'], label: 'Evidence added, not sent', bar: 'bg-info' },
  { keys: ['self_reported'], label: 'Self-reported only', bar: 'bg-text-mute/60' },
  { keys: ['rejected'], label: 'Rejected', bar: 'bg-danger' },
];

/**
 * Totals only. A farmer's individual entries open in Transactions review, where each one is
 * checked against its evidence (the API never sends them elsewhere).
 */
export function RecordsPanel({
  farmer,
  detail,
  canReview,
}: {
  farmer: FarmerAccount;
  detail: FarmerDetail | null;
  canReview: boolean;
}) {
  const s = farmer.stats;
  const total = statusCount(detail, ...ENTRY_STATES.flatMap((e) => e.keys)) ?? 0;
  return (
    <div className="space-y-3">
      <PanelSection icon={ReceiptText} title="Records" sub="Counts only, never amounts">
        <dl className="grid grid-cols-2 gap-2.5">
          {(
            [
              ['Farm records', s.records.toLocaleString()],
              ['MoMo entries', s.momo.toLocaleString()],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="bg-glass-strong/50 rounded-xl p-3">
              <dt className="text-text-dim text-xs">{label}</dt>
              <dd className="text-text mt-0.5 text-lg font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </PanelSection>

      <PanelSection
        icon={CircleCheck}
        title="Entry checks"
        sub="Farm records and MoMo entries together"
      >
        {detail === null ? (
          <Skeleton className="h-28 w-full" />
        ) : total === 0 ? (
          <p className="text-text-dim text-sm">No entries recorded yet.</p>
        ) : (
          <ul className="space-y-2.5">
            {ENTRY_STATES.map((state) => {
              const n = statusCount(detail, ...state.keys) ?? 0;
              return (
                <li key={state.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-dim">{state.label}</span>
                    <span className="text-text font-semibold tabular-nums">{n}</span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="bg-glass-strong mt-1 h-1.5 overflow-hidden rounded-full"
                  >
                    <div
                      className={cn('h-full rounded-full', state.bar)}
                      style={{ width: `${(n / total) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelSection>

      <p className="text-text-dim px-1 text-xs">
        A farmer&rsquo;s amounts are confidential. Each entry is shown only in Transactions review,
        while it is checked against its evidence.
      </p>
      {canReview && (
        <Link
          href={adminPath('/admin/transactions')}
          className="border-purple/50 text-ink-purple hover:bg-purple/8 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors"
        >
          Open Transactions review <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

// ---------- Verifications ----------

const REQUEST_PILL: Record<VerificationRequest['status'], string> = {
  pending: 'bg-gold/15 text-ink-gold',
  approved: 'bg-accent/15 text-ink-green',
  rejected: 'bg-danger/12 text-ink-red',
};

export function VerificationsPanel({
  farmer,
  checks,
  requests,
  canReview,
  onChanged,
}: {
  farmer: FarmerAccount;
  checks: CheckView[];
  requests: VerificationRequest[] | null;
  canReview: boolean;
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<VerificationRequest | null>(null);

  async function approve(request: VerificationRequest) {
    setBusyId(request.id);
    try {
      await verificationsService.approve(request.id);
      toast.success(`${KIND_LABEL[request.kind]} approved`);
      onChanged();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not approve');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      <PanelSection icon={ShieldCheck} title="Verification status">
        <ChecksList checks={checks} />
        <p className="text-text-dim mt-2.5 text-xs">
          A Ghana Card is reviewed by AgriCtec staff. It is not checked with the NIA.
        </p>
      </PanelSection>

      <PanelSection
        icon={History}
        title="Requests"
        sub="Every check this farmer submitted, newest first"
      >
        {requests === null ? (
          <Skeleton className="h-24 w-full" />
        ) : requests.length === 0 ? (
          <p className="text-text-dim text-sm">No verification requests yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {requests.map((r) => (
              <li key={r.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-text text-sm font-semibold">
                      {KIND_LABEL[r.kind]}{' '}
                      <span className="text-text-mute font-mono text-xs font-normal">
                        {r.submittedValue}
                      </span>
                    </p>
                    <p className="text-text-dim mt-0.5 text-xs">
                      Submitted {formatDate(new Date(r.submittedAt))}
                      {r.reviewedAt && ` · reviewed ${formatDate(new Date(r.reviewedAt))}`}
                      {r.reviewedBy && ` by ${r.reviewedBy}`}
                    </p>
                    {r.reason && (
                      <p className="text-text-dim mt-0.5 text-xs">
                        {r.reason}
                        {r.note && ` (${r.note})`}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold capitalize',
                      REQUEST_PILL[r.status],
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                {canReview && r.status === 'pending' && (
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      icon={Check}
                      loading={busyId === r.id}
                      onClick={() => void approve(r)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={X}
                      disabled={busyId === r.id}
                      onClick={() => setRejecting(r)}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelSection>

      <RejectDialog
        request={rejecting}
        farmerName={farmer.profile.name || farmer.email}
        onClose={() => setRejecting(null)}
        onRejected={() => {
          setRejecting(null);
          onChanged();
        }}
      />
    </div>
  );
}

// ---------- Activity ----------

export function ActivityPanel({
  timeline,
  canAudit,
}: {
  timeline: TimelineItem[] | null;
  canAudit: boolean;
}) {
  return (
    <div className="space-y-3">
      <PanelSection
        icon={History}
        title="Activity"
        sub={
          canAudit
            ? 'Account, verification and admin actions, newest first'
            : 'Account and verification events (your role can’t view the audit log)'
        }
      >
        {timeline ? <Timeline items={timeline} /> : <Skeleton className="h-40 w-full" />}
      </PanelSection>
    </div>
  );
}
