'use client';

import Link from 'next/link';
import { isToday, isYesterday } from 'date-fns';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  History,
  Sprout,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CropLabel } from '@/components/ui/crop-icon';
import { formatDate, formatGHS, parseISODate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import type { FarmRecord, MomoTransaction } from '@/types';

const MAX_ITEMS = 6;

type Tone = 'in' | 'out' | 'activity';

interface ActivityItem {
  id: string;
  label: string;
  /** Crop for records; undefined for MoMo. */
  crop?: FarmRecord['crop'];
  meta: string;
  date: string;
  createdAt: string;
  tone: Tone;
  amount: number | null; // null = activity, shown without an amount
}

const TONES: Record<Tone, { icon: LucideIcon; tile: string; text: string }> = {
  in: { icon: ArrowUpRight, tile: 'bg-accent/15 text-ink-green', text: 'text-ink-green' },
  out: { icon: ArrowDownLeft, tile: 'bg-danger/15 text-ink-red', text: 'text-ink-red' },
  activity: { icon: Sprout, tile: 'bg-info/15 text-ink-blue', text: '' },
};

/** "Today", "Yesterday", or "12 Oct 2026". */
function friendlyDate(iso: string): string {
  const date = parseISODate(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date);
}

function combine(records: FarmRecord[], momo: MomoTransaction[]): ActivityItem[] {
  const fromRecords = records.map<ActivityItem>((r) => ({
    id: r.id,
    label: r.description,
    crop: r.crop,
    meta: r.crop,
    date: r.date,
    createdAt: r.createdAt,
    tone: r.type === 'income' ? 'in' : r.type === 'expense' ? 'out' : 'activity',
    amount: r.type === 'activity' ? null : r.amount,
  }));
  const fromMomo = momo.map<ActivityItem>((t) => ({
    id: t.id,
    label: t.counterparty,
    meta: `MoMo${t.network ? ` · ${t.network}` : ''}`,
    date: t.date,
    createdAt: t.createdAt,
    tone: t.direction === 'in' ? 'in' : 'out',
    amount: t.amount,
  }));
  return [...fromRecords, ...fromMomo]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, MAX_ITEMS);
}

export function RecentActivity({ className }: { className?: string }) {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const items = combine(records, momo);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <Link
          href="/records"
          className="group text-ink-green -my-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold"
        >
          View all
          <ArrowRight
            size={14}
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </CardHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No activity yet"
          description="Your latest records and MoMo transactions will show up here."
        />
      ) : (
        <ul className="-mx-2 space-y-1">
          {items.map((item) => {
            const tone = TONES[item.tone];
            const Icon = tone.icon;
            return (
              <li
                key={item.id}
                className="hover:bg-glass flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                    tone.tile,
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-sm font-medium">{item.label}</p>
                  <p className="text-text-mute truncate text-xs">
                    {item.crop ? <CropLabel crop={item.crop} /> : item.meta} ·{' '}
                    {friendlyDate(item.date)}
                  </p>
                </div>
                {item.amount !== null && (
                  <span
                    className={cn('shrink-0 text-sm font-semibold whitespace-nowrap', tone.text)}
                  >
                    {item.tone === 'in' ? '+' : '−'}
                    {formatGHS(item.amount)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
