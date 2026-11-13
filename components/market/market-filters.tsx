'use client';

import { Search } from 'lucide-react';
import { REGIONS } from '@/constants/regions';
import { GHANA_MARKET_CROPS, type MarketFilters } from '@/lib/market/evidence';
import type { MarketPrice } from '@/types';

const field =
  'border-border bg-glass text-text h-12 w-full min-w-0 rounded-xl border px-3.5 text-sm focus:border-accent focus:outline-none';

/** Search, crop, region and market, over the published observations only. */
export function MarketPriceFilters({
  prices,
  value,
  onChange,
}: {
  prices: MarketPrice[];
  value: MarketFilters;
  onChange: (value: MarketFilters) => void;
}) {
  const crops = [...new Set([...GHANA_MARKET_CROPS, ...prices.map((p) => p.crop)])].sort();
  const markets = [
    ...new Set(
      prices
        .filter((p) => !value.region || p.region === value.region)
        .map((p) => p.market)
        .filter((market): market is string => Boolean(market)),
    ),
  ].sort();
  return (
    <div className="@container/market-filters">
      <div className="grid min-w-0 items-end gap-3 @lg/market-filters:grid-cols-2 @5xl/market-filters:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
        <label className="relative min-w-0">
          <span className="sr-only">Search crops or markets</span>
          <Search
            size={18}
            aria-hidden="true"
            className="text-text-mute pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
          />
          <input
            type="search"
            value={value.search}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
            placeholder="Search crops or markets..."
            className={`${field} pl-11`}
          />
        </label>
        <label className="min-w-0">
          <span className="text-text mb-1.5 block text-sm font-semibold">Crop</span>
          <select
            value={value.crop}
            onChange={(event) => onChange({ ...value, crop: event.target.value })}
            className={field}
          >
            <option value="">All crops</option>
            {crops.map((crop) => (
              <option key={crop}>{crop}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="text-text mb-1.5 block text-sm font-semibold">Region</span>
          <select
            value={value.region}
            onChange={(event) => onChange({ ...value, region: event.target.value, market: '' })}
            className={field}
          >
            <option value="">All Ghana regions</option>
            {REGIONS.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="text-text mb-1.5 block text-sm font-semibold">Market</span>
          <select
            value={value.market}
            onChange={(event) => onChange({ ...value, market: event.target.value })}
            className={field}
          >
            <option value="">All available markets</option>
            {markets.map((market) => (
              <option key={market}>{market}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
