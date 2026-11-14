'use client';

import { useId, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';

/**
 * The overview's surface: a titled section on the glass background (flat, no gradients). Every
 * panel shares the same header so the page reads as one system.
 */
export function Panel({
  title,
  icon,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  /** The panel's mark, in a purple tile beside the title. */
  icon?: LucideIcon;
  description?: ReactNode;
  /** A link or badge on the right of the header. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      className={cn('border-border bg-glass flex min-w-0 flex-col rounded-2xl border', className)}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <IconTile icon={icon} tone="purple" />}
          <div className="min-w-0">
            <h2 id={titleId} className="text-text text-base font-semibold">
              {title}
            </h2>
            {description && <p className="text-text-mute mt-0.5 text-xs">{description}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={cn('flex-1 px-5 pb-5', bodyClassName)}>{children}</div>
    </section>
  );
}

/** "View all →" in a panel header. */
export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group text-ink-purple inline-flex min-h-8 items-center gap-1 text-xs font-semibold"
    >
      {children}
      <ArrowRight
        size={13}
        aria-hidden="true"
        className="transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

/** A thin horizontal bar (flat colour) for the overview's lists. */
export function MeterBar({
  value,
  max,
  className,
  barClassName = 'bg-purple',
}: {
  value: number;
  max: number;
  className?: string;
  barClassName?: string;
}) {
  const width = max > 0 ? Math.max(value > 0 ? 3 : 0, (value / max) * 100) : 0;
  return (
    <span aria-hidden="true" className={cn('bg-border/80 block h-2 rounded-full', className)}>
      <span
        className={cn('block h-full rounded-full transition-[width] duration-500', barClassName)}
        style={{ width: `${width}%` }}
      />
    </span>
  );
}
