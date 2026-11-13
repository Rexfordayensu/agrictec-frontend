'use client';

import { useEffect, useState } from 'react';
import { MarketHero, MarketPrices } from '@/components/market/market-prices';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { marketService } from '@/services/market.service';
import { useProfileStore } from '@/store/profile-store';
import { usePlatformStore } from '@/store/platform-store';
import type { MarketPrice } from '@/types';

/** Loads the published prices (GET /market/prices) again whenever the admin publishes. */
export function MarketView() {
  const crops = useProfileStore((s) => s.profile?.primaryCrops);
  const platformPrices = usePlatformStore((s) => s.marketPrices);
  const [state, setState] = useState<{
    status: 'loading' | 'error' | 'ready';
    prices: MarketPrice[];
  }>({ status: 'loading', prices: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void marketService
      .getPrices()
      .then((prices) => {
        if (active) setState({ status: 'ready', prices });
      })
      .catch(() => {
        if (active) setState({ status: 'error', prices: [] });
      });
    return () => {
      active = false;
    };
  }, [attempt, platformPrices]);

  if (state.status === 'ready')
    return <MarketPrices prices={state.prices} primaryCrops={crops ?? []} />;
  return (
    <div className="space-y-5">
      <MarketHero />
      {state.status === 'loading' ? (
        <div role="status" aria-label="Loading Ghana market observations" className="space-y-5">
          <Skeleton className="rounded-card h-24" />
          <Skeleton className="rounded-card h-20" />
          <Skeleton className="rounded-card h-64" />
        </div>
      ) : (
        <div role="alert" className={dashPanel}>
          <p className="text-text font-semibold">Market prices could not load.</p>
          <p className="text-text-dim mt-1 text-sm">
            No prices are shown rather than old or invented ones.
          </p>
          <Button
            variant="ghost"
            onClick={() => {
              setState({ status: 'loading', prices: [] });
              setAttempt((value) => value + 1);
            }}
            className="mt-3"
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
