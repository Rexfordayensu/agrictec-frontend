'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CircleAlert,
  Coins,
  Lightbulb,
  RotateCcw,
  Save,
  Sprout,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { LastUpdated, ListEditor } from '@/components/admin/content/content-kit';
import { PRIMARY_CLASS } from '@/components/admin/shared/action-styles';
import { Button } from '@/components/ui/button';
import { CROP_TONES, CropIcon } from '@/components/ui/crop-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { marketReference } from '@/lib/admin/crop-pricing';
import { formatMarketAmount, unitLabel } from '@/lib/market/evidence';
import { PLATFORM_KEYS } from '@/lib/admin/keys';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { contentService } from '@/services/admin/content.service';
import type { MarketPrice } from '@/types';
import type { ContentMeta, CropContent } from '@/types/admin';

type CropName = CropContent['crop'];

const TIPS_MAX = 6;

interface CropIssues {
  yieldPerAcre?: string;
  pricePerTonne?: string;
  tips?: string;
}

/** What stops a crop from saving, per field (empty = fine). */
function issuesOf(crop: CropContent): CropIssues {
  const issues: CropIssues = {};
  if (!(crop.yieldPerAcre > 0) || crop.yieldPerAcre > 1000)
    issues.yieldPerAcre = 'Enter a yield above 0 (up to 1,000 t/acre).';
  if (!(crop.pricePerTonne > 0) || crop.pricePerTonne > 1_000_000)
    issues.pricePerTonne = 'Enter a price above GHS 0 (up to 1,000,000).';
  const tips = crop.tips.map((t) => t.trim()).filter(Boolean);
  if (tips.length === 0) issues.tips = 'Add at least one tip.';
  else if (tips.some((t) => t.length > 240)) issues.tips = 'Keep each tip under 240 characters.';
  return issues;
}

const hasIssues = (crop: CropContent) => Object.keys(issuesOf(crop)).length > 0;
const clean = (crop: CropContent): CropContent => ({
  ...crop,
  tips: crop.tips.map((t) => t.trim()).filter(Boolean),
});
const same = (a: CropContent, b: CropContent) => JSON.stringify(a) === JSON.stringify(b);
const revenueOf = (crop: CropContent) =>
  Number.isFinite(crop.yieldPerAcre * crop.pricePerTonne)
    ? crop.yieldPerAcre * crop.pricePerTonne
    : 0;
const toDrafts = (crops: CropContent[]) =>
  Object.fromEntries(crops.map((c) => [c.crop, c])) as Record<CropName, CropContent>;

/** The crop icon on its tone, at two sizes. */
function CropBadge({ crop, large = false }: { crop: CropName; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        large ? 'size-14 rounded-2xl' : 'size-9 rounded-xl',
        CROP_TONES[crop],
      )}
    >
      <CropIcon crop={crop} size={large ? 26 : 17} />
    </span>
  );
}

/**
 * The crop list: a column with each crop's revenue per acre on wide screens, a sideways-scrolling
 * row of chips on phones. A gold dot marks unsaved edits, a red one a value that can't be saved.
 */
function CropRail({
  crops,
  drafts,
  saved,
  selected,
  onSelect,
}: {
  crops: CropName[];
  drafts: Record<CropName, CropContent>;
  saved: Record<CropName, CropContent>;
  selected: CropName;
  onSelect: (crop: CropName) => void;
}) {
  const top = Math.max(1, ...crops.map((c) => revenueOf(drafts[c])));
  return (
    <nav aria-label="Crops" className="lg:border-border lg:bg-glass lg:rounded-2xl lg:border">
      <p className="text-text-mute hidden px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider uppercase lg:block">
        Revenue per acre
      </p>
      <ul className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-2 lg:pt-0 [&::-webkit-scrollbar]:hidden">
        {crops.map((name) => {
          const draft = drafts[name];
          const active = name === selected;
          const dirty = !same(clean(draft), saved[name]);
          const invalid = hasIssues(draft);
          const share = Math.max(4, Math.round((revenueOf(draft) / top) * 100));
          return (
            <li key={name} className="shrink-0">
              <button
                type="button"
                aria-current={active ? 'true' : undefined}
                onClick={() => onSelect(name)}
                className={cn(
                  'group relative flex w-full items-center gap-3 rounded-xl text-left transition-colors',
                  // Phones: a chip. Wide screens: a row with the revenue bar.
                  'border-border min-h-11 border px-3 py-1.5 lg:border-transparent lg:px-2.5 lg:py-2',
                  active
                    ? 'bg-purple/12 border-purple/40 lg:border-purple/25'
                    : 'bg-glass hover:bg-glass-strong lg:bg-transparent',
                )}
              >
                <span className="hidden lg:block">
                  <CropBadge crop={name} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'truncate text-sm font-semibold',
                        active ? 'text-text' : 'text-text-dim group-hover:text-text',
                      )}
                    >
                      {name}
                    </span>
                    {(dirty || invalid) && (
                      <span
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          invalid ? 'bg-danger' : 'bg-gold',
                        )}
                      >
                        <span className="sr-only">
                          {invalid ? '(needs fixing)' : '(unsaved changes)'}
                        </span>
                      </span>
                    )}
                    <span className="text-text-mute ml-auto hidden text-xs tabular-nums lg:inline">
                      {formatGHS(revenueOf(draft))}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="bg-glass-strong mt-1.5 hidden h-1 overflow-hidden rounded-full lg:block"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full transition-[width]',
                        active ? 'bg-purple' : 'bg-accent/70',
                      )}
                      style={{ width: `${share}%` }}
                    />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A number field with its unit inside, and its error under it. */
