'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { QuickPrompts } from '@/components/assistant/quick-prompts';
import { TypingIndicator } from '@/components/assistant/typing-indicator';
import { Bot, Sprout } from 'lucide-react';
import { useChatStore } from '@/store/chat-store';
import { useProfileStore } from '@/store/profile-store';

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
  const name = useProfileStore((state) => state.profile?.name.trim().split(/\s+/)[0]);
  const isWelcome = messages.length === 1 && messages[0].role === 'ai' && !isTyping;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll) scroll.scrollTop = isWelcome ? 0 : scroll.scrollHeight;
  }, [messages, isTyping, isWelcome]);

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-label="Conversation with AgriCtec assistant"
      aria-live="polite"
      aria-relevant="additions text"
      tabIndex={0}
      className="bg-bg-2/40 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-5"
    >
      {isWelcome ? (
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center">
          <div className="mb-6 text-center">
            <div
              aria-hidden="true"
              className="border-accent/20 from-accent/15 text-ink-green relative mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border bg-linear-to-br to-transparent"
            >
              <Bot size={28} strokeWidth={1.5} />
              <span className="bg-glass-strong border-border absolute -right-2 -bottom-1 rounded-lg border p-1">
                <Sprout size={13} />
              </span>
            </div>
            <p className="text-ink-green text-[10px] font-semibold tracking-[0.16em] uppercase">
              {name ? `Akwaaba, ${name}` : 'Welcome to your farm assistant'}
            </p>
            <h3 className="font-display text-text mt-2 text-2xl font-bold">
              What’s on your mind today?
            </h3>
            <p className="text-text-mute mx-auto mt-2 max-w-sm text-xs leading-relaxed">
              Ask about your crops, plan for the weather, or make sense of your farm finances.
            </p>
          </div>
          <QuickPrompts variant="starter" />
        </div>
      ) : (
        <div className="space-y-6">
          <div
            aria-hidden="true"
            className="text-text-mute flex items-center gap-3 text-[10px] font-medium tracking-wide"
          >
            <span className="bg-border h-px flex-1" />
            Your conversation
            <span className="bg-border h-px flex-1" />
          </div>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {isTyping && <TypingIndicator />}
        </div>
      )}
    </div>
  );
}
