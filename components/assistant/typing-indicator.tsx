import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <div role="status" aria-label="Assistant is typing" className="flex items-start gap-2 sm:gap-3">
      <div
        aria-hidden="true"
        className="border-purple/20 bg-purple/10 text-ink-purple inline-flex size-8 shrink-0 items-center justify-center rounded-xl border sm:size-9"
      >
        <Bot size={17} />
      </div>
      <div
        aria-hidden="true"
        className="border-border bg-glass flex h-11 items-center gap-1.5 rounded-2xl rounded-tl-sm border px-4"
      >
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="bg-ink-purple/60 animate-typing size-1.5 rounded-full motion-reduce:animate-none"
            style={{ animationDelay: `${dot * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
