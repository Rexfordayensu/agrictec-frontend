'use client';

import { Layers3 } from 'lucide-react';
import { NumberField, RuleSection } from '@/components/admin/credit-rules/fields';
import { SCORE_MAX, SCORE_MIN } from '@/lib/admin/credit-rules';
import { bandTone } from '@/lib/admin/score-tone';
import { cn } from '@/lib/utils';
import type { CreditConfig } from '@/types/admin';

type Bands = CreditConfig['bands'];

const span = SCORE_MAX - SCORE_MIN;
const pct = (score: number) => Math.min(100, Math.max(0, ((score - SCORE_MIN) / span) * 100));

/** Where Fair, Good and Excellent start. They must rise and stay within 300–850. */
export function BandsEditor({
  value,
  live,
  error,
  onChange,
}: {
  value: Bands;
  live: Bands;
  error?: string;
  onChange: (next: Bands) => void;
}) {
  const changed = (Object.keys(value) as (keyof Bands)[]).some((k) => value[k] !== live[k]);
  const valid = !error;
  const segments = [
    { band: 'Building', from: SCORE_MIN, to: value.fair },
    { band: 'Fair', from: value.fair, to: value.good },
    { band: 'Good', from: value.good, to: value.excellent },
    { band: 'Excellent', from: value.excellent, to: SCORE_MAX + 1 },
  ];

  return (
    <RuleSection
      icon={Layers3}
      title="Score bands"
      description="The labels farmers and lenders see for a score."
      changed={changed}
      error={error}
    >
      {/* The 300–850 scale, split where each band starts. */}
      <div className="mb-5">
        <div
          role="img"
          aria-label={
            valid
              ? `Building 300–${value.fair - 1}, Fair ${value.fair}–${value.good - 1}, Good ${value.good}–${value.excellent - 1}, Excellent ${value.excellent}–850`
              : 'The bands are not in order yet'
          }
          className={cn(
            'flex h-3 gap-0.5 overflow-hidden rounded-full',
            !valid && 'opacity-40 grayscale',
          )}
        >
          {segments.map((s) => (
            <span
              key={s.band}
              className={cn('h-full transition-[width] duration-300', bandTone(s.band).bar)}
              style={{ width: `${Math.max(0, pct(s.to) - pct(s.from))}%` }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="mt-2 grid grid-cols-4 gap-1 text-[11px]">
          {segments.map((s) => (
            <span key={s.band} className="min-w-0">
              <span className={cn('block font-semibold', bandTone(s.band).text)}>{s.band}</span>
              <span className="text-text-mute block tabular-nums">
                {valid ? `${s.from}–${Math.min(SCORE_MAX, s.to - 1)}` : '—'}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          label="Fair from"
          value={value.fair}
          live={live.fair}
          onChange={(v) => onChange({ ...value, fair: v })}
          min={SCORE_MIN + 1}
          max={SCORE_MAX}
        />
        <NumberField
          label="Good from"
          value={value.good}
          live={live.good}
          onChange={(v) => onChange({ ...value, good: v })}
          min={SCORE_MIN + 1}
          max={SCORE_MAX}
        />
        <NumberField
          label="Excellent from"
          value={value.excellent}
          live={live.excellent}
          onChange={(v) => onChange({ ...value, excellent: v })}
          min={SCORE_MIN + 1}
          max={SCORE_MAX}
        />
      </div>
    </RuleSection>
  );
}
