'use client';

import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardRange, DashboardSummary } from '@/lib/dashboard-summary';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Monthly recorded income and expenses (the server's monthly totals), with the period picker. */
export function ActivityTrend({
  summary,
  range,
  onRange,
  error,
  onRetry,
}: {
  summary: DashboardSummary | null;
  range: DashboardRange;
  onRange: (range: DashboardRange) => void;
  error: string | null;
  onRetry: () => void;
}) {
  const { palette } = useChartTheme();
  return (
    <section aria-labelledby="trend-title" className={cn(dashPanel, 'flex flex-col')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="trend-title" className="text-text text-lg font-bold">
          Financial activity trend
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-text-dim flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-full" style={{ background: palette.accent }} />
              Income
            </span>
            <span className="flex items-center gap-1.5">
              <i className="size-2.5 rounded-full" style={{ background: palette.danger }} />
              Expenses
            </span>
          </span>
          <select
            aria-label="Period"
            value={range}
            onChange={(e) => onRange(Number(e.target.value) as DashboardRange)}
            className="border-border bg-glass text-text h-8 rounded-lg border px-2 text-xs"
          >
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>
      {error && !summary ? (
        <div
          role="alert"
          className="text-text-dim flex flex-1 flex-col items-center justify-center gap-2 py-10 text-sm"
        >
          {error}
          <button type="button" onClick={onRetry} className="text-ink-green font-semibold">
            Try again
          </button>
        </div>
      ) : !summary ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : (
        <>
          <BarChart
            height={230}
            showLegend={false}
            maxBarThickness={26}
            labels={summary.series.labels}
            datasets={[
              { label: 'Income', data: summary.series.income, color: palette.accent },
              { label: 'Expenses', data: summary.series.expense, color: palette.danger },
            ]}
            ariaLabel={`Recorded farm income and expenses by month, ${summary.periodLabel}. Income ${formatGHS(summary.income)}; expenses ${formatGHS(summary.expenses)}.`}
          />
          <p className="text-text-mute mt-2 text-xs">
            {summary.financialRecordCount === 0
              ? 'Your chart starts with your first sale or expense.'
              : `${summary.periodLabel} · MoMo is tracked separately.`}
          </p>
        </>
      )}
    </section>
  );
}
