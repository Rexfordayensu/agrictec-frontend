'use client';

import type { IconType } from 'react-icons';
import {
  GiAlmond,
  GiBananaBunch,
  GiBeanstalk,
  GiBowlOfRice,
  GiCabbage,
  GiChiliPepper,
  GiCoffeeBeans,
  GiCorn,
  GiGrain,
  GiPalmTree,
  GiPeanut,
  GiPeas,
  GiPotato,
  GiRootTip,
  GiSprout,
  GiTomato,
  GiWheat,
} from 'react-icons/gi';
import { CROPS } from '@/constants/crops';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';

/** One icon per crop (react-icons, Game Icons set). The app uses icons, never emoji. */
export const CROP_ICONS: Record<Crop, IconType> = {
  Maize: GiCorn,
  Cassava: GiRootTip,
  Rice: GiBowlOfRice,
  Cocoa: GiCoffeeBeans,
  Yam: GiPotato,
  Plantain: GiBananaBunch,
  Groundnut: GiPeanut,
  Tomato: GiTomato,
  Pepper: GiChiliPepper,
  Okra: GiPeas,
  Soybean: GiBeanstalk,
  Sorghum: GiWheat,
  Millet: GiGrain,
  Cashew: GiAlmond,
  'Oil Palm': GiPalmTree,
  Vegetables: GiCabbage,
  Other: GiSprout,
};

/** Tinted tile colours per crop (WCAG AA ink colours in both themes). */
export const CROP_TONES: Record<Crop, string> = {
  Maize: 'bg-gold/15 text-ink-gold',
  Cassava: 'bg-warning/15 text-ink-gold',
  Rice: 'bg-info/15 text-ink-blue',
  Cocoa: 'bg-purple/15 text-ink-purple',
  Yam: 'bg-warning/15 text-ink-gold',
  Plantain: 'bg-accent/15 text-ink-green',
  Groundnut: 'bg-gold/15 text-ink-gold',
  Tomato: 'bg-danger/15 text-ink-red',
  Pepper: 'bg-danger/15 text-ink-red',
  Okra: 'bg-accent/15 text-ink-green',
  Soybean: 'bg-gold/15 text-ink-gold',
  Sorghum: 'bg-warning/15 text-ink-gold',
  Millet: 'bg-gold/15 text-ink-gold',
  Cashew: 'bg-warning/15 text-ink-gold',
  'Oil Palm': 'bg-accent/15 text-ink-green',
  Vegetables: 'bg-accent/15 text-ink-green',
  Other: 'bg-accent/15 text-ink-green',
};

/** Maps a free-text crop name ("Rice (local)") to a known crop, falling back to "Other". */
export function cropFromName(name: string): Crop {
  const lower = name.toLowerCase();
  return CROPS.find((crop) => lower.startsWith(crop.toLowerCase())) ?? 'Other';
}

export function CropIcon({
  crop,
  size = 16,
  className,
}: {
  crop: Crop;
  size?: number;
  className?: string;
}) {
  const Icon = CROP_ICONS[crop];
  return <Icon size={size} aria-hidden="true" className={cn('shrink-0', className)} />;
}

/** Rounded tinted square with the crop icon, e.g. at the start of a list row. */
export function CropTile({ crop, size = 'md' }: { crop: Crop; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        size === 'sm' ? 'size-8' : 'size-10',
        CROP_TONES[crop],
      )}
    >
      <CropIcon crop={crop} size={size === 'sm' ? 15 : 19} />
    </span>
  );
}

/** Inline icon + crop name. */
export function CropLabel({ crop, className }: { crop: Crop; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <CropIcon crop={crop} size={14} className={CROP_TONES[crop].split(' ')[1]} />
      {crop}
    </span>
  );
}
