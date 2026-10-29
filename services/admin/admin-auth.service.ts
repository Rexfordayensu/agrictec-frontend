// Admin sign-in through the AgriCtec API. The session is an httpOnly cookie (agrictec_admin),
// separate from the farmer's, so neither side ever signs the other out. Five failed sign-ins
// lock an email for five minutes; 30 idle minutes end the session (both enforced by the API).

import { api, ApiError } from '@/services/api';
import type { AdminSession, AdminUser } from '@/types/admin';

export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 5;

export interface LockStatus {
  locked: boolean;
  /** When the lock ends, while locked. */
  until?: string;
  attemptsLeft: number;
}

export type SignOutReason = 'manual' | 'timeout';

/** The API's session: also when it goes idle (counting every tab's activity). */
export interface ServerAdminSession extends AdminSession {
  idleExpiresAt: string;
}

export interface SessionState {
  session: ServerAdminSession | null;
  /** True when the session ended for inactivity. */
  expired: boolean;
}

export const adminAuthService = {
  async signIn(email: string, password: string): Promise<ServerAdminSession> {
    const { session } = await api<{ session: ServerAdminSession }>('/admin/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    return session;
  },

  async signOut(reason: SignOutReason = 'manual'): Promise<void> {
    try {
      await api('/admin/auth/logout', { method: 'POST', query: { reason } });
    } catch (error) {
      // Already ended on the server (timed out, or signed out in another tab).
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
  },

  /** The current admin, re-read by the API (so role changes apply at once). */
  async sessionState(): Promise<SessionState> {
    try {
      return { session: await api<ServerAdminSession>('/admin/auth/session'), expired: false };
    } catch (error) {
      if (error instanceof ApiError && error.status === 401)
        return { session: null, expired: error.code === 'session_expired' };
      throw error;
    }
  },

  async getSession(): Promise<ServerAdminSession | null> {
    return (await adminAuthService.sessionState()).session;
  },

  /** Records activity (keyboard, mouse, touch). The new idle deadline, or null when signed out. */
  async touch(): Promise<ServerAdminSession | null> {
    try {
      return await api<ServerAdminSession>('/admin/auth/touch', { method: 'POST' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },

  /** Also clears a forced change (mustChangePassword). */
  async changePassword(currentPassword: string, nextPassword: string): Promise<AdminUser> {
    const session = await api<ServerAdminSession>('/admin/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword: nextPassword },
    });
    return session.admin;
  },

  /** The signed-in admin's own display name (any role; logged). */
  async updateName(name: string): Promise<AdminUser> {
    const session = await api<ServerAdminSession>('/admin/auth/me', { method: 'PATCH', body: { name } });
    return session.admin;
  },

  /** The lockout for an email (the API counts failures per email). */
  async isLocked(email?: string): Promise<LockStatus> {
    if (!email?.trim()) return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS };
    return api<LockStatus>('/admin/auth/lockout', { query: { email: email.trim() } });
  },
};
