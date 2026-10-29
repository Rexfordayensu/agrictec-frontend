'use client';

import { useState } from 'react';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { sumSeries } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

type Range = 6 | 12;

/** Cash flow: income vs expenses with a 6/12-month switch and period totals. */
export function AnnualTrendChart({ className }: { className?: string }) {
  const { monthly6, monthly12, hasData } = useFarmStats();
  const { palette } = useChartTheme();
  const [range, setRange] = useState<Range>(12);
  const series = range === 6 ? monthly6 : monthly12;
  const income = sumSeries(series.income);
  const expenses = sumSeries(series.expense);
  const net = income - expenses;

  const chips = [
    { label: 'Income', value: formatGHS(income), dot: 'bg-accent', ink: 'text-text' },
    { label: 'Expenses', value: formatGHS(expenses), dot: 'bg-danger', ink: 'text-text' },
    {
      label: 'Net',
      value: formatGHS(net),
      dot: 'bg-purple',
      ink: net < 0 ? 'text-ink-red' : 'text-ink-green',
    },
  ];

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Cash Flow</CardTitle>
          <CardSub>Income vs expenses, last {range} months</CardSub>
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

      <dl className="mb-4 flex flex-wrap gap-2 sm:gap-3">
        {chips.map((chip) => (
          <div key={chip.label} className="border-border bg-glass rounded-xl border px-3 py-2">
            <dt className="text-text-mute flex items-center gap-1.5 text-[11px]">
              <span aria-hidden="true" className={`size-2 rounded-full ${chip.dot}`} /> {chip.label}
            </dt>
            <dd className={cn('text-sm font-bold whitespace-nowrap', chip.ink)}>{chip.value}</dd>
          </div>
        ))}
      </dl>

      {/* Grows to fill the card when the P&L statement beside it is taller. */}
      <div className="relative min-h-[300px] flex-1">
        <LineChart
          height="fill"
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
              Add records to see your cash flow
            </span>
          </p>
        )}
      </div>
    </Card>
  );
}
