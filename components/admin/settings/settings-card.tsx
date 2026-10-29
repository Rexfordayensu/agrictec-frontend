import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** One settings page's content card, with its title and a short explanation. */
export function SettingsCard({
  id,
  icon: Icon,
  title,
  description,
  danger = false,
  aside,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  danger?: boolean;
  /** Top-right of the header (a status pill or a main action). */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        'scroll-mt-24 rounded-2xl border',
        danger ? 'border-danger/50 bg-danger/5' : 'border-border bg-glass',
      )}
    >
      <header
        className={cn(
          'flex flex-wrap items-start justify-between gap-3 border-b px-5 py-4',
          danger ? 'border-danger/30' : 'border-border',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
              danger ? 'bg-danger/15 text-ink-red' : 'bg-purple/12 text-ink-purple',
            )}
          >
            <Icon size={19} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              id={`${id}-title`}
              className={cn('text-base font-semibold', danger ? 'text-ink-red' : 'text-text')}
            >
              {title}
            </h2>
            <p className="text-text-mute mt-0.5 text-xs leading-relaxed sm:text-sm">
              {description}
            </p>
          </div>
        </div>
        {aside}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

/** "Type RESET to confirm": an input that only enables the action on an exact match. */
export function TypeToConfirm({
  word,
  value,
  onChange,
  id,
}: {
  word: string;
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-text-dim mb-1.5 block text-sm">
        Type{' '}
        <code className="bg-glass-strong text-text rounded px-1.5 py-0.5 font-mono text-xs font-bold">
          {word}
        </code>{' '}
        to confirm
      </span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        className="border-border bg-bg-2 text-text focus:border-danger/70 min-h-11 w-full rounded-xl border px-3.5 font-mono text-sm outline-none"
      />
    </label>
  );
}
