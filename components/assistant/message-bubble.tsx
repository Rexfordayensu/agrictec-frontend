import { Bot, UserRound } from 'lucide-react';
import { MessageContent } from '@/components/assistant/message-content';
import { ReplyAudioButton } from '@/components/assistant/reply-audio-button';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types';

const timeFormat = new Intl.DateTimeFormat('en-GH', { hour: '2-digit', minute: '2-digit' });

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const Icon = isUser ? UserRound : Bot;

  return (
    <div className={cn('flex items-start gap-2 sm:gap-3', isUser && 'flex-row-reverse')}>
      <div
        aria-hidden="true"
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-xl border sm:size-9',
          isUser
            ? 'border-emerald-600/30 bg-emerald-700 text-white'
            : 'border-purple/20 bg-purple/10 text-ink-purple',
        )}
      >
        <Icon size={17} />
      </div>
      <div className={cn('min-w-0', isUser ? 'max-w-[85%]' : 'flex-1')}>
        <span className="sr-only">{isUser ? 'You' : 'AgriCtec assistant'}</span>
        <div
          className={cn(
            'rounded-2xl px-4 py-3.5 text-sm leading-relaxed [overflow-wrap:anywhere] sm:text-[15px]',
            isUser
              ? 'rounded-tr-sm bg-linear-to-br from-emerald-700 to-emerald-800 text-white shadow-sm'
              : 'border-border bg-glass text-text rounded-tl-sm border',
          )}
        >
          <MessageContent content={message.content} isAssistant={!isUser} />
        </div>
        <div className={cn('mt-1 flex flex-wrap items-center gap-x-3', isUser && 'justify-end')}>
          {!isUser && <ReplyAudioButton content={message.content} />}
          <time
            dateTime={message.createdAt}
            title={new Date(message.createdAt).toLocaleString('en-GH')}
            className={cn('text-text-mute mt-1.5 block px-1 text-[10px]', isUser && 'text-right')}
          >
            {isUser ? 'You' : 'AgriCtec'} · {timeFormat.format(new Date(message.createdAt))}
          </time>
        </div>
      </div>
    </div>
  );
}
