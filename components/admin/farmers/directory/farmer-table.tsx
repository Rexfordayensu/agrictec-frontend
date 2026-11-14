'use client';

import type { MouseEvent, ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Users,
} from 'lucide-react';
import {
  AccountPill,
  checksOf,
  FarmCropsCell,
  FarmerCell,
  nameOf,
  RecordsCell,
  ScoreCell,
  VerificationCell,
} from '@/components/admin/farmers/directory/farmer-cells';
import { pageWindow } from '@/components/admin/shared/pagination';
import { RowMenu, type RowMenuItem } from '@/components/admin/shared/row-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminTableState } from '@/hooks/admin/use-admin-table';
import { cn } from '@/lib/utils';
import type { CreditConfig, FarmerAccount, VerificationKind } from '@/types/admin';

/** A white box that turns purple with a tick (the browser's own checkbox ignores the theme). */
export const CHECKBOX =
  "border-border bg-bg-2 checked:border-[#a855f7] checked:bg-[#a855f7] size-[1.125rem] shrink-0 cursor-pointer appearance-none rounded-[5px] border bg-center bg-no-repeat transition-colors checked:bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2016%2016%22%20fill%3D%22none%22%20stroke%3D%22white%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22M3.5%208.5l3%203%206-7%22%2F%3E%3C%2Fsvg%3E')] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a855f7] disabled:cursor-not-allowed disabled:opacity-40";

/** Clicks on these inside a row do their own thing instead of opening the farmer. */
const INTERACTIVE = 'a, button, input, label, select, textarea';

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
}

const COLUMNS: Column[] = [
  { key: 'farmer', header: 'Farmer', sortable: true, className: 'w-[25%]' },
  { key: 'region', header: 'Farm & Crops', className: 'w-[17%]' },
  { key: 'score', header: 'AgriCtec Score', sortable: true, className: 'w-[18%]' },
  { key: 'records', header: 'Records', sortable: true, className: 'w-[12%]' },
  { key: 'verified', header: 'Verification', className: 'w-[14%]' },
  { key: 'status', header: 'Status', className: 'w-[14%]' },
];

function SortHeader({ column, table }: { column: Column; table: AdminTableState<FarmerAccount> }) {
  const sorted = table.sort?.key === column.key ? table.sort.dir : null;
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
      className={cn('px-2.5 py-3 text-xs font-semibold whitespace-nowrap', column.className)}
    >
      {column.sortable ? (
        <button
          type="button"
          onClick={() => table.setSort(column.key)}
          className={cn(
            'hover:text-text inline-flex items-center gap-1',
            sorted ? 'text-ink-purple' : 'text-text-dim',
          )}
        >
          {column.header}
          <Icon size={13} aria-hidden="true" />
        </button>
      ) : (
        <span className="text-text-dim">{column.header}</span>
      )}
    </th>
  );
}

