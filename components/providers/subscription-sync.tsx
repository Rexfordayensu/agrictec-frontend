'use client';

import { useEffect } from 'react';
import { useSubscriptionStore } from '@/store/subscription-store';

/** Keep expiry and monthly allowances current even when a farmer leaves a page open. */
export function SubscriptionSync() {
  const userId = useSubscriptionStore((s) => s.userId);
  const status = useSubscriptionStore((s) => s.status);
  const expiresAt = useSubscriptionStore((s) => s.snapshot?.subscription.expiresAt);
  const resetsAt = useSubscriptionStore((s) => s.snapshot?.resetsAt);
  useEffect(() => {
    if (!userId || status !== 'ready') return;
    const refresh = () => {
      if (useSubscriptionStore.getState().userId === userId)
        useSubscriptionStore.getState().refresh();
    };
    const next = Math.min(
      ...[expiresAt, resetsAt].filter(Boolean).map((value) => Date.parse(value!)),
    );
    const timeout = setTimeout(
      refresh,
      Math.min(Math.max(100, next - Date.now() + 100), 2_147_483_647),
    );
    const interval = setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [userId, status, expiresAt, resetsAt]);
  return null;
}
