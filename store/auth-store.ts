import { create } from 'zustand';
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
  init: () => Promise<Session | null>;
  signIn: (email: string, password: string) => Promise<Session>;
  /** After an admin reset: the temporary password, then the farmer's own new one. */
  replaceTemporaryPassword: (email: string, temporary: string, next: string) => Promise<Session>;
  signUp: (email: string, password: string) => Promise<Session>;
  continueAsGuest: () => Promise<Session>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  status: 'idle',
  impersonation: null,

  init: async () => {
    set({ status: 'loading' });
    try {
      const session = await authService.getSession();
      set({ session, status: 'ready' });
      return session;
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  signIn: async (email, password) => {
    const session = await authService.signIn(email, password);
    set({ session, status: 'ready' });
    return session;
  },

  replaceTemporaryPassword: async (email, temporary, next) => {
    const session = await authService.replaceTemporaryPassword(email, temporary, next);
    set({ session, status: 'ready' });
    return session;
  },

  signUp: async (email, password) => {
    const session = await authService.signUp(email, password);
    set({ session, status: 'ready' });
    return session;
  },

  continueAsGuest: async () => {
    const session = await authService.continueAsGuest();
    set({ session, status: 'ready' });
    return session;
  },

  signOut: async () => {
    await authService.signOut();
    set({ session: null, status: 'ready' });
  },
}));
