'use client';

import {
  ArrowUpRight,
  Banknote,
  CircleAlert,
  Lightbulb,
  NotebookPen,
  TrendingUp,
  Wheat,
} from 'lucide-react';
import { perAcreBenchmarks } from '@/components/yield-predictor/yield-options';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CropLabel } from '@/components/ui/crop-icon';
import { yieldInsight } from '@/lib/calculations/yield';
import { usePlatformStore } from '@/store/platform-store';
import { formatGHS, todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/store/modal-store';
import type { YieldInput, YieldResult as Prediction } from '@/types';

const quantity = (value: number) => value.toLocaleString('en-GH', { maximumFractionDigits: 2 });

/** Low–high band with a marker at the expected value. */
function RangeBar({ low, expected, high }: { low: number; expected: number; high: number }) {
  // The band covers the middle of the track so the ends read as "below" and "above" the range.
  const position = high > low ? 20 + ((expected - low) / (high - low)) * 60 : 50;
  return (
    <div aria-hidden="true" className="mt-5">
      <div className="bg-glass-strong relative h-2.5 rounded-full">
        <div className="absolute inset-y-0 right-[20%] left-[20%] rounded-full bg-linear-to-r from-[#34d399]/60 via-[#10b981] to-[#34d399]/60" />
        <span
          className="border-bg-1 absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] bg-[#10b981] shadow-[0_0_0_4px_var(--accent-glow)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <div className="text-text-mute mt-2 grid grid-cols-3 text-[11px] tabular-nums">
        <span className="pl-[12%]">Low {quantity(low)} t</span>
        <span className="text-ink-green text-center font-semibold">Expected</span>
        <span className="pr-[12%] text-right">High {quantity(high)} t</span>
      </div>
    </div>
  );
}

export function YieldResult({
  input,
  result,
  stale = false,
}: {
  input: YieldInput;
  result: Prediction;
  stale?: boolean;
}) {
  const openRecord = useModalStore((state) => state.openRecordWithDefaults);
  const crops = usePlatformStore((s) => s.crops);
  const benchmarks = input.crop === 'Other' ? null : perAcreBenchmarks(input.crop, crops);
  const rows = benchmarks
    ? [
        {
          label: 'Average farm',
          hint: 'No inputs',
          value: benchmarks.base,
          tone: 'bg-text-mute/40',
        },
        { label: 'Your plan', hint: 'Your inputs', value: result.perAcre, tone: 'bg-[#10b981]' },
        {
          label: 'Best practice',
          hint: 'Best inputs',
          value: benchmarks.best,
          tone: 'bg-[#f5c451]',
        },
      ]
    : [];
  const scale = benchmarks ? benchmarks.best : 1;

  return (
    <Card className={cn('animate-fade-in @container rounded-3xl', stale && 'opacity-90')}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-text flex items-center gap-2 text-[15px] font-bold">
          <TrendingUp size={17} aria-hidden="true" className="text-ink-green" />
          Your harvest outlook
        </h3>
        <Badge color="purple">Model estimate</Badge>
      </div>
      {stale && (
        <p
          role="status"
          className="bg-gold/10 text-ink-gold mb-4 flex items-start gap-2 rounded-xl p-3 text-xs leading-relaxed"
        >
          <CircleAlert size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
          Your choices have changed. Select “Update my estimate” in the form to refresh these results.
        </p>
      )}

      <div className="border-accent/25 from-accent/15 via-accent/5 relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent p-5 sm:p-6">
        <Wheat
          size={130}
          strokeWidth={1}
          aria-hidden="true"
          className="text-accent/10 absolute -right-6 -bottom-6 -rotate-12"
        />
        <div className="relative">
          <div className="text-text-dim flex flex-wrap items-center gap-2 text-xs">
            <CropLabel crop={input.crop} className="text-text font-semibold" />
            <span aria-hidden="true">·</span>
            <span>{input.season === 'major' ? 'Major season' : 'Minor season'}</span>
            <span aria-hidden="true">·</span>
            <span>
              {quantity(input.acres)} {input.acres === 1 ? 'acre' : 'acres'}
            </span>
          </div>
          <p className="text-ink-green mt-4 text-[11px] font-semibold tracking-wider uppercase">
            Predicted Yield
          </p>
          <p className="text-text mt-1 flex items-baseline gap-2">
            <span className="font-display text-5xl leading-none font-extrabold tracking-tight tabular-nums">
              {quantity(result.expected)}
            </span>
            <span className="text-text-dim text-base font-medium">tonnes expected</span>
          </p>
          <p className="text-text-dim mt-2 text-sm">
            Range {quantity(result.low)} – {quantity(result.high)} t · {quantity(result.perAcre)}{' '}
            t/acre × {quantity(input.acres)} {input.acres === 1 ? 'acre' : 'acres'}
          </p>
          <RangeBar low={result.low} expected={result.expected} high={result.high} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 @lg:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <p className="text-text-mute flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
            <Banknote size={13} aria-hidden="true" className="text-ink-green" />
            Your revenue potential
          </p>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="text-text-dim text-xs">Expected Revenue</dt>
              <dd className="text-ink-green mt-0.5 flex items-center gap-1 text-2xl font-bold tabular-nums">
                {formatGHS(result.revenue)}
                <ArrowUpRight size={18} aria-hidden="true" />
              </dd>
            </div>
            <div className="border-border flex flex-wrap justify-between gap-2 border-t pt-3 text-xs">
              <dt className="text-text-mute">Revenue Range</dt>
              <dd className="text-text font-semibold tabular-nums">
                {formatGHS(result.low * result.pricePerTonne)} –{' '}
                {formatGHS(result.high * result.pricePerTonne)}
              </dd>
            </div>
            <div className="flex flex-wrap justify-between gap-2 text-xs">
              <dt className="text-text-mute">Market Price</dt>
              <dd className="text-text font-semibold tabular-nums">
                {formatGHS(result.pricePerTonne)}/tonne
              </dd>
            </div>
          </dl>
          <p className="text-text-mute mt-3 text-[10px]">
            Indicative prices from the app’s sample data.
          </p>
        </div>

        {benchmarks && (
          <div className="glass rounded-2xl p-4">
            <p className="text-text-mute flex items-center gap-1.5 text-[10px] font-semibold tracking-wider uppercase">
              <TrendingUp size={13} aria-hidden="true" className="text-ink-green" />
              Yield per acre
            </p>
            <dl className="mt-3 space-y-3">
              {rows.map((row) => (
                <div key={row.label}>
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <dt
                      className={cn(
                        row.label === 'Your plan' ? 'text-text font-semibold' : 'text-text-dim',
                      )}
                    >
                      {row.label}
                      <span className="text-text-mute ml-1 text-[10px] font-normal">
                        {row.hint}
                      </span>
                    </dt>
                    <dd className="text-text font-semibold tabular-nums">
                      {quantity(row.value)} t
                    </dd>
                  </div>
                  <div aria-hidden="true" className="bg-glass-strong mt-1.5 h-1.5 rounded-full">
                    <div
                      className={cn('animate-progress-grow h-full rounded-full', row.tone)}
                      style={{ width: `${Math.min(100, (row.value / scale) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="bg-info/5 text-text-dim mt-4 flex gap-2.5 rounded-xl p-3 text-xs leading-relaxed">
        <Lightbulb size={16} aria-hidden="true" className="text-ink-blue mt-0.5 shrink-0" />
        <p>{yieldInsight(input, result, crops)}</p>
      </div>
      <Button
        variant="ghost"
        icon={NotebookPen}
        className="mt-5 w-full whitespace-normal"
        disabled={stale}
        onClick={() =>
          openRecord({
            type: 'income',
            crop: input.crop,
            amount: result.revenue,
            description: 'Expected harvest (prediction)',
            date: todayISO(),
            notes: `Planning estimate only, not a completed sale. Predicted ${quantity(result.expected)} tonnes from ${quantity(input.acres)} acres. Replace with actual harvest income when known.`,
          })
        }
      >
        Add to records as expected income
      </Button>
      <p className="text-text-mute mt-2 text-center text-[10px] leading-relaxed">
        Review before saving. Expected income is a planning estimate.
      </p>
    </Card>
  );
}
