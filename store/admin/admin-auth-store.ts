import { create } from 'zustand';
import {
  adminAuthService,
  type ServerAdminSession,
  type SignOutReason,
} from '@/services/admin/admin-auth.service';
import type { StoreStatus } from '@/types';
import type { AdminUser } from '@/types/admin';

/** How often activity is reported to the API (it is checked every second, but sent sparingly). */
export const TOUCH_THROTTLE_MS = 30_000;

interface AdminAuthState {
  /** The signed-in admin (id, name, email, role…). Null when signed out. */
  admin: AdminUser | null;
  startedAt: string | null;
  /** Last activity seen in this tab (ms). The session timeout counts from here. */
  lastActivityAt: number | null;
  /** When the API will end the session if nothing happens (counts every tab's activity). */
  idleExpiresAt: string | null;
  status: StoreStatus;
  /** Loads the session. `expired` is true when it just ended for inactivity. */
  init: () => Promise<{ admin: AdminUser | null; expired: boolean }>;
  /** Re-reads the session from the API (another tab's activity, a role change, a sign-out). */
  syncSession: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AdminUser>;
  signOut: (reason?: SignOutReason) => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<AdminUser>;
  /** Saves the signed-in admin's own display name. */
  updateName: (name: string) => Promise<AdminUser>;
  /** Marks activity now. Reported to the API at most once every 30 seconds, unless `force`. */
  touch: (force?: boolean) => void;
}

const SIGNED_OUT = { admin: null, startedAt: null, idleExpiresAt: null };

let lastSaved = 0;

const fromSession = (session: ServerAdminSession) => ({
  admin: session.admin,
  startedAt: session.startedAt,
  idleExpiresAt: session.idleExpiresAt,
});

export const useAdminAuthStore = create<AdminAuthState>()((set) => ({
  ...SIGNED_OUT,
  lastActivityAt: null,
  status: 'idle',

  init: async () => {
    set({ status: 'loading' });
    try {
      const { session, expired } = await adminAuthService.sessionState();
      if (!session) {
        set({ ...SIGNED_OUT, lastActivityAt: null, status: 'ready' });
        return { admin: null, expired };
      }
      set({ ...fromSession(session), lastActivityAt: Date.now(), status: 'ready' });
      lastSaved = Date.now();
      const touched = await adminAuthService.touch();
      if (touched) set(fromSession(touched));
      return { admin: session.admin, expired: false };
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  syncSession: async () => {
    const { session } = await adminAuthService.sessionState();
    set(session ? fromSession(session) : SIGNED_OUT);
  },

  signIn: async (email, password) => {
    const session = await adminAuthService.signIn(email, password);
    lastSaved = Date.now();
    set({ ...fromSession(session), lastActivityAt: Date.now(), status: 'ready' });
    return session.admin;
  },

  signOut: async (reason = 'manual') => {
    await adminAuthService.signOut(reason);
    set({ ...SIGNED_OUT, lastActivityAt: null, status: 'ready' });
  },

  changePassword: async (currentPassword, nextPassword) => {
    const admin = await adminAuthService.changePassword(currentPassword, nextPassword);
    set({ admin });
    return admin;
  },

  updateName: async (name) => {
    const admin = await adminAuthService.updateName(name);
    set({ admin });
    return admin;
  },

  touch: (force = false) => {
    const now = Date.now();
    set({ lastActivityAt: now });
    if (force || now - lastSaved >= TOUCH_THROTTLE_MS) {
      lastSaved = now;
      void adminAuthService.touch().then(
        (session) => set(session ? fromSession(session) : SIGNED_OUT),
        () => {
          // Offline for a moment: the next activity reports again.
        },
      );
    }
  },
}));
