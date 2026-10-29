'use client';

import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { REGIONS } from '@/constants/regions';
import {
  GHANA_MARKET_CROPS,
  MARKET_UNITS,
  marketPriceSchema,
  publicationError,
} from '@/lib/market/evidence';
import { getCurrentAdmin } from '@/lib/admin/admin-session';
import { generateId } from '@/lib/utils';
import type { MarketPrice } from '@/types';
import type { MarketSource } from '@/types/market';

export function MarketPriceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: MarketPrice | null;
  onSave: (price: MarketPrice) => Promise<void>;
  onCancel: () => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<MarketPrice>(() =>
    initial
      ? { ...initial, source: initial.source ? { ...initial.source } : undefined }
      : {
          id: generateId(),
          crop: '',
          unit: 'kg',
          quantity: 1,
          price: NaN,
          change: 0,
          scope: 'market',
          status: 'draft',
        },
  );
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const source = draft.source ?? {
    title: '',
    publisher: '',
    url: '',
    publishedAt: '',
    kind: 'official' as const,
    excerpt: '',
  };
  const update = (patch: Partial<MarketPrice>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setReviewed(false);
    setError('');
  };
  const updateSource = (patch: Partial<MarketSource>) =>
    update({ source: { ...source, ...patch } });
  const numeric = (value: string) => (value === '' ? undefined : Number(value));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    const published = draft.status === 'published';
    if (published && !reviewed)
      return setError(
        'Review the supporting source and tick the approval checkbox before publishing.',
      );
    const next: MarketPrice = {
      ...draft,
      country: 'GH',
      currency: 'GHS',
      crop: draft.crop.trim(),
      id: draft.id ?? generateId(),
      reviewedAt: published ? new Date().toISOString() : undefined,
      reviewedBy: published ? (getCurrentAdmin()?.name ?? 'Administrator') : undefined,
    };
    if (!marketPriceSchema.safeParse(next).success)
      return setError(
        'Add a crop name, valid price and quantity, and check any dates you entered.',
      );
    const issue = published ? publicationError(next, new Date().toISOString().slice(0, 10)) : null;
    if (issue) return setError(issue);
    setSaving(true);
    try {
      await onSave(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this observation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="@container/price-form space-y-5"
      noValidate
    >
      <p className="text-text-dim text-sm">
        Enter an observation from a real Ghanaian source. Drafts stay private to administrators.
        Publishing requires a source and your review.
      </p>
      <fieldset disabled={saving} className="min-w-0 space-y-5">
        <div className="grid min-w-0 gap-3 @lg/price-form:grid-cols-2">
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">Crop</span>
            <Input
              value={draft.crop}
              list={`${id}-crops`}
              maxLength={80}
              onChange={(event) => update({ crop: event.target.value })}
              placeholder="Choose or type a crop"
            />
            <datalist id={`${id}-crops`}>
              {GHANA_MARKET_CROPS.map((crop) => (
                <option key={crop}>{crop}</option>
              ))}
            </datalist>
          </label>
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">Price coverage</span>
            <Select
              value={draft.scope ?? 'market'}
              onChange={(event) => {
                const scope = event.target.value as MarketPrice['scope'];
                update({
                  scope,
                  region: scope === 'national' ? undefined : draft.region,
                  market: scope === 'market' ? draft.market : undefined,
                  nationalCoverageConfirmed: false,
                });
              }}
            >
              <option value="market">Named market</option>
              <option value="region">Region reported by source</option>
              <option value="national">Nationwide, explicitly supported by source</option>
            </Select>
          </label>
          {draft.scope !== 'national' && (
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-sm">Ghana region</span>
              <Select
                value={draft.region ?? ''}
                onChange={(event) => update({ region: event.target.value })}
              >
                <option value="">Select region</option>
                {REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </Select>
            </label>
          )}
          {draft.scope === 'market' && (
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-sm">Market name</span>
              <Input
                value={draft.market ?? ''}
                maxLength={160}
                onChange={(event) => update({ market: event.target.value })}
                placeholder="Market named in the source"
              />
            </label>
          )}
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">Lower or exact price (GHS)</span>
            <Input
              type="number"
              inputMode="decimal"
              min={0.01}
              step="any"
              value={Number.isFinite(draft.price) ? draft.price : ''}
              onChange={(event) => update({ price: numeric(event.target.value) ?? NaN })}
            />
          </label>
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">
              Upper price, only if source reports a range
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0.01}
              step="any"
              value={draft.priceMax ?? ''}
              onChange={(event) => update({ priceMax: numeric(event.target.value) })}
            />
          </label>
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">Measurement unit</span>
            <Select
              value={draft.unit}
              onChange={(event) => update({ unit: event.target.value, packageWeightKg: undefined })}
            >
              {!MARKET_UNITS.includes(draft.unit as (typeof MARKET_UNITS)[number]) && (
                <option value={draft.unit}>
                  Legacy unit: {draft.unit} (choose a standard unit)
                </option>
              )}
              {MARKET_UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </Select>
          </label>
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">
              Quantity of units covered by this price
            </span>
            <Input
              type="number"
              min={0.001}
              step="any"
              value={draft.quantity ?? ''}
              onChange={(event) => update({ quantity: numeric(event.target.value) })}
            />
          </label>
          {['bag', 'crate'].includes(draft.unit) && (
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-sm">
                Weight per bag/crate (kg), if documented
              </span>
              <Input
                type="number"
                min={0.001}
                step="any"
                value={draft.packageWeightKg ?? ''}
                onChange={(event) => update({ packageWeightKg: numeric(event.target.value) })}
              />
            </label>
          )}
          <label className="min-w-0">
            <span className="text-text-dim mb-1.5 block text-sm">Price observation date</span>
            <Input
              type="date"
              value={draft.observedAt ?? ''}
              onChange={(event) => update({ observedAt: event.target.value || undefined })}
            />
          </label>
        </div>
        <section className="border-border min-w-0 rounded-xl border p-4">
          <h3 className="text-text mb-3 font-semibold">Supporting source</h3>
          <div className="grid min-w-0 gap-3 @lg/price-form:grid-cols-2">
            <label>
              <span className="text-text-dim mb-1.5 block text-sm">Source title</span>
              <Input
                value={source.title}
                maxLength={200}
                onChange={(event) => updateSource({ title: event.target.value })}
              />
            </label>
            <label>
              <span className="text-text-dim mb-1.5 block text-sm">Publisher / organisation</span>
              <Input
                value={source.publisher}
                maxLength={160}
                onChange={(event) => updateSource({ publisher: event.target.value })}
              />
            </label>
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-sm">Source link (HTTP/HTTPS)</span>
              <Input
                type="url"
                value={source.url}
                maxLength={2048}
                onChange={(event) => updateSource({ url: event.target.value })}
              />
            </label>
            <label>
              <span className="text-text-dim mb-1.5 block text-sm">Source publication date</span>
              <Input
                type="date"
                value={source.publishedAt}
                onChange={(event) => updateSource({ publishedAt: event.target.value })}
              />
            </label>
            <label>
              <span className="text-text-dim mb-1.5 block text-sm">Source category</span>
              <Select
                value={source.kind}
                onChange={(event) =>
                  updateSource({ kind: event.target.value as MarketSource['kind'] })
                }
              >
                <option value="official">Official publication</option>
                <option value="commodity">Verified commodity market source</option>
                <option value="market-report">Agricultural market report</option>
              </Select>
            </label>
          </div>
          <label className="mt-3 block">
            <span className="text-text-dim mb-1.5 block text-sm">
              Supporting figures / source excerpt (optional)
            </span>
            <textarea
              value={source.excerpt ?? ''}
              maxLength={2000}
              rows={3}
              onChange={(event) => updateSource({ excerpt: event.target.value })}
              className="border-border bg-bg-2 text-text w-full min-w-0 rounded-xl border p-3 text-sm"
            />
          </label>
        </section>
        <label className="block">
          <span className="text-text-dim mb-1.5 block text-sm">Publication status</span>
          <Select
            value={draft.status ?? 'draft'}
            onChange={(event) => update({ status: event.target.value as MarketPrice['status'] })}
          >
            <option value="draft">Draft — admin only</option>
            <option value="published">Publish for farmers</option>
          </Select>
        </label>
        {draft.scope === 'national' && (
          <label className="text-text-dim flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={Boolean(draft.nationalCoverageConfirmed)}
              onChange={(event) => update({ nationalCoverageConfirmed: event.target.checked })}
              className="mt-1 shrink-0"
            />
            <span>
              The source explicitly supports a nationwide price. This is not an average inferred
              from a few markets.
            </span>
          </label>
        )}
        {draft.status === 'published' && (
          <label className="text-text-dim flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
              className="mt-1 shrink-0"
            />
            <span>
              I checked the source, crop, price, unit, location and dates, and approve this
              observation for publication.
            </span>
          </label>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-ink-red text-sm">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {draft.status === 'published' ? 'Approve & publish observation' : 'Save draft'}
        </Button>
      </div>
    </form>
  );
}
