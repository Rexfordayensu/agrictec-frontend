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
  /** Keep all month labels visible on a compact annual chart. */
  showAllLabels?: boolean;
  /** Category labels stay level; when they don't all fit, every other one shows instead. */
  flatLabels?: boolean;
  /** Value-axis labels, e.g. (v) => "GHS 1.0K". */
  formatValue?: (value: number) => string;
  /** A top for the value axis when every bar is 0 (so the empty grid still reads as money). */
  emptyMax?: number;
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
  showAllLabels = false,
  flatLabels = false,
  formatValue,
  emptyMax,
}: BarChartProps) {
  const allZero = datasets.every((ds) => ds.data.every((v) => !v));
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
    ...((showAllLabels || flatLabels || formatValue || emptyMax) && {
      scales: {
        ...baseOptions.scales,
        x: flatLabels
          ? {
              ...baseOptions.scales.x,
              ticks: {
                ...baseOptions.scales.x.ticks,
                autoSkip: true,
                autoSkipPadding: 10,
                minRotation: 0,
                maxRotation: 0,
              },
            }
          : showAllLabels
            ? {
                ...baseOptions.scales.x,
                ticks: {
                  ...baseOptions.scales.x.ticks,
                  autoSkip: false,
                  minRotation: 0,
                  maxRotation: 50,
                  font: { size: 12 },
                },
              }
            : baseOptions.scales.x,
        y: {
          ...baseOptions.scales.y,
          ...(emptyMax && allZero && { min: 0, suggestedMax: emptyMax }),
          ticks: {
            ...baseOptions.scales.y.ticks,
            ...(formatValue && {
              callback: (value: string | number) => formatValue(Number(value)),
            }),
          },
        },
      },
    }),
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
