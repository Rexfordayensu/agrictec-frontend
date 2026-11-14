'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * "Region: All" — a button that opens a list of choices. `multiple` lets several be ticked (the
 * URL keeps them comma-separated); otherwise picking one closes the list.
 */
export function FilterDropdown({
  label,
  icon: Icon,
  options,
  value,
  onChange,
  multiple = false,
  className,
}: {
  label: string;
  icon: LucideIcon;
  options: FilterOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
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
      ? 'All'
      : value.length === 1
        ? (options.find((o) => o.value === value[0])?.label ?? value[0])
        : `${value.length} selected`;

  function pick(option: string) {
    if (!multiple) {
      onChange(value[0] === option ? [] : [option]);
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    onChange(value.includes(option) ? value.filter((v) => v !== option) : [...value, option]);
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label} filter: ${summary}`}
        className={cn(
          'bg-bg-2 text-text 2xl:text-small flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm transition-colors',
          value.length ? 'border-purple/60' : 'border-border hover:border-purple/40',
        )}
      >
        <Icon size={16} aria-hidden="true" className="text-text-dim shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {label}: <span className={cn(value.length > 0 && 'font-semibold')}>{summary}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cn('text-text-dim shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="animate-fade-in border-border bg-bg-2 shadow-glass absolute top-full left-0 z-40 mt-1 max-h-72 w-full min-w-56 overflow-y-auto rounded-xl border p-1.5"
        >
          <button
            type="button"
            onClick={() => {
              onChange([]);
              setOpen(false);
            }}
            className={cn(
              'hover:bg-glass-strong flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm',
              value.length === 0 ? 'text-ink-purple font-semibold' : 'text-text',
            )}
          >
            All
          </button>
          {options.length === 0 && (
            <p className="text-text-mute px-2 py-2 text-xs">Nothing to choose from yet.</p>
          )}
          {options.map((option) => {
            const checked = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                role={multiple ? 'checkbox' : 'radio'}
                aria-checked={checked}
                onClick={() => pick(option.value)}
                className="hover:bg-glass-strong flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-sm"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-4 shrink-0 items-center justify-center border',
                    multiple ? 'rounded' : 'rounded-full',
                    checked ? 'border-purple bg-purple text-white' : 'border-border',
                  )}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="text-text">{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
