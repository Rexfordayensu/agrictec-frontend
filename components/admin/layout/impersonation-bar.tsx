'use client';

import { Eye, X } from 'lucide-react';
import { exitImpersonation } from '@/lib/admin/impersonation';
import { useAuthStore } from '@/store/auth-store';

/**
 * Shown in the farmer app while an admin views it as a farmer (phase A8): a gold bar at the very
 * top, plus a gold frame around the window so the read-only state stays obvious while scrolling.
 * The spec's 👁 is the Eye icon here: the app never renders emoji.
 */
export function ImpersonationBar() {
  const view = useAuthStore((s) => s.impersonation);
  if (!view) return null;

  return (
    <>
      <div
        role="status"
        className="bg-gold relative z-60 flex min-h-10 items-center justify-center gap-3 px-4 py-1.5 text-sm font-semibold text-[#3a2a05]"
      >
        <Eye size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate">Viewing as {view.farmerName} (read-only)</span>
        <button
          type="button"
          onClick={exitImpersonation}
          className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-black/10 px-2.5 text-xs font-bold transition-colors hover:bg-black/20"
        >
          <X size={14} aria-hidden="true" />
          Exit
        </button>
      </div>
      <div
        aria-hidden="true"
        className="ring-gold/70 pointer-events-none fixed inset-0 z-70 ring-4 ring-inset"
      />
    </>
  );
}
