'use client';

import { useEffect, useId, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowUpRight, Ban, CircleCheck, ExternalLink, Lightbulb, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { APPROVE_CLASS, REJECT_CLASS } from '@/components/admin/shared/action-styles';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { RiskTag } from '@/components/admin/risk/risk-tag';
import { RULE_ICONS, SeverityDot } from '@/components/admin/risk/risk-meta';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useCan } from '@/hooks/admin/use-can';
import { ruleById } from '@/lib/admin/risk-rules';
import { formatDate, formatGHS } from '@/lib/format';
import { GHANA_CARD_LABELS, locationLabel } from '@/lib/profile';
import { cn } from '@/lib/utils';
import { riskService, type RiskRelated } from '@/services/admin/risk.service';
import type { RiskFlag } from '@/types/admin';

/** How many unrelated entries to show around the flagged ones (the rest behind "Show all"). */
const CONTEXT_ROWS = 6;

const when = (iso: string) => format(new Date(iso), 'd MMM yyyy, HH:mm');

const relatedRow = 'bg-danger/8 shadow-[inset_3px_0_0_var(--danger)]';

function Evidence({ related }: { related: RiskRelated }) {
  const [showAll, setShowAll] = useState(false);

  if (related.kind === 'accounts') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {related.accounts.map((account, index) => (
          <article
            key={account.userId}
            className={cn(
              'rounded-2xl border p-4',
              index === 0 ? 'border-purple/40 bg-purple/8' : 'border-border bg-glass',
            )}
          >
            <div className="flex items-start gap-3">
              <InitialsAvatar name={account.profile.name || account.email} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
                  {index === 0 ? 'Flagged account' : 'Linked account'}
                </p>
                <p className="text-text flex items-center gap-1.5 text-sm font-semibold">
                  <span className="truncate">{account.profile.name || account.email}</span>
                  <RiskTag count={account.riskConfirmed} />
                </p>
                <div className="mt-1">
                  <StatusBadge kind="account" status={account.status} />
                </div>
              </div>
            </div>
            <dl className="mt-3 space-y-1.5 text-xs">
              {[
                ['Phone', account.profile.phone || '—'],
                [
                  'Ghana Card',
                  account.profile.ghanaCard.masked
                    ? `${account.profile.ghanaCard.masked} · ${GHANA_CARD_LABELS[account.profile.ghanaCard.status]}`
                    : GHANA_CARD_LABELS[account.profile.ghanaCard.status],
                ],
                ['Location', locationLabel(account.profile) || account.profile.region || '—'],
                ['Joined', formatDate(new Date(account.createdAt))],
                ['Records', String(account.stats.records)],
                ['Credit score', String(account.stats.score)],
              ].map(([term, detail]) => (
                <div key={term} className="flex justify-between gap-3">
                  <dt className="text-text-mute">{term}</dt>
                  <dd className="text-text text-right font-medium tabular-nums">{detail}</dd>
                </div>
              ))}
            </dl>
            <Link
              href={`/admin/farmers/${account.userId}`}
              className="text-ink-purple mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-semibold hover:underline"
            >
              Open account
              <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    );
  }

  const isMomo = related.kind === 'momo';
  const rows = isMomo ? related.momo : related.records;
  const flagged = rows.filter((r) => r.related);
  const others = rows.filter((r) => !r.related);
  const shown = showAll ? rows : [...flagged, ...others.slice(0, CONTEXT_ROWS)];
  const crossAccount =
    isMomo && new Set(related.momo.filter((t) => t.related).map((t) => t.userId)).size > 1;

  return (
    <div>
      <div className="border-border overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[560px] text-left text-xs">
          <caption className="sr-only">
            {isMomo ? 'MoMo transactions' : 'Farm records'}; flagged rows are marked
          </caption>
          <thead className="text-text-mute border-border border-b text-[11px] tracking-wider uppercase">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                Date
              </th>
              {isMomo ? (
                <>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Reference
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Counterparty
                  </th>
                  {crossAccount && (
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Account
                    </th>
                  )}
                </>
              ) : (
                <>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Type
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Description
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">
                    Entered
                  </th>
                </>
              )}
              <th scope="col" className="px-3 py-2 text-right font-semibold">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {shown.map((row) => (
              <tr key={row.id} className={cn(row.related && relatedRow)}>
                <td className="text-text px-3 py-2 whitespace-nowrap tabular-nums">
                  {row.related && <span className="sr-only">Flagged: </span>}
                  {formatDate(row.date)}
                </td>
                {'reference' in row ? (
                  <>
                    <td className="text-text px-3 py-2 font-mono">{row.reference}</td>
                    <td className="text-text-dim px-3 py-2">
                      {row.direction === 'in' ? 'From ' : 'To '}
                      {row.counterparty}
                    </td>
                    {crossAccount && <td className="text-text-dim px-3 py-2">{row.ownerName}</td>}
                  </>
                ) : (
                  <>
                    <td className="text-text-dim px-3 py-2 capitalize">{row.type}</td>
                    <td className="text-text px-3 py-2">{row.description}</td>
                    <td className="text-text-dim px-3 py-2 whitespace-nowrap tabular-nums">
                      {when(row.createdAt)}
                    </td>
                  </>
                )}
                <td className="text-text px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums">
                  {row.amount > 0 ? formatGHS(row.amount) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
        <p className="text-text-mute flex items-center gap-2">
          <span aria-hidden="true" className={cn('inline-block h-3 w-5 rounded-sm', relatedRow)} />
          {flagged.length} flagged · {others.length} other {isMomo ? 'transactions' : 'records'}
        </p>
        {others.length > CONTEXT_ROWS && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="text-ink-purple min-h-9 font-semibold hover:underline"
          >
            {showAll ? 'Show fewer' : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-text-mute mb-2 text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * One risk flag, reviewed in a centred modal (never a side drawer): why it was flagged, the
 * evidence (the actual transactions or records highlighted, or the linked accounts side by side)
 * and the decision. Dismiss and Confirm fraud both need a note; confirming can also suspend
 * the farmer. Every decision is audited by the service.
 */
export function RiskDetailModal({
  flag,
  farmerName,
  onClose,
  onReviewed,
}: {
  flag: RiskFlag | null;
  farmerName: string;
  onClose: () => void;
  onReviewed: () => void;
}) {
  if (!flag) return null;
  return (
    <Detail
      key={flag.id}
      flag={flag}
      farmerName={farmerName}
      onClose={onClose}
      onReviewed={onReviewed}
    />
  );
}

function Detail({
  flag,
  farmerName,
  onClose,
  onReviewed,
}: {
  flag: RiskFlag;
  farmerName: string;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const noteId = useId();
  const canReview = useCan('risk.review');
  const canSuspend = useCan('farmers.suspend');
  const [related, setRelated] = useState<RiskRelated | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [suspend, setSuspend] = useState(false);
  const [busy, setBusy] = useState<'dismiss' | 'confirm' | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const rule = ruleById(flag.rule);
  const Icon = RULE_ICONS[flag.rule];
  const open = flag.status === 'open';
  const alreadySuspended = related?.farmer.status === 'suspended';

  useEffect(() => {
    let active = true;
    riskService.getRelated(flag.id).then(
      (data) => active && setRelated(data),
      (cause: unknown) =>
        active &&
        setLoadError(cause instanceof Error ? cause.message : 'Could not load the evidence'),
    );
    return () => {
      active = false;
    };
  }, [flag.id]);

  async function decide(action: 'dismiss' | 'confirm') {
    if (note.trim().length < 3) {
      setNoteError(
        action === 'dismiss'
          ? 'Add a note saying why this is fine, e.g. “Legitimate cooperative bulk entry”.'
          : 'Add a note saying what you found.',
      );
      document.getElementById(noteId)?.focus();
      return;
    }
    setBusy(action);
    try {
      if (action === 'dismiss') {
        await riskService.dismiss(flag.id, note);
        toast.success('Flag dismissed');
      } else {
        await riskService.confirm(flag.id, note, {
          suspend: suspend && canSuspend && !alreadySuspended,
        });
        toast.success(
          suspend && canSuspend && !alreadySuspended
            ? `Fraud confirmed and ${farmerName} suspended`
            : 'Fraud confirmed',
          { description: `${farmerName} now shows the Risk tag.` },
        );
      }
      onReviewed();
      onClose();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the decision');
      setBusy(null);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={rule.label}
      description={`${farmerName} · detected ${when(flag.detectedAt)}`}
      dirty={open && note.trim().length > 0 && busy === null}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Link
            href={`/admin/farmers/${flag.userId}`}
            className="text-text-dim hover:text-text inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold sm:mr-auto"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Open farmer
          </Link>
          {open && canReview ? (
            <>
              <Button
                icon={CircleCheck}
                loading={busy === 'dismiss'}
                disabled={busy !== null}
                onClick={() => void decide('dismiss')}
                className={APPROVE_CLASS}
              >
                Dismiss
              </Button>
              <Button
                icon={Ban}
                loading={busy === 'confirm'}
                disabled={busy !== null}
                onClick={() => void decide('confirm')}
                className={REJECT_CLASS}
              >
                {suspend && canSuspend && !alreadySuspended
                  ? 'Confirm and suspend'
                  : 'Confirm fraud'}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <span className="bg-danger/12 text-ink-red inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Icon size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityDot severity={flag.severity} showLabel />
              <StatusBadge kind="risk" status={flag.status} />
            </div>
            <p className="text-text mt-1.5 text-[15px] font-semibold">{flag.description}</p>
            <p className="text-text-dim mt-1 text-sm">{rule.explanation}</p>
          </div>
        </div>

        <div className="border-gold/30 bg-gold/8 flex gap-3 rounded-2xl border p-4">
          <Lightbulb size={17} aria-hidden="true" className="text-ink-gold mt-0.5 shrink-0" />
          <div>
            <p className="text-text text-sm font-semibold">What to check</p>
            <p className="text-text-dim mt-1 text-sm leading-relaxed">{rule.guidance}</p>
          </div>
        </div>

        <Section
          title={
            rule.related === 'accounts'
              ? 'Linked accounts'
              : rule.related === 'momo'
                ? 'The transactions'
                : 'The records'
          }
        >
          {loadError ? (
            <p role="alert" className="text-ink-red text-sm">
              {loadError}
            </p>
          ) : related ? (
            <Evidence related={related} />
          ) : (
            <Skeleton className="h-40 w-full rounded-2xl" />
          )}
        </Section>

        {!open && (
          <Section title="Decision">
            <div className="border-border bg-glass rounded-2xl border p-4 text-sm">
              <p className="text-text font-semibold">
                {flag.status === 'confirmed' ? 'Confirmed as fraud' : 'Dismissed'} by{' '}
                {flag.reviewedBy ?? 'an admin'}
                {flag.reviewedAt && (
                  <span className="text-text-mute font-normal"> · {when(flag.reviewedAt)}</span>
                )}
              </p>
              {flag.note && <p className="text-text-dim mt-1.5 whitespace-pre-line">{flag.note}</p>}
            </div>
          </Section>
        )}

        {open && canReview && (
          <Section title="Your decision">
            <label htmlFor={noteId} className="text-text-dim mb-1.5 block text-xs font-semibold">
              Note (required)
            </label>
            <Textarea
              id={noteId}
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError(null);
              }}
              placeholder="e.g. Legitimate cooperative bulk entry, or what you found"
              error={Boolean(noteError)}
              aria-describedby={noteError ? `${noteId}-error` : `${noteId}-hint`}
            />
            {noteError ? (
              <p id={`${noteId}-error`} role="alert" className="text-ink-red mt-1.5 text-xs">
                {noteError}
              </p>
            ) : (
              <p id={`${noteId}-hint`} className="text-text-mute mt-1.5 text-xs">
                Saved with the decision in the audit log. Farmers never see it.
              </p>
            )}
            {canSuspend && (
              <label
                className={cn(
                  'border-border mt-3 flex min-h-11 items-start gap-3 rounded-xl border px-3.5 py-3 text-sm',
                  alreadySuspended ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                )}
              >
                <input
                  type="checkbox"
                  checked={suspend && !alreadySuspended}
                  disabled={alreadySuspended}
                  onChange={(e) => setSuspend(e.target.checked)}
                  className="accent-danger mt-0.5 size-4.5 shrink-0"
                />
                <span>
                  <span className="text-text flex items-center gap-1.5 font-semibold">
                    <ShieldAlert size={14} aria-hidden="true" className="text-ink-red" />
                    Suspend farmer now
                  </span>
                  <span className="text-text-mute block text-xs">
                    {alreadySuspended
                      ? 'This farmer is already suspended.'
                      : 'Only when you confirm fraud. They are signed out and can’t sign in until reactivated.'}
                  </span>
                </span>
              </label>
            )}
          </Section>
        )}
      </div>
    </Modal>
  );
}
