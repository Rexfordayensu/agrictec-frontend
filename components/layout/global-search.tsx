'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import type { FarmRecord, MomoTransaction } from '@/types';

const MAX_RESULTS = 8;

interface SearchResult {
  id: string;
  href: '/records' | '/momo';
  badge: { text: string; color: BadgeColor };
  label: string;
  date: string;
  amount: string | null;
  positive: boolean;
}

const RECORD_BADGES: Record<FarmRecord['type'], { text: string; color: BadgeColor }> = {
  income: { text: 'Income', color: 'green' },
  expense: { text: 'Expense', color: 'red' },
  activity: { text: 'Activity', color: 'blue' },
};

function searchAll(query: string, records: FarmRecord[], momo: MomoTransaction[]): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const recordHits: SearchResult[] = records
    .filter((r) => r.description.toLowerCase().includes(q) || r.crop.toLowerCase().includes(q))
    .map((r) => ({
      id: r.id,
      href: '/records',
      badge: RECORD_BADGES[r.type],
      label: `${r.description} · ${r.crop}`,
      date: r.date,
      // Activities have no amount (the old app showed "+GHS 0").
      amount:
        r.type === 'activity' ? null : `${r.type === 'income' ? '+' : '−'}${formatGHS(r.amount)}`,
      positive: r.type === 'income',
    }));

  const momoHits: SearchResult[] = momo
    .filter(
      (t) => t.counterparty.toLowerCase().includes(q) || t.reference.toLowerCase().includes(q),
    )
    .map((t) => ({
      id: t.id,
      href: '/momo',
      badge: { text: 'MoMo', color: 'purple' },
      label: `${t.counterparty} · ${t.reference}`,
      date: t.date,
      amount: `${t.direction === 'in' ? '+' : '−'}${formatGHS(t.amount)}`,
      positive: t.direction === 'in',
    }));

  return [...recordHits, ...momoHits]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_RESULTS);
}

export function GlobalSearch() {
  const router = useRouter();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-option-${index}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [expanded, setExpanded] = useState(false); // mobile only

  const debouncedQuery = useDebounce(query, 300);
  const results = searchAll(debouncedQuery, records, momo);
  const showPanel = open && debouncedQuery.trim() !== '';

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  function reset() {
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    setExpanded(false);
  }

  function choose(result: SearchResult) {
    router.push(result.href);
    reset();
    inputRef.current?.blur();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setOpen(true);
        if (results.length) setActiveIndex((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setOpen(true);
        if (results.length) setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
        break;
      case 'Enter': {
        const result = results[activeIndex];
        if (showPanel && result) {
          event.preventDefault();
          choose(result);
        }
        break;
      }
      case 'Escape':
        if (showPanel) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        } else if (expanded) {
          reset();
        }
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative md:w-72',
        // Mobile: the expanded search floats over the top of the screen.
        expanded && 'max-md:fixed max-md:inset-x-4 max-md:top-4 max-md:z-50',
      )}
      onBlur={(event) => {
        // Close when focus leaves the whole search (input + results).
        if (!containerRef.current?.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
          if (!query) setExpanded(false);
        }
      }}
    >
      {/* Mobile: a search icon button that expands the input */}
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label="Search"
          className="glass text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-11 items-center justify-center rounded-xl transition-colors md:hidden"
        >
          <Search size={18} aria-hidden="true" />
        </button>
      )}

      <div className={cn('relative', expanded ? 'block' : 'hidden md:block')}>
        <Search
          size={16}
          aria-hidden="true"
          className="text-text-mute pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
        />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search records and MoMo transactions"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          placeholder="Search records, crops…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="glass max-md:bg-bg-2 text-text placeholder:text-text-mute focus:border-accent min-h-11 w-full rounded-xl pr-10 pl-10 text-sm focus:shadow-[0_0_0_3px_var(--accent-glow)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {(query || expanded) && (
          <button
            type="button"
            onClick={() => {
              if (query) {
                setQuery('');
                inputRef.current?.focus();
              } else {
                reset();
              }
            }}
            aria-label={query ? 'Clear search' : 'Close search'}
            className="text-text-mute hover:text-text absolute top-1/2 right-1 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className={cn(
          'animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full right-0 z-50 mt-2 w-full min-w-70 overflow-hidden rounded-2xl border',
          !showPanel && 'hidden',
        )}
      >
        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="max-h-80 overflow-y-auto py-1"
        >
          {showPanel && results.length === 0 && (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="text-text-mute px-4 py-3 text-sm"
            >
              No matches
            </li>
          )}
          {showPanel &&
            results.map((result, index) => (
              <li
                key={result.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown would blur the input before the click lands
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(result)}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm',
                  index === activeIndex && 'bg-glass-strong',
                )}
              >
                <Badge color={result.badge.color} className="shrink-0">
                  {result.badge.text}
                </Badge>
                <span className="min-w-0 flex-1">
                  <span className="text-text block truncate">{result.label}</span>
                  <span className="text-text-mute block text-xs">{formatDate(result.date)}</span>
                </span>
                {result.amount && (
                  <span
                    className={cn(
                      'shrink-0 text-xs font-semibold',
                      result.positive ? 'text-ink-green' : 'text-ink-red',
                    )}
                  >
                    {result.amount}
                  </span>
                )}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
