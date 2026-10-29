'use client';

import { useState } from 'react';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { farmersService } from '@/services/admin/farmers.service';
import type { FarmerAccount } from '@/types/admin';

export const SUSPEND_REASONS = [
  'Suspected fraud',
  'Duplicate account',
  'Requested by farmer',
  'Policy violation',
  'Other',
] as const;

const nameOf = (f: FarmerAccount) => f.profile.name || f.email;

/**
 * Suspends one farmer or many. Always lists who is affected; each farmer gets their own audit
 * entry. Farmers already suspended are skipped.
 */
export function SuspendDialog({
  farmers,
  onClose,
  onDone,
}: {
  /** Empty = closed. */
  farmers: FarmerAccount[];
  onClose: () => void;
  onDone: () => void;
}) {
  // Re-mounted per opening, so the form always starts empty.
  if (farmers.length === 0) return null;
  return (
    <SuspendForm
      key={farmers.map((f) => f.userId).join()}
      farmers={farmers}
      onClose={onClose}
      onDone={onDone}
    />
  );
}

function SuspendForm({
  farmers,
  onClose,
  onDone,
}: {
  farmers: FarmerAccount[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [notify, setNotify] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const targets = farmers.filter((f) => f.status !== 'suspended');
  const skipped = farmers.length - targets.length;

  async function submit() {
    if (!reason) return setError('Choose a reason.');
    if (note.trim().length < 3) return setError('Add a short note for the record.');
    setError(null);
    setBusy(true);
    let done = 0;
    const failed: string[] = [];
    for (const farmer of targets) {
      try {
        await farmersService.suspend(farmer.userId, `${reason}: ${note.trim()}`);
        done++;
      } catch (cause) {
        failed.push(`${nameOf(farmer)} (${cause instanceof Error ? cause.message : 'failed'})`);
      }
    }
    setBusy(false);
    if (done) {
      toast.success(done === 1 ? `${nameOf(targets[0])} suspended` : `${done} farmers suspended`);
      if (notify) toast.info('Farmers notified (demo: no message is sent)');
    }
    if (failed.length) toast.error(`Not suspended: ${failed.join(', ')}`);
    onDone();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={farmers.length > 1 ? `Suspend ${farmers.length} farmers` : 'Suspend farmer'}
      dirty={!busy && (reason !== '' || note.trim() !== '')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon={Ban}
            loading={busy}
            disabled={targets.length === 0}
            onClick={() => void submit()}
          >
            {targets.length > 1 ? `Suspend ${targets.length} farmers` : 'Suspend'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="border-danger/40 bg-danger/10 text-ink-red rounded-xl border px-3.5 py-3 text-sm">
          They will be signed out and blocked from logging in.
        </p>

        <div>
          <p className="text-text-dim mb-2 text-xs font-semibold">
            {targets.length === 1 ? 'Farmer' : `These ${targets.length} farmers`}
          </p>
          <ul className="border-border max-h-40 overflow-y-auto rounded-xl border px-3 py-2 text-sm">
            {targets.map((f) => (
              <li key={f.userId} className="text-text py-0.5">
                {nameOf(f)} <span className="text-text-mute">· {f.email}</span>
              </li>
            ))}
          </ul>
          {skipped > 0 && (
            <p className="text-text-mute mt-1.5 text-xs">
              {skipped} already suspended {skipped === 1 ? 'farmer is' : 'farmers are'} skipped.
            </p>
          )}
        </div>

        <FormField label="Reason" htmlFor="suspend-reason">
          <Select id="suspend-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="">Choose a reason…</option>
            {SUSPEND_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Note (required)" htmlFor="suspend-note">
          <Textarea
            id="suspend-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What happened, and what the farmer must do to be reactivated."
          />
        </FormField>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            className="size-4 accent-[#a855f7]"
          />
          <span className="text-text">Notify farmer</span>
          <span className="text-text-mute text-xs">(demo: no message is sent)</span>
        </label>

        {error && (
          <p role="alert" className="text-ink-red text-sm">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
