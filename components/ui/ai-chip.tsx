import type { MouseEventHandler, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AiChipProps {
  children: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
}

const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-purple/30 bg-linear-to-r from-purple/15 to-info/15 px-3 py-1 text-[11px] font-semibold text-ink-purple';

/** Renders a button when clickable, otherwise a plain label. */
export function AiChip({ children, onClick, className }: AiChipProps) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          chipClass,
          'hover:border-purple/60 hover:from-purple/25 hover:to-info/25 min-h-9 cursor-pointer transition-colors',
          className,
        )}
      >
        {children}
      </button>
    );
  }
  return <span className={cn(chipClass, className)}>{children}</span>;
}
