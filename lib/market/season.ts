// The Weather page's "Seasonal outlook": Ghana's farming season for the place shown, and what
// the provider's own 7-day forecast says. Nothing is forecast beyond what the provider gave.

import type { DailyWeather } from '@/types/market';

/** Regions with one rainy season (May to October) instead of the south's two. */
const NORTHERN = new Set(['Northern', 'Savannah', 'North East', 'Upper East', 'Upper West']);

/** A day counts as rainy from 1 mm, or a 60% chance when the provider gives no amount. */
const RAINY_MM = 1;
const RAINY_CHANCE = 60;

/** The season for a region and month (1-12), from Ghana's two rainfall patterns. */
export function seasonFor(region: string | undefined, month: number): string {
  if (region && NORTHERN.has(region))
    return month >= 5 && month <= 10 ? 'Rainy season' : 'Dry season (Harmattan)';
  if (month >= 3 && month <= 7) return 'Major rainy season';
  if (month === 8) return 'Short dry spell';
  if (month >= 9 && month <= 11) return 'Minor rainy season';
  return 'Dry season (Harmattan)';
}

function rainy(day: DailyWeather): boolean | null {
  if (day.rainMm !== null) return day.rainMm >= RAINY_MM;
  if (day.rainChance !== null) return day.rainChance >= RAINY_CHANCE;
  return null;
}

/** One sentence about the coming days, from the forecast's own rain figures. */
export function outlookFor(days: DailyWeather[]): string {
  const known = days.map(rainy).filter((r): r is boolean => r !== null);
  if (known.length === 0) return 'The forecast gives no rain figures for the coming days.';
  const wet = known.filter(Boolean).length;
  const storms = days.some((d) => d.storm);
  if (wet === 0) return 'Mostly dry: plan watering for young crops and new transplants.';
  if (wet >= Math.ceil(known.length * 0.7))
    return `Frequent rain (${wet} of ${known.length} days)${storms ? ' with storms' : ''}: plan spraying and drying around it.`;
  return `Intermittent rain (${wet} of ${known.length} days)${storms ? ' with a storm' : ''}, generally favourable for field activities.`;
}
