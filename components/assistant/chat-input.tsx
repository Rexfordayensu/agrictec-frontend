'use client';

import { READ_ONLY_MESSAGE, useReadOnly } from '@/lib/read-only';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, CornerDownLeft, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/store/chat-store';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';
import { startDictation } from '@/lib/ai/voice';

export function ChatInput() {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const dictation = useRef<ReturnType<typeof startDictation> | null>(null);
  const isTyping = useChatStore((state) => state.isTyping);
  const status = useChatStore((state) => state.status);
  const { snapshot, allows } = useSubscription();
  const sendMessage = useChatStore((state) => state.sendMessage);
  const readOnly = useReadOnly();
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const disabled =
    isTyping ||
    status !== 'ready' ||
    !allows('aiAssistant') ||
    (snapshot?.creditsRemaining !== null && (snapshot?.creditsRemaining ?? 0) < 1);

  useEffect(() => {
    const controller = dictation;
    return () => {
      controller.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (disabled || readOnly) dictation.current?.stop();
  }, [disabled, readOnly]);

  function microphone() {
    if (listening) {
      dictation.current?.stop();
      return;
    }
    if (disabled || readOnly) return;
    const prefix = text.trim();
    try {
      setListening(true);
      dictation.current = startDictation({
        onText: (spoken) => {
          const next = [prefix, spoken].filter(Boolean).join(' ');
          setText(next.slice(0, 500));
          if (next.length >= 500) dictation.current?.stop();
        },
        onEnd: () => {
          setListening(false);
          inputRef.current?.focus();
        },
        onError: (message) => toast.error(message),
      });
    } catch (error) {
      setListening(false);
      toast.error(error instanceof Error ? error.message : 'Voice input is unavailable.');
    }
  }

  useEffect(() => {
    if (!disabled && restoreFocus.current) {
      inputRef.current?.focus();
      restoreFocus.current = false;
    }
  }, [disabled]);

  function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || listening || !text.trim()) return;
    restoreFocus.current = true;
    void sendMessage(text).catch((error: unknown) =>
      toast.error(error instanceof Error ? error.message : 'Could not send your message.'),
    );
    setText('');
  }

  return (
    <form onSubmit={send}>
      <div className="border-border bg-bg-2/60 focus-within:border-accent/50 focus-within:ring-accent/10 flex items-center gap-2 rounded-2xl border p-2 transition-shadow focus-within:ring-2">
        <Input
          ref={inputRef}
          aria-label="Message the assistant"
          aria-describedby={text.length > 400 ? 'chat-character-count' : undefined}
          placeholder={readOnly ? READ_ONLY_MESSAGE : 'Ask about your farm…'}
          value={text}
          maxLength={500}
          disabled={disabled || readOnly || listening}
          className="min-w-0 border-0 bg-transparent px-2 focus:shadow-none"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.shiftKey || event.nativeEvent.isComposing)) {
              event.preventDefault();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          icon={listening ? Square : Mic}
          mutates
          aria-label={listening ? 'Stop microphone' : 'Speak your question'}
          aria-pressed={listening}
          title={
            listening ? 'Stop recording and review your question' : 'Speak your question in English'
          }
          disabled={disabled || readOnly}
          onClick={microphone}
          className="size-10 min-h-10 shrink-0 rounded-xl px-0"
        >
          <span className="sr-only">{listening ? 'Stop microphone' : 'Microphone'}</span>
        </Button>
        <Button
          type="submit"
          icon={ArrowUp}
          mutates
          aria-label="Send message"
          disabled={disabled || listening || !text.trim()}
          className="size-10 min-h-10 shrink-0 rounded-xl px-0"
        >
          <span className="sr-only">Send</span>
        </Button>
      </div>
      <p role="status" aria-live="polite" className="text-text-dim mt-2 text-[11px]">
        {listening
          ? 'Listening… Speak in English, then press stop to review your question.'
          : 'Tap the microphone to speak. Review the text before sending.'}
      </p>
      <div className="text-text-mute mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px]">
        <p>Guidance for your farm. Confirm local conditions.</p>
        {text.length > 400 ? (
          <p id="chat-character-count" className="tabular-nums">
            {text.length}/500 characters
          </p>
        ) : (
          <span className="hidden items-center gap-1 sm:inline-flex">
            <CornerDownLeft size={11} aria-hidden="true" />
            Enter to send
          </span>
        )}
      </div>
    </form>
  );
}
