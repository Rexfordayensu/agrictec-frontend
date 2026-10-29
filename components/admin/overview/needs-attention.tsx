'use client';

import Link from 'next/link';
import {
  BadgeCheck,
  ChevronRight,
  CircleCheckBig,
  ClipboardList,
  MessageSquareWarning,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Panel } from '@/components/admin/overview/panel';
import { useAdminRole } from '@/hooks/admin/use-can';
import { needsAttention, type AttentionItem } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { FeatureFlags } from '@/types/admin';

const ICONS: Record<AttentionItem['key'], LucideIcon> = {
  maintenance: Wrench,
  risk: ShieldAlert,
  verifications: BadgeCheck,
  loans: ClipboardList,
  appeals: MessageSquareWarning,
};

/** The to-do list, most urgent first: only what this role can act on (maintenance shows to all). */
export function NeedsAttention({ flags }: { flags: FeatureFlags | null }) {
  const role = useAdminRole();
  const farmers = useAdminDataStore((s) => s.farmers);
  const apps = useAdminDataStore((s) => s.applications);
  const riskFlags = useAdminDataStore((s) => s.riskFlags);
  const verifications = useAdminDataStore((s) => s.verifications);
  const items = needsAttention(
    { farmers, apps, flags: riskFlags, verifications, featureFlags: flags },
    role,
  );

  return (
    <Panel
      title="Needs attention"
      description="Most urgent first"
      action={
        items.length > 0 && (
          <span className="bg-danger/12 text-ink-red rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums">
            {items.length}
          </span>
        )
      }
      bodyClassName="px-2 pb-2"
    >
      {items.length === 0 ? (
        <p className="text-ink-green flex items-center gap-2 px-3 py-6 text-sm font-semibold">
          <CircleCheckBig size={18} aria-hidden="true" />
          You’re all caught up
        </p>
      ) : (
        <ul>
          {items.map((item) => {
            const Icon = ICONS[item.key];
            const row = (
              <>
                <span
                  className={cn(
                    'inline-flex size-8 shrink-0 items-center justify-center rounded-lg',
                    item.urgent ? 'bg-danger/15 text-ink-red' : 'bg-glass-strong text-text-dim',
                  )}
                >
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm leading-snug',
                    item.urgent ? 'text-ink-red font-semibold' : 'text-text',
                  )}
                >
                  {item.text}
                </span>
                {item.actionable && (
                  <ChevronRight
                    size={16}
                    aria-hidden="true"
                    className="text-text-mute shrink-0 transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </>
            );
            return (
              <li key={item.key}>
                {item.actionable ? (
                  <Link
                    href={item.href}
                    className="group hover:bg-glass-strong flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 transition-colors"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex min-h-12 items-center gap-3 px-3 py-2">{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
