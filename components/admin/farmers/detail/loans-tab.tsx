'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardList } from 'lucide-react';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { StatusBadge } from '@/components/admin/shared/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatGHS } from '@/lib/format';

/** This farmer's loan applications, newest first, each linking to its page. */
export function LoansTab({ data }: TabProps) {
  const apps = [...data.applications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const lenderName = (id: string) => data.lenders.find((l) => l.id === id)?.name ?? id;

  if (apps.length === 0) {
    return <EmptyState icon={ClipboardList} title="No loan applications yet" />;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {apps.map((app) => (
        <li key={app.id}>
          <Link
            href={`/admin/loans/${app.id}`}
            className="group border-border bg-glass hover:border-purple/50 block rounded-2xl border p-4 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-text font-mono text-sm font-bold">{app.reference}</p>
                <p className="text-text-mute text-xs">
                  {lenderName(app.partnerId)} · {app.purpose}
                </p>
              </div>
              <StatusBadge kind="loan" status={app.status} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-text-mute">Amount</dt>
                <dd className="text-text font-semibold tabular-nums">{formatGHS(app.amount)}</dd>
              </div>
              <div>
                <dt className="text-text-mute">Term</dt>
                <dd className="text-text font-semibold">{app.months} months</dd>
              </div>
              <div>
                <dt className="text-text-mute">Score then</dt>
                <dd className="text-text font-semibold tabular-nums">{app.scoreAtApplication}</dd>
              </div>
            </dl>
            <p className="text-text-mute mt-3 flex items-center justify-between text-xs">
              Applied {formatDate(new Date(app.createdAt))}
              <span className="text-ink-purple inline-flex items-center gap-1 font-semibold">
                Open
                <ArrowRight
                  size={13}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
