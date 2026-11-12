'use client';

import { useRef } from 'react';
import {
  Bug,
  ChevronRight,
  CloudSun,
  Database,
  Landmark,
  Sprout,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useAsk } from '@/hooks/use-ask';
import { cn } from '@/lib/utils';

/** Each card asks the assistant a full question about the farmer's own situation. */
const TOPICS: { title: string; text: string; question: string; icon: LucideIcon; tone: string }[] =
  [
    {
      title: 'Plan a crop',
      text: 'Get guidance on what and when to plant',
      question:
        'Which crop should I plan for the next season on my farm, and when should I plant it?',
      icon: Sprout,
      tone: 'border-accent/25 bg-accent/6 [--icon:var(--color-ink-green)]',
    },
    {
      title: 'Manage pests',
      text: 'Identify and control crop pests and diseases',
      question: 'How can I identify and control the common pests and diseases on my crops?',
      icon: Bug,
      tone: 'border-gold/30 bg-gold/8 [--icon:var(--color-ink-gold)]',
    },
    {
      title: 'Farm finances',
      text: 'Understand your income, expenses and cash flow',
      question:
        'How are my farm income, expenses and cash flow looking, and what should I improve?',
      icon: Database,
      tone: 'border-info/25 bg-info/6 [--icon:var(--color-ink-blue)]',
    },
    {
      title: 'Loan readiness',
      text: 'Know what to improve for a loan application',
      question: 'What should I improve in my records before I apply for a farm loan?',
      icon: Landmark,
      tone: 'border-purple/25 bg-purple/6 [--icon:var(--color-ink-purple)]',
    },
    {
      title: 'Market prices',
      text: 'Make a more informed sale',
      question: 'What are the current market prices for my crops, and when is a good time to sell?',
      icon: TrendingUp,
      tone: 'border-gold/30 bg-gold/8 [--icon:var(--color-ink-gold)]',
    },
    {
      title: 'Weather',
      text: 'Plan your next days in the field',
      question: 'How should I plan my farm work around the weather this week?',
      icon: CloudSun,
      tone: 'border-info/25 bg-info/6 [--icon:var(--color-ink-blue)]',
    },
  ];

export function HelpTopics() {
  const { ask, disabled } = useAsk();
  const row = useRef<HTMLDivElement>(null);
  return (
    <section aria-labelledby="help-title" className="assistant-help">
      <h2 id="help-title" className="text-text text-xl font-bold">
        How can I help you today?
      </h2>
      <div className="relative mt-4">
        <div
          ref={row}
          // Inline: the global scrollbar rule in globals.css is unlayered, so it beats utilities.
          style={{ scrollbarWidth: 'none' }}
          className="assistant-topic-row -mx-1 flex snap-x gap-4 overflow-x-auto scroll-smooth px-1 pb-2"
        >
          {TOPICS.map((t) => (
            <button
              key={t.title}
              type="button"
              disabled={disabled}
              onClick={() => ask(t.question)}
              className={cn(
                'w-44 shrink-0 snap-start rounded-2xl border p-4 text-left transition-colors hover:brightness-[0.98] disabled:opacity-60 sm:w-[11.5rem]',
                t.tone,
              )}
            >
              <span className="bg-glass-strong inline-flex size-10 items-center justify-center rounded-xl">
                <t.icon size={20} aria-hidden="true" className="text-[var(--icon)]" />
              </span>
              <span className="text-text mt-3 block text-[15px] font-bold">{t.title}</span>
              <span className="text-text-dim mt-1 block text-[13px] leading-snug">{t.text}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="More topics"
          onClick={() => row.current?.scrollBy({ left: 220, behavior: 'smooth' })}
          className="border-border bg-bg-2 text-text absolute top-1/2 -right-3 hidden size-9 -translate-y-1/2 items-center justify-center rounded-full border shadow-md sm:inline-flex"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
