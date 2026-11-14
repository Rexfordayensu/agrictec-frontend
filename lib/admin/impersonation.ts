import { consoleReturn } from '@/lib/admin/console-return';
// "View as farmer" (phase A8), backed by the API:
// 1. The console calls startImpersonation(): the API checks farmers.impersonate, logs it, and
//    returns a single-use token valid for one minute; the farmer app opens with ?impersonate=…
// 2. That tab's DataLoader calls claimImpersonation(): the API exchanges the token for a
//    read-only session, kept in this tab only (sessionStorage) and sent as X-Impersonation-Token.
//    The API refuses every write from it, and ends it if the admin signs out or loses the right.
// 3. endImpersonation() (the bar's Exit) ends it on the API (logged) and in this tab.

import { api, impersonationToken } from '@/services/api';
import { sessionStore } from '@/services/storage';
import type { ImpersonationView } from '@/store/auth-store';
import type { Profile, Session } from '@/types';
import type { AdminSession } from '@/types/admin';

const SESSION_KEY = 'impersonation';
/** A hint for proxy.ts (it lets the read-only view through without a farmer session). */
const COOKIE = 'agrictec_impersonating';

function setCookie(on: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = on
    ? `${COOKIE}=1; path=/; max-age=7200; SameSite=Lax`
    : `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

function forget(): void {
  impersonationToken.set(null);
  sessionStore.set(SESSION_KEY, null);
  setCookie(false);
}

/** Console side: audited by the API; returns the farmer-app URL to open in a new tab. */
export async function startImpersonation(farmerId: string): Promise<string> {
  const { url } = await api<{ url: string }>(
    `/admin/farmers/${encodeURIComponent(farmerId)}/impersonate`,
    { method: 'POST' },
  );
  return url;
}

/**
 * Farmer tab: exchanges the console's token for this tab's read-only view. Null when the token
 * is used up, expired, or the admin isn't signed in with the permission.
 */
export async function claimImpersonation(token: string): Promise<ImpersonationView | null> {
  forget();
  try {
    const claimed = await api<{ token: string; session: Session }>('/auth/impersonation/claim', {
      method: 'POST',
      body: { token },
    });
    impersonationToken.set(claimed.token);
    const [admin, profile] = await Promise.all([
      api<AdminSession>('/admin/auth/session'),
      api<Profile>('/me/profile'),
    ]);
    const view: ImpersonationView = {
      adminId: admin.admin.id,
      adminName: admin.admin.name,
      farmerId: claimed.session.userId,
      farmerName: profile.name || claimed.session.email,
      startedAt: claimed.session.startedAt,
    };
    sessionStore.set(SESSION_KEY, view);
    setCookie(true);
    return view;
  } catch {
    forget();
    return null;
  }
}

/**
 * This tab's view, if any. Whether it is still valid is the API's call: a request from an
 * ended view gets 401, and the DataLoader then leaves.
 */
export function activeImpersonation(): ImpersonationView | null {
  const view = sessionStore.get<ImpersonationView | null>(SESSION_KEY, null);
  return view && impersonationToken.get() ? view : null;
}

/** Ends this tab's view and logs it. */
export async function endImpersonation(): Promise<void> {
  if (impersonationToken.get()) {
    await api('/auth/impersonation/end', { method: 'POST' }).catch(() => {});
  }
  forget();
}

/** The farmer session the read-only view runs as. */
export function impersonatedSession(view: ImpersonationView): Session {
  return {
    userId: view.farmerId,
    email: '',
    isGuest: false,
    role: 'farmer',
    startedAt: view.startedAt,
  };
}

/**
 * The bar's Exit (and Sign out while viewing): ends the view, then closes this tab, or, when the
 * browser won't let a script close it, goes back to the farmer in the console.
 */
export function exitImpersonation(): void {
  const farmerId = sessionStore.get<ImpersonationView | null>(SESSION_KEY, null)?.farmerId;
  void endImpersonation().finally(() => {
    window.close();
    // Still open (not opened by a script): a full page load also clears the in-memory stores.
    setTimeout(() => {
      window.location.assign(consoleReturn(farmerId ? `/farmers/${farmerId}` : '/farmers'));
    }, 150);
  });
}
