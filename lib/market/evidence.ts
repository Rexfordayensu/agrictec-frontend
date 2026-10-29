import { z } from 'zod';
import { REGIONS } from '@/constants/regions';
import type { MarketPrice } from '@/types';
import type {
  MarketEvidence,
  MarketResearchQuery,
  MarketResearchResult,
  PublishedMarketPrice,
} from '@/types/market';

export const MARKET_UNITS = ['kg', 'bag', 'crate', 'tonne'] as const;
const marketAmount = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 20 });
/** Preserve the source amount, including pesewas and fractional per-unit prices. */
export const formatMarketAmount = (amount: number) => `GHS ${marketAmount.format(amount)}`;
export const GHANA_MARKET_CROPS = [
  'Maize',
  'Rice',
  'Cocoa',
  'Cassava',
  'Yam',
  'Plantain',
  'Groundnut',
  'Soybean',
  'Cowpea',
  'Sorghum',
  'Millet',
  'Cocoyam',
  'Tomato',
  'Onion',
  'Pepper',
  'Okra',
  'Pineapple',
  'Mango',
  'Oil palm',
];
export interface MarketFilters {
  search: string;
  crop: string;
  region: string;
  market: string;
}
export const EMPTY_MARKET_FILTERS: MarketFilters = { search: '', crop: '', region: '', market: '' };
export function filterMarketPrices(prices: MarketPrice[], filter: MarketFilters) {
  const search = filter.search.trim().toLowerCase();
  return prices.filter(
    (price) =>
      (!filter.crop || price.crop === filter.crop) &&
      (!filter.region || price.region === filter.region) &&
      (!filter.market || price.market === filter.market) &&
      (!search ||
        [price.crop, price.region, price.market, price.source?.publisher].some((value) =>
          value?.toLowerCase().includes(search),
        )),
  );
}
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, 'Enter a valid date.');
const sourceSchema = z.object({
  title: z.string().trim().min(1).max(200),
  publisher: z.string().trim().min(1).max(160),
  url: z.url().refine((value) => /^https?:\/\//.test(value), 'Use an HTTP or HTTPS source link.'),
  publishedAt: date,
  kind: z.enum(['official', 'commodity', 'market-report']),
  excerpt: z.string().max(2000).optional(),
});
const sourceDraftSchema = z.object({
  title: z.string().max(200),
  publisher: z.string().max(160),
  url: z.string().max(2048),
  publishedAt: z.string().max(10),
  kind: z.enum(['official', 'commodity', 'market-report']),
  excerpt: z.string().max(2000).optional(),
});
export const marketPriceSchema = z.object({
  country: z.literal('GH').optional(),
  currency: z.literal('GHS').optional(),
  crop: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(40),
  price: z.number().min(0).max(1000000),
  change: z.number().min(-100).max(1000),
  id: z.string().min(1).max(160).optional(),
  status: z.enum(['draft', 'published']).optional(),
  scope: z.enum(['market', 'region', 'national']).optional(),
  region: z.string().max(80).optional(),
  market: z.string().max(160).optional(),
  quantity: z.number().positive().max(100000).optional(),
  packageWeightKg: z.number().positive().max(100000).optional(),
  priceMax: z.number().positive().max(1000000).optional(),
  observedAt: date.optional(),
  source: sourceDraftSchema.optional(),
  reviewedAt: z.iso.datetime().optional(),
  reviewedBy: z.string().trim().min(1).max(160).optional(),
  nationalCoverageConfirmed: z.boolean().optional(),
});

/** Structural evidence checks apply to UI, publication and future research adapters alike. */
export function publicationError(price: MarketPrice, today?: string): string | null {
  if (!marketPriceSchema.safeParse(price).success)
    return 'Check the crop, amount, source link and dates.';
  if (!price.id || !price.scope || !price.source || !price.observedAt)
    return 'Add the observation date, coverage and source before publishing.';
  if (!sourceSchema.safeParse(price.source).success)
    return 'Add a valid source title, publisher, HTTP/HTTPS link and publication date.';
  if (price.country !== 'GH' || price.currency !== 'GHS')
    return 'Only Ghanaian observations explicitly priced in GHS can be published.';
  if (
    !MARKET_UNITS.includes(price.unit as (typeof MARKET_UNITS)[number]) ||
    !price.quantity ||
    price.price <= 0
  )
    return 'Choose a standard unit, quantity and a price greater than zero.';
  if (price.priceMax !== undefined && price.priceMax < price.price)
    return 'The upper price cannot be below the lower price.';
  if (price.scope !== 'national' && !REGIONS.includes(price.region ?? ''))
    return 'Select the Ghanaian region covered by this observation.';
  if (price.scope === 'market' && !price.market?.trim())
    return 'Name the market covered by this observation.';
  if (price.scope === 'national' && !price.nationalCoverageConfirmed)
    return 'Confirm the source explicitly supports nationwide coverage.';
  if (today && (price.observedAt > today || price.source.publishedAt > today))
    return 'Prices and sources cannot be dated in the future.';
  if (!price.reviewedAt || !price.reviewedBy)
    return 'An administrator must review the evidence before publication.';
  return null;
}

export const publishedPrices = (prices: MarketPrice[]): PublishedMarketPrice[] =>
  prices.filter(
    (p): p is PublishedMarketPrice => p.status === 'published' && publicationError(p) === null,
  );

export function unitLabel(price: Pick<MarketPrice, 'unit' | 'quantity' | 'packageWeightKg'>) {
  return `${price.quantity ?? 1} ${price.unit}${price.packageWeightKg ? ` (${price.packageWeightKg} kg each)` : ['bag', 'crate'].includes(price.unit) ? ' (weight not supplied)' : ''}`;
}

/** Never merge different package sizes, dates, crops or unsupported package weights. */
export function supportedRanges(prices: PublishedMarketPrice[]) {
  const groups = new Map<string, PublishedMarketPrice[]>();
  for (const price of prices) {
    const unknownPackage = ['bag', 'crate'].includes(price.unit) && !price.packageWeightKg;
    const key = [
      price.crop.toLowerCase(),
      price.unit,
      price.quantity,
      price.packageWeightKg,
      price.observedAt,
      unknownPackage ? price.id : '',
    ].join('|');
    groups.set(key, [...(groups.get(key) ?? []), price]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      crop: group[0].crop,
      unit: unitLabel(group[0]),
      date: group[0].observedAt,
      low: Math.min(...group.map((p) => p.price)),
      high: Math.max(...group.map((p) => p.priceMax ?? p.price)),
      count: group.length,
    }));
}

