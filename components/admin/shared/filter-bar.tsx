'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

export interface FilterBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  /** Rows matching the current search and filters. */
  total: number;
  /** e.g. "farmers". */
  noun?: string;
  /** Clears search and filters in one go (pass the table's clearFilters). */
  onClearAll?: () => void;
  className?: string;
}

/** Search box, filter selects, chips for active filters, "Clear filters" and a results count. */
export function FilterBar({
  query,
  onQueryChange,
  searchPlaceholder = 'Search…',
  filters = [],
  total,
  noun = 'results',
  onClearAll,
  className,
}: FilterBarProps) {
  const active = filters.filter((f) => f.value);
  const anyActive = active.length > 0 || query.trim() !== '';

  function clearAll() {
    if (onClearAll) return onClearAll();
    // Without onClearAll only one URL change is safe, so clear the search and a single filter.
    onQueryChange('');
    active[0]?.onChange('');
  }

  return (
    <div role="search" className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-72">
          <Search
            size={16}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
          />
          <Input
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            className="pl-10"
          />
        </div>
        {filters.map((filter) => (
          <label key={filter.name} className="md:w-48">
            <span className="sr-only">{filter.label}</span>
            <Select value={filter.value} onChange={(event) => filter.onChange(event.target.value)}>
              <option value="">All {filter.label.toLowerCase()}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <p className="text-text-dim font-semibold" aria-live="polite">
          {total.toLocaleString()} {noun}
        </p>
        {active.map((filter) => {
          const label = filter.options.find((o) => o.value === filter.value)?.label ?? filter.value;
          return (
            <button
              key={filter.name}
              type="button"
              onClick={() => filter.onChange('')}
              aria-label={`Remove filter ${filter.label}: ${label}`}
              className="bg-purple/15 text-ink-purple hover:bg-purple/25 inline-flex min-h-7 items-center gap-1 rounded-full px-2.5 font-semibold transition-colors"
            >
              {filter.label}: {label}
              <X size={12} aria-hidden="true" />
            </button>
          );
        })}
        {anyActive && (
          <button
            type="button"
            onClick={clearAll}
            className="text-ink-purple min-h-7 font-semibold hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
