'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LastUpdated } from '@/components/admin/content/content-kit';
import { MarketPriceForm } from '@/components/admin/content/market-price-form';
import { MarketResearchPanel } from '@/components/admin/content/market-research-panel';
import { MarketPriceFilters } from '@/components/market/market-filters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Modal } from '@/components/ui/modal';
import { PLATFORM_KEYS } from '@/lib/admin/keys';
import {
  EMPTY_MARKET_FILTERS,
  filterMarketPrices,
  publicationError,
  unitLabel,
} from '@/lib/market/evidence';
import { formatMarketAmount } from '@/lib/market/evidence';
import { contentService } from '@/services/admin/content.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { MarketPrice } from '@/types';
import type { ContentMeta } from '@/types/admin';

export function MarketPricesEditor() {
  const syncVersion = useAdminDataStore((s) => s.syncVersion);
  const [prices, setPrices] = useState<MarketPrice[] | null>(null);
  const [meta, setMeta] = useState<ContentMeta>();
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [filters, setFilters] = useState(EMPTY_MARKET_FILTERS);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [editing, setEditing] = useState<{ record: MarketPrice | null; existing: boolean } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<MarketPrice | null>(null);
  const [writing, setWriting] = useState(false);
  const [researchOpen, setResearchOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([contentService.getMarketPrices(), contentService.getContentMeta()])
      .then(([listed, metadata]) => {
        if (!active) return;
        setPrices(listed);
        setMeta(metadata[PLATFORM_KEYS.market]);
        setError('');
      })
      .catch((cause: unknown) => {
        if (active)
          setError(cause instanceof Error ? cause.message : 'Could not load market observations.');
      });
    return () => {
      active = false;
    };
  }, [version, syncVersion]);

  async function save(price: MarketPrice) {
    setWriting(true);
    try {
      const latest = await contentService.getMarketPrices();
      if (
        editing?.existing &&
        JSON.stringify(latest.find((p) => p.id === price.id)) !== JSON.stringify(editing.record)
      )
        throw new Error(
          'This observation changed elsewhere. Close this form and refresh before editing it again.',
        );
      const next = [...latest.filter((p) => p.id !== price.id), price];
      setPrices(await contentService.saveMarketPrices(next));
      setEditing(null);
      setVersion((v) => v + 1);
      toast.success(
        price.status === 'published' ? 'Source-reviewed price published' : 'Draft saved',
      );
    } finally {
      setWriting(false);
    }
  }
  async function remove() {
    if (!deleting || writing) return;
    setWriting(true);
    try {
      const latest = await contentService.getMarketPrices();
      setPrices(await contentService.saveMarketPrices(latest.filter((p) => p.id !== deleting.id)));
      setDeleting(null);
      setVersion((v) => v + 1);
      toast.success('Market observation deleted');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not delete the observation.');
    } finally {
      setWriting(false);
    }
  }
  const visible = filterMarketPrices(prices ?? [], filters).filter(
    (p) => statusFilter === 'all' || p.status === statusFilter,
  );
  const publishedCount = (prices ?? []).filter(
    (p) => p.status === 'published' && !publicationError(p),
  ).length;

  return (
    <section
      aria-labelledby="market-management-title"
      className="@container/market-editor space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="market-management-title" className="text-text text-lg font-semibold">
            Ghana market price management
          </h2>
          <p className="text-text-dim mt-1 text-sm">
            Manage observations across all 16 regions. Multiple markets can report different prices
            for the same crop.
          </p>
          <LastUpdated meta={meta} className="mt-2" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={Sparkles}
            onClick={() => setResearchOpen((value) => !value)}
            aria-expanded={researchOpen}
          >
            Check Market Price with AI
          </Button>
          <Button
            size="sm"
            icon={Plus}
            disabled={writing}
            onClick={() => setEditing({ record: null, existing: false })}
          >
            Add price observation
          </Button>
        </div>
      </div>
      <p className="text-text-mute text-xs">
        {publishedCount} published observations · {(prices?.length ?? 0) - publishedCount} drafts /
        observations needing review. Older sample prices remain drafts until supported by real
        sources.
      </p>
      {researchOpen && (
        <MarketResearchPanel onApprove={(record) => setEditing({ record, existing: false })} />
      )}
      {error ? (
        <div role="alert" className="border-danger/30 rounded-xl border p-4">
          <p className="text-ink-red text-sm">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={() => setVersion((v) => v + 1)}
            className="mt-3"
          >
            Try again
          </Button>
        </div>
      ) : prices === null ? (
        <p role="status" className="text-text-dim">
          Loading market observations…
        </p>
      ) : (
        <>
          <MarketPriceFilters prices={prices} value={filters} onChange={setFilters} />
          <div role="group" aria-label="Publication status" className="flex flex-wrap gap-2">
            {(['all', 'draft', 'published'] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? 'primary' : 'ghost'}
                aria-pressed={statusFilter === status}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all'
                  ? 'All observations'
                  : status === 'draft'
                    ? 'Drafts'
                    : 'Published'}
              </Button>
            ))}
          </div>
          {!visible.length ? (
            <div
              className="border-border bg-glass rounded-2xl border p-6 text-center"
              role="status"
            >
              <p className="text-text font-semibold">
                {prices.length
                  ? 'No observations match these filters'
                  : 'No market prices have been published yet'}
              </p>
              <p className="text-text-dim mt-2 text-sm">
                Add a source-backed observation, or check for available evidence with the research
                button. No prices are generated automatically.
              </p>
              {prices.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilters(EMPTY_MARKET_FILTERS);
                    setStatusFilter('all');
                  }}
                  className="mt-3"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <ul className="grid min-w-0 gap-4 @3xl/market-editor:grid-cols-2">
              {visible.map((price) => (
                <li
                  key={price.id}
                  className="border-border bg-glass min-w-0 rounded-2xl border p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-text min-w-0 font-semibold break-words">{price.crop}</h3>
                    <Badge
                      color={
                        price.status === 'published' && !publicationError(price) ? 'green' : 'gold'
                      }
                    >
                      {price.status === 'published' && !publicationError(price)
                        ? 'Published · admin reviewed'
                        : 'Draft · needs evidence review'}
                    </Badge>
                  </div>
                  <p className="text-text mt-3 font-bold">
                    {formatMarketAmount(price.price)}
                    {price.priceMax ? `–${formatMarketAmount(price.priceMax)}` : ''}
                  </p>
                  <p className="text-text-dim mt-1 text-sm">per {unitLabel(price)}</p>
                  <p className="text-text-mute mt-2 text-xs">
                    {price.scope === 'national'
                      ? 'Source-reported nationwide coverage'
                      : [price.market, price.region].filter(Boolean).join(', ') ||
                        'Location not supplied'}
                  </p>
                  <p className="text-text-mute mt-1 text-xs">
                    Observed: {price.observedAt ?? 'Not supplied'} · Source:{' '}
                    {price.source?.publisher || 'Not supplied'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Pencil}
                      disabled={writing}
                      onClick={() => setEditing({ record: price, existing: true })}
                    >
                      Edit &amp; review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={Trash2}
                      disabled={writing}
                      onClick={() => setDeleting(price)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Modal
        open={editing !== null}
        onClose={() => {
          if (!writing) setEditing(null);
        }}
        title={editing?.existing ? 'Edit market observation' : 'Add market observation'}
        size="lg"
        closeOnBackdrop={!writing}
      >
        {editing && (
          <MarketPriceForm
            key={editing.record?.id ?? 'new'}
            initial={editing.record}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete market observation?"
        message={`Remove the ${deleting?.crop ?? ''} observation from the published or draft list? Other markets are kept.`}
        confirmLabel="Delete observation"
        danger
        loading={writing}
        onConfirm={() => void remove()}
        onCancel={() => {
          if (!writing) setDeleting(null);
        }}
      />
    </section>
  );
}
