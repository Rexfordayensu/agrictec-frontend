// The signed-in admin, as the console knows it. The API owns the real session (an httpOnly
// cookie), re-checks the role on every request and ends a session idle for 30 minutes; this
// module only mirrors it for the UI (menus, the idle warning).

import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import type { AdminUser } from '@/types/admin';

/** The session as the idle countdown sees it. */
export interface StoredAdminSession {
  adminId: string;
  startedAt: string;
  /** The latest activity known: this tab's, or another tab's as last reported by the API. */
  lastActivityAt?: string;
}

/**
 * Minutes of inactivity before an admin is signed out. Keep NEXT_PUBLIC_ADMIN_IDLE_MINUTES equal
 * to the API's ADMIN_IDLE_MINUTES (default 30 for both).
 */
const idleMinutes = Number(process.env.NEXT_PUBLIC_ADMIN_IDLE_MINUTES) || 30;
export const ADMIN_IDLE_MS = Math.max(1, idleMinutes) * 60_000;
/** The warning shows this long before sign-out (2 minutes, or half the timeout if shorter). */
export const ADMIN_IDLE_WARNING_MS = Math.min(2 * 60_000, ADMIN_IDLE_MS / 2);
export const ADMIN_IDLE_MINUTES = ADMIN_IDLE_MS / 60_000;

export const readAdminSession = (): StoredAdminSession | null => {
  const { admin, startedAt, idleExpiresAt } = useAdminAuthStore.getState();
  if (!admin || !startedAt) return null;
  return {
    adminId: admin.id,
    startedAt,
    // The API's deadline, back to the last activity it saw (from any tab).
    ...(idleExpiresAt && {
      lastActivityAt: new Date(Date.parse(idleExpiresAt) - ADMIN_IDLE_MS).toISOString(),
    }),
  };
};

/** When the session was last active, in ms. */
export const lastActivityOf = (session: StoredAdminSession): number =>
  Date.parse(session.lastActivityAt ?? session.startedAt);

/** The signed-in admin, or null. The API checks the role again on every request. */
export function getCurrentAdmin(): AdminUser | null {
  return useAdminAuthStore.getState().admin;
}
