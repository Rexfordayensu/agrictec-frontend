'use client';

import { useState } from 'react';
import { Bot, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ChatInput } from '@/components/assistant/chat-input';
import { ChatWindow } from '@/components/assistant/chat-window';
import { QuickPrompts } from '@/components/assistant/quick-prompts';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useChatStore } from '@/store/chat-store';
import { useAiCreditWarning } from '@/hooks/use-ai-credit-warning';

export function AssistantChat() {
  useAiCreditWarning();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const isTyping = useChatStore((state) => state.isTyping);
  const status = useChatStore((state) => state.status);
  const userId = useChatStore((state) => state.userId);
  const clear = useChatStore((state) => state.clear);
  const hasConversation = useChatStore((state) => state.messages.length > 1);

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
      className="flex h-[calc(100svh-8rem)] min-h-[36rem] min-w-0 flex-col rounded-3xl min-[900px]:min-h-[42rem]"
    >
      <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="border-accent/20 bg-accent/10 text-ink-green flex size-10 shrink-0 items-center justify-center rounded-2xl border">
            <Bot size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-text text-sm font-bold">Chat with AI</h3>
            <p className="text-text-mute mt-1 flex items-center gap-1.5 text-[11px]">
              <span aria-hidden="true" className="bg-accent size-1.5 rounded-full" />
              {isTyping ? 'Preparing your answer' : 'Your farming companion'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={Trash2}
          mutates
          disabled={isTyping || status !== 'ready' || isClearing || !hasConversation}
          onClick={() => setConfirmOpen(true)}
          className="text-text-mute shrink-0 border-0 bg-transparent shadow-none backdrop-blur-none"
        >
          Clear chat
        </Button>
      </div>
      <ChatWindow />
      <div className="border-border bg-glass shrink-0 border-t px-4 py-3 sm:px-6">
        {hasConversation && (
          <details className="mb-2">
            <summary className="text-text-dim focus-visible:outline-accent cursor-pointer rounded text-xs font-medium">
              Suggested questions
            </summary>
            <div className="mt-2">
              <QuickPrompts />
            </div>
          </details>
        )}
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
