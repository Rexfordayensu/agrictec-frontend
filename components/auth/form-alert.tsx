import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Red inline error shown above an auth form (in addition to any field errors). */
export function FormAlert({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="border-danger/40 bg-danger/10 text-ink-red flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm"
    >
      <Icon size={18} aria-hidden="true" className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}

/** "──── or ────" separator between the form and the guest option. */
export function AuthDivider() {
  return (
    <div className="text-text-mute flex items-center gap-3 text-xs uppercase" aria-hidden="true">
      <span className="bg-border h-px flex-1" />
      or
      <span className="bg-border h-px flex-1" />
    </div>
  );
}
