import { cn } from '@/lib/utils';

/** Flat tints (no gradients), picked from the name so a person always gets the same colour. */
const TONES = [
  'bg-purple/15 text-ink-purple',
  'bg-info/15 text-ink-blue',
  'bg-accent/15 text-ink-green',
  'bg-gold/15 text-ink-gold',
  'bg-danger/15 text-ink-red',
];

/** "Akosua Mensah" → "AM"; "kofi@x.com" → "KX". */
export function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

const SIZES = {
  sm: 'size-8 text-[11px]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
  xl: 'size-14 text-base',
} as const;

/** A round avatar with a person's initials (decorative: the name is always shown beside it). */
export function InitialsAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const tone = TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length];
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-bold',
        SIZES[size],
        tone,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
