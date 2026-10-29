'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { REGIONS } from '@/constants/regions';
import { MARKET_UNITS, evidenceToDraft, unitLabel } from '@/lib/market/evidence';
import { formatMarketAmount } from '@/lib/market/evidence';
import { generateId } from '@/lib/utils';
import { marketResearchService } from '@/services/market-research.service';
import type { MarketPrice } from '@/types';
import type { IntegrationResult, MarketResearchQuery, MarketResearchResult } from '@/types/market';

export function MarketResearchPanel({ onApprove }: { onApprove: (draft: MarketPrice) => void }) {
  const [query, setQuery] = useState<MarketResearchQuery>({ crop: '', unit: 'kg', quantity: 1 });
  const [state, setState] = useState<
    | { status: 'idle' | 'loading' | 'rejected' }
    | { status: 'error'; message: string }
    | IntegrationResult<MarketResearchResult>
  >({ status: 'idle' });
  const [reviewed, setReviewed] = useState(false);
  const request = useRef(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current++;
      abort.current?.abort();
    },
    [],
  );
  function change(patch: Partial<MarketResearchQuery>) {
    request.current++;
    abort.current?.abort();
    setQuery((current) => ({ ...current, ...patch }));
    setState({ status: 'idle' });
    setReviewed(false);
  }
  async function research(event: FormEvent) {
    event.preventDefault();
    abort.current?.abort();
    abort.current = new AbortController();
    const version = ++request.current;
    setState({ status: 'loading' });
    setReviewed(false);
    try {
      const result = await marketResearchService.research(query, { signal: abort.current.signal });
      if (request.current === version) setState(result);
    } catch (error) {
      if (request.current === version)
        setState({
          status: 'error',
          message:
            error instanceof Error ? error.message : 'Research could not load. Please try again.',
        });
    }
  }
  const evidence = state.status === 'ready' ? state.data.evidence : [];
  const recommendation =
    state.status === 'ready'
      ? evidence.find((item) => item.id === state.data.recommendedEvidenceId)
      : undefined;
  return (
    <section
      className="border-purple/30 bg-purple/5 @container/research min-w-0 rounded-2xl border p-4 sm:p-5"
      aria-label="Evidence-based market price research"
    >
      <h3 className="text-text flex items-center gap-2 font-semibold">
        <Sparkles size={17} aria-hidden="true" />
        Market price research
      </h3>
      <p className="text-text-dim mt-2 text-sm">
        Research must check trustworthy Ghanaian publications before suggesting a price. Official
        reports and verified commodity sources take priority. No recommendation is published
        automatically.
      </p>
      <form onSubmit={(event) => void research(event)} className="mt-4 space-y-3">
        <div className="grid min-w-0 gap-3 @xl/research:grid-cols-2">
          <label className="min-w-0">
            <span className="text-text-dim mb-1 block text-xs font-semibold">Crop to research</span>
            <Input
              value={query.crop}
              maxLength={80}
              onChange={(event) => change({ crop: event.target.value })}
            />
          </label>
          <label>
            <span className="text-text-dim mb-1 block text-xs font-semibold">
              Region (optional)
            </span>
            <Select
              value={query.region ?? ''}
              onChange={(event) =>
                change({ region: event.target.value || undefined, market: undefined })
              }
            >
              <option value="">Search Ghana-wide evidence</option>
              {REGIONS.map((region) => (
                <option key={region}>{region}</option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-text-dim mb-1 block text-xs font-semibold">
              Market (optional)
            </span>
            <Input
              value={query.market ?? ''}
              maxLength={160}
              onChange={(event) => change({ market: event.target.value || undefined })}
            />
          </label>
          <label>
            <span className="text-text-dim mb-1 block text-xs font-semibold">Unit</span>
            <Select
              value={query.unit}
              onChange={(event) =>
                change({
                  unit: event.target.value as MarketResearchQuery['unit'],
                  packageWeightKg: undefined,
                })
              }
            >
              {MARKET_UNITS.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </Select>
          </label>
          <label>
            <span className="text-text-dim mb-1 block text-xs font-semibold">Quantity</span>
            <Input
              type="number"
              min={0.001}
              step="any"
              value={Number.isFinite(query.quantity) ? query.quantity : ''}
              onChange={(event) =>
                change({ quantity: event.target.value ? Number(event.target.value) : NaN })
              }
            />
          </label>
          {['bag', 'crate'].includes(query.unit) && (
            <label>
              <span className="text-text-dim mb-1 block text-xs font-semibold">
                Package weight (kg), if known
              </span>
              <Input
                type="number"
                min={0.001}
                step="any"
                value={query.packageWeightKg ?? ''}
                onChange={(event) =>
                  change({
                    packageWeightKg: event.target.value ? Number(event.target.value) : undefined,
                  })
                }
              />
            </label>
          )}
        </div>
        <Button
          type="submit"
          icon={Search}
          loading={state.status === 'loading'}
          disabled={!query.crop.trim() || !Number.isFinite(query.quantity) || query.quantity <= 0}
          className="whitespace-normal"
        >
          Check Market Price with AI
        </Button>
      </form>
      <div className="mt-5 space-y-4" aria-live="polite">
        {state.status === 'loading' && (
          <p role="status" className="text-text-dim text-sm">
            Checking research availability and source evidence…
          </p>
        )}
        {state.status === 'error' && (
          <p role="alert" className="text-ink-red text-sm">
            {state.message}
          </p>
        )}
        {state.status === 'unavailable' && (
          <div role="status">
            <p className="text-text font-semibold">Market price data unavailable</p>
            <p className="text-text-dim mt-1 text-sm">{state.reason}</p>
          </div>
        )}
        {state.status === 'rejected' && (
          <p className="text-text-dim text-sm">Recommendation rejected. Nothing was published.</p>
        )}
        <section>
          <h4 className="text-text text-sm font-semibold">
            1. Supporting market information &amp; sources
          </h4>
          {!evidence.length ? (
            <p className="text-text-mute mt-2 text-sm">
              No researched sources available. Crop, unit, location, observation date and
              publication date must be supported before a recommendation appears.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {evidence.map((item) => (
                <li key={item.id} className="border-border bg-glass rounded-xl border p-4 text-sm">
                  <p className="text-text font-semibold">
                    {item.crop} · {formatMarketAmount(item.price)}
                    {item.priceMax ? `–${formatMarketAmount(item.priceMax)}` : ''} per{' '}
                    {unitLabel(item)}
                  </p>
                  <p className="text-text-dim mt-1">
                    {[item.market, item.region].filter(Boolean).join(', ')} · Observed{' '}
                    {item.observedAt}
                  </p>
                  <p className="text-text-mute mt-1">
                    {item.source.publisher} · {item.source.title} · Published{' '}
                    {item.source.publishedAt}
                  </p>
                  {item.source.excerpt && (
                    <p className="text-text-dim mt-2 whitespace-pre-wrap">{item.source.excerpt}</p>
                  )}
                  <a
                    href={item.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-green mt-2 inline-flex min-h-9 items-center gap-1 underline"
                  >
                    Read source
                    <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="border-border border-t pt-4">
          <h4 className="text-text text-sm font-semibold">
            2. Recommendation &amp; admin decision
          </h4>
          {recommendation && state.status === 'ready' ? (
            <>
              <p className="text-text-dim mt-2 text-sm">{state.data.explanation}</p>
              <p className="text-text mt-2 font-semibold">
                {formatMarketAmount(recommendation.price)} per {unitLabel(recommendation)} ·
                supported by the observation above
              </p>
              <label className="text-text-dim mt-3 flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(event) => setReviewed(event.target.checked)}
                  className="mt-1 shrink-0"
                />
                <span>I reviewed the cited evidence, units, location and dates.</span>
              </label>
            </>
          ) : (
            <p className="text-text-mute mt-2 text-sm">
              No recommendation. An amount is never guessed when evidence is unavailable.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              disabled={!recommendation || !reviewed}
              onClick={() => {
                if (recommendation && reviewed)
                  onApprove({ ...evidenceToDraft(recommendation), id: generateId() });
              }}
            >
              Approve &amp; review draft
            </Button>
            <Button
              variant="ghost"
              disabled={!recommendation}
              onClick={() => setState({ status: 'rejected' })}
            >
              Reject recommendation
            </Button>
          </div>
          <p className="text-text-mute mt-2 text-xs">
            Approval opens an editable draft. Publishing still requires the final source review in
            the observation form.
          </p>
        </section>
      </div>
    </section>
  );
}
