'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { getDailyInsight, getInsightCount } from '@/lib/ai/recommendations';
import { useModalStore } from '@/store/modal-store';
import { useSettingsStore } from '@/store/settings-store';

const ROTATE_MS = 15_000;

const controlClass =
  'inline-flex size-9 items-center justify-center rounded-lg border border-border bg-glass text-text-dim transition-colors hover:bg-glass-strong hover:text-text';

/** Slim AI insight strip: rotates every 15s, with previous/next controls. */
export function InsightBanner() {
  const stats = useFarmStats();
  const openModal = useModalStore((s) => s.openModal);
  const [index, setIndex] = useState(0);
  const insightsEnabled = useSettingsStore((state) => state.notifications.aiInsights);

  // A timeout per index (not an interval) so a manual prev/next restarts the 15s countdown.
  useEffect(() => {
    if (!stats.hasData || !insightsEnabled) return;
    const timer = setTimeout(() => setIndex((i) => i + 1), ROTATE_MS);
    return () => clearTimeout(timer); // no leak when leaving the page
  }, [index, stats.hasData, insightsEnabled]);

  const count = getInsightCount(stats);
  const position = ((index % count) + count) % count;
  const text = stats.hasData
    ? getDailyInsight(stats, index)
    : 'Add your first farm record and our AI will start analysing your income, costs and loan readiness.';

  return (
    <section
      aria-label="AI insight of the day"
      className="border-purple/25 from-purple/15 via-info/10 to-accent/10 relative flex flex-col gap-3 overflow-hidden rounded-2xl border bg-linear-to-r p-4 sm:flex-row sm:items-center sm:gap-4"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="animate-pulse-soft shadow-purple/30 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#9333ea] via-[#3b82f6] to-[#10b981] text-white shadow-lg">
          <Sparkles size={18} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-ink-purple text-[11px] font-semibold tracking-wider uppercase">
            AI Insight of the Day
            {stats.hasData && (
              <span className="text-text-mute ml-2 font-normal tracking-normal normal-case">
                {position + 1} / {count}
              </span>
            )}
          </p>
          {/* The key re-mounts the text so each new insight fades in. */}
          <p key={index} className="animate-fade-in text-text mt-0.5 text-sm">
            {text}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
        {stats.hasData && (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => i - 1)}
              aria-label="Previous insight"
              className={controlClass}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => i + 1)}
              aria-label="Next insight"
              className={controlClass}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>
        )}
        <Button mutates size="sm" icon={Plus} onClick={() => openModal('record')}>
          Add Record
        </Button>
      </div>
    </section>
  );
}
