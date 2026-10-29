'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  activeMomoFilterCount,
  DEFAULT_MOMO_FILTERS,
  filterMomo,
  type DirectionFilter,
  type MomoFilters,
} from '@/components/momo/momo-filters';
import { MomoList } from '@/components/momo/momo-list';
import { MomoToolbar } from '@/components/momo/momo-toolbar';
import { Card } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import { downloadFile, toCSV } from '@/lib/export/csv';
import { todayISO } from '@/lib/format';
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
      { header: 'Reference', value: (t) => t.reference },
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

      <div className="text-text-mute flex items-center justify-between gap-3 px-4 pt-4 text-xs sm:px-5">
        <span aria-live="polite">
          Showing <strong className="text-text">{rows.length}</strong> of {momo.length} transaction
          {momo.length === 1 ? '' : 's'}
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
          rows={rows}
          hasAny={momo.length > 0}
          hasActiveFilters={activeFilters > 0}
          onClearFilters={clear}
        />
      </div>
    </Card>
  );
}
