'use client';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { REGIONS } from '@/constants/regions';
import { GHANA_MARKET_CROPS, type MarketFilters } from '@/lib/market/evidence';
import type { MarketPrice } from '@/types';

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
      <div className="grid min-w-0 gap-3 @lg/market-filters:grid-cols-2 @5xl/market-filters:grid-cols-4">
        <label className="min-w-0">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">
            Search crops or markets
          </span>
          <Input
            type="search"
            value={value.search}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
            placeholder="Crop, market or source…"
          />
        </label>
        <label className="min-w-0">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Crop</span>
          <Select
            value={value.crop}
            onChange={(event) => onChange({ ...value, crop: event.target.value })}
          >
            <option value="">All crops</option>
            {crops.map((crop) => (
              <option key={crop}>{crop}</option>
            ))}
          </Select>
        </label>
        <label className="min-w-0">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Region</span>
          <Select
            value={value.region}
            onChange={(event) => onChange({ ...value, region: event.target.value, market: '' })}
          >
            <option value="">All Ghana regions</option>
            {REGIONS.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </Select>
        </label>
        <label className="min-w-0">
          <span className="text-text-dim mb-1.5 block text-xs font-semibold">Market</span>
          <Select
            value={value.market}
            onChange={(event) => onChange({ ...value, market: event.target.value })}
          >
            <option value="">All available markets</option>
            {markets.map((market) => (
              <option key={market}>{market}</option>
            ))}
          </Select>
        </label>
      </div>
    </div>
  );
}
