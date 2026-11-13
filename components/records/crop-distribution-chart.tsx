'use client';

import { Leaf } from 'lucide-react';
import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { ChartCard } from '@/components/records/chart-card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useProfileStore } from '@/store/profile-store';

/** Greens from strongest to palest: the biggest earner gets the strongest. */
const SHADES = ['#0b7a46', '#3fbf74', '#a3e3b8', '#d6f3df'];

interface Row {
  name: string;
  total: number;
}

/**
 * The three crops that earn the most, then everything else as "Others". Before any income is
 * recorded it lists the farmer's own main crops (from their profile) at GHS 0.
 */
export function cropRows(incomeByCrop: Record<string, number>, primaryCrops: string[]): Row[] {
  const earned = Object.entries(incomeByCrop)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);
  if (earned.length === 0) {
    return [
      ...primaryCrops.slice(0, 3).map((name) => ({ name, total: 0 })),
      { name: 'Others', total: 0 },
    ];
  }
  const top = earned.slice(0, 3).map(([name, total]) => ({ name, total }));
  const rest = earned.slice(3).reduce((sum, [, total]) => sum + total, 0);
  return [...top, { name: 'Others', total: rest }];
}

/** Income per crop: a doughnut with the total in the middle and a legend of amounts and shares. */
export function CropDistributionChart({ className }: { className?: string }) {
  const { incomeByCrop, income } = useFarmStats();
  const profile = useProfileStore((s) => s.profile);
  const rows = cropRows(incomeByCrop, profile?.primaryCrops ?? []);

  return (
    <ChartCard
      id="income-by-crop-title"
      icon={Leaf}
      title="Income by Crop"
      sub="Crop distribution of all income"
      className={cn('@container/crop', className)}
    >
      <div className="mt-4 grid flex-1 grid-cols-1 items-center gap-5 @sm/crop:grid-cols-[9.5rem_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-40">
          <DoughnutChart
            emptyLabel={null}
            ariaLabel="Income by crop"
            aspectRatio={1}
            showLegend={false}
            labels={rows.map((r) => r.name)}
            data={rows.map((r) => r.total)}
            colors={rows.map((_, i) => SHADES[i % SHADES.length])}
            centerLabel={
              <>
                <span className="text-text text-xl font-extrabold tabular-nums">
                  {formatCompactGHS(income)}
                </span>
                <span className="text-text-dim text-xs">Total Income</span>
              </>
            }
          />
        </div>
        <ul className="divide-border divide-y" aria-label="Income by crop">
          {rows.map((row, i) => (
            <li key={row.name} className="flex items-center gap-3 py-2.5">
              <span
                aria-hidden="true"
                className="size-4 shrink-0 rounded"
                style={{ backgroundColor: SHADES[i % SHADES.length] }}
              />
              <span className="text-text min-w-0 flex-1 truncate text-sm font-semibold">
                {row.name}
              </span>
              <span className="text-text-dim w-10 shrink-0 text-right text-sm tabular-nums">
                {income > 0 ? Math.round((row.total / income) * 100) : 0}%
              </span>
              <span className="text-text min-w-16 shrink-0 text-right text-sm font-semibold tabular-nums">
                {formatGHS(row.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  );
}
