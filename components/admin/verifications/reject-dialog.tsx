'use client';

import { useId, useRef, useState } from 'react';
import { Eye, X } from 'lucide-react';
import { toast } from 'sonner';
import { displayValue, REJECT_CLASS } from '@/components/admin/verifications/kind-meta';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { KIND_LABEL, REJECT_REASONS, type RejectReason } from '@/lib/admin/verification-queue';
import { cn } from '@/lib/utils';
import { rejectionMessage } from '@/lib/verification';
import { verificationsService } from '@/services/admin/verifications.service';
import type { VerificationRequest } from '@/types/admin';

/**
 * Reject a check with a reason from the list (and a note; required for "Other"). The farmer sees
 * "Rejected: <reason>. Please resubmit." on their profile and can submit again.
 * Keyboard: focus starts on the reasons; arrows choose, Enter rejects.
 */
export function RejectDialog({
  request,
  farmerName,
  onClose,
  onRejected,
}: {
  /** Null = closed. */
  request: VerificationRequest | null;
  farmerName: string;
  onClose: () => void;
  onRejected: (updated: VerificationRequest) => void;
}) {
  // Mounted per request, so the form always starts empty.
  if (!request) return null;
  return (
    <RejectForm
      key={request.id}
      request={request}
      farmerName={farmerName}
      onClose={onClose}
      onRejected={onRejected}
    />
  );
}

function RejectForm({
  request,
  farmerName,
  onClose,
  onRejected,
}: {
  request: VerificationRequest;
  farmerName: string;
  onClose: () => void;
  onRejected: (updated: VerificationRequest) => void;
}) {
  const id = useId();
  const firstReason = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState<RejectReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noteRequired = reason === 'Other';
  const ready = reason !== '' && (!noteRequired || note.trim().length >= 3);

  async function submit() {
    if (!reason) return setError('Choose a reason.');
    if (noteRequired && note.trim().length < 3) return setError('Add a note explaining "Other".');
    setError(null);
    setBusy(true);
    try {
      const updated = await verificationsService.reject(request.id, reason, note);
      toast.success(`${KIND_LABEL[request.kind]} rejected for ${farmerName}`);
      onRejected(updated);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reject');
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reject ${KIND_LABEL[request.kind]} check`}
      description={`${farmerName} · ${displayValue(request)}`}
      size="md"
      dirty={!busy && (reason !== '' || note.trim() !== '')}
      initialFocus={firstReason}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={id}
            icon={X}
            loading={busy}
            disabled={!ready}
            className={REJECT_CLASS}
          >
            Reject
          </Button>
        </>
      }
    >
      <form
        id={id}
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        onKeyDown={(event) => {
          // Enter on a chosen reason rejects straight away (radios don't submit on their own).
          const target = event.target;
          if (
            event.key === 'Enter' &&
            target instanceof HTMLInputElement &&
            target.type === 'radio' &&
            ready
          ) {
            event.preventDefault();
            event.currentTarget.requestSubmit();
          }
        }}
      >
        <fieldset>
          <legend className="text-text-dim mb-2 text-xs font-semibold">Reason</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {REJECT_REASONS.map((option, index) => (
              <label
                key={option}
                className={cn(
                  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 text-sm transition-colors',
                  reason === option
                    ? 'border-danger/60 bg-danger/10 text-text'
                    : 'border-border text-text-dim hover:bg-glass-strong',
                  // "Other" spans the row when it sits alone.
                  index === REJECT_REASONS.length - 1 && 'sm:col-span-2',
                )}
              >
                <input
                  ref={index === 0 ? firstReason : undefined}
                  type="radio"
                  name={`${id}-reason`}
                  value={option}
                  checked={reason === option}
                  onChange={() => setReason(option)}
                  className="size-4 shrink-0 accent-[#ef4444]"
                />
                {option}
              </label>
            ))}
          </div>
        </fieldset>

        <FormField
          label={noteRequired ? 'Note to the farmer (required)' : 'Note to the farmer (optional)'}
          htmlFor={`${id}-note`}
        >
          <Textarea
            id={`${id}-note`}
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. The photo is blurred. Take it in good light and try again."
          />
        </FormField>

        <div className="border-border bg-bg-2/60 rounded-xl border px-3.5 py-3">
          <p className="text-text-mute mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <Eye size={13} aria-hidden="true" /> The farmer will see
          </p>
          <p className={cn('text-sm', reason ? 'text-text' : 'text-text-mute')}>
            {reason
              ? rejectionMessage({ reason, note })
              : 'Choose a reason to preview the message.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-ink-red text-sm">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}
