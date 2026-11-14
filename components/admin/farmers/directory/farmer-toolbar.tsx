'use client';

import { useId, useState, type ReactNode } from 'react';
import { ChartColumn, MapPin, Search, ShieldCheck, SlidersHorizontal, Sprout } from 'lucide-react';
import { FilterDropdown } from '@/components/admin/farmers/directory/filter-dropdown';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { AdminTableState, SortDir } from '@/hooks/admin/use-admin-table';
import {
  SCORE_BANDS,
  splitValues,
  VERIFICATION_FILTERS,
  type FarmerFilterName,
} from '@/lib/admin/farmer-list';
import { cn } from '@/lib/utils';
import type { FarmerPage } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

type AccountStatus = FarmerAccount['status'];

const STATUS_TABS: { value: AccountStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'pending_verification', label: 'Pending' },
  { value: 'suspended', label: 'Suspended' },
];

const RECORD_OPTIONS = [
  { value: 'yes', label: 'Has records' },
  { value: 'no', label: 'No records' },
];

const ACTIVE_OPTIONS = [
  { value: '7', label: 'Active in the last 7 days' },
  { value: '30', label: 'Active in the last 30 days' },
  { value: '90', label: 'Active in the last 90 days' },
];

/** On phones the column headers are hidden, so sorting is a menu. */
const SORT_OPTIONS: { value: `${string}:${SortDir}`; label: string }[] = [
  { value: 'joined:desc', label: 'Newest first' },
  { value: 'joined:asc', label: 'Oldest first' },
  { value: 'farmer:asc', label: 'Name A–Z' },
  { value: 'score:desc', label: 'Highest score' },
  { value: 'score:asc', label: 'Lowest score' },
  { value: 'records:desc', label: 'Most records' },
];

/** The filters behind the Filters button (the four common ones have their own dropdowns). */
const MORE_FILTERS: FarmerFilterName[] = ['records', 'tag', 'joinedFrom', 'joinedTo', 'active'];

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={htmlFor} className="text-text-mute block text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

