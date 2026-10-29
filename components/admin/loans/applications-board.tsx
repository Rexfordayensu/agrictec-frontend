'use client';

import { useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { ArrowRight, Ban, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { RowMenu } from '@/components/admin/shared/row-menu';
import { ageInDays } from '@/lib/admin/loan-pipeline';
import { LOAN_STATUSES, LOAN_STATUS_LABELS, nextStatuses } from '@/lib/admin/loan-status';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Lender, LoanApplication, LoanStatus } from '@/types/admin';

/** Each column's dot (the same colours as the status badges). */
const STATUS_DOT: Record<LoanStatus, string> = {
  submitted: 'bg-info',
  under_review: 'bg-gold',
  approved: 'bg-accent',
  rejected: 'bg-danger',
  disbursed: 'bg-purple',
  repaid: 'bg-accent',
  defaulted: 'bg-danger',
};

/** Work in progress shows the oldest first; finished columns the newest first. */
const OLDEST_FIRST: readonly LoanStatus[] = ['submitted', 'under_review', 'approved', 'disbursed'];

const ageLabel = (days: number) => (days === 0 ? 'Today' : `${days}d`);

interface Drag {
  app: LoanApplication;
  /** The column under the pointer. */
  over: LoanStatus | null;
}

/**
 * A column per status. Drag a card to another column, or use its "Move to…" menu (keyboard and
 * touch). While dragging, columns the card can't move to are greyed out and refuse the drop; the
 * move itself is confirmed in the status-change dialog (and checked again by the service).
 */
export function ApplicationsBoard({
  applications,
  farmerName,
  farmerDeleted,
  lenderOf,
  canManage,
  now,
  onMove,
}: {
  applications: LoanApplication[];
  farmerName: (app: LoanApplication) => string;
  /** Its farmer's account is gone: the card can only move to a closing status. */
  farmerDeleted: (app: LoanApplication) => boolean;
  lenderOf: (app: LoanApplication) => Lender | undefined;
  canManage: boolean;
  now: Date;
  onMove: (app: LoanApplication, to: LoanStatus) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dropped = useRef(false);
  const allowed = drag ? nextStatuses(drag.app.status, farmerDeleted(drag.app)) : [];

  function enterColumn(status: LoanStatus, event: DragEvent) {
    if (!drag) return;
    if (allowed.includes(status)) {
      event.preventDefault(); // accept the drop
      event.dataTransfer.dropEffect = 'move';
    }
    if (drag.over !== status) setDrag({ ...drag, over: status });
  }

  function drop(status: LoanStatus, event: DragEvent) {
    event.preventDefault();
    if (drag && allowed.includes(status)) {
      dropped.current = true;
      onMove(drag.app, status);
    }
    setDrag(null);
  }

  /** A drop on a greyed column doesn't fire `drop`, so explain it when the drag ends. */
  function endDrag() {
    if (drag && !dropped.current && drag.over && drag.over !== drag.app.status) {
      const from = LOAN_STATUS_LABELS[drag.app.status];
      const next = allowed.map((s) => LOAN_STATUS_LABELS[s]);
      if (!allowed.includes(drag.over)) {
        toast.error(`${from} can’t move to ${LOAN_STATUS_LABELS[drag.over]}`, {
          description: next.length
            ? `Next steps from ${from}: ${next.join(' or ')}.`
            : `${from} is a final status.`,
        });
      }
    }
    setDrag(null);
  }

  return (
    <div
      role="region"
      aria-label="Applications board"
      // contain-paint: without it Chrome lets the wide board widen the whole page on phones.
      className="-mx-1 scrollbar-gutter-stable overflow-x-auto px-1 pb-3 contain-paint"
    >
      <div className="flex min-w-max snap-x snap-mandatory gap-3 sm:snap-none">
        {LOAN_STATUSES.map((status) => {
          const cards = applications
            .filter((a) => a.status === status)
            .sort((a, b) =>
              OLDEST_FIRST.includes(status)
                ? a.createdAt.localeCompare(b.createdAt)
                : b.createdAt.localeCompare(a.createdAt),
            );
          const total = cards.reduce((sum, a) => sum + a.amount, 0);
          const isSource = drag?.app.status === status;
          const accepts = Boolean(drag) && allowed.includes(status);
          const refuses = Boolean(drag) && !isSource && !accepts;
          const headingId = `board-${status}`;
          return (
            <section
              key={status}
              aria-labelledby={headingId}
              onDragEnter={(e) => enterColumn(status, e)}
              onDragOver={(e) => enterColumn(status, e)}
              onDrop={(e) => drop(status, e)}
              className={cn(
                'bg-glass flex w-[78vw] max-w-75 shrink-0 snap-start flex-col rounded-2xl border transition-[opacity,border-color,background-color] sm:w-68',
                accepts ? 'border-purple/70 bg-purple/10 border-dashed' : 'border-border',
                accepts && drag?.over === status && 'bg-purple/20',
                refuses && 'opacity-40 grayscale',
              )}
            >
              <header className="border-border flex items-center gap-2 border-b px-3.5 py-3">
                <span
                  aria-hidden="true"
                  className={cn('size-2 rounded-full', STATUS_DOT[status])}
                />
                <h2 id={headingId} className="text-text text-sm font-semibold">
                  {LOAN_STATUS_LABELS[status]}
                </h2>
                <span className="bg-glass-strong text-text-mute rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
                  {cards.length}
                </span>
                <span className="text-text-mute ml-auto text-xs tabular-nums">
                  {formatCompactGHS(total)}
                </span>
              </header>

              {refuses && (
                <p className="text-text-mute flex items-center justify-center gap-1.5 px-3 pt-2 text-xs font-semibold">
                  <Ban size={13} aria-hidden="true" /> Not allowed
                </p>
              )}
              {accepts && (
                <p className="text-ink-purple flex items-center justify-center gap-1.5 px-3 pt-2 text-xs font-semibold">
                  <ArrowRight size={13} aria-hidden="true" /> Drop to move here
                </p>
              )}

              <ol className="flex max-h-[62vh] min-h-28 flex-col gap-2 overflow-y-auto p-2">
                {cards.length === 0 && !drag && (
                  <li className="text-text-mute py-6 text-center text-xs">No applications</li>
                )}
                {cards.map((app) => {
                  const lender = lenderOf(app);
                  const moves = canManage ? nextStatuses(app.status, farmerDeleted(app)) : [];
                  const name = farmerName(app);
                  const age = ageInDays(app, now);
                  return (
                    <li
                      key={app.id}
                      draggable={moves.length > 0}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/plain', app.id);
                        event.dataTransfer.effectAllowed = 'move';
                        dropped.current = false;
                        setDrag({ app, over: null });
                      }}
                      onDragEnd={endDrag}
                      className={cn(
                        'border-border bg-bg-2/80 group rounded-xl border p-3 transition-shadow',
                        moves.length > 0 && 'cursor-grab active:cursor-grabbing',
                        drag?.app.id === app.id && 'opacity-50',
                        'hover:border-purple/40 hover:shadow-[0_6px_20px_-12px_rgba(0,0,0,0.6)]',
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        {moves.length > 0 && (
                          <GripVertical
                            size={14}
                            aria-hidden="true"
                            className="text-text-mute/60 mt-0.5 -ml-1 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/admin/loans/${app.id}`}
                            draggable={false}
                            className="text-ink-purple font-mono text-[11px] font-semibold hover:underline"
                          >
                            {app.reference}
                          </Link>
                          <p className="text-text truncate text-sm font-semibold">{name}</p>
                        </div>
                        {moves.length > 0 && (
                          <RowMenu
                            label={`Move ${app.reference} to…`}
                            items={moves.map((to) => ({
                              label: `Move to ${LOAN_STATUS_LABELS[to]}`,
                              icon: to === 'rejected' || to === 'defaulted' ? Ban : ArrowRight,
                              danger: to === 'rejected' || to === 'defaulted',
                              onSelect: () => onMove(app, to),
                            }))}
                          />
                        )}
                      </div>
                      <p className="font-display text-text mt-1.5 text-lg font-bold tabular-nums">
                        {formatGHS(app.amount)}
                      </p>
                      <p className="text-text-dim mt-1 flex items-center gap-1.5 text-xs">
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: lender?.color ?? 'var(--text-mute)' }}
                        />
                        <span className="truncate">{lender?.name ?? 'Unknown lender'}</span>
                      </p>
                      <div className="border-border text-text-mute mt-2.5 flex items-center justify-between border-t pt-2 text-[11px]">
                        <span>
                          Score{' '}
                          <span className="text-text font-semibold tabular-nums">
                            {app.scoreAtApplication}
                          </span>
                        </span>
                        <span title={`Sent ${new Date(app.createdAt).toLocaleDateString()}`}>
                          {ageLabel(age)}
                          <span className="sr-only"> since it was sent</span>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
