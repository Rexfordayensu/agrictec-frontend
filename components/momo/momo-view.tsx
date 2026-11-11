'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  activeMomoFilterCount,
  DEFAULT_MOMO_FILTERS,
  filterMomo,
  MOMO_PERIOD_LABELS,
  type DirectionFilter,
  type MomoFilters,
} from '@/components/momo/momo-filters';
import { MomoList } from '@/components/momo/momo-list';
import { MomoToolbar } from '@/components/momo/momo-toolbar';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import { downloadFile, toCSV } from '@/lib/export/csv';
import { formatGHS, todayISO } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';

/** The transactions card: owns the filters shared by the toolbar and the list. */
export function MomoView() {
  const momo = useFarmStore((s) => s.momo);
  const openModal = useModalStore((s) => s.openModal);
  const [filters, setFilters] = useState<MomoFilters>(DEFAULT_MOMO_FILTERS);
  const query = useDebounce(filters.query, 200);

  const update = (patch: Partial<MomoFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const clear = () => setFilters(DEFAULT_MOMO_FILTERS);

  // Network, period and search apply to every tab; the tab then narrows by direction.
  const base = filterMomo(momo, { ...filters, query });
  const rows =
    filters.direction === 'all' ? base : base.filter((t) => t.direction === filters.direction);
  const counts: Record<DirectionFilter, number> = {
    all: base.length,
    in: base.filter((t) => t.direction === 'in').length,
    out: base.filter((t) => t.direction === 'out').length,
  };
  const activeFilters = activeMomoFilterCount(filters);
  // Totals for exactly what the list shows (the summary above covers everything, all time).
  const shownIn = rows.filter((t) => t.direction === 'in').reduce((sum, t) => sum + t.amount, 0);
  const shownOut = rows.filter((t) => t.direction === 'out').reduce((sum, t) => sum + t.amount, 0);

  function exportCsv() {
    if (rows.length === 0) {
      toast.info('There are no transactions to export with these filters.');
      return;
    }
    const csv = toCSV(rows, [
      { header: 'Date', value: (t) => t.date },
      { header: 'Type', value: (t) => (t.direction === 'in' ? 'Received' : 'Sent') },
      { header: 'Counterparty', value: (t) => t.counterparty },
      { header: 'Network', value: (t) => t.network ?? '' },
      { header: 'Reference', value: (t) => t.reference ?? 'Not provided' },
      { header: 'Amount (GHS)', value: (t) => (t.direction === 'in' ? t.amount : -t.amount) },
    ]);
    downloadFile(csv, `AgriCtec_MoMo_${todayISO()}.csv`);
    toast.success(`Exported ${rows.length} transaction${rows.length === 1 ? '' : 's'}`);
  }

  return (
    <Card className="@container rounded-3xl" padding="none">
      <div className="border-border border-b p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-text text-[15px] font-bold">Transactions</h2>
          <p className="text-text-mute text-xs">Every mobile money payment in and out</p>
        </div>
        <MomoToolbar
          filters={filters}
          onChange={update}
          counts={counts}
          onExport={exportCsv}
          onNew={() => openModal('momo')}
        />
      </div>

      <div className="text-text-mute flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pt-4 text-xs sm:px-5">
        <span aria-live="polite">
          Showing <strong className="text-text">{rows.length}</strong> of {momo.length} transaction
          {momo.length === 1 ? '' : 's'}
          {rows.length > 0 && (
            <>
              {' · '}
              {MOMO_PERIOD_LABELS[filters.period].toLowerCase()}: in{' '}
              <strong className="text-ink-green">{formatGHS(shownIn)}</strong>, out{' '}
              <strong className="text-ink-red">{formatGHS(shownOut)}</strong>
            </>
          )}
        </span>
        {activeFilters > 0 && (
          <button
            type="button"
            onClick={clear}
            className="text-ink-green min-h-9 font-semibold hover:underline"
          >
            Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
          </button>
        )}
      </div>

      <div className="p-2 sm:p-3">
        <MomoList
          key={JSON.stringify({ ...filters, query })}
          rows={rows}
          hasAny={momo.length > 0}
          hasActiveFilters={activeFilters > 0}
          onClearFilters={clear}
        />
      </div>
    </Card>
  );
}
