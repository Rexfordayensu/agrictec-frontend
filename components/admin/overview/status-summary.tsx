'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  ChevronRight,
  CircleCheck,
  CircleCheckBig,
  ClipboardList,
  MessageSquareWarning,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/hooks/admin/use-can';
import type { PlatformStatus } from '@/hooks/admin/use-platform-status';
import { adminPath } from '@/lib/admin-path';
import type { AttentionItem } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';

const ICONS: Record<AttentionItem['key'], LucideIcon> = {
  maintenance: Wrench,
  risk: ShieldAlert,
  verifications: BadgeCheck,
  loans: ClipboardList,
  appeals: MessageSquareWarning,
};

/** How many to-dos fit beside the weather; the rest are counted. */
const SHOWN = 3;

/**
 * Beside the weather: is the farmer app up (from the live flags), and the to-do list for this
 * role, most urgent first (GET /admin/overview). All caught up when there is nothing to do.
 */
export function StatusSummary({
  status,
  items,
  className,
}: {
  status: PlatformStatus | null;
  items: AttentionItem[];
  className?: string;
}) {
  const canSettings = useCan('settings.manage');
  const down = status?.flags.maintenanceMode;
  const shown = items.slice(0, SHOWN);
  const more = items.length - shown.length;

  const platform = !status ? (
    <div className="space-y-2" role="status" aria-label="Loading platform status">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-4 w-40" />
    </div>
  ) : (
    <div className="flex items-center gap-4">
      <span
        className={cn(
          'inline-flex size-12 shrink-0 items-center justify-center rounded-full border-2',
          down ? 'border-danger/60 text-ink-red' : 'border-accent/70 text-ink-green',
        )}
      >
        {down ? (
          <Wrench size={22} aria-hidden="true" />
        ) : (
          <CircleCheck size={26} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <h2 className="text-text text-base font-semibold">Platform status</h2>
        <p className={cn('mt-0.5 text-sm', down ? 'text-ink-red font-semibold' : 'text-text-dim')}>
          {down ? 'Maintenance mode is on' : 'Farmer app is online'}
        </p>
      </div>
    </div>
  );

  return (
    <section
      aria-label="Platform status and what needs attention"
      className={cn(
        'border-border bg-glass grid min-w-0 gap-5 rounded-2xl border p-5 sm:grid-cols-[auto_1px_minmax(0,1fr)] sm:items-center',
        className,
      )}
    >
      {canSettings ? (
        <Link
          href={adminPath('/admin/settings')}
          className="hover:bg-glass-strong -m-2 rounded-xl p-2 transition-colors"
          aria-label="Platform status: open System Settings"
        >
          {platform}
        </Link>
      ) : (
        platform
      )}

      <span aria-hidden="true" className="bg-border hidden h-full min-h-16 sm:block" />

      <div className="min-w-0">
        <h2 className="text-text flex items-center gap-2 text-base font-semibold whitespace-nowrap">
          Needs attention
          {items.length > 0 && (
            <span className="bg-danger/12 text-ink-red rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
              {items.length}
            </span>
          )}
        </h2>
        {items.length === 0 ? (
          <p className="bg-accent/12 text-ink-green mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold">
            <CircleCheckBig size={16} aria-hidden="true" />
            You&apos;re all caught up
          </p>
        ) : (
          <ul className="mt-1.5 space-y-0.5">
            {shown.map((item) => {
              const Icon = ICONS[item.key];
              const row = (
                <>
                  <Icon
                    size={15}
                    aria-hidden="true"
                    className={cn('shrink-0', item.urgent ? 'text-ink-red' : 'text-text-mute')}
                  />
                  <span
                    className={cn(
                      'line-clamp-2 min-w-0 flex-1 text-sm leading-snug',
                      item.urgent ? 'text-ink-red font-semibold' : 'text-text',
                    )}
                  >
                    {item.text}
                  </span>
                  {item.actionable && (
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="text-text-mute shrink-0"
                    />
                  )}
                </>
              );
              return (
                <li key={item.key}>
                  {item.actionable ? (
                    <Link
                      href={item.href}
                      title={item.text}
                      className="hover:bg-glass-strong -mx-2 flex min-h-9 items-center gap-2 rounded-lg px-2 transition-colors"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex min-h-9 items-center gap-2" title={item.text}>
                      {row}
                    </div>
                  )}
                </li>
              );
            })}
            {more > 0 && <li className="text-text-mute pt-1 text-xs">and {more} more</li>}
          </ul>
        )}
      </div>
    </section>
  );
}
