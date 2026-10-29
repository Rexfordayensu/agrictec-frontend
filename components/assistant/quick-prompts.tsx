'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import {
  ArrowUpRight,
  Bug,
  ChartNoAxesCombined,
  CloudSun,
  ShieldCheck,
  Sprout,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/store/chat-store';
import { useSubscription } from '@/hooks/use-subscription';
import { toast } from 'sonner';

const prompts = [
  {
    label: 'Maize planting',
    description: 'Find the right time to sow',
    icon: Sprout,
    tone: 'bg-accent/10 text-ink-green',
  },
  {
    label: 'Pest control',
    description: 'Protect what you’re growing',
    icon: Bug,
    tone: 'bg-gold/10 text-ink-gold',
  },
  {
    label: 'Credit tips',
    description: 'Build your financial identity',
    icon: ShieldCheck,
    tone: 'bg-purple/10 text-ink-purple',
  },
  {
    label: 'Cocoa prices',
    description: 'Make a more informed sale',
    icon: TrendingUp,
    tone: 'bg-gold/10 text-ink-gold',
  },
  {
    label: 'My finances',
    description: 'See how your farm is doing',
    icon: ChartNoAxesCombined,
    tone: 'bg-info/10 text-ink-blue',
  },
  {
    label: 'Weather',
    description: 'Plan your next day in the field',
    icon: CloudSun,
    tone: 'bg-info/10 text-ink-blue',
  },
];

export function QuickPrompts({ variant = 'compact' }: { variant?: 'compact' | 'starter' }) {
  const isTyping = useChatStore((state) => state.isTyping);
  const status = useChatStore((state) => state.status);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const readOnly = useReadOnly();
  const { snapshot, allows } = useSubscription();
  const unavailable =
    !allows('aiAssistant') ||
    (snapshot?.creditsRemaining !== null && (snapshot?.creditsRemaining ?? 0) < 1);
  const starter = variant === 'starter';

  return (
    <div
      role="group"
      aria-label="Quick prompts"
      className={cn(
        starter ? 'grid grid-cols-2 gap-2.5 @md:grid-cols-3' : 'mb-3 flex flex-wrap gap-1.5',
      )}
    >
      {prompts.map(({ label, description, icon: Icon, tone }) => (
        <button
          key={label}
          type="button"
          disabled={isTyping || status !== 'ready' || unavailable}
          {...readOnlyProps(readOnly)}
          onClick={
            readOnly
              ? undefined
              : () =>
                  void sendMessage(label).catch((error: unknown) =>
                    toast.error(
                      error instanceof Error ? error.message : 'Could not send your question.',
                    ),
                  )
          }
          className={cn(
            readOnly && READ_ONLY_CLASS,
            'group border-border bg-glass hover:border-accent/40 hover:bg-glass-strong text-left transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
            starter
              ? 'rounded-2xl border p-3 sm:p-3.5'
              : 'text-text-dim flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px]',
          )}
        >
          {starter ? (
            <>
              <span className="flex items-center justify-between gap-2">
                <span
                  className={cn('inline-flex size-8 items-center justify-center rounded-xl', tone)}
                >
                  <Icon size={16} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  size={14}
                  aria-hidden="true"
                  className="text-text-mute group-hover:text-ink-green transition-colors"
                />
              </span>
              <span className="text-text mt-2 block text-xs font-semibold">{label}</span>
              <span className="text-text-mute mt-1 hidden text-[11px] leading-relaxed sm:block">
                {description}
              </span>
            </>
          ) : (
            <>
              <Icon size={13} aria-hidden="true" className="text-ink-green" />
              {label}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
