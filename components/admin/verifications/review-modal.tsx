'use client';

import { useEffect, useEffectEvent, useState } from 'react';
import Link from 'next/link';
import { formatDistanceStrict } from 'date-fns';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ShieldCheck,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import {
  APPROVE_CLASS,
  displayValue,
  KIND_ICON,
  Kbd,
  REJECT_CLASS,
} from '@/components/admin/verifications/kind-meta';
import { RejectDialog } from '@/components/admin/verifications/reject-dialog';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { bandTone, MAX_SCORE } from '@/lib/admin/score-tone';
import {
  duplicateWarning,
  findDuplicates,
  googleMapsUrl,
  isOverdue,
  KIND_LABEL,
  neighborId,
  nextAfterReview,
  parseLocation,
} from '@/lib/admin/verification-queue';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { rejectionMessage } from '@/lib/verification';
import { verificationsService } from '@/services/admin/verifications.service';
import type { CreditConfig, FarmerAccount, VerificationRequest } from '@/types/admin';

const nameOf = (f: FarmerAccount | undefined) => (f ? f.profile.name || f.email : 'Unknown farmer');

/** Keys typed into a field never trigger a shortcut. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/**
 * One request at a time, in queue order. A approves, R rejects, J/K move to the next or previous
 * request; after a decision the next pending request loads, so a reviewer can clear the queue
 * without the mouse. The service checks the permission and audits every decision.
 */
