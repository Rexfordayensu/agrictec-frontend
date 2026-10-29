'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { useReadOnly } from '@/lib/read-only';
import { claimAiUsageAlert } from '@/lib/subscriptions/usage-alert';
import { useChatStore } from '@/store/chat-store';

export function useAiCreditWarning() {
  const router = useRouter();
  const { snapshot, ready } = useSubscription();
  const readOnly = useReadOnly();
  const chatUser = useChatStore((state) => state.userId);
  const isTyping = useChatStore((state) => state.isTyping);
  const status = useChatStore((state) => state.status);
  const userId = snapshot?.subscription.userId;

  useEffect(() => {
    // Wait for settlement so a failed/refunded question cannot trigger a low-credit warning.
    if (!ready || readOnly || isTyping || status !== 'ready' || !snapshot || userId !== chatUser)
      return;
    const alert = claimAiUsageAlert(snapshot);
    if (!alert) return;
    toast.warning(alert.title, {
      id: alert.id,
      description: alert.description,
      duration: 10000,
      action: { label: 'Upgrade plan', onClick: () => router.push('/settings/plans') },
    });
  }, [snapshot, ready, readOnly, isTyping, status, userId, chatUser, router]);
}
