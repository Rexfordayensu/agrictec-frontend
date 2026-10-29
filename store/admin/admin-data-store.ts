import { create } from 'zustand';
import { getCurrentAdmin } from '@/lib/admin/admin-session';
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
      const [farmers, applications, verifications, riskFlags, announcements] = await Promise.all([
        load('farmers.view', () => farmersService.list()),
        load('loans.view', () => loanApplicationsService.list()),
        load('verifications.review', () => verificationsService.list()),
        load('risk.review', () => riskService.list()),
        load('announcements.send', () => announcementsService.list()),
      ]);
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

  syncFromOtherTab: async () => {
    await get().refresh();
    set((state) => ({ syncVersion: state.syncVersion + 1 }));
  },

  reset: () => {
    latestRefresh++;
    set(EMPTY);
  },
}));
