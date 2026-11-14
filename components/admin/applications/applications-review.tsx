'use client';

import { adminPath } from '@/lib/admin-path';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, History } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LogoLoader } from '@/components/ui/logo-loader';
import { formatGhanaDate } from '@/lib/format';
import { APPLICATION_STATUS } from '@/lib/loans/application-status';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import {
  adminApplicationsService,
  type ApplicationGroup,
} from '@/services/admin/applications.service';
import type { ApplicationSummary } from '@/types/applications';

const GROUPS: { key: ApplicationGroup; label: string; hint: string }[] = [
  {
    key: 'to_review',
    label: 'To review',
    hint: 'Submitted by farmers: check them against their records.',
  },
  {
    key: 'ready_to_send',
    label: 'Ready to send',
    hint: 'Approved by AgriCtec, not yet with the lender.',
  },
  {
    key: 'with_lender',
    label: 'With the lender',
    hint: 'Sent. Record the lender’s progress only with its confirmation.',
  },
  { key: 'returned', label: 'Returned to farmer', hint: 'AgriCtec asked the farmer for changes.' },
  { key: 'closed', label: 'Closed', hint: 'Decided by the lender, or withdrawn by the farmer.' },
];

const money = (value: string) =>
  `GHS ${Number(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The console's application queue: farmers' submitted applications by stage. Drafts stay with
 * the farmer. AgriCtec never approves a loan here: it checks, sends and records the lender's word.
 */
export function ApplicationsReview() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const group = (GROUPS.find((g) => g.key === params.get('group'))?.key ??
    'to_review') as ApplicationGroup;
  const [rows, setRows] = useState<{ group: ApplicationGroup; list: ApplicationSummary[] } | null>(
    null,
  );
  const [counts, setCounts] = useState<{
    needsAttention: number;
    withLender: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    adminApplicationsService.list(group).then(
      (list) => {
        if (!active) return;
        setRows({ group, list });
        setError(null);
      },
      (cause: unknown) =>
        active && setError(cause instanceof Error ? cause.message : 'Could not load'),
    );
    adminApplicationsService.counts().then(
      (c) => active && setCounts(c),
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [group, syncVersion]);

  const current = GROUPS.find((g) => g.key === group)!;
  const list = rows?.group === group ? rows.list : null;

  return (
    <div className="space-y-4">
      {counts && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Needs AgriCtec" value={counts.needsAttention} />
          <Stat label="With lenders" value={counts.withLender} />
          <Stat label="Submitted in total" value={counts.total} />
        </div>
      )}

      <div role="tablist" aria-label="Application stage" className="flex flex-wrap gap-2">
        {GROUPS.map((g) => (
          <button
            key={g.key}
            type="button"
            role="tab"
            aria-selected={g.key === group}
            onClick={() => router.replace(`${pathname}?group=${g.key}`, { scroll: false })}
            className={cn(
              'rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors',
              g.key === group
                ? 'border-accent bg-accent/10 text-text'
                : 'border-border text-text-dim hover:text-text',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
      <p className="text-text-mute text-xs">{current.hint}</p>

      <section className="border-border bg-glass rounded-2xl border">
        {error ? (
          <p role="alert" className="text-ink-red p-5 text-sm">
            {error}
          </p>
        ) : list === null ? (
          <LogoLoader center label="Loading applications" className="min-h-40" />
        ) : list.length === 0 ? (
          <p className="text-text-dim p-5 text-sm">Nothing here.</p>
        ) : (
          <ul className="divide-border divide-y">
            {list.map((app) => (
              <li key={app.id}>
                <Link
                  href={adminPath(`/admin/applications/${app.id}`)}
                  className="hover:bg-glass flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0">
                    <span className="text-text block text-sm font-semibold">
                      {app.farmer ?? 'Farmer'} · {app.productName} ({app.lenderName})
                    </span>
                    <span className="text-text-mute block text-xs">
                      {app.reference} · {money(app.amount)} over {app.months} months
                      {app.submittedAt && ` · submitted ${formatGhanaDate(app.submittedAt)}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge color={APPLICATION_STATUS[app.status].color}>{app.statusLabel}</Badge>
                    <ArrowRight size={15} aria-hidden="true" className="text-text-mute" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link
        href={adminPath('/admin/loans')}
        className="text-text-dim hover:text-text inline-flex items-center gap-1.5 text-sm"
      >
        <History size={14} aria-hidden="true" /> Earlier applications (read-only history)
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border bg-glass rounded-2xl border p-4">
      <p className="text-text-mute text-xs">{label}</p>
      <p className="text-text text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
