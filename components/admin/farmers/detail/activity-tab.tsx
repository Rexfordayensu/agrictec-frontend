'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ScrollText } from 'lucide-react';
import { timeAgo } from '@/components/admin/overview/recent-admin-activity';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { JsonDiff } from '@/components/admin/shared/json-diff';
import { Pagination } from '@/components/admin/shared/pagination';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { auditService } from '@/services/admin/audit.service';
import type { AuditEntry, Paged } from '@/types/admin';

const PAGE_SIZE = 20;

/** Every audit entry about this farmer, newest first, with before → after for changes. */
export function ActivityTab({ farmerId, version }: { farmerId: string; version: number }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paged<AuditEntry> | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    auditService
      .list({ targetId: farmerId }, page, PAGE_SIZE)
      .then((r) => active && setResult(r))
      .catch(
        () =>
          active && setResult({ items: [], total: 0, page: 1, pageSize: PAGE_SIZE, pageCount: 1 }),
      );
    return () => {
      active = false;
    };
  }, [farmerId, page, version]);

  if (!result) {
    return (
      <div className="space-y-2" role="status" aria-label="Loading activity">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (result.total === 0) return <EmptyState icon={ScrollText} title="No admin activity yet" />;

  return (
    <div className="space-y-4">
      <ol className="divide-border border-border bg-glass divide-y rounded-2xl border">
        {result.items.map((entry) => {
          const hasDiff = entry.before !== undefined || entry.after !== undefined;
          const expanded = open === entry.id;
          return (
            <li key={entry.id} className="p-3.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-text text-sm font-semibold">{entry.actorName}</span>
                <RoleBadge role={entry.actorRole} />
                <span className="text-text-dim min-w-0 flex-1 basis-60 text-sm">
                  {entry.summary}
                </span>
                <time
                  dateTime={entry.createdAt}
                  title={new Date(entry.createdAt).toLocaleString()}
                  className="text-text-mute text-xs"
                >
                  {timeAgo(entry.createdAt)}
                </time>
                {hasDiff && (
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : entry.id)}
                    aria-expanded={expanded}
                    className="text-ink-purple inline-flex min-h-8 items-center gap-1 text-xs font-semibold"
                  >
                    Details
                    <ChevronDown
                      size={13}
                      aria-hidden="true"
                      className={cn('transition-transform', expanded && 'rotate-180')}
                    />
                  </button>
                )}
              </div>
              {expanded && <JsonDiff before={entry.before} after={entry.after} className="mt-3" />}
            </li>
          );
        })}
      </ol>
      <Pagination
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        pageSize={PAGE_SIZE}
        onPage={setPage}
      />
    </div>
  );
}
