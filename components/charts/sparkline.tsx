import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface SparklineProps {
  data: number[];
  /** Accessible summary, e.g. "Income trend over the last 6 months". */
  ariaLabel: string;
  className?: string;
  /** Under the line: a soft gradient (default), or nothing for a flat, line-only look. */
  fill?: 'gradient' | 'none';
}

const W = 120;
const H = 36;
const PAD = 3;

/**
 * Tiny SVG trend line with a soft gradient fill. Draws in `currentColor`, so set the colour
 * with a text class (e.g. text-ink-green). No Chart.js needed, so it is cheap to render many.
 */
export function Sparkline({ data, ariaLabel, className, fill = 'gradient' }: SparklineProps) {
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const values = data.length > 1 ? data : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((value, i) => ({
    x: (i / (values.length - 1)) * W,
    y: max === min ? H / 2 : PAD + (1 - (value - min) / range) * (H - PAD * 2),
  }));

  // Smooth curve: cubic Bézier through each point, with control points halfway between.
  const line = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const midX = (prev.x + point.x) / 2;
    return `${path} C ${midX} ${prev.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
      className={cn('h-9 w-full overflow-visible', className)}
    >
      {fill === 'gradient' && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradientId})`} />
        </>
      )}
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
