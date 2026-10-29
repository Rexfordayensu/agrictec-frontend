import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InsightItemProps {
  icon: LucideIcon;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function InsightItem({ icon: Icon, title, children, className }: InsightItemProps) {
  return (
    <div className={cn('glass flex gap-3 rounded-2xl p-3.5', className)}>
      <div className="bg-accent/15 text-ink-green inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
        <Icon size={18} aria-hidden="true" />
      </div>
      <div className="min-w-0 text-sm">
        {title && <p className="text-text font-semibold">{title}</p>}
        <div className={cn('text-text-dim', title && 'mt-0.5')}>{children}</div>
      </div>
    </div>
  );
}
