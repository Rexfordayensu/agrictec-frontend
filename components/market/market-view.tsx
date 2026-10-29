'use client';

import { useEffect, useState } from 'react';
import { MarketPrices } from '@/components/market/market-prices';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { marketService } from '@/services/market.service';
import { useProfileStore } from '@/store/profile-store';
import { usePlatformStore } from '@/store/platform-store';
import type { MarketPrice } from '@/types';

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
  return (
    <>
      {state.status === 'loading' ? (
        <Card role="status">Loading Ghana market observations…</Card>
      ) : state.status === 'error' ? (
        <Card role="alert">
          <p className="text-text">Market prices could not load.</p>
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
        </Card>
      ) : (
        <MarketPrices prices={state.prices} primaryCrops={crops ?? []} />
      )}
    </>
  );
}
