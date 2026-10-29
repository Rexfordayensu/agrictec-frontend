'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { AiChip } from '@/components/ui/ai-chip';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { sumSeries } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

type Range = 6 | 12;

export function IncomeExpenseChart({ className }: { className?: string }) {
  const { monthly6, monthly12, hasData } = useFarmStats();
  const { palette } = useChartTheme();
  const [range, setRange] = useState<Range>(6);
  const series = range === 6 ? monthly6 : monthly12;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Income vs Expenses</CardTitle>
            <AiChip>
              <TrendingUp size={12} aria-hidden="true" /> AI Forecast
            </AiChip>
          </div>
          <CardSub>Last {range} months</CardSub>
        </div>
        <div
          role="group"
          aria-label="Chart range"
          className="border-border bg-glass inline-flex rounded-xl border p-1"
        >
          {([6, 12] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={range === value}
              onClick={() => setRange(value)}
              className={cn(
                'min-h-9 rounded-lg px-3 text-xs font-semibold transition-colors',
                range === value ? 'bg-accent/20 text-ink-green' : 'text-text-dim hover:text-text',
              )}
            >
              {value}M
            </button>
          ))}
        </div>
      </CardHeader>

      <dl className="mb-4 flex flex-wrap gap-3">
        <div className="border-border bg-glass rounded-xl border px-3 py-2">
          <dt className="text-text-mute flex items-center gap-1.5 text-[11px]">
            <span aria-hidden="true" className="bg-accent size-2 rounded-full" /> Income
          </dt>
          <dd className="text-text text-sm font-bold">{formatGHS(sumSeries(series.income))}</dd>
        </div>
        <div className="border-border bg-glass rounded-xl border px-3 py-2">
          <dt className="text-text-mute flex items-center gap-1.5 text-[11px]">
            <span aria-hidden="true" className="bg-danger size-2 rounded-full" /> Expenses
          </dt>
          <dd className="text-text text-sm font-bold">{formatGHS(sumSeries(series.expense))}</dd>
        </div>
      </dl>

      <div className="relative mt-auto">
        <LineChart
          height={260}
          showLegend={false}
          ariaLabel={`Income versus expenses over the last ${range} months`}
          labels={series.labels}
          datasets={[
            { label: 'Income', data: series.income, color: palette.accent, fill: true },
            { label: 'Expenses', data: series.expense, color: palette.danger, fill: true },
          ]}
        />
        {!hasData && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="glass text-text-dim rounded-full px-4 py-2 text-sm">
              Add records to see your trend
            </span>
          </p>
        )}
      </div>
    </Card>
  );
}
