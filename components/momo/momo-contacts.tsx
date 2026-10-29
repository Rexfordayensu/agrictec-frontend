'use client';

import { Users } from 'lucide-react';
import { topCounterparties } from '@/components/momo/momo-filters';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { formatGHS } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';

const AVATAR_TONES = [
  'bg-accent/15 text-ink-green',
  'bg-info/15 text-ink-blue',
  'bg-purple/15 text-ink-purple',
  'bg-gold/15 text-ink-gold',
  'bg-danger/15 text-ink-red',
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

/** Who money moves with most: received vs sent per person, largest total first. */
export function MomoContacts() {
  const momo = useFarmStore((s) => s.momo);
  const contacts = topCounterparties(momo, 5);
  const largest = Math.max(1, ...contacts.map((c) => c.received + c.sent));

  return (
    <Card className="h-full rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users size={17} aria-hidden="true" className="text-ink-blue" />
            Top contacts
          </CardTitle>
          <CardSub>Who you trade with most</CardSub>
        </div>
      </CardHeader>
      {contacts.length === 0 ? (
        <p className="text-text-mute py-8 text-center text-sm">
          Your buyers and suppliers will appear here once you log transactions.
        </p>
      ) : (
        <ul className="space-y-4">
          {contacts.map((c, i) => {
            const total = c.received + c.sent;
            return (
              <li key={c.name} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}
                >
                  {initials(c.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-text truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-text shrink-0 text-sm font-bold tabular-nums">
                      {formatGHS(total)}
                    </p>
                  </div>
                  {/* Bar length = share of the largest contact; green = received, red = sent */}
                  <div
                    aria-hidden="true"
                    className="bg-glass-strong mt-1.5 flex h-1.5 overflow-hidden rounded-full"
                    style={{ width: `${Math.max(8, (total / largest) * 100)}%` }}
                  >
                    <span
                      className="bg-[#10b981]"
                      style={{ width: `${(c.received / total) * 100}%` }}
                    />
                    <span
                      className="bg-[#ef4444]"
                      style={{ width: `${(c.sent / total) * 100}%` }}
                    />
                  </div>
                  <p className="text-text-mute mt-1 text-[11px]">
                    {c.count} transaction{c.count === 1 ? '' : 's'}
                    {c.received > 0 && <> · in {formatGHS(c.received)}</>}
                    {c.sent > 0 && <> · out {formatGHS(c.sent)}</>}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
