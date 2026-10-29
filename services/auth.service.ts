// Farmer sign-in through the AgriCtec API. The session is an httpOnly cookie set by the API
// (agrictec_session); passwords are checked and hashed (argon2) on the server only.

import { api, ApiError } from '@/services/api';
import type { AccountStatus, Session } from '@/types';

export const SUSPENDED_MESSAGE = 'Your account is suspended. Contact support.';

/**
 * Thrown by signIn after a correct temporary password (an admin reset it): the farmer chooses a
 * new password before any session starts (authService.replaceTemporaryPassword).
 */
export class PasswordChangeRequiredError extends Error {
  constructor() {
    super('Choose a new password to finish signing in.');
    this.name = 'PasswordChangeRequiredError';
  }
}

export const FARMER_PASSWORD_MIN_LENGTH = 8;

interface SignedIn {
  session: Session;
}

/** The onboarding hint for proxy.ts is set by the API with the session; a new one starts clean. */
const signedIn = ({ session }: SignedIn): Session => session;

export const authService = {
  /** Refused (403) while the admin has closed sign-ups. */
  async signUp(email: string, password: string): Promise<Session> {
    return signedIn(await api<SignedIn>('/auth/signup', { method: 'POST', body: { email, password } }));
  },

  async signIn(email: string, password: string): Promise<Session> {
    try {
      return signedIn(await api<SignedIn>('/auth/login', { method: 'POST', body: { email, password } }));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'password_change_required')
        throw new PasswordChangeRequiredError();
      throw error;
    }
  },

  /**
   * After an admin reset: the temporary password again, then the farmer's own new password
   * (the admin never learns it). Signs the farmer in.
   */
  async replaceTemporaryPassword(
    email: string,
    temporary: string,
    nextPassword: string,
  ): Promise<Session> {
    return signedIn(
      await api<SignedIn>('/auth/replace-temporary-password', {
        method: 'POST',
        body: { email, temporaryPassword: temporary, newPassword: nextPassword },
      }),
    );
  },

  /**
   * Sends a six-digit reset code to the account's email (and verified phone). The answer is the
   * same whether or not the email has an account.
   */
  async requestPasswordReset(email: string): Promise<string> {
    const { detail } = await api<{ detail: string }>('/auth/password-reset/request', {
      method: 'POST',
      body: { email },
    });
    return detail;
  },

  /** The code and a new password: other sessions end, and the farmer is signed in here. */
  async resetPassword(email: string, code: string, newPassword: string): Promise<Session> {
    return signedIn(
      await api<SignedIn>('/auth/password-reset/confirm', {
        method: 'POST',
        body: { email, code, newPassword },
      }),
    );
  },

  /** One guest per device: the API remembers it with a long-lived cookie. */
  async continueAsGuest(): Promise<Session> {
    return signedIn(await api<SignedIn>('/auth/guest', { method: 'POST' }));
  },

  /** The signed-in farmer, or null (signed out, suspended or deleted). */
  async getSession(): Promise<Session | null> {
    try {
      return await api<Session>('/auth/session');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return null;
      throw error;
    }
  },

  /**
   * The account's status, checked each time the app loads, so a farmer suspended or deleted by
   * an admin leaves an already-open session. (The API also records the visit.)
   */
  async checkAccount(userId: string): Promise<AccountStatus | 'deleted'> {
    return this.accountStatus(userId);
  },

  async accountStatus(userId: string): Promise<AccountStatus | 'deleted'> {
    try {
      const session = await api<Session>('/auth/session');
      return session.userId === userId ? 'active' : 'deleted';
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'account_suspended') return 'suspended';
        if (error.status === 401) return 'deleted';
      }
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Already signed out on the server: nothing left to end.
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
  },
};
