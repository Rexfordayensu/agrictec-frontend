'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

type Align = 'left' | 'right' | 'center';
type SortValue = string | number | null | undefined;

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  align?: Align;
  /** Value used for sorting. Defaults to row[key]. */
  sortValue?: (row: T) => SortValue;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  empty?: ReactNode;
  caption?: string;
  /** Initial sort, e.g. { key: 'date', direction: 'desc' } for newest first. */
  defaultSort?: SortState;
  className?: string;
  /** Extra classes for a row, e.g. to highlight flagged rows. */
  rowClassName?: (row: T) => string | undefined;
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

const alignClass: Record<Align, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

function readValue<T extends object>(row: T, column: DataTableColumn<T>): SortValue {
  if (column.sortValue) return column.sortValue(row);
  const value = (row as Record<string, unknown>)[column.key];
  return typeof value === 'string' || typeof value === 'number' ? value : undefined;
}

function compare(a: SortValue, b: SortValue): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export function DataTable<T extends object>({
  columns,
  rows,
  getRowId,
  empty,
  caption,
  defaultSort,
  className,
  rowClassName,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);

  const sortColumn = sort ? columns.find((c) => c.key === sort.key) : undefined;
  const sortedRows =
    sort && sortColumn
      ? [...rows].sort((a, b) => {
          const result = compare(readValue(a, sortColumn), readValue(b, sortColumn));
          return sort.direction === 'asc' ? result : -result;
        })
      : rows;

  function toggleSort(key: string) {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }

  return (
    <div className={cn('border-border w-full overflow-x-auto rounded-2xl border', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-border bg-glass border-b">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              const ariaSort = active
                ? sort.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : column.sortable
                  ? 'none'
                  : undefined;
              const SortIcon = !active
                ? ArrowUpDown
                : sort.direction === 'asc'
                  ? ArrowUp
                  : ArrowDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={ariaSort}
                  className={cn(
                    'text-text-mute px-4 py-3 text-[11px] font-semibold tracking-wider uppercase',
                    alignClass[column.align ?? 'left'],
                    column.className,
                  )}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        'hover:text-text inline-flex min-h-8 items-center gap-1 uppercase transition-colors',
                        active && 'text-text',
                        column.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {column.header}
                      <SortIcon
                        size={12}
                        aria-hidden="true"
                        className={cn(!active && 'opacity-50')}
                      />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                {empty ?? (
                  <EmptyState
                    icon={Inbox}
                    title="Nothing here yet"
                    description="Items you add will appear in this table."
                  />
                )}
              </td>
            </tr>
          ) : (
            sortedRows.map((row) => (
              <tr
                key={getRowId(row)}
                className={cn(
                  'border-border hover:bg-glass border-b transition-colors last:border-b-0',
                  rowClassName?.(row),
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'text-text-dim px-4 py-3',
                      alignClass[column.align ?? 'left'],
                      column.className,
                    )}
                  >
                    {column.render ? column.render(row) : String(readValue(row, column) ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
