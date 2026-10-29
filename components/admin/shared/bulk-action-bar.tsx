import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/** Sticky bar shown while rows are selected: "3 selected", the actions, and Clear. */
export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  /** Action buttons; each should still check permissions in its service call. */
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div
      role="region"
      aria-label="Bulk actions"
      className="animate-fade-in border-purple/40 bg-bg-2/95 shadow-glass sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-2xl border px-3 py-2 backdrop-blur-xl"
    >
      <p className="text-text px-1 text-sm font-semibold" aria-live="polite">
        {count} selected
      </p>
      <span aria-hidden="true" className="bg-border h-6 w-px" />
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <button
        type="button"
        onClick={onClear}
        className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold transition-colors"
      >
        <X size={14} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}
