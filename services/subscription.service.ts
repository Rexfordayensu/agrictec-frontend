// Plans, entitlements and AI credits, enforced by the API. Payments are still simulated ("mock"
// mode): connect a payment provider and verify payments server-side before charging anyone.
// Credits are spent by the API itself when an assistant question or a crop scan succeeds.

import { FEATURE_NAMES, planAccess } from '@/lib/subscriptions/plans';
import { api, apiBlob } from '@/services/api';
import type { FeatureFlags, Plan } from '@/types/admin';
import type {
  BillingItem,
  MockPaymentMethod,
  PlanFeature,
  PlanId,
  SubscriptionSnapshot,
} from '@/types/subscription';

/** Same day next month, clamped to the month's final day. No automatic renewal. */
export function nextBillingDate(now: Date): Date {
  const date = new Date(now);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(now.getUTCDate(), last));
  return date;
}

/**
 * The quick check the UI makes before offering a tool (the API checks again): the admin's flag
 * and the farmer's plan. Throws the message the toast shows.
 */
export function assertPlanFeature(
  snapshot: SubscriptionSnapshot,
  plans: Plan[],
  flags: FeatureFlags,
  feature: PlanFeature,
): void {
  if (!flags[feature]) throw new Error(`${FEATURE_NAMES[feature]} is currently unavailable.`);
  const plan = plans.find((p) => p.id === snapshot.subscription.planId);
  if (!plan || !planAccess(plan)[feature])
    throw new Error(
      `${FEATURE_NAMES[feature]} is not included in ${plan?.name ?? 'your plan'}. View plans in Settings → Plans & billing.`,
    );
}

export const subscriptionService = {
  /** Billing history, newest first: Paystack payments and any simulated (demo) one. */
  async payments(signal?: AbortSignal): Promise<BillingItem[]> {
    return api<BillingItem[]>('/me/subscription/payments', { signal });
  },

  /** A PDF receipt for one of the farmer's own payments. */
  async receipt(reference: string): Promise<Blob> {
    return apiBlob(`/me/subscription/payments/${encodeURIComponent(reference)}/receipt`);
  },

  async get(_userId: string): Promise<SubscriptionSnapshot> {
    return api<SubscriptionSnapshot>('/me/subscription');
  },

  /**
   * Starts a real payment (Paystack): the farmer pays on Paystack's page, which sends them back
   * to /settings/plans?reference=… where confirmPayment() finishes it.
   */
  async checkout(planId: PlanId, method: MockPaymentMethod): Promise<{ reference: string; authorizationUrl: string }> {
    return api('/me/subscription/checkout', { method: 'POST', body: { planId, method } });
  },

  /** Asks the API (which asks Paystack) how a payment went; the plan is active once paid. */
  async confirmPayment(reference: string): Promise<SubscriptionSnapshot> {
    return api<SubscriptionSnapshot>('/me/subscription/confirm', { method: 'POST', body: { reference } });
  },

  /** Switches to Free, or in demo mode activates a plan with a simulated receipt. */
  async activateMock(
    _userId: string,
    planId: PlanId,
    method: MockPaymentMethod,
  ): Promise<SubscriptionSnapshot> {
    return api<SubscriptionSnapshot>('/me/subscription', {
      method: 'POST',
      body: { planId, method },
    });
  },
};
