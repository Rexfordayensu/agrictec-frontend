'use client';

import { useRef, type KeyboardEvent } from 'react';
import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RadioCardOption<V extends string> {
  value: V;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * Big single-choice cards as a proper radiogroup: one tab stop, arrow keys move and select,
 * Space/Enter selects (WAI-ARIA radio group pattern).
 */
export function RadioCards<V extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2,
  invalid,
  describedBy,
  firstRef,
  tone = 'accent',
}: {
  label: string;
  options: RadioCardOption<V>[];
  value: V | '';
  onChange: (value: V) => void;
  columns?: 1 | 2;
  invalid?: boolean;
  describedBy?: string;
  /** Lets react-hook-form focus the group when it has an error. */
  firstRef?: (element: HTMLButtonElement | null) => void;
  tone?: 'accent' | 'gold';
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next].value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn('grid gap-3', columns === 2 && 'sm:grid-cols-2')}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
              if (index === 0) firstRef?.(el);
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === tabStop ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              'relative flex min-h-11 items-start gap-3 rounded-2xl border p-4 text-left transition-colors',
              checked
                ? tone === 'gold'
                  ? 'border-gold/60 bg-gold/10'
                  : 'border-accent bg-accent/10'
                : invalid
                  ? 'border-danger/50 hover:bg-glass'
                  : 'border-border glass hover:bg-glass-strong',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                checked
                  ? tone === 'gold'
                    ? 'bg-gold/20 text-ink-gold'
                    : 'bg-accent/20 text-ink-green'
                  : 'bg-glass-strong text-text-dim',
              )}
            >
              <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-text block text-sm font-semibold">{option.label}</span>
              <span className="text-text-mute mt-0.5 block text-xs leading-relaxed">
                {option.description}
              </span>
            </span>
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-5 shrink-0 items-center justify-center rounded-full border',
                checked
                  ? tone === 'gold'
                    ? 'border-gold bg-gold text-[#3b2a00]'
                    : 'border-accent bg-accent text-[#022c22]'
                  : 'border-border',
              )}
            >
              {checked && <Check size={12} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
