'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { FormAlert } from '@/components/auth/form-alert';
import { formatCountdown, GHANA_TIME_ZONE } from '@/lib/format';
import { ApiError } from '@/services/api';

/**
 * When a sign-in lock ends, from the API's 423 "locked" error (five wrong passwords from one
 * address lock that email there for five minutes). Null for any other error.
 */
export function lockedUntil(error: unknown): string | null {
  const until = error instanceof ApiError && error.code === 'locked' ? error.data.until : null;
  return typeof until === 'string' && !Number.isNaN(Date.parse(until)) ? until : null;
}

/** "2:36 pm" in Ghana time, rounded up to the minute so it is never too early. */
export function signInAgainAt(until: string): string {
  const minute = 60_000;
  const at = new Date(Math.ceil(Date.parse(until) / minute) * minute);
  return at.toLocaleTimeString('en-GH', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: GHANA_TIME_ZONE,
  });
}

/** Milliseconds left on the lock, ticking every second; null once it ends (onEnd is called). */
export function useSignInLock(until: string | null, onEnd: () => void): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    const timer = setInterval(() => {
      setNow(Date.now());
      if (Date.parse(until) <= Date.now()) onEnd();
    }, 1000);
    return () => clearInterval(timer);
  }, [until, onEnd]);
  if (!until) return null;
  const left = Date.parse(until) - now;
  return left > 0 ? left : null;
}

/** "Too many attempts. You can sign in again at 2:36 pm (in 4:59)." */
export function SignInLockAlert({ until, remaining }: { until: string; remaining: number }) {
  return (
    <FormAlert icon={ShieldAlert}>
      Too many attempts. You can sign in again at{' '}
      <span className="font-semibold">{signInAgainAt(until)}</span>{' '}
      <span className="tabular-nums">(in {formatCountdown(remaining)})</span>.
    </FormAlert>
  );
}
