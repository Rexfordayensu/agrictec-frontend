'use client';

import { Download, Plus, Search, X } from 'lucide-react';
import {
  PERIOD_LABELS,
  SORT_LABELS,
  type CropFilter,
  type PeriodFilter,
  type RecordFilters,
  type RecordSort,
  type RecordTab,
} from '@/components/records/record-filters';
import { Button } from '@/components/ui/button';
import { CROP_TONES, CropIcon } from '@/components/ui/crop-icon';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';

const TAB_LABELS: Record<RecordTab, string> = {
  all: 'All',
  income: 'Income',
  expense: 'Expenses',
  activity: 'Activities',
};

export interface RecordsToolbarProps {
  filters: RecordFilters;
  onChange: (patch: Partial<RecordFilters>) => void;
  counts: Record<RecordTab, number>;
  /** Crops that appear in the farmer's records (only these get a chip). */
  crops: Crop[];
  onExport: () => void;
  onNew: () => void;
}

const chipClass =
  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors';

export function RecordsToolbar({
  filters,
  onChange,
  counts,
  crops,
  onExport,
  onNew,
}: RecordsToolbarProps) {
  const tabs = (Object.keys(TAB_LABELS) as RecordTab[]).map((value) => ({
    value,
    label: TAB_LABELS[value],
    count: counts[value],
  }));

  return (
    <div className="space-y-4">
      {/* Row 1: search, period, sort, actions */}
      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <input
            type="search"
            value={filters.query}
            onChange={(event) => onChange({ query: event.target.value })}
            placeholder="Search descriptions, notes or crops…"
            aria-label="Search records"
            className="border-border bg-bg-2 text-text placeholder:text-text-mute focus:border-accent min-h-11 w-full rounded-xl border pr-10 pl-10 text-sm focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              aria-label="Clear search"
              className="text-text-mute hover:text-text absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 @3xl:flex @3xl:w-auto">
          <Select
            aria-label="Filter by period"
            value={filters.period}
            onChange={(event) => onChange({ period: event.target.value as PeriodFilter })}
            className="@3xl:w-40"
          >
            {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
              <option key={p} value={p}>
                {PERIOD_LABELS[p]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Sort records"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value as RecordSort })}
            className="@3xl:w-44"
          >
            {(Object.keys(SORT_LABELS) as RecordSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 @3xl:flex">
          <Button variant="ghost" icon={Download} onClick={onExport}>
            Export CSV
          </Button>
          <Button mutates icon={Plus} onClick={onNew}>
            New Record
          </Button>
        </div>
      </div>

      {/* Row 2: type tabs + crop chips */}
      <div className="flex flex-col gap-3 @5xl:flex-row @5xl:items-center @5xl:justify-between">
        <Tabs
          label="Filter by record type"
          tabs={tabs}
          value={filters.tab}
          onChange={(tab) => onChange({ tab })}
        />
        {crops.length > 0 && (
          <div
            role="group"
            aria-label="Filter by crop"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 @5xl:pb-0"
          >
            <button
              type="button"
              aria-pressed={filters.crop === 'all'}
              onClick={() => onChange({ crop: 'all' as CropFilter })}
              className={cn(
                chipClass,
                filters.crop === 'all'
                  ? 'border-accent/50 bg-accent/15 text-ink-green'
                  : 'border-border bg-glass text-text-dim hover:text-text',
              )}
            >
              All crops
            </button>
            {crops.map((crop) => {
              const active = filters.crop === crop;
              return (
                <button
                  key={crop}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ crop: active ? 'all' : crop })}
                  className={cn(
                    chipClass,
                    active
                      ? 'border-accent/50 bg-accent/15 text-ink-green'
                      : 'border-border bg-glass text-text-dim hover:text-text',
                  )}
                >
                  <CropIcon
                    crop={crop}
                    size={14}
                    className={active ? undefined : CROP_TONES[crop].split(' ')[1]}
                  />
                  {crop}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
