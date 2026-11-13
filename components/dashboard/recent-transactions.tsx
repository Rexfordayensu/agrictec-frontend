'use client';

import Link from 'next/link';
import { ArrowRight, History } from 'lucide-react';
import { dashPanel, PanelHeading } from '@/components/dashboard/dashboard-ui';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { formatDate, parseISODate } from '@/lib/format';
import {
  categoryLabel,
  SOURCE_LABELS,
  STATUS_COLORS,
  TRANSACTION_STATUSES,
  type VerificationStatus,
} from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import type { FarmRecord, MomoTransaction } from '@/types';

interface Row {
  id: string;
  date: string;
  createdAt: string;
  title: string;
  sub: string;
  network: string | null;
  type: { label: string; color: BadgeColor };
  /** null: an activity with no money. */
  amount: number | null;
  status: VerificationStatus;
}

const NETWORK_TONE: Record<string, string> = {
  MTN: 'bg-[#ffcc00] text-[#3a2c00]',
  Telecel: 'bg-[#e60000] text-white',
  AirtelTigo: 'bg-[#0050a0] text-white',
};

const source = (t: { sourceType?: keyof typeof SOURCE_LABELS }) =>
  SOURCE_LABELS[t.sourceType ?? 'farmer_entry'];

/** The farmer's saved farm records and MoMo entries (from the API), newest first. */
export function toRows(records: FarmRecord[], momo: MomoTransaction[], limit: number): Row[] {
  const fromRecords = records.map<Row>((r) => ({
    id: `r-${r.id}`,
    date: r.date,
    createdAt: r.createdAt,
    title: r.description,
    sub: `${r.category ? categoryLabel(r.category) : r.crop} / ${source(r)}`,
    network: null,
    type:
      r.type === 'income'
        ? { label: 'Income', color: 'green' }
        : r.type === 'expense'
          ? { label: 'Expense', color: 'red' }
          : { label: 'Activity', color: 'blue' },
    amount: r.type === 'activity' ? null : r.amount,
    status: r.verificationStatus ?? 'self_reported',
  }));
  const fromMomo = momo.map<Row>((t) => ({
    id: `m-${t.id}`,
    date: t.date,
    createdAt: t.createdAt,
    title: t.counterparty,
    sub: `${t.category ? categoryLabel(t.category) : 'Mobile Money'} / ${source(t)}`,
    network: t.network ?? null,
    type:
      t.direction === 'in'
        ? { label: 'Received', color: 'green' }
        : { label: 'Sent', color: 'red' },
    amount: t.amount,
    status: t.verificationStatus ?? 'self_reported',
  }));
  return [...fromRecords, ...fromMomo]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/** "9 Nov" this year, "9 Nov 2025" otherwise. */
const shortDate = (iso: string) => {
  const date = parseISODate(iso);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const statusLabel = (status: VerificationStatus) =>
  status === 'verified' ? 'Verified' : TRANSACTION_STATUSES[status];

const money = (n: number) =>
  n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function RecentTransactions({ limit = 5 }: { limit?: number }) {
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const rows = toRows(records, momo, limit);

  return (
    <section aria-labelledby="recent-title" className={cn(dashPanel, '@container')}>
      <PanelHeading
        id="recent-title"
        title="Recent Transactions"
        sub="Your latest Mobile Money and farm-related transactions."
        aside={
          <Link
            href="/records?view=all"
            className="border-border text-ink-green hover:bg-glass-strong inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
          >
            View all <ArrowRight size={13} aria-hidden="true" />
          </Link>
        }
      />
      {rows.length === 0 ? (
        <div className="text-text-dim flex flex-col items-center gap-2 py-8 text-center text-sm">
          <History size={24} aria-hidden="true" className="text-text-mute" />
          No entries yet. Your farm records and MoMo transactions will appear here.
        </div>
      ) : (
        <>
          {/* A wide card: a table. */}
          <div className="-mx-4 hidden overflow-x-auto sm:-mx-5 @xl:block">
            <table className="text-small w-full">
              <thead>
                <tr className="bg-glass-strong text-text-dim text-left text-xs">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-1.5 py-2.5 font-semibold">Description</th>
                  <th className="px-1.5 py-2.5 font-semibold">Network</th>
                  <th className="px-1.5 py-2.5 font-semibold">Type</th>
                  <th className="px-1.5 py-2.5 text-right font-semibold whitespace-nowrap">
                    Amount (GHS)
                  </th>
                  <th className="px-4 py-2.5 font-semibold">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="text-text-dim px-4 py-3 whitespace-nowrap">
                      {shortDate(row.date)}
                    </td>
                    <td className="max-w-48 px-1.5 py-3">
                      <span className="text-text block truncate font-semibold">{row.title}</span>
                      <span className="text-text-mute block truncate text-xs">{row.sub}</span>
                    </td>
                    <td className="px-1.5 py-3">
                      {row.network ? (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-bold',
                            NETWORK_TONE[row.network] ?? 'bg-glass-strong text-text',
                          )}
                        >
                          {row.network}
                        </span>
                      ) : (
                        <span className="text-text-mute text-xs">Farm</span>
                      )}
                    </td>
                    <td className="px-1.5 py-3">
                      <Badge color={row.type.color}>{row.type.label}</Badge>
                    </td>
                    <td className="text-text px-1.5 py-3 text-right font-semibold tabular-nums">
                      {row.amount === null ? '—' : money(row.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[row.status]}>{statusLabel(row.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* A narrow card: a compact list. */}
          <ul className="divide-border divide-y @xl:hidden">
            {rows.map((row) => (
              <li key={row.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-text truncate text-sm font-semibold">{row.title}</p>
                  <p className="text-text-mute truncate text-xs">
                    {formatDate(parseISODate(row.date))}
                    {row.network ? ` · ${row.network}` : ''} · {row.type.label}
                  </p>
                  <span className="mt-1 inline-block">
                    <Badge color={STATUS_COLORS[row.status]}>{statusLabel(row.status)}</Badge>
                  </span>
                </div>
                <span
                  className={cn(
                    'shrink-0 text-sm font-semibold tabular-nums',
                    row.type.color === 'green'
                      ? 'text-ink-green'
                      : row.type.color === 'red'
                        ? 'text-ink-red'
                        : 'text-text',
                  )}
                >
                  {row.amount === null ? '—' : `GHS ${money(row.amount)}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
