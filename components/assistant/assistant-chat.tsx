'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChatInput } from '@/components/assistant/chat-input';
import { ChatWindow } from '@/components/assistant/chat-window';
import { HelpTopics } from '@/components/assistant/help-topics';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { notifyReadOnly, readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';

/**
 * The conversation (GET /me/chat, each question answered and saved by POST /me/assistant),
 * with the topic cards above it and the message box below.
 */
export function AssistantChat() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isTyping = useChatStore((state) => state.isTyping);
  const status = useChatStore((state) => state.status);
  const userId = useChatStore((state) => state.userId);
  const clear = useChatStore((state) => state.clear);
  const hasConversation = useChatStore((state) => state.messages.length > 1);
  const readOnly = useReadOnly();

  async function clearChat() {
    setIsClearing(true);
    try {
      await clear();
      setConfirmOpen(false);
    } catch {
      toast.error('Could not clear your chat. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Card
      padding="none"
      className="assistant-chat flex h-[calc(100svh-17rem)] min-h-[36rem] min-w-0 flex-col rounded-3xl"
    >
      <div className="border-border shrink-0 border-b px-4 pt-5 pb-4 sm:px-6">
        <HelpTopics />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {hasConversation && (
          <button
            type="button"
            {...readOnlyProps(readOnly)}
            disabled={isTyping || status !== 'ready' || isClearing}
            onClick={readOnly ? notifyReadOnly : () => setConfirmOpen(true)}
            className={cn(
              'border-border bg-bg-2 text-text-mute hover:text-text absolute top-3 right-4 z-10 inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold disabled:opacity-50',
              readOnly && READ_ONLY_CLASS,
            )}
          >
            <Trash2 size={13} aria-hidden="true" /> Clear chat
          </button>
        )}
        <ChatWindow />
      </div>
      <div className="assistant-composer shrink-0 px-4 pt-3 pb-4 sm:px-6">
        <ChatInput key={userId} />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Clear chat?"
        message="This removes your conversation history. The welcome message will remain so you can start again."
        confirmLabel="Clear chat"
        danger
        loading={isClearing}
        onConfirm={() => void clearChat()}
        onCancel={() => {
          if (!isClearing) setConfirmOpen(false);
        }}
      />
    </Card>
  );
}
