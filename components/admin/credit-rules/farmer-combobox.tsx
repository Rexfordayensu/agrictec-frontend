'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import type { ScoringInput } from '@/lib/admin/credit-rules';
import { cn } from '@/lib/utils';

const MAX_SHOWN = 8;

/** A searchable farmer picker (combobox): type to filter, arrows to move, Enter to pick. */
export function FarmerCombobox({
  farmers,
  value,
  onChange,
}: {
  farmers: ScoringInput[];
  /** The picked farmer's ID. */
  value: string | null;
  onChange: (userId: string) => void;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const picked = farmers.find((f) => f.userId === value);

  const needle = query.trim().toLowerCase();
  const matches = farmers
    .filter((f) => !needle || `${f.name} ${f.region}`.toLowerCase().includes(needle))
    .slice(0, MAX_SHOWN);

  function choose(farmer: ScoringInput) {
    onChange(farmer.userId);
    setQuery('');
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(matches.length - 1, i + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (event.key === 'Enter' && open && matches[active]) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="text-text-dim mb-1.5 block text-xs font-semibold">
        Farmer
      </label>
      <div className="border-border bg-bg-2 focus-within:border-purple/70 flex min-h-11 items-center gap-2 rounded-xl border px-3">
        <Search size={15} aria-hidden="true" className="text-text-mute shrink-0" />
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active] ? `${id}-${matches[active].userId}` : undefined
          }
          autoComplete="off"
          placeholder={picked ? picked.name : 'Search by name or region'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          className={cn(
            'min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none',
            picked && !query ? 'placeholder:text-text' : '',
          )}
        />
        <ChevronsUpDown size={15} aria-hidden="true" className="text-text-mute shrink-0" />
      </div>
      {open && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Farmers"
          className="border-border bg-bg-2 shadow-glass absolute top-full right-0 left-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border p-1"
        >
          {matches.length === 0 ? (
            <li className="text-text-mute px-3 py-2 text-sm">No farmer matches “{query}”.</li>
          ) : (
            matches.map((f, index) => (
              <li
                key={f.userId}
                id={`${id}-${f.userId}`}
                role="option"
                aria-selected={f.userId === value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(f)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  'flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm',
                  index === active ? 'bg-glass-strong' : '',
                )}
              >
                <span className="text-text min-w-0 flex-1 truncate">{f.name}</span>
                <span className="text-text-mute shrink-0 text-xs">{f.region}</span>
                {f.userId === value && (
                  <Check size={14} aria-hidden="true" className="text-ink-purple shrink-0" />
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