/** The status tabs at the top of the directory card (they set ?status=; "All" clears it). */
export function StatusTabs({
  table,
  counts,
}: {
  table: AdminTableState<FarmerAccount>;
  counts?: FarmerPage['summary'];
}) {
  const status = table.filters.status || 'all';
  return (
    <div
      role="tablist"
      aria-label="Account status"
      className="border-border flex [scrollbar-width:none] gap-1 overflow-x-auto overflow-y-hidden border-b px-3 sm:px-4"
    >
      {STATUS_TABS.map((tab) => {
        const selected = status === tab.value;
        const count = counts?.[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => table.setFilter('status', tab.value === 'all' ? null : tab.value)}
            className={cn(
              '-mb-px inline-flex min-h-12 shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3.5 text-sm font-semibold transition-colors sm:px-4',
              selected
                ? 'border-purple bg-purple/10 text-ink-purple'
                : 'text-text hover:text-ink-purple border-transparent',
            )}
          >
            {tab.label}
            <span
              className={cn(
                'inline-flex min-w-5 items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums',
                selected ? 'bg-purple text-white' : 'bg-glass-strong text-text-dim',
              )}
            >
              {count ?? '–'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Search, the Filters button (less common filters), the four dropdowns (region, crop,
 * verification, score) and the result count. Everything lives in the URL, so a filtered view
 * survives a refresh and can be shared.
 */
export function FarmerToolbar({
  table,
  regions,
  crops,
  tags,
}: {
  table: AdminTableState<FarmerAccount>;
  regions: string[];
  crops: string[];
  tags: string[];
}) {
  const id = useId();
  const value = (name: FarmerFilterName) => table.filters[name] ?? '';
  const set = (name: FarmerFilterName, next: string) => table.setFilter(name, next || null);
  const moreCount = MORE_FILTERS.filter((name) => value(name)).length;
  const [moreOpen, setMoreOpen] = useState(moreCount > 0);
  const anyFilter = Boolean(table.query) || Object.values(table.filters).some((v) => Boolean(v));
  const sortValue = table.sort ? `${table.sort.key}:${table.sort.dir}` : 'joined:desc';

  return (
    <div role="search" aria-label="Find farmers" className="space-y-3 p-3 sm:p-4">
      <div className="flex gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label="Search by name, email, phone or farm"
            placeholder="Search by name, email, phone or farm..."
            value={table.query}
            onChange={(e) => table.setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={`${id}-more`}
          onClick={() => setMoreOpen((open) => !open)}
          className={cn(
            'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition-colors sm:px-5',
            moreOpen || moreCount
              ? 'border-purple/50 bg-purple/10 text-text'
              : 'border-border bg-bg-2 text-text hover:border-purple/40',
          )}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          <span className="hidden sm:inline">Filters</span>
          <span className="sr-only sm:hidden">More filters</span>
          {moreCount > 0 && (
            <span className="bg-purple inline-flex size-5 items-center justify-center rounded-full text-xs text-white">
              {moreCount}
              <span className="sr-only"> active</span>
            </span>
          )}
        </button>
      </div>

      {moreOpen && (
        <div
          id={`${id}-more`}
          className="animate-fade-in border-border bg-glass grid grid-cols-1 gap-3 rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-5"
        >
          <Field label="Records" htmlFor={`${id}-records`}>
            <Select
              id={`${id}-records`}
              value={value('records')}
              onChange={(e) => set('records', e.target.value)}
            >
              <option value="">With or without records</option>
              {RECORD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Last active" htmlFor={`${id}-active`}>
            <Select
              id={`${id}-active`}
              value={value('active')}
              onChange={(e) => set('active', e.target.value)}
            >
              <option value="">Any time</option>
              {ACTIVE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tag" htmlFor={`${id}-tag`}>
            <Select
              id={`${id}-tag`}
              value={value('tag')}
              onChange={(e) => set('tag', e.target.value)}
            >
              <option value="">Any tag</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Joined from" htmlFor={`${id}-from`}>
            <Input
              id={`${id}-from`}
              type="date"
              value={value('joinedFrom')}
              max={value('joinedTo') || undefined}
              onChange={(e) => set('joinedFrom', e.target.value)}
            />
          </Field>
          <Field label="Joined to" htmlFor={`${id}-to`}>
            <Input
              id={`${id}-to`}
              type="date"
              value={value('joinedTo')}
              min={value('joinedFrom') || undefined}
              onChange={(e) => set('joinedTo', e.target.value)}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <FilterDropdown
          label="Region"
          icon={MapPin}
          multiple
          options={regions.map((r) => ({ value: r, label: r }))}
          value={splitValues(value('region'))}
          onChange={(next) => set('region', next.join(','))}
        />
        <FilterDropdown
          label="Crop"
          icon={Sprout}
          multiple
          options={crops.map((c) => ({ value: c, label: c }))}
          value={splitValues(value('crop'))}
          onChange={(next) => set('crop', next.join(','))}
        />
        <FilterDropdown
          label="Verification"
          icon={ShieldCheck}
          options={VERIFICATION_FILTERS.map((o) => ({ value: o.value, label: o.label }))}
          value={value('verification') ? [value('verification')] : []}
          onChange={(next) => set('verification', next[0] ?? '')}
        />
        <FilterDropdown
          label="Score"
          icon={ChartColumn}
          multiple
          options={SCORE_BANDS.map((b) => ({ value: b.value, label: b.label }))}
          value={splitValues(value('band'))}
          onChange={(next) => set('band', next.join(','))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        <p className="text-text text-xs font-bold" aria-live="polite">
          {table.total.toLocaleString()} {table.total === 1 ? 'farmer' : 'farmers'}
        </p>
        {anyFilter && (
          <button
            type="button"
            onClick={table.clearFilters}
            className="text-ink-purple min-h-7 text-xs font-semibold hover:underline"
          >
            Clear filters
          </button>
        )}
        <label className="ml-auto md:hidden">
          <span className="sr-only">Sort by</span>
          <Select
            value={sortValue}
            onChange={(e) => {
              const [key, dir] = e.target.value.split(':');
              table.setSort(key, dir === 'desc' ? 'desc' : 'asc');
            }}
          >
            {!SORT_OPTIONS.some((o) => o.value === sortValue) && (
              <option value={sortValue}>Custom sort</option>
            )}
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
