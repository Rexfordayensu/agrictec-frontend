'use client';

import { useEffect, type ReactNode } from 'react';
import { MaintenanceScreen } from '@/components/shared/maintenance-screen';
import { usePlatformStore } from '@/store/platform-store';
import type { StoreStatus } from '@/types';

/** What the gate shows: maintenance always wins; otherwise wait until the flags have loaded. */
export function gateView(
  flagsStatus: StoreStatus,
  maintenanceMode: boolean,
): 'maintenance' | 'loading' | 'page' {
  if (maintenanceMode) return 'maintenance';
  if (flagsStatus === 'idle' || flagsStatus === 'loading') return 'loading';
  return 'page';
}

/**
 * For pages outside the signed-in app (login, signup): loads the feature flags once and shows
 * the maintenance screen instead of the page while maintenance mode is on.
 */
export function MaintenanceGate({ children }: { children: ReactNode }) {
  const flagsStatus = usePlatformStore((s) => s.flagsStatus);
  const maintenance = usePlatformStore((s) => s.flags.maintenanceMode);
  const message = usePlatformStore((s) => s.flags.maintenanceMessage);

  useEffect(() => {
    if (usePlatformStore.getState().flagsStatus === 'idle') {
      // On failure the defaults stay (everything on), so the page still works.
      usePlatformStore
        .getState()
        .loadFlags()
        .catch(() => {});
    }
  }, []);

  const view = gateView(flagsStatus, maintenance);
  if (view === 'maintenance') return <MaintenanceScreen message={message} />;
  // Wait for the flags so a farmer never starts signing in just before maintenance appears.
  if (view === 'loading') {
    return <div role="status" aria-label="Loading" className="min-h-screen" />;
  }
  return <>{children}</>;
}
