'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowUpRight, Lock } from 'lucide-react';
import { targetTypeLabel } from '@/components/admin/audit-log/audit-filters';
import { RoleBadge } from '@/components/admin/layout/role-badge';
import { JsonDiff } from '@/components/admin/shared/json-diff';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { AUDIT_GROUPS, actionLabel, auditGroupOf, targetHref } from '@/lib/admin/audit-groups';
import type { AuditEntry } from '@/types/admin';

/**
 * One audit entry in a centred modal (never a drawer): every field and the before → after
 * diff. Read-only: there is no way to change or delete an entry.
 */
export function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditEntry | null;
  onClose: () => void;
}) {
  if (!entry) return null;
  const href = targetHref(entry);
  const group = AUDIT_GROUPS.find((g) => g.id === auditGroupOf(entry.action));
  const hasDiff = entry.before !== undefined || entry.after !== undefined;
  const fields: [string, React.ReactNode][] = [
    ['When', format(new Date(entry.createdAt), "EEEE d MMMM yyyy 'at' HH:mm:ss")],
    [
      'Who',
      <span key="who" className="inline-flex flex-wrap items-center gap-2">
        {entry.actorName}
        <RoleBadge role={entry.actorRole} />
      </span>,
    ],
    [
      'Action',
      <code key="action" className="font-mono text-xs">
        {entry.action}
      </code>,
    ],
    ['Group', group?.label ?? '—'],
    ['Target', targetTypeLabel(entry.targetType)],
    [
      'Target ID',
      entry.targetId ? (
        href ? (
          <Link
            key="target"
            href={href}
            className="text-ink-purple inline-flex items-center gap-1 font-mono text-xs hover:underline"
          >
            {entry.targetId}
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        ) : (
          <code key="target" className="font-mono text-xs">
            {entry.targetId}
          </code>
        )
      ) : (
        '—'
      ),
    ],
    [
      'Entry ID',
      <code key="id" className="text-text-mute font-mono text-xs">
        {entry.id}
      </code>,
    ],
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={actionLabel(entry.action)}
      description={entry.summary}
      footer={
        <>
          <p className="text-text-mute mr-auto hidden items-center gap-1.5 text-xs sm:flex">
            <Lock size={13} aria-hidden="true" />
            Entries can’t be edited or deleted.
          </p>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <dl className="border-border divide-border divide-y rounded-2xl border">
          {fields.map(([term, detail]) => (
            <div
              key={term}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm"
            >
              <dt className="text-text-mute">{term}</dt>
              <dd className="text-text min-w-0 break-words">{detail}</dd>
            </div>
          ))}
        </dl>
        <section>
          <h3 className="text-text-mute mb-2 text-[11px] font-semibold tracking-wider uppercase">
            Before → after
          </h3>
          {hasDiff ? (
            <JsonDiff before={entry.before} after={entry.after} />
          ) : (
            <p className="border-border text-text-mute rounded-xl border border-dashed p-4 text-sm">
              Nothing was changed by this action (for example a sign-in or an export).
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
