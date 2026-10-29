'use client';

import './register';
import type { ChartData, ChartOptions } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useChartTheme, withAlpha } from '@/components/charts/use-chart-theme';

export interface LineDataset {
  label: string;
  data: number[];
  color: string;
  fill?: boolean;
}

export interface LineChartProps {
  labels: string[];
  datasets: LineDataset[];
  /** Width ÷ height. Ignored when `height` is set. */
  aspectRatio?: number;
  /**
   * Fixed height in px, or 'fill' to take the full height of its parent (give the parent a
   * height, e.g. flex-1 with a min-height). Either way the chart fills the full width.
   */
  height?: number | 'fill';
  /** Hide the built-in legend when the card already shows its own. */
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
  formatValue?: (value: number) => string;
  yAxisTitle?: string;
}

export function LineChart({
  labels,
  datasets,
  aspectRatio = 2,
  height,
  showLegend = true,
  ariaLabel = 'Line chart',
  className,
  formatValue,
  yAxisTitle,
}: LineChartProps) {
  const { baseOptions } = useChartTheme();
  // Money charts that are never negative should start at 0 (an all-zero chart would otherwise span −1…1).
  const allNonNegative = datasets.every((ds) => ds.data.every((value) => value >= 0));

  const data: ChartData<'line'> = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color,
      backgroundColor: ds.fill ? withAlpha(ds.color, 0.15) : ds.color,
      pointBackgroundColor: ds.color,
      fill: ds.fill ? 'origin' : false,
      tension: 0.4,
      // Smooth, but never overshoots: the curve can't dip below 0 between two zero-ish months.
      cubicInterpolationMode: 'monotone',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
    })),
  };

  const options: ChartOptions<'line'> = {
    ...baseOptions,
    ...(height ? { maintainAspectRatio: false } : { aspectRatio }),
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: showLegend },
      tooltip: {
        ...baseOptions.plugins.tooltip,
        ...(formatValue && {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${formatValue(context.parsed.y ?? 0)}`,
          },
        }),
      },
    },
    scales: {
      ...baseOptions.scales,
      y: {
        ...baseOptions.scales.y,
        ...(allNonNegative && { min: 0, suggestedMax: 1 }),
        ...(formatValue && {
          ticks: { ...baseOptions.scales.y.ticks, callback: (value) => formatValue(Number(value)) },
        }),
        ...(yAxisTitle && {
          title: {
            display: true,
            text: yAxisTitle,
            color: baseOptions.scales.y.ticks.color,
            font: { size: 10 },
          },
        }),
      },
    },
    interaction: { mode: 'index', intersect: false },
  };

  return (
    <div
      className={className}
      style={
        height === 'fill'
          ? { height: '100%', position: 'relative' }
          : height
            ? { height, position: 'relative' }
            : undefined
      }
    >
      <Line data={data} options={options} aria-label={ariaLabel} role="img" />
    </div>
  );
}
