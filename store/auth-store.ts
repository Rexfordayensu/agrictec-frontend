import { create } from 'zustand';
import {
  currentDemo,
  demoJustEnded,
  demoSession,
  endDemo,
  isDemoBrowser,
  startDemo,
} from '@/lib/demo';
import { authService } from '@/services/auth.service';
import type { Session, StoreStatus } from '@/types';

/** An admin viewing the app as a farmer (phase A8): the farmer's data, strictly read-only. */
export interface ImpersonationView {
  adminId: string;
  adminName: string;
  farmerId: string;
  farmerName: string;
  startedAt: string;
}

interface AuthState {
  session: Session | null;
  status: StoreStatus;
  /** Set while an admin views the app as this farmer; every write is then refused. */
  impersonation: ImpersonationView | null;
  /** True when the last check found the session ended because it went unused for too long. */
  sessionExpired: boolean;
  /** True when the last check found this browser's guest demo past its 24 hours. */
  demoEnded: boolean;
  init: () => Promise<Session | null>;
  signIn: (email: string, password: string) => Promise<Session>;
  /** After an admin reset: the temporary password, then the farmer's own new one. */
  replaceTemporaryPassword: (email: string, temporary: string, next: string) => Promise<Session>;
  /** Forgot password: the emailed code, then a new password. */
  resetPassword: (email: string, code: string, next: string) => Promise<Session>;
  signUp: (email: string, password: string) => Promise<Session>;
  /** The guest demo: no account, no session on the server, nothing stored (lib/demo.ts). */
  continueAsGuest: () => Promise<Session>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  status: 'idle',
  impersonation: null,
  sessionExpired: false,
  demoEnded: false,

  init: async () => {
    // The guest demo lives in this browser only (a token in localStorage, for 24 hours): there
    // is no server session to ask about. Once its day is over the token is gone.
    const ended = demoJustEnded();
    const demo = currentDemo();
    if (demo) {
      const session = demoSession(demo);
      set({ session, status: 'ready', sessionExpired: false, demoEnded: false });
      return session;
    }
    if (ended) {
      set({ session: null, status: 'ready', sessionExpired: false, demoEnded: true });
      return null;
    }
    set({ status: 'loading' });
    try {
      const { session, expired } = await authService.sessionState();
      set({ session, status: 'ready', sessionExpired: expired });
      return session;
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  signIn: async (email, password) => {
    const session = await authService.signIn(email, password);
    endDemo();
    set({ session, status: 'ready' });
    return session;
  },

  replaceTemporaryPassword: async (email, temporary, next) => {
    const session = await authService.replaceTemporaryPassword(email, temporary, next);
    endDemo();
    set({ session, status: 'ready' });
    return session;
  },

  resetPassword: async (email, code, next) => {
    const session = await authService.resetPassword(email, code, next);
    endDemo();
    set({ session, status: 'ready' });
    return session;
  },

  signUp: async (email, password) => {
    const session = await authService.signUp(email, password);
    endDemo();
    set({ session, status: 'ready' });
    return session;
  },

  continueAsGuest: async () => {
    // Carries on a demo opened earlier today rather than restarting its 24 hours.
    const session = demoSession(startDemo());
    set({ session, status: 'ready', sessionExpired: false, demoEnded: false });
    return session;
  },

  signOut: async () => {
    if (isDemoBrowser()) endDemo();
    else await authService.signOut();
    set({ session: null, status: 'ready' });
  },
}));
