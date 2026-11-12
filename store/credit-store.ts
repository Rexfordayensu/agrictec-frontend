import { create } from 'zustand';
import { loansService, type CreditSummary } from '@/services/loans.service';
import { useApplicationsStore } from '@/store/applications-store';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { EligibilityResult, LoadOptions, StoreStatus } from '@/types';

interface CreditState {
  userId: string | null;
  /** GET /me/credit: score and factors, band, readiness, borrowing limit, account review. */
  summary: CreditSummary | null;
  /**
   * The server's check with no amount and no lender: which of the records, platform score and
   * Ghana Card rules still fail. The path to a loan and the default tab come from it.
   */
  gate: EligibilityResult | null;
  status: StoreStatus;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
}

/**
 * The farmer's credit as the API calculates it. Nothing here is worked out in the browser: the
 * score, its factors, the band, the limit and the eligibility rules are all the server's.
 */
export const useCreditStore = create<CreditState>()((set, get) => ({
  userId: null,
  summary: null,
  gate: null,
  status: 'idle',

  load: async (userId, { silent = false } = {}) => {
    set(silent ? { userId } : { userId, status: 'loading' });
    try {
      const [summary, gate] = await Promise.all([
        loansService.getCreditSummary(),
        loansService.checkEligibility(0),
      ]);
      if (get().userId !== userId) return;
      set({ summary, gate, status: 'ready' });
      // The same server answer drives "applications are paused" everywhere in the app.
      if (usePlatformStore.getState().underReview !== summary.underReview)
        usePlatformStore.setState({ underReview: summary.underReview });
    } catch (error) {
      // A silent reload keeps the last answer on screen rather than blanking the page.
      if (!silent || !get().summary) set({ status: 'error' });
      throw error;
    }
  },
}));

export const resetCreditStore = () =>
  useCreditStore.setState({ userId: null, summary: null, gate: null, status: 'idle' });

/** Several edits usually land together (a save touches more than one store): reload once. */
const SETTLE_MS = 300;
/** How often open pages re-read the server's figures. */
const LIVE_REFRESH_MS = 60_000;
let timer: ReturnType<typeof setTimeout> | undefined;

function reloadSoon() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const { userId, status, load } = useCreditStore.getState();
    if (userId && status === 'ready') load(userId, { silent: true }).catch(() => {});
  }, SETTLE_MS);
}

// Whatever the score is built from changed (a record, a MoMo entry, the profile, a
// verification, the admin's rules or lenders): ask the server again.
if (typeof window !== 'undefined') {
  useFarmStore.subscribe((state, prev) => {
    if (state.records !== prev.records || state.momo !== prev.momo) reloadSoon();
  });
  useProfileStore.subscribe((state, prev) => {
    if (state.profile !== prev.profile) reloadSoon();
  });
  usePlatformStore.subscribe((state, prev) => {
    if (
      state.creditConfig !== prev.creditConfig ||
      state.lenders !== prev.lenders ||
      state.verifications !== prev.verifications
    )
      reloadSoon();
  });

  // What others change (AgriCtec reviewing an application, a lender's update, an admin's
  // rules or lenders) shows without a page reload: refresh when the farmer comes back to the
  // tab, and every minute while it is open.
  const refreshLive = () => {
    if (document.visibilityState !== 'visible') return;
    reloadSoon();
    const applications = useApplicationsStore.getState();
    if (applications.status === 'ready') applications.load({ silent: true }).catch(() => {});
    usePlatformStore.getState().refresh().catch(() => {});
  };
  document.addEventListener('visibilitychange', refreshLive);
  setInterval(refreshLive, LIVE_REFRESH_MS);
}