/** Previous, the page numbers and next, under "Showing 1–3 of 3". */
function Pager({ table }: { table: AdminTableState<FarmerAccount> }) {
  const { page, pageCount, pageSize, total } = table;
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const arrow =
    'border-border text-text-dim hover:border-purple/40 hover:text-text inline-flex size-9 items-center justify-center rounded-lg border bg-bg-2 transition-colors disabled:pointer-events-none disabled:opacity-40';
  return (
    <nav
      aria-label="Pagination"
      className="border-border flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3.5 sm:px-6"
    >
      <p className="text-text text-sm">
        Showing{' '}
        <span className="tabular-nums">
          {from}–{to}
        </span>{' '}
        of <span className="tabular-nums">{total.toLocaleString()}</span>
      </p>
      <ul className="flex items-center gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => table.setPage(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className={arrow}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        </li>
        {pageWindow(page, pageCount).map((item, index) =>
          item === 'gap' ? (
            <li key={`gap-${index}`} aria-hidden="true" className="text-text-mute px-1 text-xs">
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                onClick={() => table.setPage(item)}
                aria-label={`Page ${item}`}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'inline-flex size-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                  item === page ? 'bg-[#a855f7] text-white' : 'text-text-dim hover:bg-glass-strong',
                )}
              >
                {item}
              </button>
            </li>
          ),
        )}
        <li>
          <button
            type="button"
            onClick={() => table.setPage(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className={arrow}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}

/**
 * The farmers directory: one page from the API, sortable headers, checkboxes, a row that opens
 * the farmer's panel, and the ⋯ menu. Phones get a card per farmer. The height follows the rows.
 */
export function FarmerTable({
  table,
  bands,
  pendingChecks,
  selectedId,
  onOpen,
  menuItems,
  selectable,
  loading,
  hasFilters,
  empty,
}: {
  table: AdminTableState<FarmerAccount>;
  bands?: CreditConfig['bands'];
  pendingChecks: Record<string, VerificationKind[]>;
  /** The farmer whose panel is open (their row is highlighted). */
  selectedId: string | null;
  onOpen: (farmer: FarmerAccount) => void;
  menuItems: (farmer: FarmerAccount) => RowMenuItem[];
  selectable: boolean;
  loading: boolean;
  hasFilters: boolean;
  empty?: ReactNode;
}) {
  function onRowClick(event: MouseEvent<HTMLElement>, farmer: FarmerAccount) {
    if ((event.target as HTMLElement).closest(INTERACTIVE)) return;
    event.currentTarget
      .querySelector<HTMLElement>('[data-row-opener]')
      ?.focus({ preventScroll: true });
    onOpen(farmer);
  }

  const checkbox = (farmer: FarmerAccount) => (
    <input
      type="checkbox"
      checked={table.selected.has(farmer.userId)}
      onChange={() => table.toggle(farmer.userId)}
      aria-label={`Select ${nameOf(farmer)}`}
      className={CHECKBOX}
    />
  );

  const opener = (farmer: FarmerAccount, content: ReactNode) => (
    <button
      type="button"
      data-row-opener
      onClick={() => onOpen(farmer)}
      aria-label={`Open ${nameOf(farmer)}`}
      className="block w-full min-w-0 text-left"
    >
      {content}
    </button>
  );

  const actions = (farmer: FarmerAccount) => (
    <RowMenu
      label={`Actions for ${nameOf(farmer)}`}
      items={menuItems(farmer)}
      button={<MoreHorizontal size={18} aria-hidden="true" />}
      buttonClassName="text-text hover:bg-glass-strong inline-flex size-9 items-center justify-center rounded-lg transition-colors"
    />
  );

  if (loading) {
    return (
      <div role="status" aria-label="Loading farmers" className="space-y-2 px-4 pb-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (table.total === 0) {
    return (
      <div className="px-4 pb-6">
        {empty ??
          (hasFilters ? (
            <EmptyState
              icon={Users}
              title="No farmers match"
              description="Try a different search or clear the filters."
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No farmers yet"
              description="Farmers appear here as soon as they create an account."
            />
          ))}
      </div>
    );
  }

  return (
    <div>
      {/* Phones and small tablets: a card per farmer */}
      <ul className="space-y-2 px-3 pb-3 md:hidden" aria-label="Farmers">
        {table.pageRows.map((farmer) => {
          const checks = checksOf(farmer, pendingChecks[farmer.userId]);
          return (
            <li
              key={farmer.userId}
              onClick={(event) => onRowClick(event, farmer)}
              className={cn(
                'border-border cursor-pointer rounded-xl border p-3.5 transition-colors',
                selectedId === farmer.userId ? 'border-purple/40 bg-purple/10' : 'bg-bg-2',
              )}
            >
              <div className="flex items-start gap-3">
                {selectable && <span className="pt-2.5">{checkbox(farmer)}</span>}
                <div className="min-w-0 flex-1">
                  {opener(farmer, <FarmerCell farmer={farmer} />)}
                </div>
                {actions(farmer)}
              </div>
              <div className="border-border mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
                <FarmCropsCell farmer={farmer} />
                <ScoreCell farmer={farmer} bands={bands} />
                <RecordsCell farmer={farmer} />
                <span className="flex flex-col items-start gap-1.5">
                  <VerificationCell checks={checks} />
                  <AccountPill status={farmer.status} />
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Tablets and up: the table (scrolls sideways inside the card when space is short) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="text-small w-full min-w-[44rem] table-fixed text-left">
          <caption className="sr-only">Farmers</caption>
          <thead className="bg-glass-strong/60">
            <tr className="border-border border-y">
              {selectable && (
                <th scope="col" className="w-11 py-3 pr-0 pl-4">
                  <input
                    type="checkbox"
                    checked={table.allOnPageSelected}
                    onChange={table.toggleAllOnPage}
                    disabled={!table.anySelectableOnPage}
                    aria-label="Select all farmers on this page"
                    className={CHECKBOX}
                  />
                </th>
              )}
              {COLUMNS.map((column) => (
                <SortHeader key={column.key} column={column} table={table} />
              ))}
              <th
                scope="col"
                className="text-text-dim w-[4.25rem] px-2.5 py-3 text-xs font-semibold"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {table.pageRows.map((farmer) => {
              const open = selectedId === farmer.userId;
              const checks = checksOf(farmer, pendingChecks[farmer.userId]);
              return (
                <tr
                  key={farmer.userId}
                  onClick={(event) => onRowClick(event, farmer)}
                  aria-selected={open}
                  className={cn(
                    'cursor-pointer transition-colors',
                    open ? 'bg-purple/8' : 'hover:bg-glass-strong/50',
                    table.selected.has(farmer.userId) && !open && 'bg-purple/5',
                  )}
                >
                  {selectable && <td className="py-4 pr-0 pl-4">{checkbox(farmer)}</td>}
                  <td className="px-2.5 py-4">{opener(farmer, <FarmerCell farmer={farmer} />)}</td>
                  <td className="px-2.5 py-4">
                    <FarmCropsCell farmer={farmer} />
                  </td>
                  <td className="px-2.5 py-4">
                    <ScoreCell farmer={farmer} bands={bands} />
                  </td>
                  <td className="px-2.5 py-4">
                    <RecordsCell farmer={farmer} />
                  </td>
                  <td className="px-2.5 py-4">
                    <VerificationCell checks={checks} />
                  </td>
                  <td className="px-2.5 py-4">
                    <AccountPill status={farmer.status} />
                  </td>
                  <td className="px-2.5 py-4">{actions(farmer)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pager table={table} />
    </div>
  );
}
