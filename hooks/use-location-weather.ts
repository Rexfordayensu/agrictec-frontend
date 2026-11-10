'use client';

import { useEffect, useState } from 'react';
import { weatherService } from '@/services/weather.service';
import type { IntegrationResult, WeatherLocation, WeatherReport } from '@/types/market';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | IntegrationResult<WeatherReport>;

/** Live weather for a place, from the API's weather providers (never made-up readings). */
export function useLocationWeather(location: WeatherLocation | null) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    void weatherService
      .getForecast(location, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setState(result);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Weather could not be loaded. Please try again.',
          });
      });
    return () => controller.abort();
  }, [location, version]);
  return {
    state,
    loading: () => setState({ status: 'loading' }),
    retry: () => {
      setState({ status: 'loading' });
      setVersion((current) => current + 1);
    },
  };
}
