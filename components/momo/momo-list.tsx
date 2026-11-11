'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { TransactionTools } from '@/components/transactions/transaction-tools';
import { useState } from 'react';
import { isToday, isYesterday } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  FilterX,
  Pencil,
  Plus,
  SearchX,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { groupMomoByMonth, type MomoMonthGroup } from '@/components/momo/momo-filters';
import { NetworkLogo } from '@/components/momo/network-logo';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatGHS, parseISODate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { MomoTransaction } from '@/types';

function friendlyDate(iso: string): string {
  const date = parseISODate(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date);
}

/** Transactions shown at first, and added by each "Show more". */
const PAGE_SIZE = 25;

const actionClass =
  'inline-flex size-10 items-center justify-center rounded-lg text-text-dim transition-colors hover:bg-glass-strong sm:size-9';

function TransactionRow({
  t,
  onEdit,
  onDelete,
}: {
  t: MomoTransaction;
  onEdit: (t: MomoTransaction) => void;
  onDelete: (t: MomoTransaction) => void;
}) {
  const readOnly = useReadOnly() || t.verificationStatus === 'verified';
  const inflow = t.direction === 'in';
  const Arrow = inflow ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="group hover:bg-glass focus-within:bg-glass flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors">
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex size-11 shrink-0 items-center justify-center rounded-full',
          inflow ? 'bg-accent/15 text-ink-green' : 'bg-danger/15 text-ink-red',
        )}
      >
        <Arrow size={19} />
        {t.network && (
          <NetworkLogo
            network={t.network}
            size={20}
            className="ring-bg-2 absolute -right-1 -bottom-1 ring-2"
          />
        )}
      </span>

      {/* The row opens the transaction (its reference and every detail are in the form). */}
      <div
        title={`Reference ${t.reference ?? 'Not provided'}`}
        aria-label={`${inflow ? 'Received from' : 'Sent to'} ${t.counterparty}, ${formatGHS(t.amount)}, ${friendlyDate(t.date)}. Open details`}
        className="min-w-0 flex-1 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span className="text-text block truncate text-sm font-semibold">{t.counterparty}</span>
        <span className="text-text-mute mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span>{inflow ? 'Received' : 'Sent'}</span>
          <span aria-hidden="true">·</span>
          <span>{friendlyDate(t.date)}</span>
          {t.network && (
            <>
              <span aria-hidden="true">·</span>
              <span>{t.network}</span>
            </>
          )}
        </span>
        <TransactionTools kind="momo" id={t.id} entry={t} />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span
          className={cn(
            'text-sm font-bold whitespace-nowrap tabular-nums',
            inflow ? 'text-ink-green' : 'text-ink-red',
          )}
        >
          {inflow ? '+' : '−'}
          {formatGHS(t.amount)}
        </span>
        {/* On mouse devices the actions appear on hover/focus; touch screens always show them. */}
        <div className="flex gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? undefined : () => onEdit(t)}
            aria-label={`Edit transaction with ${t.counterparty}`}
            className={cn(actionClass, 'hover:text-text', readOnly && READ_ONLY_CLASS)}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? undefined : () => onDelete(t)}
            aria-label={`Delete transaction with ${t.counterparty}`}
            className={cn(actionClass, 'hover:text-ink-red', readOnly && READ_ONLY_CLASS)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function MonthHeader({ group }: { group: MomoMonthGroup }) {
  const net = group.inflow - group.outflow;
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-3 pb-2">
      <h3 className="text-text text-sm font-bold">
        {group.label}
        <span className="text-text-mute ml-2 font-normal">
          {group.items.length} transaction{group.items.length === 1 ? '' : 's'}
        </span>
      </h3>
      <p className="flex flex-wrap items-center gap-x-3 text-xs">
        <span className="text-text-mute">
          In <span className="text-ink-green font-semibold">{formatGHS(group.inflow)}</span>
        </span>
        <span className="text-text-mute">
          Out <span className="text-ink-red font-semibold">{formatGHS(group.outflow)}</span>
        </span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-bold',
            net >= 0 ? 'bg-accent/15 text-ink-green' : 'bg-danger/15 text-ink-red',
          )}
        >
          Net {net >= 0 ? '+' : '−'}
          {formatGHS(Math.abs(net))}
        </span>
      </p>
    </div>
  );
}

export function MomoList({
  rows,
  hasAny,
  hasActiveFilters,
  onClearFilters,
}: {
  rows: MomoTransaction[];
  hasAny: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const openModal = useModalStore((s) => s.openModal);
  const deleteMomo = useFarmStore((s) => s.deleteMomo);
  const [pendingDelete, setPendingDelete] = useState<MomoTransaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Reset to the first page whenever the filters change (MomoView keys this list by them).
  const [visible, setVisible] = useState(PAGE_SIZE);

  const onEdit = (t: MomoTransaction) => openModal('momo', t.id);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteMomo(pendingDelete.id);
      toast.success('Transaction deleted');
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the transaction');
    } finally {
      setDeleting(false);
    }
  }

  let content;
  if (!hasAny) {
    content = (
      <EmptyState
        icon={Smartphone}
        title="No MoMo transactions yet"
        description="Log mobile money payments you send and receive. They raise your AgriCtec score."
        action={
          <Button mutates icon={Plus} onClick={() => openModal('momo')}>
            Add your first transaction
          </Button>
        }
      />
    );
  } else if (rows.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No transactions match your filters"
        description="Try a different search, period, direction or network."
        action={
          hasActiveFilters && (
            <Button variant="ghost" icon={FilterX} onClick={onClearFilters}>
              Clear filters
            </Button>
          )
        }
      />
    );
  } else {
    // Months keep their full totals; only the rows shown are limited ("Show more" adds a page).
    const shownGroups: { group: MomoMonthGroup; items: MomoTransaction[] }[] = [];
    let budget = visible;
    for (const group of groupMomoByMonth(rows)) {
      if (budget <= 0) break;
      const items = group.items.slice(0, budget);
      shownGroups.push({ group, items });
      budget -= items.length;
    }
    const hidden = rows.length - Math.min(visible, rows.length);
    content = (
      <div className="space-y-5">
        {shownGroups.map(({ group, items }) => (
          <section key={group.key} aria-label={group.label}>
            <MonthHeader group={group} />
            <ul className="mt-1">
              {items.map((t) => (
                <TransactionRow key={t.id} t={t} onEdit={onEdit} onDelete={setPendingDelete} />
              ))}
            </ul>
          </section>
        ))}
        {hidden > 0 && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              icon={ChevronDown}
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="border-border border"
            >
              Show {Math.min(PAGE_SIZE, hidden)} more
              <span className="text-text-mute font-normal">({hidden} left)</span>
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {content}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this transaction?"
        message={
          pendingDelete
            ? `The ${formatGHS(pendingDelete.amount)} transaction with "${pendingDelete.counterparty}" will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
