'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, MailCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { farmerPasswordProblem } from '@/components/auth/auth-schemas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField, fieldHintId } from '@/components/ui/form-field';
import { IconTile } from '@/components/ui/icon-tile';
import { Input } from '@/components/ui/input';
import { FARMER_PASSWORD_MIN_LENGTH } from '@/services/auth.service';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/auth-store';

/** The API sends at most one code a minute. */
const RESEND_SECONDS = 60;

/**
 * Change password while signed in: a six-digit code is emailed to the account's email (POST
 * /me/password/code), proving the email is the farmer's; then the current password, the new one
 * twice and the code (POST /me/password). The API signs every other device out; this one stays
 * signed in. Not for the guest demo.
 */
export function ChangePasswordCard() {
  const session = useAuthStore((state) => state.session);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The countdown before a new code can be asked for.
  useEffect(() => {
    if (wait <= 0) return;
    const timer = window.setTimeout(() => setWait((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [wait]);

  if (!session || session.isGuest) return null;

  async function sendCode() {
    setSending(true);
    setError(null);
    try {
      const sent = await api<{ detail: string; sentTo: string }>('/me/password/code', {
        method: 'POST',
      });
      setSentTo(sent.sentTo);
      setCode('');
      setWait(RESEND_SECONDS);
      toast.success(sent.detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send a code');
    } finally {
      setSending(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const problem = !current
      ? 'Enter your current password.'
      : (farmerPasswordProblem(next) ??
        (next !== again
          ? 'The new passwords don’t match.'
          : next === current
            ? 'Choose a password different from your current one.'
            : !/^\d{6}$/.test(code.trim())
              ? 'Enter the 6-digit code from your email.'
              : null));
    setError(problem);
    if (problem) return;
    setSaving(true);
    try {
      await api('/me/password', {
        method: 'POST',
        body: { currentPassword: current, newPassword: next, code: code.trim() },
      });
      setCurrent('');
      setNext('');
      setAgain('');
      setCode('');
      setSentTo(null);
      setWait(0);
      toast.success('Password changed. Your other devices were signed out.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not change your password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card aria-labelledby="change-password-title" className="rounded-[21px]">
      <header className="account-card-heading">
        <IconTile icon={KeyRound} size="lg" />
        <div>
          <h3 id="change-password-title">Change password</h3>
          <p>
            For your security, we email you a code first. Your other phones and computers are signed
            out when you change it.
          </p>
        </div>
      </header>
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="mt-4 grid gap-4 md:grid-cols-3"
      >
        <FormField label="Current password" htmlFor="current-password">
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            disabled={saving}
          />
        </FormField>
        <FormField label="New password" htmlFor="new-password">
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder={`At least ${FARMER_PASSWORD_MIN_LENGTH} characters`}
            value={next}
            onChange={(event) => setNext(event.target.value)}
            disabled={saving}
          />
        </FormField>
        <FormField label="Repeat new password" htmlFor="repeat-password">
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            value={again}
            onChange={(event) => setAgain(event.target.value)}
            disabled={saving}
          />
        </FormField>

        <div className="border-border bg-glass rounded-2xl border p-4 md:col-span-3">
          {!sentTo ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-text-dim min-w-0 flex-1 text-sm">
                We&apos;ll email a 6-digit code to the email you sign in with.
              </p>
              <Button
                type="button"
                variant="ghost"
                icon={Send}
                loading={sending}
                mutates
                onClick={() => void sendCode()}
              >
                Email me a code
              </Button>
            </div>
          ) : (
            <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
              <FormField
                label="Code from your email"
                htmlFor="password-code"
                hint={`Sent to ${sentTo}. It expires in 15 minutes.`}
              >
                <Input
                  id="password-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  aria-describedby={fieldHintId('password-code')}
                  disabled={saving}
                />
              </FormField>
              <div className="flex flex-wrap items-center gap-2 pb-0.5">
                <MailCheck size={16} aria-hidden="true" className="text-ink-green" />
                <span className="text-text-dim text-sm">Didn&apos;t get it? Check spam, or</span>
                <button
                  type="button"
                  onClick={() => void sendCode()}
                  disabled={wait > 0 || sending}
                  className="text-ink-green text-sm font-semibold hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                >
                  {wait > 0 ? `send a new code in ${wait}s` : 'send a new code'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 md:col-span-3">
          <Button
            type="submit"
            icon={KeyRound}
            loading={saving}
            disabled={!sentTo || code.length !== 6}
            mutates
          >
            Change password
          </Button>
          {error && (
            <p role="alert" className="text-ink-red text-sm">
              {error}
            </p>
          )}
        </div>
      </form>
    </Card>
  );
}
