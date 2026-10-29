import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type BadgeColor = 'green' | 'red' | 'blue' | 'gold' | 'purple';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
}

const colors: Record<BadgeColor, string> = {
  green: 'bg-accent/15 text-ink-green',
  red: 'bg-danger/15 text-ink-red',
  blue: 'bg-info/15 text-ink-blue',
  gold: 'bg-gold/15 text-ink-gold',
  purple: 'bg-purple/15 text-ink-purple',
};

export function Badge({ color = 'green', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        colors[color],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
