import { create } from 'zustand';
import { applicationsService } from '@/services/applications.service';
import type { StoreStatus } from '@/types';
import type { ApplicationSummary } from '@/types/applications';

interface ApplicationsState {
  /** The farmer's applications prepared through AgriCtec, newest first (drafts included). */
  list: ApplicationSummary[];
  status: StoreStatus;
  error: string | null;
  /** Loads (or reloads) the list. `silent` keeps what is on screen while it reloads. */
  load: (options?: { silent?: boolean }) => Promise<void>;
  reset: () => void;
}

/** Shared by the Loans page header, the path to a loan and the Applications tab. */
export const useApplicationsStore = create<ApplicationsState>()((set) => ({
  list: [],
  status: 'idle',
  error: null,
  load: async ({ silent = false } = {}) => {
    if (!silent) set({ status: 'loading', error: null });
    try {
      set({ list: await applicationsService.list(), status: 'ready', error: null });
    } catch (cause) {
      set({ status: 'error', error: cause instanceof Error ? cause.message : 'Could not load' });
    }
  },
  reset: () => set({ list: [], status: 'idle', error: null }),
}));
