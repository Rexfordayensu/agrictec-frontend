'use client';

import { useRef, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem<V extends string> {
  value: V;
  label: string;
  /** Optional count shown as a small pill after the label. */
  count?: number;
}

export interface TabsProps<V extends string> {
  tabs: TabItem<V>[];
  value: V;
  onChange: (value: V) => void;
  label?: string;
  className?: string;
  /** When set, tabs get ids and aria-controls pointing at `${idPrefix}-panel-${value}`. */
  idPrefix?: string;
  /** Fit every tab across the available width, allowing labels to wrap on small screens. */
  fullWidth?: boolean;
}

export function Tabs<V extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
  idPrefix,
  fullWidth = false,
}: TabsProps<V>) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = tabs.length - 1;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = index === last ? 0 : index + 1;
        break;
      case 'ArrowLeft':
        next = index === 0 ? last : index - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(tabs[next].value);
    tabRefs.current[next]?.focus();
  }

  return (
    <div className={cn('max-w-full overflow-x-auto', className)}>
      <div
        role="tablist"
        aria-label={label}
        className={cn(
          'glass gap-1 rounded-2xl p-1',
          fullWidth ? 'grid w-full auto-cols-fr grid-flow-col' : 'inline-flex min-w-max',
        )}
      >
        {tabs.map((tab, index) => {
          const selected = tab.value === value;
          return (
            <button
              key={tab.value}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={idPrefix ? `${idPrefix}-tab-${tab.value}` : undefined}
              aria-controls={idPrefix ? `${idPrefix}-panel-${tab.value}` : undefined}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={cn(
                'inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold whitespace-nowrap transition-all duration-200',
                fullWidth &&
                  'min-w-0 justify-center gap-1 px-2 text-xs whitespace-normal sm:px-4 sm:text-sm',
                selected
                  ? 'bg-linear-to-br from-[#34d399] to-[#10b981] text-[#022c22] shadow-[0_4px_16px_-4px_var(--accent-glow)]'
                  : 'text-text-dim hover:bg-glass-strong hover:text-text',
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none font-bold',
                    selected ? 'bg-[#022c22]/15' : 'bg-glass-strong text-text-mute',
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
