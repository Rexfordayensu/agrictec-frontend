'use client';

import { Pencil, type LucideIcon } from 'lucide-react';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';

/** A profile card's heading: icon, title, a short line, and an Edit button. */
export function CardHead({
  id,
  icon: Icon,
  title,
  sub,
  onEdit,
  editLabel = 'Edit',
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  sub: string;
  onEdit?: () => void;
  editLabel?: string;
}) {
  const readOnly = useReadOnly();
  return (
    <div className="flex items-start gap-3">
      <span className="bg-accent/12 text-ink-green inline-flex size-12 shrink-0 items-center justify-center rounded-2xl">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={id} className="text-text text-xl font-bold">
          {title}
        </h2>
        <p className="text-text-dim text-sm">{sub}</p>
      </div>
      {onEdit && (
        <button
          type="button"
          {...readOnlyProps(readOnly)}
          onClick={readOnly ? undefined : onEdit}
          className={cn(
            'bg-accent/10 text-ink-green hover:bg-accent/15 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold',
            readOnly && READ_ONLY_CLASS,
          )}
        >
          <Pencil size={14} aria-hidden="true" /> {editLabel}
        </button>
      )}
    </div>
  );
}
