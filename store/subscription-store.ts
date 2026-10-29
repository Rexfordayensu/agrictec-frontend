import { create } from 'zustand';
import { assertWritable } from '@/lib/read-only';
import { assertPlanFeature, subscriptionService } from '@/services/subscription.service';
import { usePlatformStore } from '@/store/platform-store';
import type { LoadOptions, StoreStatus } from '@/types';
import type { MockPaymentMethod, PlanFeature, PlanId, SubscriptionSnapshot } from '@/types/subscription';

interface SubscriptionState {
  userId: string | null;
  snapshot: SubscriptionSnapshot | null;
  status: StoreStatus;
  load: (userId: string, options?: LoadOptions) => Promise<void>;
  /** Re-reads the plan and credits in place (expiry, the monthly reset, another device). */
  refresh: () => void;
  checkoutMock: (planId: PlanId, method: MockPaymentMethod) => Promise<void>;
  /** Real payments: returns Paystack's checkout page for the plan. */
  startCheckout: (planId: PlanId, method: MockPaymentMethod) => Promise<string>;
  /** After Paystack sends the farmer back: the plan's state once the payment is checked. */
  confirmPayment: (reference: string) => Promise<SubscriptionSnapshot>;
  /** After an AI request: the API spent the credits and reported what is left. */
  applyCredits: (creditsRemaining: number | null) => void;
  /** The UI's quick check before offering a tool (the API checks again). */
  assertFeature: (feature: PlanFeature) => void;
}

export const useSubscriptionStore = create<SubscriptionState>()((set, get) => {
  const requireReady = () => {
    const { userId, status, snapshot } = get();
    if (!userId || status !== 'ready' || !snapshot)
      throw new Error('Your plan is still loading. Please try again.');
    return { userId, snapshot };
  };
  return {
    userId: null,
    snapshot: null,
    status: 'idle',
    load: async (userId, { silent = false } = {}) => {
      if (!silent || get().userId !== userId) set({ userId, status: 'loading', snapshot: null });
      try {
        const snapshot = await subscriptionService.get(userId);
        if (get().userId === userId) set({ snapshot, status: 'ready' });
      } catch (error) {
        if (get().userId === userId) set({ status: 'error' });
        throw error;
      }
    },
    refresh: () => {
      const { userId } = get();
      if (!userId) return;
      void subscriptionService.get(userId).then(
        (snapshot) => {
          if (get().userId === userId) set({ snapshot });
        },
        () => {
          // Offline for a moment: the next refresh catches up.
        },
      );
    },
    checkoutMock: async (planId, method) => {
      assertWritable();
      const { userId } = requireReady();
      const snapshot = await subscriptionService.activateMock(userId, planId, method);
      if (get().userId === userId) set({ snapshot });
    },
    startCheckout: async (planId, method) => {
      assertWritable();
      requireReady();
      const { authorizationUrl } = await subscriptionService.checkout(planId, method);
      return authorizationUrl;
    },
    confirmPayment: async (reference) => {
      assertWritable();
      const snapshot = await subscriptionService.confirmPayment(reference);
      if (get().userId) set({ snapshot, status: 'ready' });
      return snapshot;
    },
    applyCredits: (creditsRemaining) => {
      const { snapshot } = get();
      if (!snapshot) return;
      const used =
        snapshot.creditsLimit === null || creditsRemaining === null
          ? snapshot.creditsUsed
          : snapshot.creditsLimit - creditsRemaining;
      set({ snapshot: { ...snapshot, creditsRemaining, creditsUsed: used } });
    },
    assertFeature: (feature) => {
      const { snapshot } = requireReady();
      const { plans, flags } = usePlatformStore.getState();
      assertPlanFeature(snapshot, plans, flags, feature);
    },
  };
});
