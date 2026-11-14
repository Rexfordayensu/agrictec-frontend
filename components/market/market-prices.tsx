'use client';

import { useState } from 'react';
import {
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Database,
  ExternalLink,
  Leaf,
  MapPin,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { MarketCoverageNotice } from '@/components/market/market-coverage-notice';
import { MarketPriceFilters } from '@/components/market/market-filters';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CropTile, cropFromName } from '@/components/ui/crop-icon';
import { REGIONS } from '@/constants/regions';
import {
  EMPTY_MARKET_FILTERS,
  filterMarketPrices,
  formatMarketAmount,
  publishedPrices,
  supportedRanges,
  unitLabel,
  type MarketFilters,
} from '@/lib/market/evidence';
import { isPrimaryCrop } from '@/lib/market/data';
import { cn } from '@/lib/utils';
import type { MarketPrice } from '@/types';

/** The banner, with the region choice that filters the prices below. */
export function MarketHero({
  region,
  onRegion,
}: {
  region?: string;
  onRegion?: (region: string) => void;
}) {
  return (
    <section
      aria-labelledby="market-title"
      className="rounded-card relative isolate min-h-44 overflow-hidden p-6 text-white sm:p-8"
    >
      {/* A CSS background (already an optimised JPEG): renders the same on the server and in tests. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-20 bg-cover"
        style={{
          backgroundImage: "url('/images/market/market-banner.jpg')",
          backgroundPosition: '78% 55%',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(90deg, rgba(2,70,32,0.97) 0%, rgba(3,82,38,0.92) 40%, rgba(3,82,38,0.2) 62%, rgba(3,82,38,0) 75%)',
        }}
      />
      <h2 id="market-title" className="text-display leading-tight font-extrabold tracking-tight">
        Ghana Market Prices
      </h2>
      <p className="mt-2 max-w-md text-base leading-relaxed text-white/90">
        Get trusted, source-backed prices for key crops across different markets in Ghana.
      </p>
      {onRegion && (
        <label className="relative mt-5 inline-flex">
          <span className="sr-only">Region</span>
          <MapPin
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2"
          />
          <select
            value={region ?? ''}
            onChange={(e) => onRegion(e.target.value)}
            className="min-h-12 min-w-60 appearance-none rounded-xl border border-white/25 bg-white/10 pr-10 pl-11 text-sm font-semibold text-white backdrop-blur-sm [&>option]:text-[#0f2a1f]"
          >
            <option value="">Ghana (All regions)</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 right-4 z-10 -translate-y-1/2 text-xs"
          >
            ▼
          </span>
        </label>
      )}
    </section>
  );
}

/** Crops most traded in Ghana: each chip filters the prices to that crop. */
const POPULAR = ['Maize', 'Cocoa', 'Soybean', 'Cassava', 'Plantain'];

/**
 * Published, source-backed price observations (GET /market/prices), filtered by crop, region,
 * market and search. Drafts and unreviewed observations are never shown, and nothing is
 * averaged or estimated: each amount keeps its own location, unit, date and source.
 */
export function MarketPrices({
  prices,
  primaryCrops = [],
}: {
  prices: MarketPrice[];
  primaryCrops?: string[];
}) {
  const [filters, setFilters] = useState<MarketFilters>(EMPTY_MARKET_FILTERS);
  const published = publishedPrices(prices);
  const visible = filterMarketPrices(published, filters).sort(
    (a, b) =>
      (b.observedAt ?? '').localeCompare(a.observedAt ?? '') || a.crop.localeCompare(b.crop),
  );
  const ranges = supportedRanges(publishedPrices(visible));
  const regions = new Set(published.filter((p) => p.scope !== 'national').map((p) => p.region))
    .size;
  const markets = new Set(published.map((p) => p.market).filter(Boolean)).size;

  function pickCrop(crop: string) {
    setFilters((f) => ({ ...f, crop: f.crop === crop ? '' : crop }));
    document
      .getElementById('market-results')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-5">
      <MarketHero
        region={filters.region}
        onRegion={(region) => setFilters((f) => ({ ...f, region, market: '' }))}
      />

      <section
        aria-labelledby="coverage-title"
        className={cn(
          dashPanel,
          'grid grid-cols-1 items-center gap-4 @4xl:grid-cols-[minmax(0,1.1fr)_repeat(3,minmax(0,1fr))]',
        )}
      >
        <div className="flex items-start gap-3">
          <BarChart3 size={30} aria-hidden="true" className="text-ink-green shrink-0" />
          <div>
            <h2 id="coverage-title" className="text-text text-lg font-bold">
              Ghana market coverage
            </h2>
            <p className="text-text-dim text-sm">Availability and coverage across markets</p>
          </div>
        </div>
        <Stat icon={Database} label="Published observations" value={String(published.length)} />
        <Stat icon={MapPin} label="Regions represented" value={`${regions} of 16`} />
        <Stat icon={Store} label="Named markets" value={String(markets)} />
      </section>

      <section aria-label="Filter prices" className={dashPanel}>
        <MarketPriceFilters prices={published} value={filters} onChange={setFilters} />
      </section>

      <section
        id="market-results"
        aria-label="Market prices"
        className={cn(dashPanel, '@container/market scroll-mt-24')}
      >
        {!visible.length ? (
          <div className="flex flex-col items-center px-2 py-8 text-center" role="status">
            <StoreArt />
            <h3 className="text-text mt-4 text-2xl font-bold">
              {published.length ? 'No prices match these filters' : 'Market price data unavailable'}
            </h3>
            <p className="text-text-dim mt-2 max-w-lg text-sm leading-relaxed">
              {published.length
                ? 'Try another crop, region or market.'
                : 'Source-backed observations will appear after an administrator reviews and publishes them. No sample prices are shown.'}
            </p>
            {published.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters(EMPTY_MARKET_FILTERS)}
                className="mt-4"
              >
                Clear filters
              </Button>
            ) : (
              <div className="mt-6 w-full max-w-3xl">
                <MarketCoverageNotice />
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-text text-lg font-bold">
                {visible.length} published observation{visible.length === 1 ? '' : 's'}
              </h2>
              <p className="text-text-mute text-xs">
                No national average is calculated: each amount keeps its own location, unit and
                date.
              </p>
            </div>
            {ranges.length > 0 && (
              <div className="border-accent/20 bg-accent/5 mt-4 rounded-2xl border p-4">
                <h3 className="text-text text-sm font-semibold">Supported price ranges</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
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
              </div>
            )}
            <ul className="mt-4 grid min-w-0 gap-4 @3xl/market:grid-cols-2 @6xl/market:grid-cols-3">
              {visible.map((price) => (
                <PriceCard
                  key={price.id}
                  price={price}
                  mine={isPrimaryCrop(price.crop, primaryCrops)}
                />
              ))}
            </ul>
          </>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="popular-crops-title"
          className={cn(dashPanel, '@container/popular')}
        >
          <div className="flex items-start gap-3">
            <Leaf size={30} aria-hidden="true" className="text-icon shrink-0" />
            <div>
              <h2 id="popular-crops-title" className="text-text text-lg font-bold">
                Popular crops to watch
              </h2>
              <p className="text-text-dim text-sm">
                Track prices for commonly traded crops in Ghana.
              </p>
            </div>
          </div>
          {/* As many as fit at a width that always shows the full crop name. */}
          <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2">
            {POPULAR.map((crop) => (
              <button
                key={crop}
                type="button"
                aria-pressed={filters.crop === crop}
                onClick={() => pickCrop(crop)}
                className={cn(
                  'border-border bg-glass hover:bg-glass-strong text-text text-small inline-flex min-h-12 min-w-0 items-center gap-2.5 rounded-xl border px-3 text-left font-semibold whitespace-nowrap',
                  filters.crop === crop && 'border-accent bg-accent/10',
                )}
              >
                <CropTile crop={cropFromName(crop)} size="sm" />
                {crop}
              </button>
            ))}
          </div>
        </section>
        <section
          aria-labelledby="next-market-title"
          className="rounded-card border-accent/25 from-accent/10 to-accent/4 min-w-0 border bg-linear-to-br p-4 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <CalendarCheck size={30} aria-hidden="true" className="text-icon shrink-0" />
            <div>
              <h2 id="next-market-title" className="text-text text-lg font-bold">
                What’s next?
              </h2>
              <p className="text-text-dim text-sm">Get the most from market prices on AgriCtec.</p>
            </div>
          </div>
          <ul className="bg-accent/8 mt-4 space-y-3 rounded-2xl p-4 text-sm">
            {(published.length
              ? [
                  ['Compare markets', 'for the same crop, unit and date before you sell.'],
                  ['Check the source', 'of each price: every observation links to its evidence.'],
                ]
              : [
                  ['Check back later', 'for published prices.'],
                  ['Select a crop and region', 'to quickly find price updates when available.'],
                ]
            ).map(([strong, rest]) => (
              <li key={strong} className="text-text flex items-start gap-2.5">
                <CheckCircle2 size={20} aria-hidden="true" className="text-ink-green shrink-0" />
                <span>
                  <strong className="font-semibold">{strong}</strong> {rest}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="bg-accent/6 border-accent/15 flex items-center gap-3 rounded-2xl border px-4 py-3">
      <span className="bg-icon-bg text-icon inline-flex size-12 shrink-0 items-center justify-center rounded-xl">
        <Icon size={24} aria-hidden="true" />
      </span>
      <div>
        <p className="text-text-dim text-small">{label}</p>
        <p className="text-text text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function PriceCard({ price, mine }: { price: MarketPrice; mine: boolean }) {
  return (
    <li className="border-border bg-bg-2/40 min-w-0 rounded-2xl border p-4">
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
        {mine && <Badge>Your crop</Badge>}
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
      {price.source?.url && (
        <a
          href={price.source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-green mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold underline"
        >
          View supporting source
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </li>
  );
}

/** Decoration for the empty state: a market stall on a soft cloud. */
function StoreArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 180 90" className="h-24 w-auto">
      <path
        d="M30 80 Q 18 56 46 50 Q 52 24 86 30 Q 104 10 132 28 Q 168 30 160 64 Q 170 80 150 82 Z"
        fill="currentColor"
        className="text-accent/15"
      />
      <g
        transform="translate(58 18)"
        fill="none"
        stroke="#0b8a55"
        strokeWidth="5"
        strokeLinejoin="round"
      >
        <path d="M4 18 L 10 2 H 58 L 64 18 Z" fill="#e9f7ef" />
        <path
          d="M4 18 v4 a8 8 0 0 0 15 0 a8 8 0 0 0 15 0 a8 8 0 0 0 15 0 a8 8 0 0 0 15 0 v-4"
          fill="#e9f7ef"
        />
        <path d="M10 32 V 62 H 58 V 32" fill="#ffffff" />
        <rect x="18" y="42" width="12" height="20" fill="#e9f7ef" />
        <rect x="36" y="42" width="14" height="10" />
        <path d="M22 2 L 20 18 M 34 2 V 18 M 46 2 L 48 18" />
      </g>
    </svg>
  );
}
