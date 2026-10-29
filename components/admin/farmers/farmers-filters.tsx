'use client';

import { useId, useState, type ReactNode } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { MultiSelect } from '@/components/admin/shared/multi-select';
import { StatusTabs } from '@/components/admin/shared/status-tabs';
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
import type { FarmerAccount } from '@/types/admin';

type AccountStatus = FarmerAccount['status'];

/** The status tabs above the list (they set ?status=; "all" clears it). */
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

/** Sort choices for phones and tablets, where some sortable columns are hidden. */
const SORT_OPTIONS: { value: `${string}:${SortDir}`; label: string }[] = [
  { value: 'joined:desc', label: 'Newest first' },
  { value: 'joined:asc', label: 'Oldest first' },
  { value: 'farmer:asc', label: 'Name A–Z' },
  { value: 'region:asc', label: 'Region A–Z' },
  { value: 'score:desc', label: 'Highest score' },
  { value: 'score:asc', label: 'Lowest score' },
  { value: 'income:desc', label: 'Highest income' },
  { value: 'records:desc', label: 'Most records' },
];

/** Filters in the panel behind the Filters button (status has its own tabs). */
const PANEL_FILTERS: FarmerFilterName[] = [
  'region',
  'crop',
  'band',
  'verification',
  'records',
  'tag',
  'joinedFrom',
  'joinedTo',
];

const FILTER_LABELS: Record<FarmerFilterName, string> = {
  region: 'Region',
  crop: 'Crop',
  status: 'Status',
  band: 'Score',
  verification: 'Verification',
  joinedFrom: 'Joined from',
  joinedTo: 'Joined to',
  records: 'Records',
  tag: 'Tag',
  active: 'Active in',
};

/** A chip's text for an active filter, e.g. "Northern, Ashanti". */
function chipText(name: FarmerFilterName, value: string): string {
  const many = (labels: Record<string, string>) =>
    splitValues(value)
      .map((v) => labels[v] ?? v)
      .join(', ');
  switch (name) {
    case 'band':
      return many(Object.fromEntries(SCORE_BANDS.map((b) => [b.value, b.label])));
    case 'verification':
      return VERIFICATION_FILTERS.find((o) => o.value === value)?.label ?? value;
    case 'records':
      return RECORD_OPTIONS.find((o) => o.value === value)?.label ?? value;
    case 'active':
      return `last ${value} days`;
    default:
      return splitValues(value).join(', ');
  }
}

/** A visible label above a filter control. */
function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-text-mute block text-xs font-semibold">
          {label}
        </label>
      ) : (
        <p aria-hidden="true" className="text-text-mute text-xs font-semibold">
          {label}
        </p>
      )}
      {children}
    </div>
  );
}

/**
 * Status tabs, search, sort and the filter panel. All of it lives in the URL (via useAdminTable),
 * so a filtered view survives a refresh and can be shared: ?status=active&region=Northern
 */
export function FarmersFilters({
  table,
  farmers,
  regions,
  crops,
  tags,
}: {
  table: AdminTableState<FarmerAccount>;
  /** Everyone in the list, for the counts on the status tabs. */
  farmers: FarmerAccount[];
  regions: string[];
  crops: string[];
  tags: string[];
}) {
  const id = useId();
  const value = (name: FarmerFilterName) => table.filters[name] ?? '';
  const set = (name: FarmerFilterName, next: string) => table.setFilter(name, next || null);
  const setMany = (name: FarmerFilterName) => (next: string[]) => set(name, next.join(','));

  // Chips for every active filter except status (the tabs already show it).
  const chips = (Object.keys(FILTER_LABELS) as FarmerFilterName[]).filter(
    (name) => name !== 'status' && value(name),
  );
  const panelCount = PANEL_FILTERS.filter((name) => value(name)).length;
  const [panelOpen, setPanelOpen] = useState(panelCount > 0);
  const status = value('status');
  const sortValue = table.sort ? `${table.sort.key}:${table.sort.dir}` : 'joined:desc';
  const countOf = (s: AccountStatus | 'all') =>
    s === 'all' ? farmers.length : farmers.filter((f) => f.status === s).length;

  return (
    <div className="space-y-4">
      <StatusTabs
        label="Account status"
        tabs={STATUS_TABS.map((tab) => ({ ...tab, count: countOf(tab.value) }))}
        value={(status || 'all') as AccountStatus | 'all'}
        onChange={(next) => set('status', next === 'all' ? '' : next)}
      />

      <div role="search" aria-label="Find farmers" className="space-y-3">
        {/* Search, filters and sort */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              aria-label="Search by name, email, phone or farm"
              placeholder="Search name, email, phone or farm"
              value={table.query}
              onChange={(e) => table.setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-expanded={panelOpen}
              aria-controls={`${id}-panel`}
              onClick={() => setPanelOpen((open) => !open)}
              className={cn(
                'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors sm:flex-none',
                panelOpen || panelCount
                  ? 'border-purple/50 bg-purple/10 text-text'
                  : 'border-border bg-bg-2 text-text-dim hover:text-text',
              )}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Filters
              {panelCount > 0 && (
                <span className="bg-purple inline-flex size-5 items-center justify-center rounded-full text-[11px] text-white">
                  {panelCount}
                  <span className="sr-only"> active</span>
                </span>
              )}
            </button>
            <label className="flex-1 sm:w-48 sm:flex-none xl:hidden">
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

        {/* Filter panel */}
        {panelOpen && (
          <div
            id={`${id}-panel`}
            className="animate-fade-in border-border bg-glass grid grid-cols-1 gap-4 rounded-2xl border p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Field label="Region">
              <MultiSelect
                label="Region"
                options={regions.map((r) => ({ value: r, label: r }))}
                value={splitValues(value('region'))}
                onChange={setMany('region')}
              />
            </Field>
            <Field label="Crop">
              <MultiSelect
                label="Crop"
                options={crops.map((c) => ({ value: c, label: c }))}
                value={splitValues(value('crop'))}
                onChange={setMany('crop')}
              />
            </Field>
            <Field label="Score band">
              <MultiSelect
                label="Score band"
                options={SCORE_BANDS.map((b) => ({ value: b.value, label: b.label }))}
                value={splitValues(value('band'))}
                onChange={setMany('band')}
              />
            </Field>
            <Field label="Verification" htmlFor={`${id}-verification`}>
              <Select
                id={`${id}-verification`}
                value={value('verification')}
                onChange={(e) => set('verification', e.target.value)}
              >
                <option value="">Any verification</option>
                {VERIFICATION_FILTERS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
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

        {/* Results and active filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <p className="text-text-dim font-semibold" aria-live="polite">
            {table.total.toLocaleString()} {table.total === 1 ? 'farmer' : 'farmers'}
          </p>
          {chips.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => table.setFilter(name, null)}
              aria-label={`Remove filter ${FILTER_LABELS[name]}: ${chipText(name, value(name))}`}
              className="border-border bg-glass text-text-dim hover:text-text hover:border-purple/50 inline-flex min-h-7 items-center gap-1.5 rounded-lg border px-2.5 transition-colors"
            >
              <span className="text-text-mute">{FILTER_LABELS[name]}:</span>
              <span className="text-text font-semibold">{chipText(name, value(name))}</span>
              <X size={12} aria-hidden="true" />
            </button>
          ))}
          {(chips.length > 0 || status || table.query) && (
            <button
              type="button"
              onClick={table.clearFilters}
              className="text-ink-purple min-h-7 px-1 font-semibold hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
