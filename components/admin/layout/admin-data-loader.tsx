'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AdminSessionGate } from '@/components/admin/auth/admin-session-gate';
import { AdminBrand } from '@/components/admin/layout/admin-brand';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

type LoadState = 'loading' | 'ready' | 'error';

/** Refresh the cached data (and sidebar badges) when the tab comes back, at most this often. */
const REFRESH_ON_FOCUS_MS = 30_000;
/** Several changes usually land together (a save touches more than one thing): sync once. */
const SETTLE_MS = 250;
const EVENTS_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? '/api/v1').replace(/\/$/, '')}/events`;

/**
 * The console's loader. AdminSessionGate first: session check, redirect when signed out, the
 * forced password change, and SessionTimeout. Then the admin data store loads before any page.
 * (The demo world is seeded by the API at startup, with SEED_DEMO_DATA=true.)
 */
export function AdminDataLoader({ children }: { children: ReactNode }) {
  return (
    <AdminSessionGate>
      <PlatformLoader>{children}</PlatformLoader>
    </AdminSessionGate>
  );
}

function PlatformLoader({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState('loading');
      await useAdminDataStore.getState().refresh();
      if (cancelled) return;
      setState(useAdminDataStore.getState().status === 'error' ? 'error' : 'ready');
    })().catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Another admin (or another tab) changed something (phase A15): the API says so over
  // Server-Sent Events. The data reloads now if this tab is visible, otherwise when it comes back.
  // The session is re-read too, so a sign-out, a role change or a disabled account applies here.
  useEffect(() => {
    let stale = false;
    let timer: number | undefined;
    const sync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        stale = false;
        void useAdminAuthStore
          .getState()
          .syncSession()
          .catch(() => {})
          .then(() => {
            if (useAdminAuthStore.getState().admin) void useAdminDataStore.getState().syncFromOtherTab();
          });
      }, SETTLE_MS);
    };
    const events = new EventSource(EVENTS_URL, { withCredentials: true });
    events.addEventListener('change', () => {
      stale = true;
      if (document.visibilityState === 'visible') sync();
    });

    function onFocus() {
      const { loadedAt, refresh } = useAdminDataStore.getState();
      if (stale) sync();
      else if (!loadedAt || Date.now() - Date.parse(loadedAt) > REFRESH_ON_FOCUS_MS) {
        void useAdminAuthStore.getState().syncSession().catch(() => {});
        void refresh();
      }
    }
    window.addEventListener('focus', onFocus);
    return () => {
      events.close();
      window.clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <AlertTriangle size={32} aria-hidden="true" className="text-ink-gold mx-auto mb-3" />
          <p className="text-text font-semibold">The console couldn&apos;t load its data</p>
          <p className="text-text-dim mt-1 text-sm">
            {useAdminDataStore.getState().error ?? 'Check your connection and try again.'}
          </p>
          <Button className="mt-5" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (state !== 'ready') {
    return (
      <div role="status" className="flex min-h-screen flex-col items-center justify-center gap-4">
        <AdminBrand />
        <p className="text-text-dim flex items-center gap-2 text-sm">
          <Loader2 size={16} aria-hidden="true" className="text-ink-purple animate-spin" />
          Loading the console…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
