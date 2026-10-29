'use client';

import { useId, type CSSProperties } from 'react';
import { Scale } from 'lucide-react';
import { FACTOR_COLOR, RuleSection } from '@/components/admin/credit-rules/fields';
import { FACTORS, weightTotal, type WeightKey } from '@/lib/admin/credit-rules';
import { cn } from '@/lib/utils';
import type { CreditConfig } from '@/types/admin';

type Weights = CreditConfig['weights'];

/** The share each factor gets (0–100). They must add up to exactly 100% to publish. */
export function WeightsEditor({
  value,
  live,
  error,
  onChange,
}: {
  value: Weights;
  live: Weights;
  error?: string;
  onChange: (next: Weights) => void;
}) {
  const id = useId();
  const total = weightTotal(value);
  const balanced = total === 100;
  const changed = FACTORS.some((f) => value[f.key] !== live[f.key]);
  const set = (key: WeightKey, raw: number) =>
    onChange({ ...value, [key]: Number.isFinite(raw) ? Math.round(raw) : 0 });

  return (
    <RuleSection
      icon={Scale}
      title="Score weights"
      description="How much each factor counts towards the 300–850 score."
      changed={changed}
      error={error}
      aside={
        <span
          aria-live="polite"
          className={cn(
            'shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums',
            balanced ? 'bg-accent/12 text-ink-green' : 'bg-danger/12 text-ink-red',
          )}
        >
          {total}%<span className="sr-only"> total</span>
        </span>
      }
    >
      {/* Composition: one segment per factor, so the balance is visible at a glance. */}
      <div
        aria-hidden="true"
        className="bg-glass-strong mb-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full"
      >
        {FACTORS.map((f) =>
          value[f.key] > 0 ? (
            <span
              key={f.key}
              className={cn('h-full transition-[width] duration-300', FACTOR_COLOR[f.key].bar)}
              style={{ width: `${(value[f.key] / Math.max(100, total)) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <ul className="space-y-5">
        {FACTORS.map((f) => {
          const inputId = `${id}-${f.key}`;
          const was = live[f.key];
          return (
            <li key={f.key}>
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', FACTOR_COLOR[f.key].dot)}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor={inputId} className="text-text text-sm font-semibold">
                      {f.label}
                    </label>
                    {value[f.key] !== was && (
                      <span className="text-ink-gold text-[11px] font-semibold">Live: {was}%</span>
                    )}
                  </div>
                  <p className="text-text-mute mt-0.5 text-xs">{f.description}</p>
                  <div className="mt-2.5 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={value[f.key]}
                      onChange={(e) => set(f.key, Number(e.target.value))}
                      aria-label={`${f.label} weight`}
                      aria-valuetext={`${value[f.key]}%`}
                      className="range-flat min-w-0 flex-1"
                      style={{ '--range-fill': `${value[f.key]}%` } as CSSProperties}
                    />
                    <div className="border-border bg-bg-2 focus-within:border-purple/70 flex h-9 w-20 shrink-0 items-center rounded-lg border pr-2">
                      <input
                        id={inputId}
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        inputMode="numeric"
                        value={value[f.key]}
                        onChange={(e) => set(f.key, Number(e.target.value))}
                        className="text-text w-full min-w-0 bg-transparent px-2 text-right text-sm font-semibold tabular-nums outline-none"
                      />
                      <span className="text-text-mute text-xs">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {!balanced && !error && (
        <p className="text-ink-red mt-4 text-sm font-semibold">Total is {total}%. Must be 100%.</p>
      )}
    </RuleSection>
  );
}
