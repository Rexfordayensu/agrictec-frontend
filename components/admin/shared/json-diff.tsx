'use client';

import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DiffKind = 'added' | 'removed' | 'changed' | 'same';

export interface DiffEntry {
  /** Dotted path, e.g. "weights.verification" or "tags.1". */
  key: string;
  kind: DiffKind;
  before?: string;
  after?: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Flattens nested objects and arrays to dotted keys with display values. */
function flatten(
  value: unknown,
  prefix = '',
  out = new Map<string, string>(),
): Map<string, string> {
  if (isPlainObject(value) && Object.keys(value).length > 0) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else if (prefix || value !== undefined) {
    out.set(prefix || '(value)', value === undefined ? '' : JSON.stringify(value));
  }
  return out;
}

/** Key-by-key comparison of two values (audit before/after). Changed keys first. */
export function diffEntries(before: unknown, after: unknown): DiffEntry[] {
  const a = flatten(before);
  const b = flatten(after);
  const keys = [...new Set([...a.keys(), ...b.keys()])];
  const order: Record<DiffKind, number> = { changed: 0, removed: 1, added: 2, same: 3 };
  return keys
    .map((key): DiffEntry => {
      const left = a.get(key);
      const right = b.get(key);
      if (left === undefined) return { key, kind: 'added', after: right };
      if (right === undefined) return { key, kind: 'removed', before: left };
      return { key, kind: left === right ? 'same' : 'changed', before: left, after: right };
    })
    .sort((x, y) => order[x.kind] - order[y.kind] || x.key.localeCompare(y.key));
}

/** Before → after, with changes highlighted (red removed, green added). Unchanged keys fold away. */
export function JsonDiff({
  before,
  after,
  className,
}: {
  before: unknown;
  after: unknown;
  className?: string;
}) {
  const [showSame, setShowSame] = useState(false);
  const entries = diffEntries(before, after);
  const changed = entries.filter((e) => e.kind !== 'same');
  const same = entries.filter((e) => e.kind === 'same');
  const shown = showSame ? entries : changed;

  if (entries.length === 0) {
    return <p className={cn('text-text-mute text-sm', className)}>No details recorded.</p>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <dl className="border-border divide-border divide-y overflow-hidden rounded-xl border font-mono text-xs">
        {shown.map((entry) => (
          <div key={entry.key} className="grid gap-1 px-3 py-2 sm:grid-cols-[minmax(0,10rem)_1fr]">
            <dt className="text-text-mute truncate" title={entry.key}>
              {entry.key}
            </dt>
            <dd className="flex min-w-0 flex-wrap items-center gap-1.5 break-all">
              {entry.before !== undefined && entry.kind !== 'same' && (
                <span className="bg-danger/10 text-ink-red rounded px-1.5 py-0.5 line-through decoration-1">
                  <span className="sr-only">Before: </span>
                  {entry.before}
                </span>
              )}
              {entry.kind === 'changed' && (
                <ArrowRight size={12} aria-hidden="true" className="text-text-mute shrink-0" />
              )}
              {entry.after !== undefined && entry.kind !== 'same' && (
                <span className="bg-accent/10 text-ink-green rounded px-1.5 py-0.5">
                  <span className="sr-only">After: </span>
                  {entry.after}
                </span>
              )}
              {entry.kind === 'same' && <span className="text-text-dim">{entry.after}</span>}
            </dd>
          </div>
        ))}
        {shown.length === 0 && (
          <p className="text-text-mute px-3 py-2 font-sans">No values changed.</p>
        )}
      </dl>
      {same.length > 0 && (
        <button
          type="button"
          onClick={() => setShowSame((value) => !value)}
          aria-expanded={showSame}
          className="text-ink-purple text-xs font-semibold"
        >
          {showSame ? 'Hide' : 'Show'} {same.length} unchanged
        </button>
      )}
    </div>
  );
}
