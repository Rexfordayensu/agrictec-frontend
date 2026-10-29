'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import {
  ADMIN_IDLE_MS,
  ADMIN_IDLE_WARNING_MS,
  lastActivityOf,
  readAdminSession,
} from '@/lib/admin/admin-session';
import { formatCountdown } from '@/lib/format';
import { TOUCH_THROTTLE_MS, useAdminAuthStore } from '@/store/admin/admin-auth-store';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel'] as const;

/**
 * Signs an idle admin out: a warning with a countdown 2 minutes before the 30-minute timeout,
 * then sign-out and /admin-login?reason=timeout. Activity in any open console tab counts: each
 * tab reports it to the API, and this one asks the API before warning or signing out. Mount once
 * inside the signed-in console.
 */
export function SessionTimeout() {
  const router = useRouter();
  const touch = useAdminAuthStore((s) => s.touch);
  const signOut = useAdminAuthStore((s) => s.signOut);
  const syncSession = useAdminAuthStore((s) => s.syncSession);
  const localActivity = useAdminAuthStore((s) => s.lastActivityAt) ?? 0;
  const [now, setNow] = useState(() => Date.now());
  // Re-read every tick (not during render): another tab may have signed out or been active.
  const [stored, setStored] = useState(readAdminSession);
  const lastTouch = useRef(0);
  const ending = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      setStored(readAdminSession());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // The newest activity from this tab or any other (the stored session is shared by tabs).
  const lastActivity = stored ? Math.max(localActivity, lastActivityOf(stored)) : 0;
  const remaining = ADMIN_IDLE_MS - (now - lastActivity);
  const warning = stored !== null && remaining > 0 && remaining <= ADMIN_IDLE_WARNING_MS;
  const signedOutElsewhere = stored === null;

  // Activity resets the clock, throttled to once every 30 seconds. While the warning is open,
  // only its buttons count: a stray mouse move shouldn't silently dismiss a security prompt.
  useEffect(() => {
    if (warning) return;
    function onActivity() {
      const time = Date.now();
      if (time - lastTouch.current < TOUCH_THROTTLE_MS) return;
      lastTouch.current = time;
      touch();
    }
    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, onActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, onActivity));
  }, [warning, touch]);

  useEffect(() => {
    if (ending.current) return;
    if (signedOutElsewhere) {
      ending.current = true;
      router.replace('/admin-login?reason=signed-out');
    } else if (remaining <= 0) {
      ending.current = true;
      // Another console tab may have been active: ask the API before signing out.
      void syncSession()
        .catch(() => {})
        .then(() => {
          const fresh = readAdminSession();
          if (fresh && ADMIN_IDLE_MS - (Date.now() - lastActivityOf(fresh)) > 0) {
            ending.current = false;
            setStored(fresh);
            return;
          }
          return signOut('timeout').finally(() => router.replace('/admin-login?reason=timeout'));
        });
    }
  }, [signedOutElsewhere, remaining, signOut, syncSession, router]);

  // When the warning opens, check whether another tab kept the session alive.
  useEffect(() => {
    if (warning) void syncSession().catch(() => {});
  }, [warning, syncSession]);

  /** Saved at once (not throttled), so every other tab sees it too. */
  function staySignedIn() {
    lastTouch.current = Date.now();
    touch(true);
  }

  async function signOutNow() {
    ending.current = true;
    await signOut('manual');
    router.replace('/admin-login?reason=signed-out');
  }

  return (
    <Modal
      open={warning}
      onClose={staySignedIn}
      title="Are you still there?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" icon={LogOut} onClick={() => void signOutNow()}>
            Sign out
          </Button>
          <Button onClick={staySignedIn}>Stay signed in</Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span className="bg-gold/15 text-ink-gold inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Clock size={20} aria-hidden="true" />
        </span>
        <p className="text-text text-sm">
          You&apos;ll be signed out in{' '}
          <strong className="tabular-nums">{formatCountdown(remaining)}</strong> for security.
        </p>
      </div>
    </Modal>
  );
}
