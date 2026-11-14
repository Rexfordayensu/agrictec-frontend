'use client';

import { Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CropTile } from '@/components/ui/crop-icon';
import { cropMarketPrice, findCrop } from '@/lib/calculations/yield';
import { formatGHS } from '@/lib/format';
import { usePlatformStore } from '@/store/platform-store';
import type { Crop } from '@/types';

export function YieldTips({ crop, cropName = crop }: { crop: Crop; cropName?: string }) {
  // Published crop content supplies the baseline and guidance.
  const crops = usePlatformStore((s) => s.crops);
  const data = findCrop(crop, crops);
  const yieldPerAcre = data?.yieldPerAcre ?? 0;
  // Only a published market price, never a built-in one.
  const price = cropMarketPrice(
    crop,
    usePlatformStore((s) => s.marketPrices),
  )?.perTonne;
  const facts = [
    { label: 'Average yield', value: data ? `${yieldPerAcre} t/acre` : 'Not published' },
    { label: 'Market price', value: price ? `${formatGHS(price)}/t` : 'Not published' },
    {
      label: 'Average revenue',
      value: price ? `${formatGHS(yieldPerAcre * price)}/acre` : 'No price yet',
    },
  ];

  return (
    <Card className="yield-growing @container rounded-3xl">
      <div className="flex flex-col gap-5 @3xl:flex-row @3xl:items-start @3xl:justify-between">
        <div className="flex items-center gap-3">
          <CropTile crop={crop} />
          <div>
            <h3 className="text-text flex items-center gap-2 text-sm font-bold">
              Growing tips for {cropName}
              <Lightbulb size={16} aria-hidden="true" className="text-ink-gold" />
            </h3>
            <p className="text-text-mute mt-0.5 text-xs">
              Small steps for a stronger growing season
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 @3xl:min-w-96">
          {facts.map((fact) => (
            <div key={fact.label} className="border-border bg-glass rounded-xl border px-3 py-2">
              <dt className="text-text-mute text-xs font-semibold tracking-wide uppercase">
                {fact.label}
              </dt>
              <dd className="text-text mt-0.5 text-xs font-bold tabular-nums @md:text-sm">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {!data && (
        <p className="text-text-mute mt-4 text-xs">
          Growing guidance has not been published for {cropName} yet.
        </p>
      )}
      <ol className="mt-5 grid gap-3 @2xl:grid-cols-2 @5xl:grid-cols-4">
        {(data?.tips ?? []).map((tip, index) => (
          <li
            key={tip}
            className="border-border bg-bg-2/40 hover:border-accent/30 relative flex flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-colors"
          >
            <span className="text-ink-green bg-accent/10 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase">
              Step {index + 1}
            </span>
            <p className="text-text-dim relative text-sm leading-relaxed">{tip}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
