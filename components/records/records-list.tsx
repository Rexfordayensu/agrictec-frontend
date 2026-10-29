'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { useState } from 'react';
import { isToday, isYesterday } from 'date-fns';
import { ClipboardList, FilterX, Pencil, Plus, SearchX, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  groupByMonth,
  type MonthGroup,
  type RecordSort,
} from '@/components/records/record-filters';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CropTile } from '@/components/ui/crop-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatGHS, parseISODate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { FarmRecord, RecordType } from '@/types';

const TYPE_BADGE: Record<RecordType, { label: string; color: BadgeColor }> = {
  income: { label: 'Income', color: 'green' },
  expense: { label: 'Expense', color: 'red' },
  activity: { label: 'Activity', color: 'blue' },
};

function friendlyDate(iso: string): string {
  const date = parseISODate(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date);
}

/** +GHS for income, −GHS for expenses, and no amount for activities (never "+GHS 0"). */
function Amount({ record }: { record: FarmRecord }) {
  if (record.type === 'activity') {
    return <span className="text-text-mute text-xs">No amount</span>;
  }
  const income = record.type === 'income';
  return (
    <span
      className={cn(
        'text-sm font-bold whitespace-nowrap tabular-nums',
        income ? 'text-ink-green' : 'text-ink-red',
      )}
    >
      {income ? '+' : '−'}
      {formatGHS(record.amount)}
    </span>
  );
}

const actionClass =
  'inline-flex size-10 items-center justify-center rounded-lg text-text-dim transition-colors hover:bg-glass-strong sm:size-9';

function RecordRow({
  record,
  onEdit,
  onDelete,
}: {
  record: FarmRecord;
  onEdit: (record: FarmRecord) => void;
  onDelete: (record: FarmRecord) => void;
}) {
  const readOnly = useReadOnly();
  const badge = TYPE_BADGE[record.type];
  return (
    <li className="group hover:bg-glass focus-within:bg-glass flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors sm:items-center">
      <CropTile crop={record.crop} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-text min-w-0 text-sm font-semibold break-words">
            {record.description}
          </p>
          <Badge color={badge.color}>{badge.label}</Badge>
        </div>
        <p className="text-text-mute mt-0.5 text-xs">
          {record.crop} · {friendlyDate(record.date)}
        </p>
        {record.notes && (
          <p className="text-text-dim mt-1 line-clamp-2 text-xs break-words">{record.notes}</p>
        )}
      </div>

      {/* Phones: amount above the buttons. Wider: side by side. */}
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
        <Amount record={record} />
        {/* On mouse devices the actions appear on hover/focus; touch screens always show them. */}
        <div className="flex gap-0.5 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:hover)]:opacity-0">
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? undefined : () => onEdit(record)}
            aria-label={`Edit record: ${record.description}`}
            className={cn(actionClass, 'hover:text-text', readOnly && READ_ONLY_CLASS)}
          >
            <Pencil size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            onClick={readOnly ? undefined : () => onDelete(record)}
            aria-label={`Delete record: ${record.description}`}
            className={cn(actionClass, 'hover:text-ink-red', readOnly && READ_ONLY_CLASS)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </li>
  );
}

function MonthHeader({ group }: { group: MonthGroup }) {
  const net = group.income - group.expenses;
  return (
    <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-3 pb-2">
      <h3 className="text-text text-sm font-bold">
        {group.label}
        <span className="text-text-mute ml-2 font-normal">
          {group.records.length} entr{group.records.length === 1 ? 'y' : 'ies'}
        </span>
      </h3>
      <p className="flex flex-wrap items-center gap-x-3 text-xs">
        <span className="text-text-mute">
          In <span className="text-ink-green font-semibold">{formatGHS(group.income)}</span>
        </span>
        <span className="text-text-mute">
          Out <span className="text-ink-red font-semibold">{formatGHS(group.expenses)}</span>
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

export function RecordsList({
  rows,
  sort,
  hasAnyRecords,
  hasActiveFilters,
  onClearFilters,
}: {
  rows: FarmRecord[];
  sort: RecordSort;
  hasAnyRecords: boolean;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}) {
  const openModal = useModalStore((s) => s.openModal);
  const deleteRecord = useFarmStore((s) => s.deleteRecord);
  const [pendingDelete, setPendingDelete] = useState<FarmRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const onEdit = (record: FarmRecord) => openModal('record', record.id);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteRecord(pendingDelete.id);
      toast.success('Record deleted');
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete the record');
    } finally {
      setDeleting(false);
    }
  }

  let content;
  if (!hasAnyRecords) {
    content = (
      <EmptyState
        icon={ClipboardList}
        title="No records yet. Add your first record!"
        description="Income, expenses and farm activities you record here build your financial history."
        action={
          <Button mutates icon={Plus} onClick={() => openModal('record')}>
            Add your first record
          </Button>
        }
      />
    );
  } else if (rows.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No records match your filters"
        description="Try a different search, period or crop."
        action={
          hasActiveFilters && (
            <Button variant="ghost" icon={FilterX} onClick={onClearFilters}>
              Clear filters
            </Button>
          )
        }
      />
    );
  } else if (sort === 'newest' || sort === 'oldest') {
    // Date order: group by month, each with its own totals.
    content = (
      <div className="space-y-6">
        {groupByMonth(rows).map((group) => (
          <section key={group.key} aria-label={group.label}>
            <MonthHeader group={group} />
            <ul className="mt-1 space-y-0.5">
              {group.records.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  onEdit={onEdit}
                  onDelete={setPendingDelete}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    );
  } else {
    content = (
      <ul className="space-y-0.5" aria-label="Records sorted by amount">
        {rows.map((record) => (
          <RecordRow key={record.id} record={record} onEdit={onEdit} onDelete={setPendingDelete} />
        ))}
      </ul>
    );
  }

  return (
    <>
      {content}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this record?"
        message={
          pendingDelete
            ? `"${pendingDelete.description}" will be permanently removed. This cannot be undone.`
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
