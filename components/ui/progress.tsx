import { cn } from '@/lib/utils';

export interface ProgressProps {
  /** 0–100 */
  value: number;
  label?: string;
  className?: string;
}

export function Progress({ value, label, className }: ProgressProps) {
  const pct = Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-text-dim">{label}</span>
          <span className="text-text font-semibold">{pct}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="bg-glass-strong h-2 w-full overflow-hidden rounded-full"
      >
        <div
          className="animate-progress-grow from-accent to-accent-2 h-full rounded-full bg-linear-to-r transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
