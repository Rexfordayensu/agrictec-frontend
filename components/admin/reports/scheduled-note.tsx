import { CalendarClock } from 'lucide-react';

/** Scheduled reports by email need a server; this console runs in the browser. */
export function ScheduledNote() {
  return (
    <aside className="border-border bg-glass flex items-start gap-4 rounded-2xl border border-dashed p-5">
      <span className="bg-info/12 text-ink-blue inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
        <CalendarClock size={19} aria-hidden="true" />
      </span>
      <div>
        <p className="text-text text-sm font-semibold">Scheduled email reports</p>
        <p className="text-text-dim mt-0.5 text-sm">
          Scheduled email reports need a backend. Coming soon. Until then, download any report above
          whenever you need it.
        </p>
      </div>
    </aside>
  );
}
