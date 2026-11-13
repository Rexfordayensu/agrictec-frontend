import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The look every dashboard card shares (light and dark themes come from the tokens). */
export const dashPanel =
  'dash-panel rounded-card border-border bg-glass shadow-glass min-w-0 border p-4 sm:p-5';

export type Tone = 'green' | 'red' | 'gold' | 'blue';

const TONES: Record<Tone, string> = {
  green: 'bg-accent/12 text-ink-green',
  red: 'bg-danger/12 text-ink-red',
  gold: 'bg-gold/15 text-ink-gold',
  blue: 'bg-info/12 text-ink-blue',
};

/** A rounded, tinted square holding an icon (the cards' leading mark). */
export function IconTile({
  icon: Icon,
  tone = 'green',
  size = 'md',
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'md' ? 'size-10' : 'size-8',
        TONES[tone],
      )}
    >
      <Icon size={size === 'md' ? 20 : 16} />
    </span>
  );
}

/** A card heading: optional icon, title, a short line under it, and something on the right. */
export function PanelHeading({
  icon,
  title,
  sub,
  aside,
  id,
}: {
  icon?: LucideIcon;
  title: string;
  sub?: string;
  aside?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      {icon && <IconTile icon={icon} size="sm" />}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-text text-lg leading-tight font-bold">
          {title}
        </h2>
        {sub && <p className="text-text-mute mt-0.5 text-xs">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}
