'use client';

import { useState } from 'react';
import { IdCard, ShieldCheck, X } from 'lucide-react';
import { GhanaCardModal } from '@/components/profile/ghana-card-modal';
import { Button } from '@/components/ui/button';
import { useGhanaCardStatus } from '@/hooks/use-ghana-card';
import { isReadOnly } from '@/lib/read-only';
import { storage, userKey } from '@/services/storage';
import { useProfileStore } from '@/store/profile-store';

const dismissedKey = (userId: string) => userKey(userId, 'ghana-card-prompt-dismissed');

/**
 * Dashboard nudge while no Ghana Card has been provided: loans need one. Dismissible (remembered
 * per farmer); it never shows once a card is pending, verified or rejected.
 */
export function GhanaCardPrompt() {
  const status = useGhanaCardStatus();
  const userId = useProfileStore((s) => s.userId);
  const [dismissed, setDismissed] = useState(() =>
    userId ? storage.get<boolean>(dismissedKey(userId), false) : false,
  );
  const [open, setOpen] = useState(false);
  if (status !== 'not_provided' || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    // An admin viewing as this farmer must not change their settings.
    if (userId && !isReadOnly()) storage.set(dismissedKey(userId), true);
  }

  return (
    <section
      aria-labelledby="card-prompt-title"
      className="border-gold/35 bg-gold/8 relative flex flex-col gap-4 rounded-3xl border p-5 pr-14 sm:flex-row sm:items-center"
    >
      <span className="bg-gold/20 text-ink-gold inline-flex size-11 shrink-0 items-center justify-center rounded-2xl">
        <IdCard size={21} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="card-prompt-title" className="text-text text-base font-bold">
          Add your Ghana Card to unlock loans
        </h2>
        <p className="text-text-dim mt-0.5 text-sm">
          Everything else works without it, but lenders need a verified Ghana Card before you can
          apply.
        </p>
      </div>
      <Button icon={ShieldCheck} mutates onClick={() => setOpen(true)} className="shrink-0">
        Add Ghana Card
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss: add your Ghana Card later"
        className="text-text-mute hover:text-text hover:bg-glass-strong absolute top-3 right-3 inline-flex size-11 items-center justify-center rounded-xl transition-colors"
      >
        <X size={17} aria-hidden="true" />
      </button>
      <GhanaCardModal open={open} onClose={() => setOpen(false)} />
    </section>
  );
}
