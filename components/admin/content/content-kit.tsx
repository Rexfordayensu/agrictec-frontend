'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, History, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentMeta } from '@/types/admin';

/** "Last updated by Efua Asantewaa on 22 Oct 2026, 09:14" (or "Built-in content"). */
export function LastUpdated({ meta, className }: { meta?: ContentMeta; className?: string }) {
  return (
    <p className={cn('text-text-mute flex items-start gap-1.5 text-xs', className)}>
      <History size={13} aria-hidden="true" className="mt-px shrink-0" />
      {/* One text node, so it wraps as a sentence (not as separate flex items). */}
      <span>
        {meta ? (
          <>
            Last updated by <span className="text-text-dim font-semibold">{meta.by}</span> on{' '}
            {format(new Date(meta.at), 'd MMM yyyy, HH:mm')}
          </>
        ) : (
          'Built-in content: not edited yet'
        )}
      </span>
    </p>
  );
}

const iconButton =
  'text-text-mute hover:text-text hover:bg-glass-strong inline-flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30';

/**
 * An editable list of short texts (tips, bullets): type in each row, add, remove, and move
 * rows up or down. Empty rows are kept while editing; callers drop them when saving.
 */
export function ListEditor({
  label,
  items,
  onChange,
  max = 8,
  min = 0,
  placeholder,
  addLabel = 'Add',
  multiline = false,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  max?: number;
  min?: number;
  placeholder?: string;
  addLabel?: string;
  multiline?: boolean;
}) {
  const id = useId();
  const set = (index: number, value: string) =>
    onChange(items.map((item, i) => (i === index ? value : item)));
  const move = (index: number, by: -1 | 1) => {
    const next = [...items];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onChange(next);
  };

  return (
    <fieldset className="min-w-0">
      <legend className="text-text-dim mb-1.5 flex w-full items-center justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="text-text-mute font-normal tabular-nums">
          {items.length}/{max}
        </span>
      </legend>
      <ol className="space-y-2">
        {items.map((item, index) => {
          const field = `${id}-${index}`;
          const common = {
            id: field,
            value: item,
            placeholder,
            'aria-label': `${label} ${index + 1}`,
            className:
              'text-text min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-text-mute',
          };
          return (
            <li
              key={index}
              className="border-border bg-bg-2 focus-within:border-purple/70 flex items-start gap-1 rounded-xl border pr-1"
            >
              <span
                aria-hidden="true"
                className="text-text-mute w-6 shrink-0 pt-2 text-right text-xs tabular-nums"
              >
                {index + 1}.
              </span>
              {multiline ? (
                <textarea
                  rows={2}
                  {...common}
                  // Grows with its text, so a long tip is never cut off on a phone.
                  className={cn(common.className, 'field-sizing-content min-h-16 resize-none')}
                  onChange={(e) => set(index, e.target.value)}
                />
              ) : (
                <input {...common} onChange={(e) => set(index, e.target.value)} />
              )}
              <div className="flex shrink-0 items-center pt-0.5">
                <button
                  type="button"
                  className={iconButton}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} up`}
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Move ${label.toLowerCase()} ${index + 1} down`}
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn(iconButton, 'hover:text-ink-red')}
                  disabled={items.length <= min}
                  onClick={() => onChange(items.filter((_, i) => i !== index))}
                  aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        disabled={items.length >= max}
        onClick={() => onChange([...items, ''])}
        className="text-ink-purple mt-2 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
      >
        <Plus size={14} aria-hidden="true" />
        {addLabel}
      </button>
    </fieldset>
  );
}

/**
 * Keywords as chips: type and press Enter or comma to add (lower-cased, no duplicates),
 * Backspace on an empty field removes the last one.
 */
export function ChipInput({
  label,
  values,
  onChange,
  placeholder,
  error,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const keyword = raw.trim().toLowerCase().replace(/\s+/g, ' ');
    if (keyword && !values.includes(keyword)) onChange([...values, keyword]);
    setDraft('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      commit(draft);
    } else if (event.key === 'Backspace' && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-text-dim mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      <div
        className={cn(
          'bg-bg-2 focus-within:border-purple/70 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border px-2 py-1.5',
          error ? 'border-danger' : 'border-border',
        )}
      >
        {values.map((value) => (
          <span
            key={value}
            className="bg-purple/15 text-ink-purple inline-flex items-center gap-1 rounded-lg py-0.5 pr-1 pl-2 text-xs font-semibold"
          >
            {value}
            <button
              type="button"
              onClick={() => onChange(values.filter((v) => v !== value))}
              aria-label={`Remove keyword ${value}`}
              className="hover:bg-purple/20 inline-flex size-5 items-center justify-center rounded"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={values.length ? '' : placeholder}
          aria-describedby={hint ? `${id}-hint` : undefined}
          aria-invalid={error ? true : undefined}
          className="text-text placeholder:text-text-mute min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none"
        />
      </div>
      {error ? (
        <p role="alert" className="text-ink-red mt-1.5 text-xs">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-text-mute mt-1.5 text-xs">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
