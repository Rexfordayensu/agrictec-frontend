'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  filterRecords,
  sortRecords,
  type RecordFilters,
  type RecordTab,
} from '@/components/records/record-filters';
import { RecordsList } from '@/components/records/records-list';
import { RecordsSummary } from '@/components/records/records-summary';
import { RecordsToolbar } from '@/components/records/records-toolbar';
import { Card } from '@/components/ui/card';
import { CROPS } from '@/constants/crops';
import { useDebounce } from '@/hooks/use-debounce';
import { downloadFile, toCSV } from '@/lib/export/csv';
import { todayISO } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import type { FarmRecord } from '@/types';

const TYPE_LABEL: Record<FarmRecord['type'], string> = {
  income: 'Income',
  expense: 'Expense',
  activity: 'Activity',
};

/** Owns the filter state shared by the summary, toolbar and list. */
export function RecordsView() {
  const records = useFarmStore((s) => s.records);
  const openModal = useModalStore((s) => s.openModal);
  const [filters, setFilters] = useState<RecordFilters>(DEFAULT_FILTERS);
  const query = useDebounce(filters.query, 200);

  const update = (patch: Partial<RecordFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // Crop, period and search apply to every tab; the tab then narrows by type.
  const base = filterRecords(records, { ...filters, query });
  const rows = sortRecords(
    filters.tab === 'all' ? base : base.filter((r) => r.type === filters.tab),
    filters.sort,
  );
  const counts: Record<RecordTab, number> = {
    all: base.length,
    income: base.filter((r) => r.type === 'income').length,
    expense: base.filter((r) => r.type === 'expense').length,
    activity: base.filter((r) => r.type === 'activity').length,
  };
  const cropsInUse = CROPS.filter((crop) => records.some((r) => r.crop === crop));
  const activeFilters = activeFilterCount(filters);

  function exportCsv() {
    if (rows.length === 0) {
      toast.info('There are no records to export with these filters.');
      return;
    }
    const csv = toCSV(rows, [
      { header: 'Date', value: (r) => r.date },
      { header: 'Type', value: (r) => TYPE_LABEL[r.type] },
      { header: 'Description', value: (r) => r.description },
      { header: 'Crop', value: (r) => r.crop },
      {
        // Signed so the column sums to net profit; activities have no amount.
        header: 'Amount (GHS)',
        value: (r) => (r.type === 'activity' ? '' : r.type === 'income' ? r.amount : -r.amount),
      },
      { header: 'Notes', value: (r) => r.notes ?? '' },
    ]);
    downloadFile(csv, `AgriCtec_Records_${todayISO()}.csv`);
    toast.success(`Exported ${rows.length} record${rows.length === 1 ? '' : 's'}`);
  }

  return (
    <div className="space-y-5">
      <RecordsSummary rows={rows} filtered={activeFilters > 0} />

      <Card className="@container" padding="none">
        <div className="border-border border-b p-4 sm:p-5">
          <RecordsToolbar
            filters={filters}
            onChange={update}
            counts={counts}
            crops={cropsInUse}
            onExport={exportCsv}
            onNew={() => openModal('record')}
          />
        </div>

        <div className="text-text-mute flex items-center justify-between gap-3 px-4 pt-4 text-xs sm:px-5">
          <span aria-live="polite">
            Showing <strong className="text-text">{rows.length}</strong> of {records.length} record
            {records.length === 1 ? '' : 's'}
          </span>
          {activeFilters > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
              className="text-ink-green min-h-9 font-semibold hover:underline"
            >
              Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
            </button>
          )}
        </div>

        <div className="p-2 sm:p-3">
          <RecordsList
            rows={rows}
            sort={filters.sort}
            hasAnyRecords={records.length > 0}
            hasActiveFilters={activeFilters > 0}
            onClearFilters={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
          />
        </div>
      </Card>
    </div>
  );
}