export function evidenceToDraft(evidence: MarketEvidence): MarketPrice {
  return {
    country: evidence.country,
    currency: evidence.currency,
    id: evidence.id,
    crop: evidence.crop,
    unit: evidence.unit,
    quantity: evidence.quantity,
    packageWeightKg: evidence.packageWeightKg,
    price: evidence.price,
    priceMax: evidence.priceMax,
    change: 0,
    region: evidence.region,
    market: evidence.market,
    scope: evidence.market ? 'market' : 'region',
    observedAt: evidence.observedAt,
    source: evidence.source,
    status: 'draft',
  };
}

export function validateResearch(
  query: MarketResearchQuery,
  result: MarketResearchResult,
): boolean {
  if (
    !result ||
    !Array.isArray(result.evidence) ||
    !result.evidence.length ||
    new Set(result.evidence.map((item) => item?.id)).size !== result.evidence.length ||
    typeof result.explanation !== 'string' ||
    !result.explanation.trim() ||
    typeof result.recommendedEvidenceId !== 'string'
  )
    return false;
  const matching = result.evidence.filter((item) => {
    if (!item || typeof item.crop !== 'string' || typeof item.id !== 'string' || !item.id.trim())
      return false;
    const draft = {
      ...evidenceToDraft(item),
      reviewedAt: new Date().toISOString(),
      reviewedBy: 'Research review pending',
    };
    return (
      item.crop.trim().toLowerCase() === query.crop.trim().toLowerCase() &&
      item.unit === query.unit &&
      item.quantity === query.quantity &&
      item.packageWeightKg === query.packageWeightKg &&
      (!query.region || query.region === item.region) &&
      (!query.market || query.market.toLowerCase() === item.market?.toLowerCase()) &&
      !publicationError(draft, new Date().toISOString().slice(0, 10))
    );
  });
  return (
    matching.length === result.evidence.length &&
    matching.some((item) => item.id === result.recommendedEvidenceId)
  );
}
