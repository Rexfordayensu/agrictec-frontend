'use client';

import { Clock, ShieldAlert, UserCheck, Users, type LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { FarmerPage } from '@/services/admin/farmers.service';

interface Card {
  key: string;
  label: string;
  value?: number;
  icon: LucideIcon;
  /** The round icon's tint and the card's faint wash. */
  tone: string;
  wash: string;
  /** Clicking the card shows these farmers (the URL filter it sets). */
  filter: { name: 'status' | 'verification'; value: string } | null;
}

/**
 * Total, active, waiting for verification review and suspended farmers, counted by the API from
 * the database (never from the page on screen). Each card filters the list to its farmers.
 */
export function FarmerSummaryCards({
  summary,
  active,
  onFilter,
}: {
  summary?: FarmerPage['summary'];
  /** Which card's filter is on (to mark it pressed). */
  active: { status: string; verification: string };
  onFilter: (filter: Card['filter']) => void;
}) {
  const cards: Card[] = [
    {
      key: 'all',
      label: 'Total farmers',
      value: summary?.all,
      icon: Users,
      tone: 'bg-purple/12 text-ink-purple',
      wash: 'from-purple/[0.04]',
      filter: null,
    },
    {
      key: 'active',
      label: 'Active farmers',
      value: summary?.active,
      icon: UserCheck,
      tone: 'bg-accent/15 text-ink-green',
      wash: 'from-accent/[0.07]',
      filter: { name: 'status', value: 'active' },
    },
    {
      key: 'pending',
      label: 'Pending verification',
      value: summary?.pending_review,
      icon: Clock,
      tone: 'bg-gold/15 text-ink-gold',
      wash: 'from-gold/[0.06]',
      filter: { name: 'verification', value: 'pending-review' },
    },
    {
      key: 'suspended',
      label: 'Suspended farmers',
      value: summary?.suspended,
      icon: ShieldAlert,
      tone: 'bg-danger/12 text-ink-red',
      wash: 'from-danger/[0.05]',
      filter: { name: 'status', value: 'suspended' },
    },
  ];

  const isOn = (card: Card) =>
    card.filter
      ? active[card.filter.name] === card.filter.value
      : !active.status && !active.verification;

  return (
    <section aria-label="Farmer totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={isOn(card)}
            onClick={() => onFilter(isOn(card) ? null : card.filter)}
            title={
              card.key === 'pending'
                ? 'Farmers with a phone, location or Ghana Card check waiting for review'
                : undefined
            }
            className={cn(
              'border-border bg-bg-2 flex min-w-0 items-center gap-3 rounded-2xl border bg-linear-to-br to-transparent p-3.5 text-left transition-colors sm:p-4',
              card.wash,
              'hover:border-purple/40',
              isOn(card) && card.filter && 'border-purple/50',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-11 shrink-0 items-center justify-center rounded-full',
                card.tone,
              )}
            >
              <Icon size={22} />
            </span>
            <span className="min-w-0">
              <span className="text-text-dim sm:text-small block text-xs leading-snug">
                {card.label}
              </span>
              {!summary ? (
                <Skeleton className="mt-1.5 h-7 w-10" />
              ) : card.value === undefined ? (
                // Loaded, but this figure is missing (an API older than this page): say so.
                <span
                  title="Not available yet"
                  className="font-display text-text-mute block text-3xl leading-tight font-bold"
                >
                  –
                </span>
              ) : (
                <span className="font-display text-text block text-3xl leading-tight font-bold tabular-nums">
                  {card.value.toLocaleString()}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </section>
  );
}
