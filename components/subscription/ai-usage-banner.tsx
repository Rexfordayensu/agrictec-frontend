'use client';

import Link from 'next/link';
import { useSubscription } from '@/hooks/use-subscription';
import { AI_COSTS } from '@/lib/subscriptions/plans';
import { cn } from '@/lib/utils';

export function AiUsageBanner({ feature }: { feature: keyof typeof AI_COSTS }) {
  const { plan, snapshot, ready } = useSubscription();
  const remaining = snapshot?.creditsRemaining ?? null;
  const limit = snapshot?.creditsLimit ?? null;
  const percentage =
    snapshot && limit !== null && limit > 0
      ? Math.min(100, Math.max(0, Math.floor((snapshot.creditsUsed / limit) * 100)))
      : null;
  const cost = AI_COSTS[feature];
  const exhausted =
    ready &&
    snapshot !== null &&
    limit !== null &&
    limit > 0 &&
    remaining !== null &&
    remaining < cost;
  const warning = percentage !== null && percentage >= 80;
  const critical = exhausted || (percentage !== null && percentage >= 95);
  const resetDate = snapshot
    ? new Date(snapshot.resetsAt).toLocaleDateString('en-GH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Africa/Accra',
      })
    : '';
  return (
    <div
      className={cn(
        'text-text-dim flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-4 py-3 text-xs',
        critical
          ? 'border-danger/30 bg-danger/5'
          : warning
            ? 'border-gold/30 bg-gold/5'
            : 'border-accent/20 bg-accent/5',
      )}
      role={warning || exhausted ? 'alert' : 'status'}
      aria-atomic="true"
    >
      <div className="min-w-0 flex-1 basis-52">
        <p className="text-text font-semibold">
          {plan.name} ·{' '}
          {!ready || !snapshot
            ? 'Loading AI credit usage…'
            : remaining === null
              ? 'Unlimited AI credits'
              : `${remaining} of ${snapshot?.creditsLimit ?? 0} AI credits left`}
        </p>
        {ready && percentage !== null && (
          <>
            <p
              className={cn(
                'mt-1 font-semibold',
                critical ? 'text-ink-red' : warning ? 'text-ink-gold' : 'text-ink-green',
              )}
            >
              You have used {percentage}% of your monthly AI credits.
            </p>
            <progress
              value={percentage}
              max={100}
              aria-label="Monthly AI credits used"
              aria-valuetext={`${percentage}% used, ${remaining} credits remaining`}
              className={cn(
                'mt-2 block h-1.5 w-full overflow-hidden rounded-full',
                critical ? 'accent-danger' : warning ? 'accent-gold' : 'accent-accent',
              )}
            />
          </>
        )}
        <p className="mt-1">
          {cost} {cost === 1 ? 'credit' : 'credits'} per{' '}
          {feature === 'aiAssistant' ? 'question' : 'scan'}. Failed requests are refunded.
        </p>
        {ready && snapshot && (warning || exhausted) && (
          <p className={cn('mt-1 font-semibold', critical ? 'text-ink-red' : 'text-ink-gold')}>
            {remaining === 0
              ? 'Your AI credits are finished.'
              : exhausted
                ? `You need ${cost} credits for another scan; you have ${remaining} left.`
                : percentage !== null && percentage >= 95
                  ? 'Your AI credits are almost finished.'
                  : 'Your AI credits are running low.'}{' '}
            {remaining === 0 ? 'Upgrade your plan or wait for the reset' : 'Credits reset'} on{' '}
            {resetDate}.
          </p>
        )}
        {ready && percentage !== null && (
          <p className="mt-1 text-[11px]">Shared by AI Assistant and Crop Doctor.</p>
        )}
      </div>
      <Link
        href="/settings/plans"
        className="text-ink-green inline-flex min-h-9 items-center font-semibold underline underline-offset-4"
      >
        View plan &amp; usage
      </Link>
    </div>
  );
}
