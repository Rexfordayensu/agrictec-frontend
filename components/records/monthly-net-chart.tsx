'use client';

import { BarChart3, ChartColumn } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { ChartCard } from '@/components/records/chart-card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { sumSeries } from '@/lib/calculations/finance';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function MonthlyNetChart({ className }: { className?: string }) {
  // currentYearNet only includes records from this calendar year.
  const { currentYearNet } = useFarmStats();
  const { palette } = useChartTheme();
  const year = new Date().getFullYear();
  const ytdNet = sumSeries(currentYearNet);
  const best = currentYearNet.reduce((top, net, i) => (net > currentYearNet[top] ? i : top), 0);
  const hasBest = currentYearNet[best] > 0;
  // Any income or expense this year (a month can net to zero, so check the records).
  const hasAny = useFarmStore((s) =>
    s.records.some(
      (r) => (r.type === 'income' || r.type === 'expense') && r.date.startsWith(String(year)),
    ),
  );

  return (
    <ChartCard
      id="monthly-net-title"
      icon={ChartColumn}
      title="Monthly Net"
      sub="Monthly breakdown: income minus expenses"
      className={className}
    >
      {hasAny && (
        <dl className="mt-4 flex flex-wrap gap-3">
          <div className="border-border bg-glass rounded-xl border px-3 py-2">
            <dt className="text-text-mute text-xs">Net this year</dt>
            <dd className={cn('text-sm font-bold', ytdNet < 0 ? 'text-ink-red' : 'text-text')}>
              {formatGHS(ytdNet)}
            </dd>
          </div>
          {hasBest && (
            <div className="border-border bg-glass rounded-xl border px-3 py-2">
              <dt className="text-text-mute text-xs">Best month</dt>
              <dd className="text-text text-sm font-bold">
                {MONTHS[best]} ·{' '}
                <span className="text-ink-green">{formatGHS(currentYearNet[best])}</span>
              </dd>
            </div>
          )}
        </dl>
      )}

      <div className="relative mt-4 flex-1">
        {!hasAny && (
          <p className="border-border bg-bg-2 text-text-dim absolute top-1/2 left-1/2 z-10 w-44 -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-3 text-center text-xs leading-relaxed shadow-md">
            <BarChart3 size={18} aria-hidden="true" className="text-text-mute mx-auto mb-1" />
            Your monthly net will appear here once you add records.
          </p>
        )}
        <BarChart
          showAllLabels
          height={280}
          formatValue={(v) => formatCompactGHS(v)}
          emptyMax={1000}
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
    </ChartCard>
  );
}
