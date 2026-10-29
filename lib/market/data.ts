import type { MarketPrice } from '@/types';

export type MarketSort = 'name' | 'price' | 'change';

/** Match profile crops such as "Rice" with display names such as "Rice (local)". */
export function marketCropKey(crop: string): string {
  return crop
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '')
    .trim();
}

export function isPrimaryCrop(crop: string, primaryCrops: string[]): boolean {
  return primaryCrops.some((primary) => marketCropKey(primary) === marketCropKey(crop));
}

export function sortMarketPrices(prices: MarketPrice[], sort: MarketSort): MarketPrice[] {
  return [...prices].sort((a, b) => {
    const difference =
      sort === 'price' ? b.price - a.price : sort === 'change' ? b.change - a.change : 0;
    return difference || a.crop.localeCompare(b.crop);
  });
}

/** Percentage change from the first month, so crops with different prices are comparable. */
export function percentageSeries(prices: number[]): number[] {
  const baseline = prices[0];
  if (!baseline || baseline <= 0) return prices.map(() => 0);
  return prices.map((price) => Math.round((price / baseline - 1) * 100 * 100) / 100);
}

export function formatPriceChange(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toLocaleString('en-GH', { maximumFractionDigits: 2 })}%`;
}
