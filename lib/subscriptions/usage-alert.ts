import { GHANA_TIME_ZONE } from '@/lib/format';
import { storage } from '@/services/storage';
import type { SubscriptionSnapshot } from '@/types/subscription';

const shown = new Set<string>();

/** "low": 90% of the month's AI credits used. "finished": all of them. */
export type AiUsageLevel = 'low' | 'finished';

export interface AiUsageAlert {
  id: string;
  level: AiUsageLevel;
  percentage: number;
  title: string;
  description: string;
}

export function aiUsageAlertId(userId: string, resetsAt: string, level: AiUsageLevel = 'low') {
  return `ai-usage-${level === 'low' ? '90' : '100'}:${userId}:${resetsAt}`;
}

const resetDay = (resetsAt: string) =>
  new Date(resetsAt).toLocaleDateString('en-GH', {
    day: 'numeric',
    month: 'short',
    timeZone: GHANA_TIME_ZONE,
  });

/**
 * The upgrade warning for the AI credit pop-up (components/subscription/ai-credits-warning.tsx):
 * once at 90% and once when the credits are finished, per account and monthly allowance,
 * remembered after reloads on this device. Null when there is nothing new to say (unlimited or
 * no AI plan, below 90%, already shown, or an admin's read-only view).
 */
export function claimAiUsageAlert(snapshot: SubscriptionSnapshot): AiUsageAlert | null {
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
  const { userId } = snapshot.subscription;
  const level: AiUsageLevel = snapshot.creditsUsed >= limit ? 'finished' : 'low';
  const id = aiUsageAlertId(userId, snapshot.resetsAt, level);
  if (shown.has(id) || storage.get(id, false)) return null;
  // Finished covers "nearly finished" too: the 90% warning never follows it this month.
  const ids = level === 'finished' ? [id, aiUsageAlertId(userId, snapshot.resetsAt, 'low')] : [id];
  for (const key of ids) {
    storage.set(key, true);
    shown.add(key);
  }
  const percentage = Math.min(100, Math.floor((snapshot.creditsUsed / limit) * 100));
  return level === 'finished'
    ? {
        id,
        level,
        percentage,
        title: 'Your AI credits are finished',
        description: `You have used all your monthly AI credits. Upgrade your plan to keep using the AI Assistant and Crop Doctor, or wait until your credits reset on ${resetDay(snapshot.resetsAt)}.`,
      }
    : {
        id,
        level,
        percentage,
        title: 'Your AI credits are nearly finished',
        description: `You have used ${percentage}% of your monthly AI credits. ${snapshot.creditsRemaining ?? 0} credits remain. You can upgrade your plan to keep using the AI Assistant and Crop Doctor.`,
      };
}
