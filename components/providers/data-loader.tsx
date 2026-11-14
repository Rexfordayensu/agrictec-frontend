'use client';

import { consoleReturn } from '@/lib/admin/console-return';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { usePlatformSync } from '@/components/providers/use-platform-sync';
import { MaintenanceScreen } from '@/components/shared/maintenance-screen';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LogoLoader } from '@/components/ui/logo-loader';
import {
  activeImpersonation,
  claimImpersonation,
  endImpersonation,
  impersonatedSession,
} from '@/lib/admin/impersonation';
import { ApiError, isSignedOut } from '@/services/api';
import { authService } from '@/services/auth.service';
import { onboardingService } from '@/services/onboarding.service';
import { useDemoReminder } from '@/components/providers/use-demo-reminder';
import { currentDemo, endDemo } from '@/lib/demo';
import { onOtherTabAuthChange } from '@/lib/tab-sync';
import {
  forgetOtherAccount,
  loadAllStores,
  loadDemoStores,
  resetAllStores,
  signOutAndReset,
  useAuthStore,
  usePlatformStore,
} from '@/store';

type LoadState = 'loading' | 'ready' | 'error' | 'maintenance';

/** What hydrate() decided: render the app, show maintenance, or leave for the login page. */
type HydrateResult = 'ready' | 'maintenance' | { redirect: string };

/**
 * Hydrates the stores BEFORE rendering the app: first the admin's flags (maintenance mode), then
 * auth and the account's status, then every data store.
 * (The old app loaded data before auth had finished, which caused a race condition.)
 */
export function DataLoader({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [errorMessage, setErrorMessage] = useState('Check your connection and try again.');
  const maintenanceMessage = usePlatformStore((s) => s.flags.maintenanceMessage);
  // Admin changes made in another tab (lenders, rates, loan decisions…) show up here at once.
  usePlatformSync(state === 'ready');
  // A guest demo lasts one day: an open tab ends it on time.
  useDemoDayEnd(state === 'ready');
  // And every 10 minutes it reminds the guest what a free account adds.
  useDemoReminder(state === 'ready');
  // Another tab signed in, signed out or opened the guest demo: start again in the right place.
  useOtherTabAuthChange(state === 'ready');

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function hydrate(): Promise<HydrateResult> {
      // Maintenance mode replaces the whole app for farmers (admins use /admin, unaffected).
      const flags = await usePlatformStore.getState().loadFlags();
      if (flags.maintenanceMode) return 'maintenance';

      // An admin's "View as farmer" (phase A8): the farmer's data, read-only (the API refuses
      // every write from this tab's view).
      const url = new URL(window.location.href);
      const token = url.searchParams.get('impersonate');
      if (token) {
        const claimed = await claimImpersonation(token);
        url.searchParams.delete('impersonate');
        window.history.replaceState(null, '', url.pathname + url.search);
        if (!claimed) return { redirect: consoleReturn('/farmers?impersonation=expired') };
      }
      const view = activeImpersonation();
      if (view) {
        useAuthStore.setState({
          session: impersonatedSession(view),
          status: 'ready',
          impersonation: view,
        });
        forgetOtherAccount(view.farmerId);
        try {
          await loadAllStores(view.farmerId);
        } catch (error) {
          // The admin signed out, lost the permission, or the view ended.
          if (!isSignedOut(error)) throw error;
          await endImpersonation();
          return { redirect: consoleReturn('/farmers?impersonation=expired') };
        }
        return 'ready';
      }

      const session = await useAuthStore.getState().init();
      if (!session) {
        const next = encodeURIComponent(window.location.pathname);
        // Unused for a week, or a guest demo past its day: say so on the sign-in page.
        const { sessionExpired, demoEnded } = useAuthStore.getState();
        const reason = demoEnded ? 'reason=demo_ended&' : sessionExpired ? 'reason=expired&' : '';
        return { redirect: `/login?${reason}next=${next}` };
      }
      // The guest demo: no account to check and no farm data, only the public information.
      if (session.isGuest) {
        forgetOtherAccount(session.userId);
        await loadDemoStores();
        return 'ready';
      }
      // An admin may have suspended or deleted the account since this session started.
      const status = await authService.checkAccount(session.userId);
      if (status === 'suspended' || status === 'deleted') {
        await signOutAndReset();
        return { redirect: `/login?reason=${status}` };
      }
      // The proxy's cookie is only a hint: the profile decides. No app page until the farm
      // setup is finished (it resumes on the step where the farmer stopped).
      // A guest who signed in or created an account starts from that account's own data.
      forgetOtherAccount(session.userId);
      if (!(await onboardingService.isComplete(session.userId))) return { redirect: '/onboarding' };
      await loadAllStores(session.userId);
      return 'ready';
    }

    hydrate().then(
      (result) => {
        if (cancelled) return;
        if (typeof result === 'string') setState(result);
        else router.replace(result.redirect); // keep the skeleton while redirecting
      },
      (error: unknown) => {
        console.error('[DataLoader] Failed to load data', error);
        if (!cancelled) {
          setErrorMessage(
            error instanceof ApiError && error.code === 'timeout'
              ? error.message
              : 'Check your connection and try again.',
          );
          setState('error');
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [attempt, router]);

  if (state === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="max-w-sm text-center">
          <AlertTriangle size={32} aria-hidden="true" className="text-ink-gold mx-auto mb-3" />
          <p className="text-text font-semibold">We couldn&apos;t load your data</p>
          <p className="text-text-dim mt-1 text-sm">{errorMessage}</p>
          <Button
            className="mt-5"
            onClick={() => {
              setState('loading');
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  if (state === 'maintenance') return <MaintenanceScreen message={maintenanceMessage} />;

  if (state === 'loading') return <AppSkeleton />;

  return <>{children}</>;
}

/**
 * Ends the guest demo when its 24 hours are up, even in a tab left open: the token is deleted,
 * nothing of the demo stays in memory, and the guest is back at sign-in with a note.
 */
function useDemoDayEnd(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !useAuthStore.getState().session?.isGuest) return;
    const demo = currentDemo();
    if (!demo) return;
    const end = () => {
      endDemo();
      resetAllStores();
      window.location.replace('/login?reason=demo_ended');
    };
    // Timers can't wait more than ~24.8 days; a demo never lasts more than one.
    const timer = window.setTimeout(end, Math.max(0, Date.parse(demo.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [enabled]);
}

/**
 * Several tabs share one browser's sign-in: when another tab changes it, this one reloads, so it
 * never keeps showing the previous account or the wrong mode. An admin's "View as farmer" tab
 * belongs to the admin and stays as it is.
 */
function useOtherTabAuthChange(enabled: boolean) {
  useEffect(() => {
    if (!enabled || useAuthStore.getState().impersonation) return;
    return onOtherTabAuthChange(() => {
      resetAllStores();
      window.location.reload();
    });
  }, [enabled]);
}

/** The whole screen while the farmer's data loads: the animated AgriCtec mark. */
function AppSkeleton() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 8_000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <LogoLoader size="lg" label="Loading AgriCtec" />
      {/* Only after 8 seconds: a slow server is worth saying, a normal load is not. */}
      {slow && (
        <p className="text-text-dim max-w-xs text-center text-sm" role="status">
          Waiting for the server. You can retry if it does not respond.
        </p>
      )}
    </div>
  );
}
