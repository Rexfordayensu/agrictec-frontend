'use client';

import { useEffect, useState } from 'react';
import { weatherService } from '@/services/weather.service';
import { weatherLocationKey } from '@/lib/market/weather-location';
import type { IntegrationResult, WeatherLocation, WeatherReport } from '@/types/market';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | IntegrationResult<WeatherReport>;

/** Live provider readings, refreshed on focus and every 15 minutes while visible. */
export function useLocationWeather(location: WeatherLocation | null) {
  const key = location ? weatherLocationKey(location) : null;
  const [stored, setStored] = useState<{ key: string | null; state: State }>({
    key: null,
    state: { status: 'idle' },
  });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!location) return;
    let controller: AbortController;
    function refresh() {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      void weatherService
        .getForecast(location!, { signal: current.signal })
        .then((result) => {
          if (!current.signal.aborted) setStored({ key, state: result });
        })
        .catch((error: unknown) => {
          if (!current.signal.aborted)
            setStored({
              key,
              state: {
                status: 'error',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Weather could not be loaded. Please try again.',
              },
            });
        });
    }
    const visibleRefresh = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    const timer = window.setInterval(visibleRefresh, 15 * 60_000);
    window.addEventListener('focus', visibleRefresh);
    document.addEventListener('visibilitychange', visibleRefresh);
    return () => {
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener('focus', visibleRefresh);
      document.removeEventListener('visibilitychange', visibleRefresh);
    };
  }, [location, key, version]);
  return {
    state: stored.key === key ? stored.state : { status: 'loading' as const },
    loading: () => setStored({ key, state: { status: 'loading' } }),
    retry: () => {
      setStored({ key, state: { status: 'loading' } });
      setVersion((current) => current + 1);
    },
  };
}
