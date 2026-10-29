'use client';

import { normalizePlans, planAccess } from '@/lib/subscriptions/plans';
import { usePlatformStore } from '@/store/platform-store';
import { useSubscriptionStore } from '@/store/subscription-store';
import type { PlanFeature } from '@/types/subscription';

export function useSubscription() {
  const snapshot = useSubscriptionStore((s) => s.snapshot);
  const status = useSubscriptionStore((s) => s.status);
  const plans = usePlatformStore((s) => s.plans);
  const flags = usePlatformStore((s) => s.flags);
  const paid = snapshot?.subscription;
  const planId = paid?.planId ?? 'free';
  const plan = normalizePlans(plans).find((p) => p.id === planId)!;
  const access = planAccess(plan);
  const limit = planId === 'advanced' ? null : planId === 'premium' ? (plan.aiCredits ?? 100) : 0;
  const current = snapshot
    ? {
        ...snapshot,
        creditsLimit: limit,
        creditsRemaining: limit === null ? null : Math.max(0, limit - snapshot.creditsUsed),
      }
    : null;
  return {
    plan,
    snapshot: current,
    ready: status === 'ready',
    allows: (feature: PlanFeature) => status === 'ready' && access[feature] && flags[feature],
  };
}
