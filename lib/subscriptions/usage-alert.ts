import { storage } from '@/services/storage';
import type { SubscriptionSnapshot } from '@/types/subscription';

const shown = new Set<string>();

export function aiUsageAlertId(userId: string, resetsAt: string) {
  return `ai-usage-90:${userId}:${resetsAt}`;
}

/** One warning per account and monthly allowance, including after reloads on this device. */
export function claimAiUsageAlert(snapshot: SubscriptionSnapshot) {
  const limit = snapshot.creditsLimit;
  if (
    typeof window === 'undefined' ||
    storage.isReadOnly() ||
    limit === null ||
    !Number.isFinite(limit) ||
    limit <= 0 ||
    !Number.isFinite(snapshot.creditsUsed) ||
    snapshot.creditsUsed / limit < 0.9
  )
    return null;
  const id = aiUsageAlertId(snapshot.subscription.userId, snapshot.resetsAt);
  if (shown.has(id) || storage.get(id, false)) return null;
  storage.set(id, true);
  shown.add(id);
  const percentage = Math.min(100, Math.floor((snapshot.creditsUsed / limit) * 100));
  return {
    id,
    title:
      percentage >= 100 ? 'Your AI credits are finished' : 'Your AI credits are nearly finished',
    description: `You have used ${percentage}% of your monthly AI credits. ${snapshot.creditsRemaining ?? 0} credits remain. Would you like to upgrade your plan?`,
  };
}
