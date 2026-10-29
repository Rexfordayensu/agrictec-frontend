'use client';

import './register';
import type { ChartData, ChartOptions } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useChartTheme } from '@/components/charts/use-chart-theme';

export interface BarDataset {
  label: string;
  data: number[];
  color: string;
  /** One colour per bar, e.g. green/red for positive/negative net values. */
  colorsPerBar?: string[];
}

export interface BarChartProps {
  labels: string[];
  datasets: BarDataset[];
  /** Width ÷ height. Ignored when `height` is set. */
  aspectRatio?: number;
  /**
   * Fixed height in px, or 'fill' to take the full height of its parent (give the parent a
   * height). Either way the chart fills the full width.
   */
  height?: number | 'fill';
  /** The widest a bar may get, in px (default 36). */
  maxBarThickness?: number;
  /** Hide the built-in legend when the card already explains the colours. */
  showLegend?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Bars run left to right, with the category labels down the side. */
  horizontal?: boolean;
  /** Called with a bar's index when it is clicked (the cursor becomes a pointer over bars). */
  onBarClick?: (index: number) => void;
}

export function BarChart({
  labels,
  datasets,
  aspectRatio = 2,
  height,
  showLegend = true,
  ariaLabel = 'Bar chart',
  className,
  horizontal = false,
  onBarClick,
  maxBarThickness = 36,
}: BarChartProps) {
  const { baseOptions } = useChartTheme();

  const data: ChartData<'bar'> = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.colorsPerBar ?? ds.color,
      borderColor: ds.colorsPerBar ?? ds.color,
      borderRadius: 6,
      borderSkipped: false,
      maxBarThickness,
    })),
  };

  const options: ChartOptions<'bar'> = {
    ...baseOptions,
    ...(height ? { maintainAspectRatio: false } : { aspectRatio }),
    plugins: {
      ...baseOptions.plugins,
      legend: { ...baseOptions.plugins.legend, display: showLegend },
    },
    interaction: { mode: 'index', intersect: false },
    ...(horizontal && { indexAxis: 'y' as const }),
    ...(onBarClick && {
      onClick: (_event, elements) => {
        if (elements[0]) onBarClick(elements[0].index);
      },
      onHover: (event, elements) => {
        const target = event.native?.target;
        if (target instanceof HTMLElement) {
          target.style.cursor = elements.length ? 'pointer' : 'default';
        }
      },
    }),
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
      <Bar data={data} options={options} aria-label={ariaLabel} role="img" />
    </div>
  );
}
