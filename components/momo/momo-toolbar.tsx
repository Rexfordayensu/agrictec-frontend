'use client';

import { Download, Plus, Search, X } from 'lucide-react';
import {
  MOMO_PERIOD_LABELS,
  NETWORK_STYLES,
  type DirectionFilter,
  type MomoFilters,
  type MomoPeriod,
  type NetworkFilter,
} from '@/components/momo/momo-filters';
import { NetworkLogo } from '@/components/momo/network-logo';
import { MOMO_NETWORKS } from '@/components/momo/momo-schema';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const chipClass =
  'inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors';

export function MomoToolbar({
  filters,
  onChange,
  counts,
  onExport,
  onNew,
}: {
  filters: MomoFilters;
  onChange: (patch: Partial<MomoFilters>) => void;
  counts: Record<DirectionFilter, number>;
  onExport: () => void;
  onNew: () => void;
}) {
  const networks: NetworkFilter[] = ['all', ...MOMO_NETWORKS];

  return (
    <div className="space-y-4">
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
            placeholder="Search name, reference or network…"
            aria-label="Search MoMo transactions"
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 @3xl:flex">
          <Select
            aria-label="Filter by period"
            value={filters.period}
            onChange={(event) => onChange({ period: event.target.value as MomoPeriod })}
            className="@3xl:w-40"
          >
            {(Object.keys(MOMO_PERIOD_LABELS) as MomoPeriod[]).map((p) => (
              <option key={p} value={p}>
                {MOMO_PERIOD_LABELS[p]}
              </option>
            ))}
          </Select>
          <Button
            variant="ghost"
            icon={Download}
            onClick={onExport}
            aria-label="Export CSV"
            className="px-3 @3xl:px-4"
          >
            <span className="hidden @3xl:inline">Export</span>
          </Button>
          <Button mutates icon={Plus} onClick={onNew} className="px-3 @3xl:px-4">
            <span className="hidden @md:inline">New</span>
            <span className="sr-only @md:hidden">New transaction</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <Tabs
          label="Filter by direction"
          value={filters.direction}
          onChange={(direction) => onChange({ direction })}
          tabs={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'in', label: 'Received', count: counts.in },
            { value: 'out', label: 'Sent', count: counts.out },
          ]}
        />
        <div
          role="group"
          aria-label="Filter by network"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 @3xl:pb-0"
        >
          {networks.map((network) => {
            const active = filters.network === network;
            return (
              <button
                key={network}
                type="button"
                aria-pressed={active}
                onClick={() => onChange({ network })}
                className={cn(
                  chipClass,
                  active
                    ? network === 'all'
                      ? 'border-accent/50 bg-accent/15 text-ink-green'
                      : NETWORK_STYLES[network].chip
                    : 'border-border bg-glass text-text-dim hover:text-text',
                )}
              >
                {network !== 'all' && <NetworkLogo network={network} size={18} />}
                {network === 'all' ? 'All networks' : network}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
