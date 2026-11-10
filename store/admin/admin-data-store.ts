import { create } from 'zustand';
import { getCurrentAdmin } from '@/lib/admin/admin-session';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { can } from '@/lib/admin/permissions';
import { announcementsService } from '@/services/admin/announcements.service';
import { farmersService } from '@/services/admin/farmers.service';
import { loanApplicationsService } from '@/services/admin/loan-applications.service';
import { riskService } from '@/services/admin/risk.service';
import { verificationsService } from '@/services/admin/verifications.service';
import type { StoreStatus } from '@/types';
import type {
  Announcement,
  FarmerAccount,
  LoanApplication,
  Permission,
  RiskFlag,
  VerificationRequest,
} from '@/types/admin';

export interface BadgeCounts {
  pendingVerifications: number;
  openRisk: number;
  newApplications: number;
}

interface AdminDataState {
  /**
   * Only the farmers named by the loaded applications, verifications and risk flags (for their
   * names and regions): never the whole list.
   */
  farmers: FarmerAccount[];
  applications: LoanApplication[];
  verifications: VerificationRequest[];
  riskFlags: RiskFlag[];
  announcements: Announcement[];
  /** Sidebar counts. Zero for data the current role can't see. */
  badgeCounts: BadgeCounts;
  status: StoreStatus;
  error: string | null;
  loadedAt: string | null;
  /**
   * Goes up each time another tab changed platform data. Pages that keep their own copy of
   * service data (audit log, team, lenders, settings…) list it in their load effect to reload.
   */
  syncVersion: number;
  /** Reloads everything the current admin may view (other datasets stay empty). */
  refresh: () => Promise<void>;
  /** After another tab's change: reloads the store, then tells the pages (syncVersion). */
  syncFromOtherTab: () => Promise<void>;
  /** Adds (or updates) one farmer the console is showing, e.g. on their own page. */
  rememberFarmer: (farmer: FarmerAccount) => void;
  reset: () => void;
}

const EMPTY = {
  farmers: [],
  applications: [],
  verifications: [],
  riskFlags: [],
  announcements: [],
  badgeCounts: { pendingVerifications: 0, openRisk: 0, newApplications: 0 },
  status: 'idle' as StoreStatus,
  error: null,
  loadedAt: null,
  syncVersion: 0,
};

export function countBadges(
  verifications: VerificationRequest[],
  riskFlags: RiskFlag[],
  applications: LoanApplication[],
): BadgeCounts {
  return {
    pendingVerifications: verifications.filter((v) => v.status === 'pending').length,
    openRisk: riskFlags.filter((f) => f.status === 'open').length,
    newApplications: applications.filter((a) => a.status === 'submitted').length,
  };
}

// Ignores a slow refresh that finishes after a newer one started.
let latestRefresh = 0;

export const useAdminDataStore = create<AdminDataState>()((set, get) => ({
  ...EMPTY,

  refresh: async () => {
    const token = ++latestRefresh;
    set({ status: 'loading', error: null });
    const role = getCurrentAdmin()?.role;
    const load = <T>(permission: Permission, fn: () => Promise<T[]>): Promise<T[]> =>
      can(role, permission) ? fn() : Promise.resolve([]);
    try {
      const [applications, verifications, riskFlags, announcements] = await Promise.all([
        load('loans.view', () => loanApplicationsService.list()),
        load('verifications.review', () => verificationsService.list()),
        load('risk.review', () => riskService.list()),
        load('announcements.send', () => announcementsService.list()),
      ]);
      // Never every farmer: only the ones these queues name (for their names and regions). The
      // farmers page, the overview and search ask the API for exactly what they show.
      const farmers = can(role, 'farmers.view')
        ? await farmersService.lookup([
            ...applications.map((a) => a.userId),
            ...verifications.map((v) => v.userId),
            ...riskFlags.map((f) => f.userId),
          ])
        : [];
      if (token !== latestRefresh) return;
      set({
        farmers,
        applications,
        verifications,
        riskFlags,
        announcements,
        badgeCounts: countBadges(verifications, riskFlags, applications),
        status: 'ready',
        loadedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (token !== latestRefresh) return;
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Could not load data.',
      });
    }
  },

  rememberFarmer: (farmer) =>
    set((state) => ({
      farmers: [...state.farmers.filter((f) => f.userId !== farmer.userId), farmer],
    })),

  syncFromOtherTab: async () => {
    await get().refresh();
    set((state) => ({ syncVersion: state.syncVersion + 1 }));
  },

  reset: () => {
    latestRefresh++;
    set(EMPTY);
  },
}));

// Signed out, timed out, or a different admin signed in on this tab: nothing the previous
// session loaded (every farmer's details) stays in memory.
useAdminAuthStore.subscribe((state, previous) => {
  if (previous.admin && (!state.admin || state.admin.id !== previous.admin.id)) {
    useAdminDataStore.getState().reset();
  }
});
