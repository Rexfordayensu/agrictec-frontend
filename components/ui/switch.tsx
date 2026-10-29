'use client';

import { cn } from '@/lib/utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Accessible name for screen readers. */
  label: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, disabled, id, className }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      // The button is 44px tall for touch; the visible track is 44×24.
      className={cn(
        'group inline-flex min-h-11 items-center rounded-full disabled:cursor-not-allowed disabled:opacity-60',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-block h-6 w-11 rounded-full border transition-colors duration-200',
          checked
            ? 'border-transparent bg-linear-to-r from-[#10b981] to-[#34d399]'
            : 'border-border bg-glass-strong',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-0.5 size-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform duration-200',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  );
}
