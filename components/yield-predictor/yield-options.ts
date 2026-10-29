import {
  CloudRain,
  CloudSun,
  Droplet,
  FlaskConical,
  Layers,
  Leaf,
  Sprout,
  Sun,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { YIELD_MULTIPLIERS } from '@/constants/crops';
import { baseYield } from '@/lib/calculations/yield';
import type { CropContent } from '@/types/admin';
import type { YieldInput } from '@/types';

export interface YieldOption<T extends string> {
  value: T;
  label: string;
  hint: string;
  icon: LucideIcon;
}

export const SEASON_OPTIONS: YieldOption<YieldInput['season']>[] = [
  { value: 'major', label: 'Major season', hint: 'Mar – Jul', icon: Sun },
  { value: 'minor', label: 'Minor season', hint: 'Aug – Dec', icon: CloudSun },
];

export const FERTILIZER_OPTIONS: YieldOption<YieldInput['fertilizer']>[] = [
  { value: 'both', label: 'Both types', hint: 'Compost or manure plus NPK or urea', icon: Layers },
  { value: 'inorganic', label: 'NPK or urea', hint: 'Inorganic fertilizer', icon: FlaskConical },
  { value: 'organic', label: 'Manure or compost', hint: 'Organic fertilizer', icon: Leaf },
  { value: 'none', label: 'No fertilizer', hint: 'No added fertilizer', icon: Sprout },
];

export const IRRIGATION_OPTIONS: YieldOption<YieldInput['irrigation']>[] = [
  { value: 'rainfed', label: 'Rain only', hint: 'Natural rainfall', icon: CloudRain },
  { value: 'drip', label: 'Drip irrigation', hint: 'Water at the roots', icon: Droplet },
  { value: 'sprinkler', label: 'Sprinkler', hint: 'Overhead spray', icon: Waves },
];

export const ACRE_PRESETS = [1, 2, 5, 10] as const;

/** Percentage boost a multiplier adds over the baseline, e.g. 1.35 → 35. */
export const boostPercent = (multiplier: number) => Math.round((multiplier - 1) * 100);

/** Combined multiplier of the chosen inputs against the best possible combination. */
export function inputStrength(input: Pick<YieldInput, 'season' | 'fertilizer' | 'irrigation'>) {
  const { fertilizer, irrigation, season } = YIELD_MULTIPLIERS;
  const current =
    fertilizer[input.fertilizer] * irrigation[input.irrigation] * season[input.season];
  const best = fertilizer.both * irrigation.drip * season.major;
  return { current, best, boost: boostPercent(current), share: (current - 1) / (best - 1) };
}

/** Per-acre yield with no inputs (average farm) and with the best inputs. */
export function perAcreBenchmarks(
  crop: Exclude<YieldInput['crop'], 'Other'>,
  crops?: CropContent[],
) {
  const base = baseYield(crop, crops);
  const { best } = inputStrength({ season: 'minor', fertilizer: 'none', irrigation: 'rainfed' });
  return { base, best: base * best };
}
