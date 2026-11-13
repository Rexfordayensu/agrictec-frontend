'use client';

import { useEffect, useRef } from 'react';
import { MessageBubble } from '@/components/assistant/message-bubble';
import { TypingIndicator } from '@/components/assistant/typing-indicator';
import { Bot } from 'lucide-react';
import { useAsk } from '@/hooks/use-ask';
import { useChatStore } from '@/store/chat-store';

export function ChatWindow() {
  const messages = useChatStore((state) => state.messages);
  const isTyping = useChatStore((state) => state.isTyping);
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
      className="assistant-conversation min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 sm:px-5"
    >
      {isWelcome ? (
        <WelcomeBubble />
      ) : (
        <div className="space-y-6">
          <div
            aria-hidden="true"
            className="text-text-mute flex items-center gap-3 text-xs font-medium tracking-wide"
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

const EXAMPLES = [
  'How do I prepare my farm for the next planting season?',
  'What records do I need for a loan?',
  'How can I improve my financial profile?',
  'What is the current market price for maize?',
  'How can I control pests on my crops?',
];

/** The assistant's greeting, with example questions the farmer can tap to ask. */
function WelcomeBubble() {
  const { ask, disabled } = useAsk();
  return (
    <div className="assistant-welcome flex items-start gap-3">
      <span
        aria-hidden="true"
        className="bg-accent/12 text-ink-green inline-flex size-10 shrink-0 items-center justify-center rounded-full"
      >
        <Bot size={20} />
      </span>
      <div className="border-border bg-bg-2 text-text max-w-xl rounded-2xl rounded-tl-md border px-4 py-3.5 text-sm leading-relaxed">
        <p>Hello! 👋</p>
        <p>I’m your AgriCtec AI Assistant. You can ask me questions like:</p>
        <ul className="mt-2 space-y-1">
          {EXAMPLES.map((q) => (
            <li key={q} className="flex gap-2">
              <span aria-hidden="true">•</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => ask(q)}
                className="hover:text-ink-green text-left underline-offset-2 hover:underline disabled:no-underline"
              >
                {q}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3">What would you like to know today?</p>
      </div>
    </div>
  );
}
