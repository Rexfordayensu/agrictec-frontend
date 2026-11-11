import { YIELD_MULTIPLIERS } from '@/constants/crops';
import { marketReference } from '@/lib/admin/crop-pricing';
import { DEFAULT_CROP_CONTENT } from '@/lib/admin/defaults';
import type { MarketPrice, YieldInput, YieldResult } from '@/types';
import type { CropContent } from '@/types/admin';

const round2 = (value: number) => Math.round(value * 100) / 100;

/** The admin's data for a crop, or undefined (for 'Other' or a crop with no data). */
export const findCrop = (crop: YieldInput['crop'], crops: CropContent[] = DEFAULT_CROP_CONTENT) =>
  crops.find((c) => c.crop === crop);

/** Tonnes per acre under baseline conditions (0 when unknown). */
export const baseYield = (crop: YieldInput['crop'], crops?: CropContent[]) =>
  findCrop(crop, crops)?.yieldPerAcre ?? 0;

/**
 * The published market price per tonne for a crop, with where and when it was observed: only
 * from a single published observation priced by weight (null otherwise). Never a built-in price.
 */
export function cropMarketPrice(crop: YieldInput['crop'], prices: MarketPrice[] = []) {
  const reference = marketReference(crop, prices);
  if (!reference || reference.perTonne === null) return null;
  const { row } = reference;
  return {
    perTonne: reference.perTonne,
    where: [row.market, row.region].filter(Boolean).join(', ') || 'Nationwide',
    observedAt: row.observedAt ?? null,
  };
}

/**
 * Deterministic yield prediction: the same input always gives the same output.
 * Yields come from the admin's crop content (defaults: constants/crops.ts). Revenue only from a
 * published market price; without one there is no revenue figure.
 */
export function predictYield(
  input: YieldInput,
  crops?: CropContent[],
  prices: MarketPrice[] = [],
): YieldResult {
  const { fertilizer, irrigation, season } = YIELD_MULTIPLIERS;
  const perAcre =
    baseYield(input.crop, crops) *
    fertilizer[input.fertilizer] *
    irrigation[input.irrigation] *
    season[input.season];
  const expected = perAcre * input.acres;
  const market = cropMarketPrice(input.crop, prices);

  return {
    low: round2(expected * 0.9),
    expected: round2(expected),
    high: round2(expected * 1.1),
    perAcre: round2(perAcre),
    revenue: market ? Math.round(expected * market.perTonne) : null,
    pricePerTonne: market?.perTonne ?? null,
    priceSource: market ? { where: market.where, observedAt: market.observedAt } : null,
  };
}

/** One line of advice: praise strong management, or name the single biggest improvement. */
export function yieldInsight(
  input: YieldInput,
  result: YieldResult,
  crops?: CropContent[],
): string {
  const base = baseYield(input.crop, crops);
  if (base === 0) {
    return 'We do not have baseline yield data for this crop yet. Record your harvests to build your own benchmark.';
  }
  if (result.perAcre > base * 1.2) {
    return `Excellent management! Your inputs put you about ${Math.round((result.perAcre / base - 1) * 100)}% above the average yield for ${input.crop}.`;
  }

  const { fertilizer, irrigation, season } = YIELD_MULTIPLIERS;
  const options = [
    {
      gain: fertilizer.both / fertilizer[input.fertilizer],
      advice: 'Using both organic and inorganic fertilizer',
    },
    {
      gain: irrigation.drip / irrigation[input.irrigation],
      advice: 'Adding drip irrigation',
    },
    {
      gain: season.major / season[input.season],
      advice: 'Planting in the major season (Mar–Jul)',
    },
  ];
  const best = options.reduce((top, option) => (option.gain > top.gain ? option : top));

  if (best.gain <= 1) {
    return 'Your inputs are already well optimized. Focus on timely weeding and pest control.';
  }
  return `${best.advice} could raise yield by about ${Math.round((best.gain - 1) * 100)}%.`;
}
