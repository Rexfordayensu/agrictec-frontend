'use client';

import { useId, useState } from 'react';
import { ChartNoAxesCombined } from 'lucide-react';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { formatGHS } from '@/lib/format';
import { formatPriceChange, marketCropKey, percentageSeries } from '@/lib/market/data';
import type { MarketPrice, PriceTrends } from '@/types';

export function PriceTrendChart({
  trends,
  prices,
}: {
  trends: PriceTrends;
  prices: MarketPrice[];
}) {
  const [percentage, setPercentage] = useState(false);
  const toggleId = useId();
  const { palette } = useChartTheme();
  const colors = [palette.accent, palette.info, palette.purple, palette.gold];
  const datasets = trends.series.map((series, index) => ({
    label: series.crop,
    data: percentage ? percentageSeries(series.prices) : series.prices,
    color: colors[index % colors.length],
  }));
  const formatValue = percentage ? formatPriceChange : formatGHS;
  if (!trends.labels.length || !trends.series.length)
    return (
      <Card className="rounded-3xl">
        <CardTitle>Price history unavailable</CardTitle>
        <CardSub>
          Historical observations from documented sources are needed before a price trend can be
          shown.
        </CardSub>
      </Card>
    );
  const unitFor = (crop: string) =>
    prices.find((price) => marketCropKey(price.crop) === marketCropKey(crop))?.unit ??
    'listed unit';

  return (
    <Card className="rounded-3xl">
      <CardHeader className="flex-wrap items-center">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ChartNoAxesCombined size={17} aria-hidden="true" className="text-ink-green" />
            Price Trends (Last 6 Months)
          </CardTitle>
          <CardSub>
            {percentage
              ? `Percentage change from ${trends.labels[0]} — every crop starts at 0%`
              : 'Compare supplied historical observations, or switch to percentage change'}
          </CardSub>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={toggleId} className="text-text-dim cursor-pointer text-xs font-semibold">
            % change
          </label>
          <Switch
            id={toggleId}
            label="Show percentage change instead of absolute prices"
            checked={percentage}
            onChange={setPercentage}
          />
        </div>
      </CardHeader>
      <ul aria-label="Chart legend" className="mb-5 flex flex-wrap gap-x-5 gap-y-2">
        {datasets.map((series) => (
          <li key={series.label} className="text-text-dim inline-flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <span className="font-semibold">{series.label}</span>
            {!percentage && (
              <span className="text-text-mute text-[10px]">/{unitFor(series.label)}</span>
            )}
          </li>
        ))}
      </ul>
      <LineChart
        labels={trends.labels}
        datasets={datasets}
        height={300}
        showLegend={false}
        formatValue={formatValue}
        yAxisTitle={percentage ? '% change from first month' : 'GHS per listed market unit'}
        ariaLabel={
          percentage
            ? 'Six-month demo crop price changes in percent, from the first month'
            : 'Six-month demo crop prices in GHS per listed market unit'
        }
      />
      <details className="border-border text-text-mute mt-4 border-t pt-3 text-xs">
        <summary className="hover:text-text min-h-9 cursor-pointer py-2 font-semibold">
          View price data
        </summary>
        <div className="overflow-x-auto pb-1">
          <table className="w-full min-w-96 text-right tabular-nums">
            <caption className="sr-only">
              {percentage
                ? 'Source-backed price percentage changes from the first month'
                : 'Source-backed observations in GHS per listed market unit'}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="py-2 text-left font-semibold">
                  Month
                </th>
                {datasets.map((series) => (
                  <th key={series.label} scope="col" className="px-2 py-2 font-semibold">
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trends.labels.map((month, index) => (
                <tr key={`${month}-${index}`} className="border-border border-t">
                  <th scope="row" className="py-2 text-left font-medium">
                    {month}
                  </th>
                  {datasets.map((series) => (
                    <td key={series.label} className="px-2 py-2">
                      {formatValue(series.data[index])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
