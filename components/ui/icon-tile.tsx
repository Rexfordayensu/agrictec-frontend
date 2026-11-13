import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Tone = 'green' | 'red' | 'gold' | 'blue' | 'grey';

/**
 * Green is the standard AgriCtec icon (text-icon on bg-icon-bg, see globals.css). The others keep
 * their meaning: red for expenses and errors, gold for warnings, blue for information, grey for
 * inactive.
 */
export const ICON_TONES: Record<Tone, string> = {
  green: 'bg-icon-bg text-icon',
  red: 'bg-danger/12 text-ink-red',
  gold: 'bg-gold/15 text-ink-gold',
  blue: 'bg-info/12 text-ink-blue',
  grey: 'bg-glass-strong text-text-mute',
};

const SIZES = {
  /** Dense rows only (lists, tables). */
  sm: { box: 'size-8', icon: 16 },
  /** Standard: 40px square, 20px icon. */
  md: { box: 'size-10', icon: 20 },
  /** Card and section headings: 48px square, 24px icon. */
  lg: { box: 'size-12', icon: 24 },
} as const;

/** A rounded (12px) tinted square holding an icon: the leading mark of cards and rows. */
export function IconTile({
  icon: Icon,
  tone = 'green',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        SIZES[size].box,
        ICON_TONES[tone],
        className,
      )}
    >
      <Icon size={SIZES[size].icon} />
    </span>
  );
}