export function ReviewModal({
  requestId,
  queue,
  all,
  farmers,
  bands,
  canReview,
  now,
  onNavigate,
  onClose,
  onReviewed,
}: {
  /** Null = closed. */
  requestId: string | null;
  /** The list as shown (tab, filters, sort): J/K and "Request 3 of 12" follow it. */
  queue: VerificationRequest[];
  /** Every request, for the duplicate check and the farmer's history. */
  all: VerificationRequest[];
  farmers: FarmerAccount[];
  bands?: CreditConfig['bands'];
  canReview: boolean;
  now: Date;
  onNavigate: (id: string) => void;
  onClose: () => void;
  /** After a decision: reload the console's data (in the background). */
  onReviewed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const request = requestId ? all.find((v) => v.id === requestId) : undefined;
  const open = Boolean(request);
  const farmer = request && farmers.find((f) => f.userId === request.userId);
  const name = nameOf(farmer);
  const actionable = Boolean(canReview && request?.status === 'pending');
  const index = request ? queue.findIndex((v) => v.id === request.id) : -1;
  const previousId = request ? neighborId(queue, request.id, -1) : null;
  const nextId = request ? neighborId(queue, request.id, 1) : null;

  /** After approving or rejecting: the next pending request, or close when none is left. */
  function advance(id: string) {
    const next = nextAfterReview(queue, id);
    if (next) onNavigate(next);
    else {
      toast.success('All caught up. Nothing else is waiting here.');
      onClose();
    }
    onReviewed();
  }

  async function approve() {
    if (!request || !actionable || busy) return;
    setBusy(true);
    try {
      await verificationsService.approve(request.id);
      toast.success(`${KIND_LABEL[request.kind]} approved for ${name}`);
      advance(request.id);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not approve');
    } finally {
      setBusy(false);
    }
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (rejecting || busy || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.defaultPrevented || isTyping(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === 'j' && nextId) {
      event.preventDefault();
      onNavigate(nextId);
    } else if (key === 'k' && previousId) {
      event.preventDefault();
      onNavigate(previousId);
    } else if (key === 'a' && actionable) {
      event.preventDefault();
      void approve();
    } else if (key === 'r' && actionable) {
      event.preventDefault();
      setRejecting(true);
    }
  });

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!request) return null;

  const KindIcon = KIND_ICON[request.kind];
  const overdue = isOverdue(request, now);
  const waited = formatDistanceStrict(new Date(request.submittedAt), now, { addSuffix: true });
  const duplicates = findDuplicates(request, all, farmers);
  const warning = duplicateWarning(duplicates);
  const point = request.kind === 'location' ? parseLocation(request.submittedValue) : null;
  const history = all.filter(
    (v) => v.userId === request.userId && v.kind === request.kind && v.id !== request.id,
  );
  const score = farmer?.stats.score ?? 0;
  const band = scoreLabel(score, bands);
  const tone = bandTone(band);
  const checks = farmer?.profile.verification;

  return (
    <>
      <Modal
        open
        onClose={onClose}
        size="lg"
        title={`${KIND_LABEL[request.kind]} check`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {index >= 0 && (
              <>
                <span className="text-text font-semibold">
                  Request {index + 1} of {queue.length}
                </span>
                <span aria-hidden="true" className="hidden sm:inline">
                  ·
                </span>
              </>
            )}
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-ink-red')}>
              <Clock size={13} aria-hidden="true" />
              Submitted {waited}
            </span>
          </span>
        }
        footer={
          <>
            <p className="text-text-mute hidden items-center gap-3 text-xs sm:mr-auto sm:flex">
              {actionable && (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <Kbd>A</Kbd> Approve
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Kbd>R</Kbd> Reject
                  </span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Kbd>J</Kbd>
                <Kbd>K</Kbd> Next / previous
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                aria-label="Previous request"
                title="Previous (K)"
                icon={ChevronLeft}
                disabled={!previousId}
                onClick={() => previousId && onNavigate(previousId)}
                className="flex-1 px-3 sm:flex-none"
              />
              <Button
                variant="ghost"
                aria-label="Next request"
                title="Next (J)"
                icon={ChevronRight}
                disabled={!nextId}
                onClick={() => nextId && onNavigate(nextId)}
                className="flex-1 px-3 sm:flex-none"
              />
            </div>
            {actionable && (
              <>
                <Button
                  icon={X}
                  disabled={busy}
                  onClick={() => setRejecting(true)}
                  className={REJECT_CLASS}
                >
                  Reject
                </Button>
                <Button
                  icon={Check}
                  loading={busy}
                  onClick={() => void approve()}
                  className={APPROVE_CLASS}
                >
                  Approve
                </Button>
              </>
            )}
          </>
        }
      >
        <div className="space-y-5">
          {overdue && (
            <p className="border-danger/30 bg-danger/10 text-ink-red flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm">
              <Clock size={15} aria-hidden="true" className="shrink-0" />
              Waiting longer than the 3-day target.
            </p>
          )}

          {/* The farmer */}
          <section
            aria-label="Farmer"
            className="border-border bg-glass flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <InitialsAvatar name={name} size="xl" />
              <div className="min-w-0">
                <p className="text-text truncate text-base font-bold">{name}</p>
                <p className="text-text-mute mt-0.5 text-xs">
                  {farmer
                    ? [
                        farmer.profile.region,
                        farmer.profile.phone || 'No phone',
                        `Joined ${formatDate(new Date(farmer.createdAt))}`,
                      ].join(' · ')
                    : 'This account no longer exists.'}
                </p>
                {farmer && (
                  <Link
                    href={`/admin/farmers/${farmer.userId}`}
                    className="text-ink-purple mt-1.5 inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    Open full profile <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                )}
              </div>
            </div>
            {farmer && (
              <div className="sm:w-36">
                <p className="text-text-mute text-xs">Credit score</p>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="font-display text-text text-2xl font-bold tabular-nums">
                    {score}
                  </span>
                  <span className={cn('text-xs font-semibold', tone.text)}>{band}</span>
                </p>
                <span aria-hidden="true" className="bg-glass-strong mt-1.5 block h-1 rounded-full">
                  <span
                    className={cn('block h-full rounded-full', tone.bar)}
                    style={{ width: `${Math.min(100, (score / MAX_SCORE) * 100)}%` }}
                  />
                </span>
              </div>
            )}
          </section>

          {/* What they submitted */}
          <section aria-labelledby="review-value" className="space-y-3">
            <h3
              id="review-value"
              className="text-text-mute text-xs font-semibold tracking-wider uppercase"
            >
              Submitted {KIND_LABEL[request.kind]}
            </h3>
            <div className="border-border flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3.5">
              <span className="bg-purple/12 text-ink-purple inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                <KindIcon size={18} aria-hidden="true" />
              </span>
              <span className="text-text min-w-0 flex-1 font-mono text-lg font-semibold tracking-wide break-all">
                {displayValue(request)}
              </span>
              {point && (
                <a
                  href={googleMapsUrl(point)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border text-text hover:bg-glass-strong inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-colors"
                >
                  Open in Google Maps <ExternalLink size={13} aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
            {request.kind === 'ghanaCard' && (
              <p className="text-text-mute text-xs">
                Only the last four digits are shown. The full number is never stored.
              </p>
            )}
            {request.kind === 'ghanaCard' && request.identityCheck && (
              <IdentityCheckNote check={request.identityCheck} />
            )}
            {request.kind === 'phone' && farmer && (
              <p className="text-text-mute text-xs">
                {farmer.profile.phone === request.submittedValue
                  ? 'Matches the phone number on the profile.'
                  : `The profile has ${farmer.profile.phone || 'no phone number'}.`}
              </p>
            )}
          </section>

          {/* Duplicate check (Ghana Cards, by hash) */}
          {warning ? (
            <div
              role="alert"
              className="border-warning/40 bg-warning/10 text-text flex gap-3 rounded-2xl border px-4 py-3.5 text-sm"
            >
              <AlertTriangle
                size={18}
                aria-hidden="true"
                className="text-ink-gold mt-0.5 shrink-0"
              />
              <div className="space-y-1.5">
                <p className="font-semibold">{warning}</p>
                <p className="flex flex-wrap gap-x-3 gap-y-1">
                  {duplicates.map((d) => (
                    <Link
                      key={d.userId}
                      href={`/admin/farmers/${d.userId}`}
                      className="text-ink-gold inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    >
                      View {d.name} <ArrowUpRight size={13} aria-hidden="true" />
                    </Link>
                  ))}
                </p>
              </div>
            </div>
          ) : (
            request.kind === 'ghanaCard' &&
            request.valueHash && (
              <p className="text-ink-green flex items-center gap-2 text-sm">
                <ShieldCheck size={16} aria-hidden="true" />
                No other account uses this card.
              </p>
            )
          )}

          {/* The farmer's checks so far */}
          {checks && (
            <section aria-labelledby="review-checks">
              <h3
                id="review-checks"
                className="text-text-mute mb-2 text-xs font-semibold tracking-wider uppercase"
              >
                Verified so far
              </h3>
              <ul className="grid grid-cols-3 gap-2">
                {(['phone', 'location', 'ghanaCard'] as const).map((kind) => {
                  const Icon = KIND_ICON[kind];
                  const done = checks[kind];
                  return (
                    <li
                      key={kind}
                      className={cn(
                        'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold',
                        done
                          ? 'border-accent/30 bg-accent/10 text-ink-green'
                          : 'border-border text-text-mute',
                      )}
                    >
                      <Icon size={14} aria-hidden="true" />
                      <span className="truncate">{KIND_LABEL[kind]}</span>
                      <span className="sr-only">{done ? 'verified' : 'not verified'}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* The decision, once made */}
          {request.status !== 'pending' && (
            <section
              aria-label="Decision"
              className="border-border flex flex-wrap items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm"
            >
              <StatusBadge kind="verification" status={request.status} />
              <div className="min-w-0 flex-1">
                <p className="text-text">
                  {request.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                  {request.reviewedBy ?? 'a reviewer'}
                  {request.reviewedAt && ` on ${formatDate(new Date(request.reviewedAt))}`}
                </p>
                {request.status === 'rejected' && (
                  <p className="text-text-mute mt-1 text-xs">
                    The farmer sees: “{rejectionMessage(request)}”
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Earlier submissions of the same check */}
          {history.length > 0 && (
            <section aria-labelledby="review-history">
              <h3
                id="review-history"
                className="text-text-mute mb-2 text-xs font-semibold tracking-wider uppercase"
              >
                Earlier {KIND_LABEL[request.kind]} submissions
              </h3>
              <ul className="divide-border divide-y text-sm">
                {history.map((v) => (
                  <li key={v.id} className="flex flex-wrap items-center gap-2 py-2">
                    <span className="text-text font-mono text-xs">{displayValue(v)}</span>
                    <StatusBadge kind="verification" status={v.status} />
                    <span className="text-text-mute text-xs">
                      {formatDate(new Date(v.submittedAt))}
                      {v.reason && ` · ${v.reason}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </Modal>

      <RejectDialog
        request={rejecting ? request : null}
        farmerName={name}
        onClose={() => setRejecting(false)}
        onRejected={(updated) => {
          setRejecting(false);
          advance(updated.id);
        }}
      />
    </>
  );
}

const IDENTITY_RESULTS: Record<string, { text: string; good: boolean }> = {
  verified: { text: 'Number found on the NIA register', good: true },
  not_found: { text: 'Number not found on the NIA register', good: false },
  unavailable: { text: 'The NIA register could not be reached', good: false },
  unsupported: { text: 'Check not available for this card', good: false },
  error: { text: 'The check returned an unexpected answer', good: false },
};

/** The identity provider's answer: advice for the reviewer, never a decision. */
function IdentityCheckNote({ check }: { check: NonNullable<VerificationRequest['identityCheck']> }) {
  const result = IDENTITY_RESULTS[check.result] ?? IDENTITY_RESULTS.error;
  return (
    <p
      className={cn(
        'flex items-start gap-2 text-xs',
        result.good ? 'text-ink-green' : 'text-ink-gold',
      )}
    >
      {result.good ? (
        <ShieldCheck size={14} aria-hidden="true" className="mt-px shrink-0" />
      ) : (
        <AlertTriangle size={14} aria-hidden="true" className="mt-px shrink-0" />
      )}
      <span>
        {check.provider}: {result.text}
        {check.names ? `. Names: ${check.names}` : ''}. Advice only: you still decide.
      </span>
    </p>
  );
}
