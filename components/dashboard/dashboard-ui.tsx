import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** The look every dashboard card shares (light and dark themes come from the tokens). */
export const dashPanel =
  'dash-panel rounded-card border-border bg-glass shadow-glass min-w-0 border p-4 sm:p-5';

// The shared icon tile (components/ui/icon-tile), re-exported for the dashboard's cards.
import { IconTile } from '@/components/ui/icon-tile';

export { IconTile };
export type { Tone } from '@/components/ui/icon-tile';

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
      {icon && <IconTile icon={icon} />}
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
