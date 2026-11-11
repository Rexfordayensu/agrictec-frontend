import { create } from 'zustand';
import type { LoanTab } from '@/lib/loans/loan-path';
import { assertWritable } from '@/lib/read-only';
import { loansService } from '@/services/loans.service';
import { useAuthStore } from '@/store/auth-store';
import type { LoadOptions, LoanApplication, LoanApplicationInput, StoreStatus } from '@/types';

export type { LoanTab };

export interface LoanDraft {
  amount: number;
  purpose: string;
  months: number;
  partnerId: string;
}

interface LoanState {
  userId: string | null;
  /** Submitted applications, newest first. */
  applications: LoanApplication[];
  status: StoreStatus;
  /**
   * The tab the farmer picked; null until they pick one, so the page opens where it is most
   * useful (a ?tab= link, else "Compare loans" when ready to apply, else "My credit").
   */
  tab: LoanTab | null;
  /** When set, the apply-confirmation modal is open for this draft. */
  confirm: LoanDraft | null;
  /** Every "Verify Ghana Card" action on /loans opens the same dialog. */
  ghanaCardOpen: boolean;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
  setTab: (tab: LoanTab) => void;
  setGhanaCardOpen: (open: boolean) => void;
  openConfirm: (draft: LoanDraft) => void;
  closeConfirm: () => void;
  /** `score` is recorded with the application so lenders see the score at the time of applying. */
  submit: (input: LoanApplicationInput, score: number) => Promise<LoanApplication>;
}

export const useLoanStore = create<LoanState>()((set, get) => ({
  userId: null,
  applications: [],
  status: 'idle',
  tab: null,
  confirm: null,
  ghanaCardOpen: false,

  load: async (userId, { silent = false } = {}) => {
    set(silent ? { userId } : { userId, status: 'loading' });
    try {
      const applications = await loansService.listApplications(userId);
      if (get().userId !== userId) return;
      set({ applications, status: 'ready' });
    } catch (error) {
      set({ status: 'error' });
      throw error;
    }
  },

  setTab: (tab) => set({ tab }),
  setGhanaCardOpen: (ghanaCardOpen) => set({ ghanaCardOpen }),
  openConfirm: (confirm) => {
    assertWritable();
    set({ confirm });
  },
  closeConfirm: () => set({ confirm: null }),

  submit: async (input, score) => {
    assertWritable();
    const userId = useAuthStore.getState().session?.userId;
    if (!userId) throw new Error('You need to sign in first');
    const application = await loansService.submitApplication(userId, input, score);
    set((state) => ({ applications: [application, ...state.applications] }));
    return application;
  },
}));
