import type { Crop, YieldCrop, YieldInput } from '@/types';

type KnownCrop = YieldCrop;

/** Crops with yield data: the yield predictor offers only these. */
export const YIELD_CROPS: YieldCrop[] = [
  'Maize',
  'Cassava',
  'Rice',
  'Cocoa',
  'Yam',
  'Plantain',
  'Groundnut',
  'Tomato',
];

/** Every crop a farmer can pick (onboarding, records, profile). 'Other' is always last. */
export const CROPS: Crop[] = [
  ...YIELD_CROPS,
  'Pepper',
  'Okra',
  'Soybean',
  'Sorghum',
  'Millet',
  'Cashew',
  'Oil Palm',
  'Vegetables',
  'Other',
];

export const isYieldCrop = (crop: string): crop is YieldCrop =>
  (YIELD_CROPS as string[]).includes(crop);

/** Average yield in tonnes per acre under baseline conditions. */
export const BASE_YIELD_PER_ACRE: Record<KnownCrop, number> = {
  Maize: 2.5,
  Cassava: 15,
  Rice: 3,
  Cocoa: 0.8,
  Yam: 12,
  Plantain: 18,
  Groundnut: 1.2,
  Tomato: 15,
};

/** Farm-gate price in GHS per tonne. */
export const PRICE_PER_TONNE: Record<KnownCrop, number> = {
  Maize: 3200,
  Cassava: 900,
  Rice: 5500,
  Cocoa: 24000,
  Yam: 4500,
  Plantain: 2000,
  Groundnut: 6000,
  Tomato: 3500,
};

export const CROP_TIPS: Record<KnownCrop, string[]> = {
  Maize: [
    'Plant at the start of the rains with 75cm × 40cm spacing for the best stand.',
    'Apply NPK 15-15-15 two weeks after planting and top-dress with urea at six weeks.',
    'Scout weekly for Fall Armyworm and act early when you see leaf damage.',
    'Dry cobs to 13% moisture before storage to prevent aflatoxin and weevils.',
  ],
  Cassava: [
    'Use clean, disease-free stems from improved varieties such as Bankye Hemaa.',
    'Plant cuttings at a slant, about 1m × 1m apart, with two-thirds buried.',
    'Weed at 4, 8 and 12 weeks after planting, before the canopy closes.',
    'Harvest between 9 and 12 months for the best starch content and price.',
  ],
  Rice: [
    'Level the field well so water spreads evenly and weeds are suppressed.',
    'Transplant 21-day-old seedlings at 20cm × 20cm for higher tillering.',
    'Keep 5cm of standing water during tillering and drain two weeks before harvest.',
    'Harvest when 80% of the grains are golden to reduce shattering losses.',
  ],
  Cocoa: [
    'Prune regularly to keep the canopy open and reduce black pod disease.',
    'Remove and bury infected pods every week during the rainy season.',
    'Keep moderate shade trees to protect young cocoa and the soil.',
    'Ferment beans for 6 days and sun-dry them well to earn premium prices.',
  ],
  Yam: [
    'Select healthy seed yams or use the minisett technique to cut costs.',
    'Make mounds or ridges about 1m apart to give tubers room to grow.',
    'Stake vines early so leaves get more sunlight and yields increase.',
    'Store harvested tubers in a cool, shaded, well-ventilated barn.',
  ],
  Plantain: [
    'Use clean suckers and pare the corm to remove pests before planting.',
    'Space plants 3m × 2m and mulch heavily to hold soil moisture.',
    'Remove extra suckers, leaving one mother plant and one follower.',
    'Prop up heavy bunches with poles to prevent the plants from toppling.',
  ],
  Groundnut: [
    'Plant on ridges or flat beds at 40cm × 15cm for good pod filling.',
    'Apply gypsum or lime at flowering to improve pod development.',
    'Keep the field weed-free for the first six weeks after planting.',
    'Dry pods quickly after harvest to keep aflatoxin levels low.',
  ],
  Tomato: [
    'Raise seedlings in a nursery and transplant after 3 to 4 weeks.',
    'Stake or trellis plants to keep fruit off the soil and reduce rot.',
    'Water at the base in the morning to avoid leaf diseases like blight.',
    'Rotate with non-solanaceous crops to break the pest and disease cycle.',
  ],
};

export const YIELD_MULTIPLIERS: {
  fertilizer: Record<YieldInput['fertilizer'], number>;
  irrigation: Record<YieldInput['irrigation'], number>;
  season: Record<YieldInput['season'], number>;
} = {
  fertilizer: { both: 1.35, inorganic: 1.25, organic: 1.15, none: 1 },
  irrigation: { drip: 1.4, sprinkler: 1.25, rainfed: 1 },
  season: { major: 1.1, minor: 1 },
};
