'use client';

import { useState } from 'react';
import { LockKeyhole, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatGhanaCard, ghanaCard } from '@/lib/profile';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

/** Add or resubmit a Ghana Card (Profile → Verification, and "Verify now" on /loans). */
export function GhanaCardModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Verify Ghana Card" onClose={onClose}>
      <GhanaCardForm onClose={onClose} />
    </Modal>
  );
}

function GhanaCardForm({ onClose }: { onClose: () => void }) {
  const [number, setNumber] = useState('');
  const [owner, setOwner] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!ghanaCard.test(number))
          return setError('Enter a valid Ghana Card number, e.g. GHA-123456789-0');
        if (!owner) return setError('Confirm that this Ghana Card belongs to you.');
        setSaving(true);
        try {
          // Sent for admin review; only a masked number and a hash are stored. The profile shows
          // "Pending review" until an admin approves it.
          await usePlatformStore.getState().submitGhanaCard(number);
          const userId = useProfileStore.getState().userId;
          if (userId) await useProfileStore.getState().load(userId);
          setNumber('');
          toast.success('Ghana Card sent for review');
          onClose();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not verify your Ghana Card');
        } finally {
          setSaving(false);
        }
      }}
    >
      <div>
        <label htmlFor="ghana-card-number" className="text-text-dim text-xs font-semibold">
          Ghana Card number
        </label>
        <Input
          id="ghana-card-number"
          autoComplete="off"
          spellCheck={false}
          placeholder="GHA-123456789-0"
          maxLength={15}
          value={number}
          onChange={(event) => {
            setNumber(formatGhanaCard(event.target.value));
            setError('');
          }}
          disabled={saving}
          error={Boolean(error)}
          aria-describedby={error ? 'ghana-card-error' : 'ghana-card-privacy'}
          className="mt-2 uppercase"
        />
      </div>
      <label className="border-border flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm">
        <input
          type="checkbox"
          checked={owner}
          onChange={(event) => {
            setOwner(event.target.checked);
            setError('');
          }}
          className="accent-accent mt-0.5 size-4.5 shrink-0"
        />
        <span className="text-text">I confirm this Ghana Card belongs to me.</span>
      </label>
      {error && (
        <p id="ghana-card-error" role="alert" className="text-ink-red text-xs">
          {error}
        </p>
      )}
      <p
        id="ghana-card-privacy"
        className="text-text-mute flex items-start gap-2 text-xs leading-relaxed"
      >
        <LockKeyhole size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
        Your full card number is never stored: only a masked version and a one-way fingerprint for
        duplicate checks. Our team reviews each card, usually within one working day.
      </p>
      <p className="bg-gold/10 text-ink-gold rounded-xl p-3 text-xs">
        Demo only. No real NIA verification is performed.
      </p>
      <Button mutates type="submit" icon={Send} loading={saving} className="w-full">
        Submit for review
      </Button>
    </form>
  );
}
