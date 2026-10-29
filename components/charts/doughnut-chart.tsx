'use client';

import './register';
import type { ReactNode } from 'react';
import type { ChartData, ChartOptions } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { cn } from '@/lib/utils';

export interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  /** Width ÷ height. */
  aspectRatio?: number;
  /** Hide the built-in legend when the card renders its own. */
  showLegend?: boolean;
  /** Content shown in the hole of the doughnut, e.g. the total. */
  centerLabel?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

export function DoughnutChart({
  labels,
  data,
  colors,
  aspectRatio = 1.4,
  showLegend = true,
  centerLabel,
  ariaLabel = 'Doughnut chart',
  className,
}: DoughnutChartProps) {
  const { baseOptions, gridColor } = useChartTheme();
  const isEmpty = data.length === 0 || data.every((value) => value <= 0);

  const chartData: ChartData<'doughnut'> = isEmpty
    ? {
        labels: ['No data'],
        datasets: [{ data: [1], backgroundColor: [gridColor], borderWidth: 0 }],
      }
    : {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }],
      };

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio,
    cutout: '65%',
    plugins: {
      legend: {
        ...baseOptions.plugins.legend,
        display: showLegend && !isEmpty,
        position: 'bottom',
      },
      tooltip: { ...baseOptions.plugins.tooltip, enabled: !isEmpty },
    },
  };

  return (
    <div className={cn('relative', className)}>
      <Doughnut
        data={chartData}
        options={options}
        aria-label={isEmpty ? `${ariaLabel}: no data` : ariaLabel}
        role="img"
      />
      {!isEmpty && centerLabel && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel}
        </div>
      )}
      {isEmpty && (
        <p className="text-text-mute pointer-events-none absolute inset-0 flex items-center justify-center text-sm">
          No data
        </p>
      )}
    </div>
  );
}