function NumberField({
  label,
  hint,
  unit,
  value,
  onChange,
  error,
  step,
  prefix = false,
}: {
  label: string;
  hint: string;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  step: string;
  prefix?: boolean;
}) {
  const affix = <span className="text-text-mute shrink-0 text-xs font-semibold">{unit}</span>;
  return (
    <label className="border-border bg-glass block min-w-0 rounded-2xl border p-4">
      <span className="text-text-dim block text-xs font-semibold">{label}</span>
      <span
        className={cn(
          'bg-bg-2 mt-2.5 flex min-h-12 items-center gap-2 rounded-xl border px-3.5 transition-colors',
          error ? 'border-danger/60' : 'border-border focus-within:border-purple/70',
        )}
      >
        {prefix && affix}
        <input
          type="number"
          min={0}
          step={step}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(Number(e.target.value || NaN))}
          aria-invalid={error ? true : undefined}
          className="text-text font-display min-w-0 flex-1 bg-transparent text-lg font-bold tabular-nums outline-none"
        />
        {!prefix && affix}
      </span>
      <span
        className={cn(
          'mt-2 block text-xs',
          error ? 'text-ink-red font-semibold' : 'text-text-mute',
        )}
      >
        {error ?? hint}
      </span>
    </label>
  );
}

/** The selected crop: figures, the market price next to them, and the tips farmers read. */
function CropEditorPanel({
  draft,
  saved,
  market,
  onChange,
}: {
  draft: CropContent;
  saved: CropContent;
  market: MarketPrice[];
  onChange: (crop: CropContent) => void;
}) {
  const issues = issuesOf(draft);
  const dirty = !same(clean(draft), saved);
  const revenue = revenueOf(draft);
  const before = revenueOf(saved);
  const change = before > 0 && revenue !== before ? ((revenue - before) / before) * 100 : 0;
  const reference = marketReference(draft.crop, market);
  const matchesMarket = reference?.perTonne === draft.pricePerTonne;

  return (
    <section
      aria-labelledby="crop-editor-title"
      className="border-border bg-glass min-w-0 rounded-2xl border"
    >
      <header className="border-border flex flex-wrap items-center gap-x-4 gap-y-3 border-b p-5">
        <CropBadge crop={draft.crop} large />
        <div className="min-w-[12rem] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="crop-editor-title" className="font-display text-text text-xl font-bold">
              {draft.crop}
            </h2>
            {dirty && (
              <span className="bg-gold/15 text-ink-gold rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Unsaved
              </span>
            )}
          </div>
          <p className="text-text-mute mt-0.5 text-sm">
            Feeds the yield predictor and the assistant&apos;s {draft.crop.toLowerCase()} tips.
          </p>
        </div>
        {dirty && (
          <Button
            size="sm"
            variant="ghost"
            icon={RotateCcw}
            onClick={() => onChange(saved)}
            className="border-border border max-sm:w-full"
          >
            Undo changes
          </Button>
        )}
      </header>

      <div className="space-y-6 p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <NumberField
            label="Base yield"
            hint={
              draft.yieldPerAcre === saved.yieldPerAcre
                ? 'Tonnes per acre, before farming practices.'
                : `Was ${saved.yieldPerAcre} t/acre.`
            }
            unit="t/acre"
            step="0.1"
            value={draft.yieldPerAcre}
            error={issues.yieldPerAcre}
            onChange={(yieldPerAcre) => onChange({ ...draft, yieldPerAcre })}
          />
          <NumberField
            label="Farm-gate price"
            hint={
              draft.pricePerTonne === saved.pricePerTonne
                ? 'What farmers are paid per tonne at the farm gate.'
                : `Was ${formatGHS(saved.pricePerTonne)} per tonne.`
            }
            unit="GHS / t"
            step="10"
            value={draft.pricePerTonne}
            error={issues.pricePerTonne}
            onChange={(pricePerTonne) => onChange({ ...draft, pricePerTonne })}
          />
          {/* The result: what a farmer sees as average revenue per acre. */}
          <div className="bg-purple/10 border-purple/25 rounded-2xl border p-4 sm:col-span-2 xl:col-span-1">
            <p className="text-ink-purple flex items-center gap-1.5 text-xs font-semibold">
              <Coins size={14} aria-hidden="true" />
              Revenue per acre
            </p>
            <p className="font-display text-text mt-2.5 text-2xl font-bold tabular-nums">
              {formatGHS(revenue)}
            </p>
            <p className="text-text-mute mt-1.5 flex items-center gap-1 text-xs">
              {change === 0 ? (
                'Yield × price, at baseline.'
              ) : (
                <>
                  {change > 0 ? (
                    <ArrowUpRight size={13} aria-hidden="true" className="text-ink-green" />
                  ) : (
                    <ArrowDownRight size={13} aria-hidden="true" className="text-ink-red" />
                  )}
                  <span
                    className={cn(
                      'font-semibold tabular-nums',
                      change > 0 ? 'text-ink-green' : 'text-ink-red',
                    )}
                  >
                    {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </span>
                  from {formatGHS(before)}
                </>
              )}
            </p>
          </div>
        </div>

        {/* The market page's price for the same crop, so the two never drift apart unnoticed. */}
        <div className="border-border flex flex-col gap-3 rounded-2xl border border-dashed p-4 sm:flex-row sm:items-center">
          <span className="bg-info/12 text-ink-blue inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
            <Store size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            {reference ? (
              <>
                <p className="text-text font-semibold">
                  Market page: {formatMarketAmount(reference.row.price)}{' '}
                  <span className="text-text-mute font-normal">per {unitLabel(reference.row)}</span>
                </p>
                <p className="text-text-mute text-xs">
                  {reference.perTonne === null
                    ? 'This observation is a range or has no documented unit weight. No single per-tonne price can be copied.'
                    : matchesMarket
                      ? `Same as ${formatGHS(reference.perTonne)} per tonne. The two pages agree.`
                      : `That is ${formatGHS(reference.perTonne)} per tonne.`}
                </p>
                <p className="text-text-mute mt-1 text-xs">
                  {[reference.row.market, reference.row.region].filter(Boolean).join(', ') ||
                    'Source-reported nationwide coverage'}{' '}
                  · {reference.row.observedAt} · {reference.row.source?.publisher}
                </p>
              </>
            ) : (
              <>
                <p className="text-text font-semibold">No single source-reviewed reference</p>
                <p className="text-text-mute text-xs">
                  Review {draft.crop} under Market Price Management. Multiple regional prices are
                  not reduced to one national price.
                </p>
              </>
            )}
          </div>
          {reference?.perTonne != null && !matchesMarket && (
            <Button
              size="sm"
              variant="ghost"
              icon={ArrowRight}
              onClick={() => onChange({ ...draft, pricePerTonne: reference.perTonne ?? 0 })}
              className="border-border shrink-0 border"
            >
              Use market price
            </Button>
          )}
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Lightbulb size={16} aria-hidden="true" className="text-ink-gold" />
            <h3 className="text-text text-sm font-semibold">Tips for farmers</h3>
            <span className="text-text-mute basis-full text-xs sm:basis-auto">
              Shown under the yield prediction, in this order.
            </span>
          </div>
          <ListEditor
            label="Tips"
            items={draft.tips}
            onChange={(tips) => onChange({ ...draft, tips })}
            min={1}
            max={TIPS_MAX}
            addLabel="Add tip"
            placeholder="A short, practical tip"
            multiline
          />
          {issues.tips && (
            <p role="alert" className="text-ink-red mt-2 text-xs font-semibold">
              {issues.tips}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Crops & yields (phase A12): base yield, farm-gate price and tips for each crop, behind the
 * yield predictor and the assistant. Pick a crop on the left, edit it on the right; edits to
 * several crops are kept until one Save writes them all (audited, live for farmers at once).
 */
export function CropsEditor() {
  const [saved, setSaved] = useState<CropContent[] | null>(null);
  const [drafts, setDrafts] = useState<Record<CropName, CropContent> | null>(null);
  const [market, setMarket] = useState<MarketPrice[]>([]);
  const [meta, setMeta] = useState<ContentMeta | undefined>();
  const [selected, setSelected] = useState<CropName | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      contentService.getCrops(),
      contentService.getMarketPrices(),
      contentService.getContentMeta(),
    ]).then(([crops, prices, metas]) => {
      if (!active) return;
      setSaved(crops);
      setDrafts(toDrafts(crops));
      setMarket(prices);
      setMeta(metas[PLATFORM_KEYS.crops]);
      setSelected((current) => current ?? crops[0]?.crop ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const savedByCrop = saved ? toDrafts(saved) : null;
  const edited =
    saved && drafts ? saved.filter((c) => !same(clean(drafts[c.crop]), c)).map((c) => c.crop) : [];
  const blocked = edited.filter((c) => drafts && hasIssues(drafts[c]));

  // Warn before the tab closes with unsaved edits.
  const dirty = edited.length > 0;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (!saved || !drafts || !savedByCrop || !selected) {
    return (
      <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-14 rounded-2xl lg:h-[28rem]" />
        <Skeleton className="h-[34rem] rounded-2xl" />
      </div>
    );
  }

  async function saveAll() {
    if (!drafts) return;
    setSaving(true);
    try {
      // Re-read the latest list and change only the crops edited here, so two admins editing
      // different crops don't overwrite each other.
      const latest = await contentService.getCrops();
      const next = await contentService.saveCrops(
        latest.map((c) => (edited.includes(c.crop) ? clean(drafts[c.crop]) : c)),
      );
      setSaved(next);
      setDrafts(toDrafts(next));
      setMeta((await contentService.getContentMeta())[PLATFORM_KEYS.crops]);
      toast.success(edited.length === 1 ? `${edited[0]} saved` : `${edited.length} crops saved`, {
        description: 'The yield predictor uses the new figures now.',
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not save the crops');
    } finally {
      setSaving(false);
    }
  }

  const crops = saved.map((c) => c.crop);
  const top = saved.reduce((best, c) => (revenueOf(c) > revenueOf(best) ? c : best), saved[0]);
  const average = saved.reduce((sum, c) => sum + revenueOf(c), 0) / Math.max(1, saved.length);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <LastUpdated meta={meta} />
        <dl className="text-text-mute flex flex-wrap gap-x-5 gap-y-1 text-xs">
          <div className="flex items-center gap-1.5">
            <Sprout size={13} aria-hidden="true" />
            <dt>Crops</dt>
            <dd className="text-text font-semibold tabular-nums">{saved.length}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt>Average revenue</dt>
            <dd className="text-text font-semibold tabular-nums">{formatGHS(average)}/acre</dd>
          </div>
          {top && (
            <div className="flex items-center gap-1.5">
              <dt>Top earner</dt>
              <dd className="text-text font-semibold">{top.crop}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-24">
          <CropRail
            crops={crops}
            drafts={drafts}
            saved={savedByCrop}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        <CropEditorPanel
          key={selected}
          draft={drafts[selected]}
          saved={savedByCrop[selected]}
          market={market}
          onChange={(crop) => setDrafts({ ...drafts, [crop.crop]: crop })}
        />
      </div>

      {/* One save for every edited crop; it stays in view while there is something to save. */}
      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          className="border-border bg-bg-2 shadow-glass animate-fade-in sticky bottom-4 z-20 flex flex-col gap-3 rounded-2xl border p-3 pl-4 sm:flex-row sm:items-center"
        >
          <p className="text-text min-w-0 flex-1 text-sm">
            {blocked.length > 0 ? (
              <span className="text-ink-red flex items-center gap-1.5 font-semibold">
                <CircleAlert size={15} aria-hidden="true" />
                Fix {blocked.join(', ')} before saving.
              </span>
            ) : (
              <>
                <span className="font-semibold">
                  {edited.length} {edited.length === 1 ? 'crop' : 'crops'} edited
                </span>
                <span className="text-text-mute"> · {edited.join(', ')}</span>
              </>
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={saving}
              onClick={() => setDrafts(toDrafts(saved))}
            >
              Discard
            </Button>
            <Button
              size="sm"
              icon={Save}
              loading={saving}
              disabled={blocked.length > 0}
              onClick={() => void saveAll()}
              className={PRIMARY_CLASS}
            >
              Save changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
