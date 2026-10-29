import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface ScoreRingProps {
  value: number;
  max: number;
  label: string;
  /** Diameter in px. */
  size?: number;
  className?: string;
}

export function ScoreRing({ value, max, label, size = 140, className }: ScoreRingProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  // --ring-pct is a registered @property (globals.css), so animate-ring-fill grows it from 0.
  const style = {
    width: size,
    height: size,
    '--ring-pct': pct,
    background: 'conic-gradient(var(--accent) calc(var(--ring-pct) * 1%), var(--border) 0)',
  } as CSSProperties;

  return (
    <div
      role="img"
      aria-label={`${label}: ${value} out of ${max}`}
      className={cn('animate-ring-fill relative shrink-0 rounded-full', className)}
      style={style}
    >
      <div className="bg-bg-1 absolute inset-2.5 flex flex-col items-center justify-center rounded-full text-center">
        <span
          className="text-text leading-none font-extrabold"
          style={{ fontSize: Math.round(size * 0.24) }}
        >
          {value}
        </span>
        <span className="text-text-mute mt-1 text-[10px] font-semibold tracking-wider uppercase">
          {label}
        </span>
      </div>
    </div>
  );
}
