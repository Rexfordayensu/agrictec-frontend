'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Panel, PanelLink } from '@/components/admin/overview/panel';
import { useCan } from '@/hooks/admin/use-can';
import { DATE_RANGES, overviewKpis, signupSeries, type DateRange } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

const UNIT_LABEL = { day: 'per day', week: 'per week', month: 'per month' } as const;

/** New farmers over the chosen period, as bars (counts per day, week or month). */
export function SignupsChart({ range, className }: { range: DateRange; className?: string }) {
  const farmers = useAdminDataStore((s) => s.farmers);
  const canFarmers = useCan('farmers.view');
  const { palette } = useChartTheme();
  const series = signupSeries(farmers, range);
  const total = series.counts.reduce((a, b) => a + b, 0);
  const { newDelta, totalFarmers } = overviewKpis(farmers, [], [], [], range);
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label.toLowerCase() ?? '';
  const peak = Math.max(0, ...series.counts);
  const average = series.counts.length ? total / series.counts.length : 0;

  return (
    <Panel
      title="Farmer growth"
      description={`New sign-ups ${UNIT_LABEL[series.unit]}, ${rangeLabel}`}
      action={canFarmers && <PanelLink href="/admin/farmers">All farmers</PanelLink>}
      className={className}
      bodyClassName="flex flex-col"
    >
      <div className="mb-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="font-display text-text text-3xl leading-none font-bold tabular-nums">
            +{total}
          </p>
          <p className="text-text-mute mt-1.5 flex items-center gap-2 text-xs">
            new farmers
            {newDelta !== null && Number.isFinite(newDelta) && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold',
                  newDelta >= 0 ? 'bg-accent/12 text-ink-green' : 'bg-danger/12 text-ink-red',
                )}
              >
                {newDelta >= 0 ? (
                  <TrendingUp size={12} aria-hidden="true" />
                ) : (
                  <TrendingDown size={12} aria-hidden="true" />
                )}
                {newDelta > 0 ? '+' : ''}
                {Math.round(newDelta)}% vs previous
              </span>
            )}
          </p>
        </div>
        <dl className="flex gap-6 text-xs">
          <div>
            <dt className="text-text-mute">Total now</dt>
            <dd className="text-text mt-0.5 text-sm font-semibold tabular-nums">{totalFarmers}</dd>
          </div>
          <div>
            <dt className="text-text-mute">Best {series.unit}</dt>
            <dd className="text-text mt-0.5 text-sm font-semibold tabular-nums">{peak}</dd>
          </div>
          <div>
            <dt className="text-text-mute">Average</dt>
            <dd className="text-text mt-0.5 text-sm font-semibold tabular-nums">
              {average.toFixed(average < 10 ? 1 : 0)}
            </dd>
          </div>
        </dl>
      </div>
      {/* Fills the card's height (it sits beside the to-do column), never under 240px. */}
      <div className="relative min-h-60 flex-1">
        <div className="absolute inset-0">
          <BarChart
            labels={series.labels}
            datasets={[{ label: 'New farmers', data: series.counts, color: palette.purple }]}
            height="fill"
            maxBarThickness={22}
            showLegend={false}
            ariaLabel={`Sign-ups ${UNIT_LABEL[series.unit]}, ${rangeLabel}: ${total} in total`}
          />
        </div>
      </div>
    </Panel>
  );
}
