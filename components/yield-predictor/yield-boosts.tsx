'use client';

import { ArrowRight, BadgeCheck, Rocket, type LucideIcon } from 'lucide-react';
import {
  FERTILIZER_OPTIONS,
  IRRIGATION_OPTIONS,
  SEASON_OPTIONS,
} from '@/components/yield-predictor/yield-options';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { predictYield } from '@/lib/calculations/yield';
import { usePlatformStore } from '@/store/platform-store';
import { formatGHS } from '@/lib/format';
import type { YieldInput, YieldResult } from '@/types';

interface Upgrade {
  key: string;
  icon: LucideIcon;
  title: string;
  from: string;
  to: string;
  extraTonnes: number;
  extraRevenue: number;
}

const quantity = (value: number) => value.toLocaleString('en-GH', { maximumFractionDigits: 2 });
const labelOf = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((o) => o.value === value)?.label ?? value;

/** "What if" upgrades: each input switched to its best option, with the extra harvest it adds. */
export function YieldBoosts({ input, result }: { input: YieldInput; result: YieldResult }) {
  const crops = usePlatformStore((s) => s.crops);
  const candidates: (Omit<Upgrade, 'extraTonnes' | 'extraRevenue'> & { next: YieldInput })[] = [];
  if (input.irrigation !== 'drip') {
    candidates.push({
      key: 'irrigation',
      icon: IRRIGATION_OPTIONS[1].icon,
      title: 'Switch to drip irrigation',
      from: labelOf(IRRIGATION_OPTIONS, input.irrigation),
      to: 'Drip',
      next: { ...input, irrigation: 'drip' },
    });
  }
  if (input.fertilizer !== 'both') {
    candidates.push({
      key: 'fertilizer',
      icon: FERTILIZER_OPTIONS[0].icon,
      title: 'Combine organic and inorganic fertilizer',
      from: labelOf(FERTILIZER_OPTIONS, input.fertilizer),
      to: 'Both',
      next: { ...input, fertilizer: 'both' },
    });
  }
  if (input.season !== 'major') {
    candidates.push({
      key: 'season',
      icon: SEASON_OPTIONS[0].icon,
      title: 'Plant in the major season',
      from: labelOf(SEASON_OPTIONS, input.season),
      to: 'Major season',
      next: { ...input, season: 'major' },
    });
  }

  const upgrades: Upgrade[] = candidates
    .map(({ next, ...rest }) => {
      const better = predictYield(next, crops);
      return {
        ...rest,
        extraTonnes: better.expected - result.expected,
        extraRevenue: better.revenue - result.revenue,
      };
    })
    .sort((a, b) => b.extraRevenue - a.extraRevenue);

  const all = predictYield(
    { ...input, irrigation: 'drip', fertilizer: 'both', season: 'major' },
    crops,
  );

  return (
    <Card className="animate-fade-in rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket size={17} aria-hidden="true" className="text-ink-gold" />
            Ways to grow more
          </CardTitle>
          <CardSub>What each change could add to this harvest</CardSub>
        </div>
      </CardHeader>

      {upgrades.length === 0 ? (
        <p className="bg-accent/10 text-ink-green flex items-start gap-2.5 rounded-2xl p-4 text-sm">
          <BadgeCheck size={18} aria-hidden="true" className="mt-0.5 shrink-0" />
          You’re already using the strongest inputs. Focus on timely weeding, pest scouting and good
          storage to protect this harvest.
        </p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {upgrades.map(({ key, icon: Icon, title, from, to, extraTonnes, extraRevenue }, i) => (
              <li
                key={key}
                className="border-border bg-glass flex flex-wrap items-center gap-3 rounded-2xl border p-3.5"
              >
                <span className="bg-gold/15 text-ink-gold inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-text flex items-center gap-2 text-sm font-semibold">
                    {title}
                    {i === 0 && upgrades.length > 1 && (
                      <span className="bg-accent/15 text-ink-green rounded-full px-2 py-0.5 text-[10px] font-bold">
                        Biggest gain
                      </span>
                    )}
                  </p>
                  <p className="text-text-mute mt-0.5 flex items-center gap-1 text-xs">
                    {from} <ArrowRight size={11} aria-hidden="true" /> {to}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ink-green text-sm font-bold tabular-nums">
                    +{quantity(extraTonnes)} t
                  </p>
                  <p className="text-text-mute text-xs tabular-nums">+{formatGHS(extraRevenue)}</p>
                </div>
              </li>
            ))}
          </ul>
          {upgrades.length > 1 && (
            <p className="border-border text-text-dim mt-4 border-t pt-4 text-xs leading-relaxed">
              With all {upgrades.length} changes you could harvest about{' '}
              <span className="text-text font-semibold">{quantity(all.expected)} t</span>, worth{' '}
              <span className="text-ink-green font-semibold">{formatGHS(all.revenue)}</span>.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
