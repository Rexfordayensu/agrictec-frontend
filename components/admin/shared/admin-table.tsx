'use client';

import type { MouseEvent, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import { Pagination } from '@/components/admin/shared/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminTableState } from '@/hooks/admin/use-admin-table';
import { cn } from '@/lib/utils';

export interface AdminColumn<T> {
  /** Also the sort key passed to useAdminTable (see its sortAccessors). */
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  className?: string;
  /** The row's name: rendered as the link or button that opens the row. */
  primary?: boolean;
  /** Left out of the stacked cards on phones. */
  hideOnMobile?: boolean;
}

/** What a custom phone card gets: the row's opener (its name as a link or button) and checkbox. */
export interface AdminMobileCardParts {
  opener: (content: ReactNode) => ReactNode;
  checkbox: ReactNode;
}

export interface AdminTableProps<T> {
  table: AdminTableState<T>;
  columns: AdminColumn<T>[];
  getRowId: (row: T) => string;
  /** Read by screen readers, e.g. "Farmers". */
  caption: string;
  /** Adds a checkbox column (selection lives in useAdminTable). */
  selectable?: boolean;
  /** For checkbox labels, e.g. the farmer's name. */
  rowLabel?: (row: T) => string;
  /** A row opens a page… */
  rowHref?: (row: T) => string;
  /** …or a detail modal. */
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  /** A purpose-built card per row on phones, instead of the default label/value list. */
  mobileCard?: (row: T, parts: AdminMobileCardParts) => ReactNode;
  /** Shown on rows that can't be selected (see useAdminTable's canSelect). */
  unselectableHint?: string;
}

/** Clicks on these inside a row do their own thing instead of opening the row. */
const INTERACTIVE = 'a, button, input, label, select, textarea';

/**
 * The console's data table: sticky header, checkbox column, sortable headers (aria-sort), rows
 * that open a page or a detail modal, pagination and an empty state. Below 768px rows become cards.
 */
export function AdminTable<T>({
  table,
  columns,
  getRowId,
  caption,
  selectable = false,
  rowLabel,
  rowHref,
  onRowClick,
  loading = false,
  empty,
  mobileCard,
  unselectableHint = 'Not available for bulk actions',
}: AdminTableProps<T>) {
  const router = useRouter();
  const opensRow = Boolean(rowHref || onRowClick);

  function open(row: T) {
    if (rowHref) router.push(rowHref(row));
    else onRowClick?.(row);
  }

  function onRowMouseClick(event: MouseEvent<HTMLElement>, row: T) {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    // Focus the row's own link or button first, so a modal opened from the row hands focus back
    // to this row when it closes (a tap on a card focuses nothing by itself).
    event.currentTarget
      .querySelector<HTMLElement>('[data-row-opener]')
      ?.focus({ preventScroll: true });
    open(row);
  }

  /** The keyboard path into a row: the primary cell is a real link or button. */
  function primaryCell(row: T, content: ReactNode) {
    if (rowHref) {
      return (
        <Link
          href={rowHref(row)}
          data-row-opener
          className="text-text hover:text-ink-purple font-semibold"
        >
          {content}
        </Link>
      );
    }
    if (onRowClick) {
      return (
        <button
          type="button"
          data-row-opener
          onClick={() => onRowClick(row)}
          className="text-text hover:text-ink-purple text-left font-semibold"
        >
          {content}
        </button>
      );
    }
    return content;
  }

  const checkbox = (row: T) => {
    const id = getRowId(row);
    // Rows that can't be bulk-selected keep the column aligned with an empty, labelled slot.
    if (!table.canSelect(row))
      return (
        <span
          title={unselectableHint}
          className="border-border/60 inline-block size-4 rounded-[3px] border border-dashed align-middle"
        >
          <span className="sr-only">{unselectableHint}</span>
        </span>
      );
    return (
      <input
        type="checkbox"
        checked={table.selected.has(id)}
        onChange={() => table.toggle(id)}
        aria-label={`Select ${rowLabel?.(row) ?? id}`}
        className="size-4 cursor-pointer accent-[#a855f7]"
      />
    );
  };

  if (loading) {
    return (
      <div role="status" aria-label={`Loading ${caption.toLowerCase()}`} className="space-y-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (table.total === 0) {
    return (
      empty ?? (
        <EmptyState
          icon={Inbox}
          title="Nothing matches"
          description="Try a different search or clear the filters."
        />
      )
    );
  }

  return (
    <div className="space-y-4">
      {/* Phones: one card per row */}
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {table.pageRows.map((row) => (
          <li
            key={getRowId(row)}
            onClick={(event) => onRowMouseClick(event, row)}
            className={cn(
              'border-border bg-glass rounded-2xl border p-4 transition-colors',
              opensRow && 'active:bg-glass-strong cursor-pointer',
              table.selected.has(getRowId(row)) && 'border-purple/40 bg-purple/10',
            )}
          >
            {mobileCard ? (
              mobileCard(row, {
                opener: (content) => primaryCell(row, content),
                checkbox: selectable ? checkbox(row) : null,
              })
            ) : (
              <div className="flex items-start gap-3">
                {selectable && <span className="pt-0.5">{checkbox(row)}</span>}
                <dl className="min-w-0 flex-1 space-y-1.5">
                  {columns
                    .filter((column) => !column.hideOnMobile)
                    .map((column) => (
                      <div
                        key={column.key}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <dt className="text-text-mute shrink-0 text-xs">{column.header}</dt>
                        <dd className="min-w-0 text-right">
                          {column.primary ? primaryCell(row, column.cell(row)) : column.cell(row)}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Tablet and up: the table, with a header that stays in view while scrolling */}
      <div className="border-border bg-glass hidden max-h-[70vh] overflow-auto rounded-2xl border md:block">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-bg-2 sticky top-0 z-10">
            <tr className="border-border border-b">
              {selectable && (
                <th scope="col" className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={table.allOnPageSelected}
                    onChange={table.toggleAllOnPage}
                    disabled={!table.anySelectableOnPage}
                    aria-label="Select all rows on this page"
                    className="size-4 cursor-pointer accent-[#a855f7] disabled:cursor-not-allowed disabled:opacity-40"
                  />
                </th>
              )}
              {columns.map((column) => {
                const sorted = table.sort?.key === column.key ? table.sort.dir : null;
                const SortIcon =
                  sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                    className={cn(
                      'text-text-mute px-3 py-3 text-[11px] font-semibold tracking-wider whitespace-nowrap uppercase',
                      column.align === 'right' && 'text-right',
                      column.className,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => table.setSort(column.key)}
                        className={cn(
                          'hover:text-text inline-flex items-center gap-1',
                          sorted && 'text-ink-purple',
                        )}
                      >
                        {column.header}
                        <SortIcon size={13} aria-hidden="true" />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {table.pageRows.map((row) => {
              const id = getRowId(row);
              return (
                <tr
                  key={id}
                  onClick={(event) => onRowMouseClick(event, row)}
                  className={cn(
                    'transition-colors',
                    opensRow && 'hover:bg-glass-strong cursor-pointer',
                    table.selected.has(id) && 'bg-purple/10',
                  )}
                >
                  {selectable && <td className="px-3 py-3">{checkbox(row)}</td>}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'text-text-dim px-3 py-3 align-middle',
                        column.align === 'right' && 'text-right tabular-nums',
                        column.className,
                      )}
                    >
                      {column.primary ? primaryCell(row, column.cell(row)) : column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPage={table.setPage}
      />
    </div>
  );
}
