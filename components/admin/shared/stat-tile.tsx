import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** A compact summary number above a list ("Waiting 12 · 8 Ghana Cards"). Flat, no gradients. */
export function StatTile({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'danger' | 'good';
  icon?: LucideIcon;
}) {
  return (
    <div className="border-border bg-glass min-w-0 rounded-2xl border px-4 py-3.5">
      <p className="text-text-mute flex items-center gap-1.5 text-xs font-semibold">
        {Icon && <Icon size={13} aria-hidden="true" />}
        {label}
      </p>
      <p
        className={cn(
          'font-display mt-1 truncate text-xl font-bold tabular-nums sm:text-2xl',
          tone === 'danger' ? 'text-ink-red' : tone === 'good' ? 'text-ink-green' : 'text-text',
        )}
      >
        {value}
      </p>
      {hint && <p className="text-text-mute mt-0.5 truncate text-xs">{hint}</p>}
    </div>
  );
}
