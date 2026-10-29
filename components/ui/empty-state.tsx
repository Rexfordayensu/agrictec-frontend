import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}
    >
      <Icon
        size={48}
        strokeWidth={1.5}
        aria-hidden="true"
        className="text-text-mute mb-4 opacity-50"
      />
      <p className="text-text text-sm font-semibold">{title}</p>
      {description && <p className="text-text-dim mt-1 max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
