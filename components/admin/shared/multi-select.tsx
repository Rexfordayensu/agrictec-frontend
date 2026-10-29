'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MultiSelectOption {
  value: string;
  label: string;
}

/**
 * A filter button that opens a checkbox list ("Region: 2 selected"). Values are an array; the
 * page stores them comma-separated in the URL.
 */
export function MultiSelect({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const summary =
    value.length === 0
      ? `All ${label.toLowerCase()}s`
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${label}: ${value.length} selected`;

  function toggle(option: string) {
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label} filter: ${summary}`}
        className={cn(
          'bg-bg-2 text-text flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-sm transition-colors',
          value.length ? 'border-purple/60' : 'border-border',
        )}
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={16} aria-hidden="true" className="text-text-mute shrink-0" />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full left-0 z-40 mt-1 max-h-72 w-full min-w-56 overflow-y-auto rounded-xl border p-1.5"
        >
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-ink-purple mb-1 min-h-8 w-full rounded-lg px-2 text-left text-xs font-semibold hover:underline"
            >
              Clear {label.toLowerCase()}
            </button>
          )}
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <label
                key={option.value}
                className="hover:bg-glass-strong flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center rounded border',
                    checked ? 'border-purple bg-purple text-white' : 'border-border',
                  )}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="text-text">{option.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
