'use client';

import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { READ_ONLY_MESSAGE, useReadOnly } from '@/lib/read-only';
import { useChatStore } from '@/store/chat-store';

/**
 * Sends a ready-made question to the assistant (POST /me/assistant, saved to the chat history),
 * with the same checks as typing one: the plan allows the assistant, AI credits remain, the
 * account is not read-only, and no answer is already on its way.
 */
export function useAsk() {
  const isTyping = useChatStore((s) => s.isTyping);
  const status = useChatStore((s) => s.status);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const readOnly = useReadOnly();
  const { snapshot, allows } = useSubscription();
  const outOfCredits = snapshot?.creditsRemaining !== null && (snapshot?.creditsRemaining ?? 0) < 1;
  const disabled = isTyping || status !== 'ready' || !allows('aiAssistant') || outOfCredits;

  function ask(question: string) {
    if (readOnly) {
      toast.info(READ_ONLY_MESSAGE);
      return;
    }
    if (disabled) return;
    void sendMessage(question).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Could not send your question.'),
    );
  }

  return { ask, disabled: disabled || readOnly };
}
