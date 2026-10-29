'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ScrollText } from 'lucide-react';
import { Panel, PanelLink } from '@/components/admin/overview/panel';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useCan } from '@/hooks/admin/use-can';
import { ROLE_LABELS } from '@/lib/admin/permissions';
import { auditService } from '@/services/admin/audit.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { AuditEntry } from '@/types/admin';

/** "2 min ago", "3 hours ago". */
export const timeAgo = (iso: string) =>
  formatDistanceToNowStrict(new Date(iso), { addSuffix: true })
    .replace(/ minutes?/, ' min')
    .replace(/ seconds?/, ' sec');

const LIMIT = 6;

/** The latest audit entries (who, what, when). Only rendered for roles with audit.view. */
export function RecentAdminActivity({ className }: { className?: string }) {
  const canView = useCan('audit.view');
  // Reload when the admin data refreshes, so new actions appear.
  const loadedAt = useAdminDataStore((s) => s.loadedAt);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    if (!canView) return;
    let active = true;
    auditService
      .list({}, 1, LIMIT)
      .then((page) => active && setEntries(page.items))
      .catch(() => active && setEntries([]));
    return () => {
      active = false;
    };
  }, [canView, loadedAt]);

  if (!canView) return null;

  return (
    <Panel
      title="Recent activity"
      description="Latest actions in the audit log"
      action={<PanelLink href="/admin/audit-log">Audit log</PanelLink>}
      className={className}
    >
      {entries === null ? (
        <div className="space-y-3" role="status" aria-label="Loading recent activity">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No admin activity yet" />
      ) : (
        <ol className="relative space-y-4">
          {/* The timeline's spine, behind the avatars. */}
          <span aria-hidden="true" className="bg-border absolute top-2 bottom-2 left-4 w-px" />
          {entries.map((entry) => (
            <li key={entry.id} className="relative flex gap-3">
              <InitialsAvatar
                name={entry.actorName}
                size="sm"
                className="ring-bg-1 relative ring-4"
              />
              <div className="min-w-0 flex-1">
                <p className="text-text line-clamp-2 text-sm leading-snug">{entry.summary}</p>
                <p className="text-text-mute mt-0.5 text-xs">
                  {entry.actorName} · {ROLE_LABELS[entry.actorRole]} ·{' '}
                  <time
                    dateTime={entry.createdAt}
                    title={new Date(entry.createdAt).toLocaleString()}
                  >
                    {timeAgo(entry.createdAt)}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
