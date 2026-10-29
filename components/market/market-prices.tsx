'use client';

import { useState } from 'react';
import { ExternalLink, Store } from 'lucide-react';
import { MarketPriceFilters } from '@/components/market/market-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CropTile, cropFromName } from '@/components/ui/crop-icon';
import {
  EMPTY_MARKET_FILTERS,
  filterMarketPrices,
  publishedPrices,
  supportedRanges,
  unitLabel,
} from '@/lib/market/evidence';
import { formatMarketAmount } from '@/lib/market/evidence';
import { isPrimaryCrop } from '@/lib/market/data';
import type { MarketPrice } from '@/types';

export function MarketPrices({
  prices,
  primaryCrops = [],
}: {
  prices: MarketPrice[];
  primaryCrops?: string[];
}) {
  const [filters, setFilters] = useState(EMPTY_MARKET_FILTERS);
  const published = publishedPrices(prices);
  const visible = filterMarketPrices(published, filters).sort(
    (a, b) =>
      (b.observedAt ?? '').localeCompare(a.observedAt ?? '') || a.crop.localeCompare(b.crop),
  );
  const ranges = supportedRanges(publishedPrices(visible));
  const regions = new Set(published.filter((p) => p.scope !== 'national').map((p) => p.region))
    .size;
  const markets = new Set(published.map((p) => p.market).filter(Boolean)).size;
  return (
    <Card className="@container/market min-w-0 rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Store size={18} className="text-ink-green" aria-hidden="true" />
            Ghana market overview
          </CardTitle>
          <CardSub>
            Available price evidence across Ghana. Your location never limits this list.
          </CardSub>
        </div>
      </CardHeader>
      <dl className="mb-5 grid grid-cols-1 gap-3 @lg/market:grid-cols-3">
        {[
          ['Published observations', published.length],
          ['Regions represented', `${regions} of 16`],
          ['Named markets', markets],
        ].map(([label, value]) => (
          <div key={label} className="border-border rounded-xl border p-3">
            <dt className="text-text-mute text-xs">{label}</dt>
            <dd className="text-text mt-1 text-xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <MarketPriceFilters prices={published} value={filters} onChange={setFilters} />
      <p className="text-text-mute mt-3 text-xs">
        No national average is calculated. Each amount belongs to the location, unit and observation
        date reported by its source. Unrepresented regions have no published data yet.
      </p>
      {ranges.length > 0 && (
        <div className="border-accent/20 bg-accent/5 mt-5 rounded-2xl border p-4">
          <h3 className="text-text text-sm font-semibold">Supported price ranges</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {ranges.map((range) => (
              <li key={`${range.crop}-${range.unit}-${range.date}`} className="text-text-dim">
                {range.crop}:{' '}
                <strong className="text-text">
                  {formatMarketAmount(range.low)}–{formatMarketAmount(range.high)}
                </strong>{' '}
                per {range.unit} · {range.date} · {range.count} comparable observations
              </li>
            ))}
          </ul>
          <p className="text-text-mute mt-2 text-xs">
            Only matching crops, units, known package weights and dates are compared.
          </p>
        </div>
      )}
      {!visible.length ? (
        <div className="bg-bg-2/40 mt-5 rounded-2xl p-5 text-center" role="status">
          <h3 className="text-text font-semibold">
            {published.length ? 'No prices match these filters' : 'Market price data unavailable'}
          </h3>
          <p className="text-text-dim mt-2 text-sm">
            {published.length
              ? 'Try another crop, region or market.'
              : 'Source-backed observations will appear after an administrator reviews and publishes them. No sample prices are shown.'}
          </p>
          {published.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters(EMPTY_MARKET_FILTERS)}
              className="mt-3"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-5 grid min-w-0 gap-4 @3xl/market:grid-cols-2">
          {visible.map((price) => (
            <li key={price.id} className="border-border bg-bg-2/40 min-w-0 rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <CropTile crop={cropFromName(price.crop)} />
                  <div className="min-w-0">
                    <h3 className="text-text font-semibold break-words">{price.crop}</h3>
                    <p className="text-text-mute mt-1 text-xs">
                      {price.scope === 'national'
                        ? 'Nationwide coverage reported by source'
                        : [price.market, price.region].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
                {isPrimaryCrop(price.crop, primaryCrops) && <Badge>Your crop</Badge>}
              </div>
              <p className="text-ink-green mt-4 text-xl font-bold break-words">
                {formatMarketAmount(price.price)}
                {price.priceMax && price.priceMax !== price.price
                  ? `–${formatMarketAmount(price.priceMax)}`
                  : ''}
              </p>
              <p className="text-text-dim mt-1 text-sm">per {unitLabel(price)}</p>
              <dl className="text-text-mute mt-4 space-y-1 text-xs">
                <div>
                  <dt className="inline font-semibold">Observed: </dt>
                  <dd className="inline">{price.observedAt}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Source: </dt>
                  <dd className="inline">
                    {price.source?.publisher} · {price.source?.title}
                  </dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Published by source: </dt>
                  <dd className="inline">{price.source?.publishedAt}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Admin reviewed: </dt>
                  <dd className="inline">{price.reviewedAt?.slice(0, 10)}</dd>
                </div>
              </dl>
              <a
                href={price.source!.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-green mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold underline"
              >
                View supporting source
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
