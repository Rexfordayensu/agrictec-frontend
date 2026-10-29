import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** A label/value list for detail modals and detail pages. Wrap DetailRow items in DetailList. */
export function DetailList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn('divide-border divide-y', className)}>{children}</dl>;
}

export function DetailRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  /** For IDs, references and numbers that read better in a monospace font. */
  mono?: boolean;
}) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-3">
      <dt className="text-text-mute text-xs font-semibold">{label}</dt>
      <dd className={cn('text-text min-w-0 text-sm break-words', mono && 'font-mono text-xs')}>
        {children ?? <span className="text-text-mute">—</span>}
      </dd>
    </div>
  );
}
