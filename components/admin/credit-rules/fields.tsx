'use client';

import { useId, type ReactNode } from 'react';
import { AlertCircle, type LucideIcon } from 'lucide-react';
import type { WeightKey } from '@/lib/admin/credit-rules';
import { cn } from '@/lib/utils';

/** One flat colour per factor, used by the weights bar, the simulator and their legends. */
export const FACTOR_COLOR: Record<WeightKey, { bar: string; dot: string }> = {
  paymentHistory: { bar: 'bg-purple', dot: 'bg-purple' },
  recordCompleteness: { bar: 'bg-info', dot: 'bg-info' },
  incomeStability: { bar: 'bg-accent', dot: 'bg-accent' },
  momoActivity: { bar: 'bg-gold', dot: 'bg-gold' },
  verification: { bar: 'bg-[#14b8a6]', dot: 'bg-[#14b8a6]' },
};

/** A titled editor section; a red note under the header when the section can't be published. */
export function RuleSection({
  icon: Icon,
  title,
  description,
  aside,
  error,
  changed,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Right side of the header (e.g. the weights total). */
  aside?: ReactNode;
  error?: string;
  /** Marks the section as edited in the draft. */
  changed?: boolean;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        'bg-glass rounded-2xl border transition-colors',
        error ? 'border-danger/50' : changed ? 'border-gold/40' : 'border-border',
      )}
    >
      <header className="flex items-start gap-3 px-5 pt-4 pb-3">
        <span className="bg-purple/12 text-ink-purple inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
          <Icon size={17} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="text-text flex items-center gap-2 text-sm font-semibold">
            {title}
            {changed && !error && (
              <span className="bg-gold/15 text-ink-gold rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Edited
              </span>
            )}
          </h2>
          <p className="text-text-mute mt-0.5 text-xs">{description}</p>
        </div>
        {aside}
      </header>
      {error && (
        <p
          role="alert"
          className="text-ink-red mx-5 mb-3 flex items-center gap-1.5 text-sm font-semibold"
        >
          <AlertCircle size={15} aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

/** A number input with a label, an optional unit, a hint and the live value when it differs. */
export function NumberField({
  label,
  value,
  live,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
  format = (v) => String(v),
}: {
  label: string;
  value: number;
  /** The published value; shown as "Live: x" when the draft differs. */
  live: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  format?: (value: number) => string;
}) {
  const id = useId();
  const changed = value !== live;
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-text-dim mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <div
        className={cn(
          'bg-bg-2 focus-within:border-purple/70 flex min-h-11 items-center rounded-xl border pr-3 transition-colors',
          changed ? 'border-gold/50' : 'border-border',
        )}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : Number(e.target.value))}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className="text-text min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm font-semibold tabular-nums outline-none"
        />
        {unit && <span className="text-text-mute shrink-0 text-xs">{unit}</span>}
      </div>
      <p className="mt-1.5 flex min-h-4 items-center justify-between gap-2 text-[11px]">
        {hint && (
          <span id={`${id}-hint`} className="text-text-mute">
            {hint}
          </span>
        )}
        {changed && (
          <span className="text-ink-gold ml-auto shrink-0 font-semibold">Live: {format(live)}</span>
        )}
      </p>
    </div>
  );
}
