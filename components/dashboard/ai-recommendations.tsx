'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { AiChip } from '@/components/ui/ai-chip';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { getRecommendations } from '@/lib/ai/recommendations';
import { cn } from '@/lib/utils';

const TILE_TONES = [
  'bg-accent/15 text-ink-green',
  'bg-purple/15 text-ink-purple',
  'bg-info/15 text-ink-blue',
  'bg-gold/15 text-ink-gold',
  'bg-danger/15 text-ink-red',
];

export function AiRecommendations() {
  const stats = useFarmStats();
  const recommendations = getRecommendations(stats);

  return (
    <Card className="@container">
      <CardHeader className="flex-wrap">
        <div>
          <CardTitle>AI Recommendations</CardTitle>
          <CardSub>Next steps picked from your own data</CardSub>
        </div>
        <AiChip>
          <Sparkles size={12} aria-hidden="true" /> Powered by AgriCtec AI
        </AiChip>
      </CardHeader>

      {recommendations.length === 0 ? (
        <p className="text-text-dim text-sm">
          You&apos;re all set. Keep recording to keep your financial identity up to date.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
          {recommendations.map((item, i) => {
            const Icon = item.icon;
            return (
              <li
                key={item.id}
                className="group border-border bg-glass hover:border-accent/40 flex flex-col rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
                      TILE_TONES[i % TILE_TONES.length],
                    )}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-text text-sm font-bold">{item.title}</h3>
                    <p className="text-text-dim mt-1 text-sm">{item.text}</p>
                  </div>
                </div>
                <Link
                  href={item.cta.href}
                  className="text-ink-green mt-3 ml-13 inline-flex min-h-9 items-center gap-1 self-start text-sm font-semibold"
                >
                  {item.cta.label}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
