'use client';

import { CircleCheck, Landmark, Lock } from 'lucide-react';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import type { CreditConfig } from '@/types/admin';

const MIN = 300;
const MAX = 850;
const pct = (score: number) => ((Math.min(MAX, Math.max(MIN, score)) - MIN) / (MAX - MIN)) * 100;

/** Score bands, matching scoreLabel() and the admin's thresholds (default 500 / 650 / 750). */
const bandsFor = ({ fair, good, excellent }: CreditConfig['bands']) => [
  { label: 'Building', from: MIN, to: fair, tone: 'bg-[#ef4444]/70' },
  { label: 'Fair', from: fair, to: good, tone: 'bg-[#f5c451]/80' },
  { label: 'Good', from: good, to: excellent, tone: 'bg-[#34d399]/80' },
  { label: 'Excellent', from: excellent, to: MAX, tone: 'bg-[#10b981]' },
];

/** The 300–850 scale with the farmer's score and each lender's minimum marked on it. */
export function ScoreLadder() {
  const { credit, creditConfig } = useFarmStats();
  const bands = bandsFor(creditConfig.bands);
  const activeLenders = usePlatformStore((s) => s.lenders);
  const lenders = [...activeLenders].sort((a, b) => a.minScore - b.minScore);
  const unlocked = lenders.filter((p) => credit.score >= p.minScore).length;

  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Landmark size={17} aria-hidden="true" className="text-ink-blue" />
            Lenders you can reach
          </CardTitle>
          <CardSub>
            {unlocked} of {lenders.length} lenders accept your score of {credit.score}
          </CardSub>
        </div>
      </CardHeader>

      <div
        role="img"
        aria-label={`Your score ${credit.score} on a scale from ${MIN} to ${MAX}. ${lenders
          .map((p) => `${p.name} needs ${p.minScore}`)
          .join('. ')}.`}
        className="relative pt-8 pb-7"
      >
        {/* "You" marker */}
        <span
          aria-hidden="true"
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${pct(credit.score)}%` }}
        >
          <span className="rounded-full bg-[#10b981] px-2 py-0.5 text-[10px] font-bold whitespace-nowrap text-[#022c22]">
            You · {credit.score}
          </span>
          <span className="h-3 w-0.5 bg-[#10b981]" />
        </span>
        <div className="flex h-3 overflow-hidden rounded-full">
          {bands.map((band) => (
            <span
              key={band.label}
              className={band.tone}
              style={{ width: `${((band.to - band.from) / (MAX - MIN)) * 100}%` }}
            />
          ))}
        </div>
        {/* Lender minimums */}
        {lenders.map((p) => (
          <span
            key={p.id}
            aria-hidden="true"
            className="ring-bg-2 absolute top-[30px] size-4 -translate-x-1/2 rounded-full ring-2"
            style={{ left: `${pct(p.minScore)}%`, backgroundColor: p.color }}
          />
        ))}
        <div
          className="text-text-mute absolute inset-x-0 bottom-0 flex text-[10px]"
          aria-hidden="true"
        >
          {bands.map((band) => (
            <span
              key={band.label}
              className="text-center"
              style={{ width: `${((band.to - band.from) / (MAX - MIN)) * 100}%` }}
            >
              {band.label}
            </span>
          ))}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {lenders.map((p) => {
          const gap = p.minScore - credit.score;
          const ok = gap <= 0;
          return (
            <li
              key={p.id}
              className="border-border bg-glass flex items-center gap-3 rounded-xl border px-3 py-2.5"
            >
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              <span className="text-text min-w-0 flex-1 truncate text-sm font-semibold">
                {p.name}
              </span>
              <span className="text-text-mute text-xs tabular-nums">min {p.minScore}</span>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                  ok ? 'bg-accent/15 text-ink-green' : 'bg-gold/15 text-ink-gold',
                )}
              >
                {ok ? (
                  <CircleCheck size={12} aria-hidden="true" />
                ) : (
                  <Lock size={12} aria-hidden="true" />
                )}
                {ok ? 'Unlocked' : `+${gap} pts`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
