'use client';

import Link from 'next/link';
import { format, formatDistanceStrict } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import { targetTypeLabel } from '@/components/admin/audit-log/audit-filters';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { actionLabel, auditGroupOf, targetHref, type AuditGroup } from '@/lib/admin/audit-groups';
import { cn } from '@/lib/utils';
import type { AuditEntry } from '@/types/admin';

const GROUP_TONE: Record<AuditGroup, string> = {
  farmer: 'bg-accent/12 text-ink-green',
  loan: 'bg-gold/15 text-ink-gold',
  config: 'bg-purple/12 text-ink-purple',
  content: 'bg-info/12 text-ink-blue',
  team: 'bg-purple/12 text-ink-purple',
  system: 'bg-danger/12 text-ink-red',
  auth: 'bg-glass-strong text-text-dim',
};

function Target({ entry }: { entry: AuditEntry }) {
  const href = targetHref(entry);
  const label = targetTypeLabel(entry.targetType);
  if (!href) return <span className="text-text-dim">{label}</span>;
  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className="text-ink-purple inline-flex items-center gap-1 font-semibold hover:underline"
    >
      {label}
      <ArrowUpRight size={12} aria-hidden="true" />
    </Link>
  );
}

function ActionChip({ action }: { action: string }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        GROUP_TONE[auditGroupOf(action)],
      )}
    >
      <span className="truncate">{actionLabel(action)}</span>
    </span>
  );
}

/**
 * The log, newest first: when (exact and relative), who (with role), what, on what (linked), and
 * the summary. A row opens the full entry. Read-only: no edit or delete anywhere.
 */
export function AuditTable({
  entries,
  now,
  onOpen,
}: {
  entries: AuditEntry[];
  now: Date;
  onOpen: (entry: AuditEntry) => void;
}) {
  const time = (e: AuditEntry) => (
    <span className="block whitespace-nowrap">
      <span className="text-text block tabular-nums">
        {format(new Date(e.createdAt), 'd MMM, HH:mm:ss')}
      </span>
      <span className="text-text-mute block text-xs">
        {formatDistanceStrict(new Date(e.createdAt), now, { addSuffix: true })}
      </span>
    </span>
  );

  return (
    <div className="border-border bg-glass overflow-hidden rounded-2xl border">
      <table className="hidden w-full table-fixed text-left text-sm lg:table">
        <caption className="sr-only">
          Audit log entries, newest first. Select a row for details.
        </caption>
        <colgroup>
          <col className="w-36" />
          <col className="w-52" />
          <col className="w-48" />
          <col className="w-40" />
          <col />
        </colgroup>
        <thead className="border-border text-text-mute border-b text-[11px] tracking-wider uppercase">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">
              Time
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Actor
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Action
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Target
            </th>
            <th scope="col" className="px-3 py-3 font-semibold">
              Summary
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {entries.map((e) => (
            <tr
              key={e.id}
              tabIndex={0}
              onClick={() => onOpen(e)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(e);
                }
              }}
              aria-label={`${actionLabel(e.action)} by ${e.actorName}: open details`}
              className="hover:bg-glass focus-visible:bg-glass-strong cursor-pointer align-top outline-none"
            >
              <td className="px-5 py-3">{time(e)}</td>
              <td className="px-3 py-3">
                <span className="text-text block truncate font-semibold">{e.actorName}</span>
                <RoleBadge role={e.actorRole} className="mt-1" />
              </td>
              <td className="px-3 py-3">
                <ActionChip action={e.action} />
              </td>
              <td className="px-3 py-3">
                <Target entry={e} />
              </td>
              <td className="text-text-dim px-3 py-3">
                <span className="line-clamp-2">{e.summary}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul aria-label="Audit log entries" className="divide-border divide-y lg:hidden">
        {entries.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onOpen(e)}
              className="hover:bg-glass block w-full space-y-2 p-4 text-left"
            >
              <span className="flex items-start justify-between gap-3">
                <ActionChip action={e.action} />
                <span className="text-text-mute shrink-0 text-xs">
                  {formatDistanceStrict(new Date(e.createdAt), now, { addSuffix: true })}
                </span>
              </span>
              <span className="text-text block text-sm">{e.summary}</span>
              <span className="text-text-mute flex flex-wrap items-center gap-2 text-xs">
                {e.actorName}
                <RoleBadge role={e.actorRole} />
                <span>· {targetTypeLabel(e.targetType)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
