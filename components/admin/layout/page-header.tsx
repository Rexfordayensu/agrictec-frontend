import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * The heading row at the top of an admin page: title, a short description and the page's
 * actions (e.g. Export CSV). The top bar above it shows where the page sits (breadcrumbs).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-display text-text text-2xl leading-tight font-bold">{title}</h1>
        {description && <p className="text-text-dim mt-1 max-w-2xl text-sm">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
