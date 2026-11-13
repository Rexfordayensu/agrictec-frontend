import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A Farm Records chart card: icon tile, title and a short line, then the content. */
export function ChartCard({
  id,
  icon: Icon,
  title,
  sub,
  aside,
  className,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'rounded-card border-border bg-glass shadow-glass flex min-w-0 flex-col border p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
          <Icon size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={id} className="text-text text-lg leading-tight font-bold">
            {title}
          </h2>
          <p className="text-text-dim text-sm">{sub}</p>
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
