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
function PhoneVerification({ onClose }: { onClose: () => void }) {
  const phone = useProfileStore((state) => state.profile?.phone ?? '');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!sentTo || sentTo !== phone)
          return setError('Send a code to your current saved number first.');
        if (code !== '123456') return setError('Incorrect code. Please try again.');
        setSaving(true);
        try {
          // Verified by the API, which also records the approved check for the admin.
          await useProfileStore.getState().verifyPhone(sentTo);
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
        disabled={!ghanaPhone.test(phone) || saving}
        onClick={() => {
          setSentTo(phone);
          setCode('');
          setError('');
          toast.info('Demo code: 123456');
        }}
      >
        Send code
      </Button>
      <div>
        <label htmlFor="phone-code" className="text-text-dim text-xs font-semibold">
          Verification code
        </label>
        <Input
          id="phone-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
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
      <p className="text-text-mute text-xs">Demo verification only. No SMS is sent.</p>
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
