import Link from 'next/link';
import { ArrowRight, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  label: string;
  /** Already formatted, e.g. "GHS 1.2M" or "64". */
  value: string;
  /** A short line under the value, e.g. "+8 in 30 days" or "68% of farmers". */
  hint?: string;
  icon?: LucideIcon;
  /** % change vs the last period; null when there is nothing to compare with. */
  delta?: number | null;
  /** e.g. "vs last month". */
  deltaLabel?: string;
  /** For metrics where down is good (e.g. open risk flags): flips the colours. */
  lowerIsBetter?: boolean;
  /** Values over time for a small trend line. */
  trend?: number[];
  href?: string;
  linkLabel?: string;
  className?: string;
}

/** A label, a big value, an optional delta (green good, red bad), sparkline and link. */
export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delta,
  deltaLabel = 'vs last period',
  lowerIsBetter = false,
  trend,
  href,
  linkLabel = 'View',
  className,
}: KpiCardProps) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta);
  const up = hasDelta && delta! > 0;
  const good = hasDelta && (lowerIsBetter ? delta! < 0 : delta! > 0);
  const flat = hasDelta && delta === 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;

  return (
    <Card padding="sm" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-text-dim text-xs font-semibold">{label}</p>
        {Icon && (
          <span className="bg-purple/15 text-ink-purple inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon size={16} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="font-display text-text text-2xl leading-none font-bold tabular-nums">{value}</p>
      {hint && <p className="text-text-dim -mt-1.5 text-xs">{hint}</p>}
      <div className="flex min-h-5 items-end justify-between gap-2">
        {hasDelta ? (
          <p
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold',
              flat ? 'text-text-mute' : good ? 'text-ink-green' : 'text-ink-red',
            )}
          >
            {!flat && <DeltaIcon size={13} aria-hidden="true" />}
            {up ? '+' : ''}
            {delta!.toFixed(Math.abs(delta!) < 10 ? 1 : 0)}%
            <span className="text-text-mute font-normal">{deltaLabel}</span>
          </p>
        ) : (
          <span />
        )}
        {trend && trend.length > 1 && (
          <Sparkline
            data={trend}
            ariaLabel={`${label} trend`}
            className="text-ink-purple h-8 w-24 shrink-0"
          />
        )}
      </div>
      {href && (
        <Link
          href={href}
          className="group text-ink-purple inline-flex min-h-8 items-center gap-1 text-xs font-semibold"
        >
          {linkLabel}
          <ArrowRight
            size={13}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      )}
    </Card>
  );
}
