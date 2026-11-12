'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useSubscription } from '@/hooks/use-subscription';
import { useReadOnly } from '@/lib/read-only';
import { claimAiUsageAlert, type AiUsageAlert } from '@/lib/subscriptions/usage-alert';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import { useModalStore } from '@/store/modal-store';

/**
 * The AI credit warning: a pop-up when the farmer has used 90% of the month's AI credits, and
 * again when they are finished, each once a month (lib/subscriptions/usage-alert.ts). Credits
 * are shared by the AI Assistant and the Crop Doctor, so it lives app-wide. It waits for a
 * question to settle (a refunded one never triggers it) and for any open form to close.
 */
export function AiCreditsWarning() {
  const router = useRouter();
  const { snapshot, ready, plan } = useSubscription();
  const readOnly = useReadOnly();
  const answering = useChatStore((s) => s.isTyping);
  const formOpen = useModalStore((s) => s.modal !== null);
  const [alert, setAlert] = useState<AiUsageAlert | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!ready || readOnly || answering || !snapshot || alert) return;
    const next = claimAiUsageAlert(snapshot);
    if (!next) return;
    // Claimed (remembered) now; shown on the next tick so the render stays pure.
    setTimeout(() => mounted.current && setAlert(next), 0);
  }, [snapshot, ready, readOnly, answering, alert]);

  if (!alert) return null;
  const finished = alert.level === 'finished';

  return (
    <Modal
      open={!formOpen}
      onClose={() => setAlert(null)}
      title={alert.title}
      size="md"
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setAlert(null)}>
            Not now
          </Button>
          <Button
            icon={Sparkles}
            onClick={() => {
              setAlert(null);
              router.push('/settings/plans');
            }}
          >
            Upgrade plan
          </Button>
        </div>
      }
    >
      <div className="flex gap-4">
        <span
          className={cn(
            'inline-flex size-12 shrink-0 items-center justify-center rounded-2xl',
            finished ? 'bg-danger/15 text-ink-red' : 'bg-gold/20 text-ink-gold',
          )}
        >
          <TriangleAlert size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0 space-y-3">
          <p className="text-text-dim text-sm leading-relaxed">{alert.description}</p>
          <div>
            <div className="text-text-mute flex justify-between text-xs">
              <span>{plan.name} · monthly AI credits</span>
              <span className="font-semibold">{alert.percentage}% used</span>
            </div>
            <div
              role="progressbar"
              aria-label="Monthly AI credits used"
              aria-valuenow={alert.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              className="bg-glass-strong mt-1.5 h-1.5 overflow-hidden rounded-full"
            >
              <div
                className={cn('h-full rounded-full', finished ? 'bg-danger' : 'bg-gold')}
                style={{ width: `${alert.percentage}%` }}
              />
            </div>
          </div>
          <p className="text-text-mute text-xs">
            Shared by the AI Assistant and Crop Doctor. A question uses 1 credit and a crop scan
            uses 5. Failed requests are refunded.
          </p>
        </div>
      </div>
    </Modal>
  );
}
