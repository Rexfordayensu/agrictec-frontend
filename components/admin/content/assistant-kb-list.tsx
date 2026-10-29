'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  GripVertical,
  Lock,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { byPriority, duplicateKeywords, isFallback } from '@/lib/admin/assistant-kb';
import { cn } from '@/lib/utils';
import type { AssistantKnowledgeItem } from '@/types/admin';

const MAX_CHIPS = 4;

const iconButton =
  'text-text-mute hover:text-text hover:bg-glass-strong inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30';

/**
 * The replies in matching order (the first matching keyword wins). Drag a row, or use its up and
 * down buttons, to change the order; the fallback stays last and can't be deleted.
 */
export function AssistantKbList({
  items,
  busy,
  onMove,
  onToggle,
  onEdit,
  onDelete,
}: {
  items: AssistantKnowledgeItem[];
  busy: boolean;
  onMove: (from: number, to: number) => void;
  onToggle: (item: AssistantKnowledgeItem) => void;
  onEdit: (item: AssistantKnowledgeItem) => void;
  onDelete: (item: AssistantKnowledgeItem) => void;
}) {
  const ordered = byPriority(items);
  const lastMovable = ordered.filter((i) => !isFallback(i)).length - 1;
  const duplicates = duplicateKeywords(items);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {duplicates.length > 0 && (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 flex gap-3 rounded-2xl border px-4 py-3 text-sm"
        >
          <AlertTriangle size={18} aria-hidden="true" className="text-ink-gold mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-text font-semibold">
              {duplicates.length} keyword{duplicates.length === 1 ? ' is' : 's are'} used by two
              active replies
            </p>
            <ul className="text-text-dim mt-1 space-y-0.5 text-xs">
              {duplicates.slice(0, 5).map((d) => (
                <li key={d.keyword}>
                  <span className="text-ink-gold font-mono font-semibold">“{d.keyword}”</span> in{' '}
                  {d.titles.join(' and ')}. Only the higher one ever answers.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <ol
        aria-label="Assistant replies, in matching order"
        className="border-border bg-glass divide-border divide-y overflow-hidden rounded-2xl border"
      >
        {ordered.map((item, index) => {
          const fallback = isFallback(item);
          const extra = item.keywords.length - MAX_CHIPS;
          return (
            <li
              key={item.id}
              draggable={!fallback && !busy}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.id);
                setDragFrom(index);
              }}
              onDragOver={(event) => {
                if (dragFrom === null || fallback) return;
                event.preventDefault();
                setDragOver(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragFrom !== null && !fallback && dragFrom !== index) onMove(dragFrom, index);
                setDragFrom(null);
                setDragOver(null);
              }}
              onDragEnd={() => {
                setDragFrom(null);
                setDragOver(null);
              }}
              className={cn(
                'flex flex-wrap items-center gap-3 px-3 py-3 transition-colors sm:flex-nowrap sm:px-4',
                fallback && 'bg-bg-2/40',
                dragFrom === index && 'opacity-50',
                dragOver === index && dragFrom !== index && 'bg-purple/10',
                !item.active && !fallback && 'opacity-60',
              )}
            >
              <span className="flex shrink-0 items-center gap-1">
                {fallback ? (
                  <span
                    className="text-text-mute inline-flex size-6 items-center justify-center"
                    title="Always last"
                  >
                    <Lock size={14} aria-hidden="true" />
                  </span>
                ) : (
                  <GripVertical
                    size={16}
                    aria-hidden="true"
                    className="text-text-mute/70 cursor-grab active:cursor-grabbing"
                  />
                )}
                <span className="text-text-mute w-6 text-right text-xs font-semibold tabular-nums">
                  {fallback ? '—' : index + 1}
                </span>
              </span>

              <div className="min-w-0 flex-1 basis-56">
                <p className="text-text truncate text-sm font-semibold">
                  {item.reply.title}
                  {fallback && (
                    <span className="bg-glass-strong text-text-dim ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                      Fallback
                    </span>
                  )}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {fallback ? (
                    <span className="text-text-mute text-xs">Used when no keyword matches</span>
                  ) : (
                    <>
                      {item.keywords.slice(0, MAX_CHIPS).map((k) => (
                        <span
                          key={k}
                          className="bg-purple/12 text-ink-purple rounded-md px-1.5 py-0.5 font-mono text-[11px]"
                        >
                          {k}
                        </span>
                      ))}
                      {extra > 0 && (
                        <span className="text-text-mute px-1 text-[11px]">+{extra} more</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                {!fallback && (
                  <>
                    <button
                      type="button"
                      className={iconButton}
                      disabled={busy || index === 0}
                      onClick={() => onMove(index, index - 1)}
                      aria-label={`Move “${item.reply.title}” up`}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      disabled={busy || index >= lastMovable}
                      onClick={() => onMove(index, index + 1)}
                      aria-label={`Move “${item.reply.title}” down`}
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                    <Switch
                      checked={item.active}
                      disabled={busy}
                      onChange={() => onToggle(item)}
                      label={`“${item.reply.title}” active`}
                      className="mx-1"
                    />
                  </>
                )}
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => onEdit(item)}
                  aria-label={`Edit “${item.reply.title}”`}
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
                {!fallback && (
                  <button
                    type="button"
                    className={cn(iconButton, 'hover:text-ink-red')}
                    disabled={busy}
                    onClick={() => onDelete(item)}
                    aria-label={`Delete “${item.reply.title}”`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
