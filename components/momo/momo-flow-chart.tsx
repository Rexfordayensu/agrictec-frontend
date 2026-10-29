'use client';

import { BarChart3 } from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';

export function MomoFlowChart() {
  const { momo } = useFarmStats();
  const { palette } = useChartTheme();
  const inflow = momo.monthly6.income.reduce((a, b) => a + b, 0);
  const outflow = momo.monthly6.expense.reduce((a, b) => a + b, 0);

  return (
    <Card className="flex h-full flex-col rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 size={17} aria-hidden="true" className="text-ink-green" />
            Cash flow
          </CardTitle>
          <CardSub>Money in vs money out, last 6 months</CardSub>
        </div>
      </CardHeader>
      <dl className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-[#10b981]" />
          <dt className="text-text-mute">Money in</dt>
          <dd className="text-text font-semibold tabular-nums">{formatGHS(inflow)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-[#ef4444]" />
          <dt className="text-text-mute">Money out</dt>
          <dd className="text-text font-semibold tabular-nums">{formatGHS(outflow)}</dd>
        </div>
      </dl>
      <div className="mt-auto">
        <BarChart
          ariaLabel="MoMo money in versus money out over the last 6 months"
          height={240}
          showLegend={false}
          labels={momo.monthly6.labels}
          datasets={[
            { label: 'Money in', data: momo.monthly6.income, color: palette.accent },
            { label: 'Money out', data: momo.monthly6.expense, color: palette.danger },
          ]}
        />
      </div>
    </Card>
  );
}
