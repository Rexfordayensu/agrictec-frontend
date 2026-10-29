'use client';

import { cn } from '@/lib/utils';

export interface StatusTab<V extends string> {
  value: V;
  label: string;
  count?: number;
}

/**
 * Underlined tabs with counts above a list ("All 60 · Active 51 · …"). They filter the list, so
 * they are toggle buttons (aria-pressed). On phones the row scrolls sideways without a scrollbar.
 */
export function StatusTabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: StatusTab<V>[];
  value: V;
  onChange: (value: V) => void;
  /** e.g. "Account status". */
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'scrollbar-none overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      <div
        role="group"
        aria-label={label}
        className="flex min-w-max gap-0.5 shadow-[inset_0_-1px_0_var(--border)] sm:gap-1"
      >
        {tabs.map((tab) => {
          const selected = value === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(tab.value)}
              className={cn(
                'inline-flex min-h-11 items-center gap-1.5 border-b-2 px-2 text-[13px] font-semibold transition-colors sm:gap-2 sm:px-3 sm:text-sm',
                selected
                  ? 'border-purple text-text'
                  : 'text-text-mute hover:text-text border-transparent',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-md px-1.5 py-0.5 text-[11px] tabular-nums',
                    selected ? 'bg-purple/15 text-ink-purple' : 'bg-glass-strong text-text-mute',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
