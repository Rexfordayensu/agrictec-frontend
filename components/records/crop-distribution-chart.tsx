'use client';

import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CropTile } from '@/components/ui/crop-icon';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import type { Crop } from '@/types';

/** Doughnut of income per crop, with an icon legend showing amounts and shares. */
export function CropDistributionChart({ className }: { className?: string }) {
  const { incomeByCrop, income } = useFarmStats();
  const { palette } = useChartTheme();
  const colors = [
    palette.accent,
    palette.gold,
    palette.purple,
    palette.info,
    palette.warning,
    palette.danger,
  ];

  // Largest share first, so the biggest earner always gets the brand colour.
  const entries = (Object.entries(incomeByCrop) as [Crop, number][])
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Income by Crop</CardTitle>
          <CardSub>Crop distribution of all income</CardSub>
        </div>
      </CardHeader>

      <div className="mx-auto max-w-60">
        <DoughnutChart
          ariaLabel="Income by crop"
          aspectRatio={1}
          showLegend={false}
          labels={entries.map(([crop]) => crop)}
          data={entries.map(([, total]) => total)}
          colors={entries.map((_, i) => colors[i % colors.length])}
          centerLabel={
            <>
              <span className="text-text-mute text-[11px]">Total</span>
              <span className="text-text text-lg font-extrabold">{formatCompactGHS(income)}</span>
            </>
          }
        />
      </div>

      {entries.length > 0 && (
        <ul className="mt-5 space-y-2.5">
          {entries.map(([crop, total], i) => (
            <li key={crop} className="flex items-center gap-3">
              <CropTile crop={crop} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text flex items-center gap-2 font-medium">
                    <span
                      aria-hidden="true"
                      className="size-2 rounded-full"
                      style={{ backgroundColor: colors[i % colors.length] }}
                    />
                    {crop}
                  </span>
                  <span className="text-text font-semibold tabular-nums">{formatGHS(total)}</span>
                </div>
                <p className="text-text-mute text-xs">
                  {Math.round((total / income) * 100)}% of income
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
