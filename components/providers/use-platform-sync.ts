'use client';

import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { loansService } from '@/services/loans.service';
import {
  refreshUserStores,
  resetAllStores,
  signOutAndReset,
  useAuthStore,
  usePlatformStore,
} from '@/store';
import { useLoanStore } from '@/store/loan-store';

const EVENTS_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '')}/events`;
/** Several changes usually land together (a save touches more than one thing): sync once. */
const SETTLE_MS = 250;
/** A tab that was away this long reloads the farmer's own data when it comes back. */
const STALE_AFTER_MS = 60_000;

/** Swaps in the farmer's applications without a loading state (no skeleton flash). */
async function refreshApplications(userId: string) {
  const applications = await loansService.listApplications(userId);
  const store = useLoanStore.getState();
  if (store.userId === userId && store.status === 'ready') useLoanStore.setState({ applications });
}

interface Pending {
  /** The admin changed something farmers see (flags, rules, lenders, content, announcements). */
  platform: boolean;
  /** An admin acted on this farmer: a suspension, a verification, a loan decision… */
  account: boolean;
  /** Back after a while: this farmer may have changed their data on another device. */
  own: boolean;
}

const nothing = (): Pending => ({ platform: false, account: false, own: false });

/**
 * Keeps an open farmer tab in step with the server (phase A15), over Server-Sent Events from
 * GET /api/v1/events. A visible tab syncs at once, a hidden one when it comes back. The stores
 * reload in place (no skeleton). A suspension or a deletion sends the tab to the login page.
 */
export function usePlatformSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    let pending = nothing();
    let timer: number | undefined;
    let hiddenSince: number | null = null;

    async function sync() {
      const changes = pending;
      pending = nothing();
      const { session, impersonation } = useAuthStore.getState();
      const userId = session?.userId;
      if (!userId) return;

      // The admin's read-only view has no farmer session of its own; only its data can change.
      if ((changes.account || changes.own) && !impersonation) {
        const { session: stored, expired } = await authService.sessionState();
        if (expired) {
          // Unused for too long: the API ended the session.
          resetAllStores();
          window.location.replace('/login?reason=expired');
          return;
        }
        if (!stored || stored.userId !== userId) {
          const status = await authService.accountStatus(userId).catch(() => 'deleted' as const);
          if (status === 'suspended' || status === 'deleted') {
            await signOutAndReset().catch(() => resetAllStores());
            window.location.replace(`/login?reason=${status}`);
          } else {
            resetAllStores();
            window.location.replace('/login');
          }
          return;
        }
      }
      const work: Promise<unknown>[] = [];
      if (changes.platform) work.push(usePlatformStore.getState().refresh());
      if (changes.account || changes.own) work.push(refreshUserStores(userId));
      else if (changes.platform) work.push(refreshApplications(userId));
      await Promise.all(work);
    }

    function schedule() {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void sync().catch(() => {}), SETTLE_MS);
    }

    const hasPending = () => Object.values(pending).some(Boolean);

    const events = new EventSource(EVENTS_URL, { withCredentials: true });
    events.addEventListener('change', (event) => {
      try {
        const { topic } = JSON.parse((event as MessageEvent<string>).data) as { topic: string };
        if (topic === 'account') pending.account = true;
        else pending.platform = true;
      } catch {
        return;
      }
      if (document.visibilityState === 'visible') schedule();
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenSince = Date.now();
        return;
      }
      if (hiddenSince !== null && Date.now() - hiddenSince > STALE_AFTER_MS) pending.own = true;
      hiddenSince = null;
      if (hasPending()) schedule();
    };
    const onFocus = () => {
      if (hasPending()) schedule();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      events.close();
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
