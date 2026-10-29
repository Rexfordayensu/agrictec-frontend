'use client';

import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { sumSeries } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyNetChart({ className }: { className?: string }) {
  // currentYearNet only includes records from this calendar year.
  const { currentYearNet } = useFarmStats();
  const { palette } = useChartTheme();
  const year = new Date().getFullYear();
  const ytdNet = sumSeries(currentYearNet);
  const best = currentYearNet.reduce((top, net, i) => (net > currentYearNet[top] ? i : top), 0);
  const hasBest = currentYearNet[best] > 0;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>Monthly Net ({year})</CardTitle>
          <CardSub>Monthly breakdown: income minus expenses</CardSub>
        </div>
      </CardHeader>

      <dl className="mb-4 flex flex-wrap gap-3">
        <div className="border-border bg-glass rounded-xl border px-3 py-2">
          <dt className="text-text-mute text-[11px]">Net this year</dt>
          <dd className={cn('text-sm font-bold', ytdNet < 0 ? 'text-ink-red' : 'text-text')}>
            {formatGHS(ytdNet)}
          </dd>
        </div>
        {hasBest && (
          <div className="border-border bg-glass rounded-xl border px-3 py-2">
            <dt className="text-text-mute text-[11px]">Best month</dt>
            <dd className="text-text text-sm font-bold">
              {MONTHS[best]} ·{' '}
              <span className="text-ink-green">{formatGHS(currentYearNet[best])}</span>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-auto">
        <BarChart
          height={260}
          showLegend={false}
          ariaLabel={`Monthly net income for ${year}`}
          labels={MONTHS}
          datasets={[
            {
              label: 'Net (GHS)',
              data: currentYearNet,
              color: palette.accent,
              colorsPerBar: currentYearNet.map((net) =>
                net < 0 ? palette.danger : palette.accent,
              ),
            },
          ]}
        />
      </div>
    </Card>
  );
}
