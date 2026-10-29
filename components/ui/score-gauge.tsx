import { useId, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface ScoreGaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  /** Short text under the value, e.g. "Good". */
  caption?: string;
  className?: string;
}

const R = 80;
const CX = 100;
const CY = 100;
const LENGTH = Math.PI * R; // half circle

/** Semicircle gauge (red → gold → green) with a marker at the value. */
export function ScoreGauge({ value, min, max, label, caption, className }: ScoreGaugeProps) {
  const gradientId = `gauge-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const pct = Math.min(1, Math.max(0, (value - min) / (max - min)));
  const angle = Math.PI * (1 - pct); // 180° at min → 0° at max
  const marker = { x: CX + R * Math.cos(angle), y: CY - R * Math.sin(angle) };
  const arc = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div
      role="img"
      aria-label={`${label}: ${value} on a scale from ${min} to ${max}${caption ? `, ${caption}` : ''}`}
      className={cn('relative w-full max-w-[260px]', className)}
    >
      <svg viewBox="0 0 200 118" className="w-full overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="45%" stopColor="#f5c451" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={LENGTH}
          strokeDashoffset={LENGTH * (1 - pct)}
          style={
            { '--gauge-len': LENGTH, animation: 'gaugeFill 1.2s ease-out both' } as CSSProperties
          }
        />
        <circle
          cx={marker.x}
          cy={marker.y}
          r="9"
          fill="var(--bg-1)"
          stroke="#fff"
          strokeWidth="4"
        />
        <text x={CX - R} y={CY + 16} textAnchor="middle" className="fill-text-mute text-[9px]">
          {min}
        </text>
        <text x={CX + R} y={CY + 16} textAnchor="middle" className="fill-text-mute text-[9px]">
          {max}
        </text>
      </svg>
      <div className="absolute inset-x-0 bottom-3 text-center">
        <p className="text-text text-4xl leading-none font-extrabold tracking-tight">{value}</p>
        {caption && <p className="text-ink-green mt-1 text-sm font-semibold">{caption}</p>}
        <p className="text-text-mute text-[10px] font-semibold tracking-wider uppercase">{label}</p>
      </div>
    </div>
  );
}
