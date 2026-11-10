'use client';

import { useState } from 'react';
import { Check, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ghanaPhone } from '@/lib/profile';
import { useProfileStore } from '@/store/profile-store';

export function PhoneVerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} title="Verify phone number" onClose={onClose}>
      <PhoneVerification onClose={onClose} />
    </Modal>
  );
}

/**
 * A six-digit code is texted to the saved number; the API checks the code (the browser never
 * knows it), so a phone is verified only by someone who can read its messages.
 */
function PhoneVerification({ onClose }: { onClose: () => void }) {
  const phone = useProfileStore((state) => state.profile?.phone ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sentLabel, setSentLabel] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  async function sendCode() {
    if (sending) return;
    setSending(true);
    setError('');
    setCode('');
    try {
      const { sentTo: masked, expiresInMinutes } = await useProfileStore.getState().sendPhoneCode();
      setSentTo(phone);
      setSentLabel(`Code sent to ${masked}. It expires in ${expiresInMinutes} minutes.`);
      toast.success('Verification code sent by SMS');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send the code');
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!sentTo || sentTo !== phone)
          return setError('Send a code to your current saved number first.');
        if (!/^\d{6}$/.test(code)) return setError('Enter the six-digit code from the SMS.');
        setSaving(true);
        try {
          // The API checks the code and records the approved check for the admin.
          await useProfileStore.getState().verifyPhone(sentTo, code);
          toast.success('Phone verified');
          onClose();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not verify your phone');
        } finally {
          setSaving(false);
        }
      }}
    >
      <p className="text-text-dim text-sm">
        {phone && ghanaPhone.test(phone)
          ? `Verify your saved number: ${phone}`
          : 'Add and save a valid phone number in Personal information first.'}
      </p>
      <Button
        variant="ghost"
        icon={Send}
        mutates
        loading={sending}
        disabled={!ghanaPhone.test(phone) || saving}
        onClick={() => void sendCode()}
      >
        {sentTo ? 'Send a new code' : 'Send code'}
      </Button>
      {sentLabel && <p className="text-text-mute text-xs">{sentLabel}</p>}
      <div>
        <label htmlFor="phone-code" className="text-text-dim text-xs font-semibold">
          Verification code
        </label>
        <Input
          id="phone-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
          value={code}
          onChange={(event) => {
            setCode(event.target.value.replace(/\D/g, ''));
            setError('');
          }}
          disabled={!sentTo || saving}
          error={Boolean(error)}
          aria-describedby={error ? 'phone-code-error' : undefined}
          className="mt-2 tracking-[0.3em]"
        />
        {error && (
          <p id="phone-code-error" role="alert" className="text-ink-red mt-2 text-xs">
            {error}
          </p>
        )}
      </div>
      <Button
        type="submit"
        icon={Check}
        mutates
        loading={saving}
        disabled={!sentTo || code.length !== 6}
        className="w-full"
      >
        Verify phone
      </Button>
    </form>
  );
}
