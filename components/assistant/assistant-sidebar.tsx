'use client';

import Link from 'next/link';
import {
  ArrowLeftRight,
  ChevronRight,
  FileText,
  Landmark,
  Layers,
  Lightbulb,
  Bug,
  ChartNoAxesColumnIncreasing,
  Sparkles,
  Sprout,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { useAsk } from '@/hooks/use-ask';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { getRecommendations } from '@/lib/ai/recommendations';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';

/** The right-hand column: the farmer's own numbers, a next step, and topics to ask about. */
export function AssistantSidebar() {
  return (
    <aside aria-label="Your farm and topics" className="assistant-sidebar space-y-5">
      <FarmGlance />
      <Insights />
      <PopularTopics />
    </aside>
  );
}

/** Counts from the farmer's saved records and MoMo entries (GET /me/records, /me/momo). */
function FarmGlance() {
  const status = useFarmStore((s) => s.status);
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const total = records.length + momo.length;
  const verified = [...records, ...momo].filter((e) => e.verificationStatus === 'verified').length;
  const share = total ? Math.round((verified / total) * 100) : 0;
  const rows: { icon: LucideIcon; label: string; value: string; href: string; strong?: boolean }[] =
    [
      {
        icon: Warehouse,
        label: 'Farm records',
        value: `${records.length} ${records.length === 1 ? 'record' : 'records'}`,
        href: '/records',
        strong: true,
      },
      {
        icon: ArrowLeftRight,
        label: 'MoMo transactions',
        value: `${momo.length} ${momo.length === 1 ? 'transaction' : 'transactions'}`,
        href: '/momo',
      },
      {
        icon: FileText,
        label: 'Verified transactions',
        value: `${verified} (${share}%)`,
        href: '/reports',
      },
    ];
  return (
    <section aria-labelledby="glance-title" className={cn(dashPanel, 'assistant-glance')}>
      <Link href="/records" className="group flex items-center gap-3">
        <Sprout size={20} aria-hidden="true" className="text-icon" />
        <h2 id="glance-title" className="text-text flex-1 text-lg font-bold">
          Your farm at a glance
        </h2>
        <ChevronRight
          size={18}
          aria-hidden="true"
          className="text-text-mute group-hover:text-text"
        />
      </Link>
      {status !== 'ready' ? (
        <p className="text-text-dim mt-4 text-sm">
          {status === 'error'
            ? 'Your farm records could not be loaded. Refresh to try again.'
            : 'Loading your farm records…'}
        </p>
      ) : (
        <ul className="border-border divide-border mt-4 divide-y rounded-2xl border">
          {rows.map((r) => (
            <li key={r.label}>
              <Link
                href={r.href}
                className="hover:bg-glass-strong flex items-center gap-3 px-4 py-3"
              >
                <r.icon size={20} aria-hidden="true" className="text-icon shrink-0" />
                <span className="text-text flex-1 text-sm">{r.label}</span>
                <span className={cn('text-text text-sm tabular-nums', r.strong && 'font-bold')}>
                  {r.value}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** The most useful next step, worked out from the farmer's own records and profile. */
function Insights() {
  const stats = useFarmStats();
  const flags = usePlatformStore((s) => s.flags);
  const status = useFarmStore((s) => s.status);
  const items = (
    stats.recordCount === 0
      ? [
          {
            id: 'first-record',
            title: 'Get started with your records',
            text: 'Add your first farm record (e.g., maize planting, fertilizer purchase or farm labour) to get more useful and personalised advice.',
            cta: { href: '/records', label: 'Add a record' },
          },
        ]
      : getRecommendations(stats)
  )
    .filter((item) => {
      if (item.cta.href.startsWith('/loans')) return flags.loans;
      if (item.cta.href.startsWith('/yield-predictor')) return flags.yieldPredictor;
      if (item.cta.href.startsWith('/crop-doctor')) return flags.cropDoctor;
      return true;
    })
    .slice(0, 1);
  return (
    <section aria-labelledby="insights-title" className={cn(dashPanel, 'assistant-insights')}>
      <h2 id="insights-title" className="text-text flex items-center gap-3 text-lg font-bold">
        <Sparkles size={20} aria-hidden="true" className="text-icon" />
        Personalised insights
      </h2>
      {status !== 'ready' ? (
        <p className="text-text-dim mt-4 text-sm">
          Your insights will appear when your farm records load.
        </p>
      ) : items.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">
          You’re up to date. Keep recording your farm activity.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.cta.href}
                className="bg-accent/8 hover:bg-accent/12 flex items-start gap-3 rounded-2xl p-4 transition-colors"
              >
                <Lightbulb
                  size={20}
                  aria-hidden="true"
                  className="text-ink-green mt-0.5 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="text-text block text-sm font-bold">{item.title}</span>
                  <span className="text-text-dim text-small mt-1 block leading-relaxed">
                    {item.text}
                  </span>
                </span>
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="text-text-mute mt-1 shrink-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const POPULAR: { label: string; question: string; icon: LucideIcon; tone: string }[] = [
  {
    label: 'Crop planning and best practices',
    question: 'What are the best practices for planning my crops this season?',
    icon: Sprout,
    tone: 'bg-icon-bg text-icon',
  },
  {
    label: 'Pest and disease management',
    question: 'How do I prevent and manage pests and diseases on my farm?',
    icon: Bug,
    tone: 'bg-gold/15 text-ink-gold',
  },
  {
    label: 'Market prices and selling tips',
    question:
      'What are the current market prices for my crops, and how can I get a better price when I sell?',
    icon: ChartNoAxesColumnIncreasing,
    tone: 'bg-icon-bg text-icon',
  },
  {
    label: 'Financial records and reporting',
    question: 'Which financial records should I keep, and how do I read my farm report?',
    icon: FileText,
    tone: 'bg-info/12 text-ink-blue',
  },
  {
    label: 'Loan requirements and preparation',
    question: 'What do lenders usually require for a farm loan, and how do I prepare?',
    icon: Landmark,
    tone: 'bg-icon-bg text-icon',
  },
];

/** Each topic asks the assistant (POST /me/assistant), saved to the conversation. */
function PopularTopics() {
  const { ask, disabled } = useAsk();
  return (
    <section aria-labelledby="popular-title" className={cn(dashPanel, 'assistant-popular')}>
      <h2 id="popular-title" className="text-text flex items-center gap-3 text-lg font-bold">
        <Layers size={20} aria-hidden="true" className="text-icon" />
        Popular topics
      </h2>
      <ul className="divide-border mt-3 divide-y">
        {POPULAR.map((t) => (
          <li key={t.label}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => ask(t.question)}
              className="hover:bg-glass-strong -mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-3 text-left disabled:opacity-60"
            >
              <span
                className={cn(
                  'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                  t.tone,
                )}
              >
                <t.icon size={20} aria-hidden="true" />
              </span>
              <span className="text-text flex-1 text-sm font-medium">{t.label}</span>
              <ChevronRight size={16} aria-hidden="true" className="text-text-mute shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
