'use client';

import { useEffect, useState } from 'react';
import { weatherService } from '@/services/weather.service';
import { createDemoWeather } from '@/lib/market/demo-weather';
import type { IntegrationResult, WeatherLocation, WeatherReport } from '@/types/market';

type State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | IntegrationResult<WeatherReport>;

export function useLocationWeather(location: WeatherLocation | null, demo = false) {
  const [state, setState] = useState<State>({ status: 'idle' });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const result: Promise<IntegrationResult<WeatherReport>> = demo
      ? Promise.resolve({ status: 'ready', data: createDemoWeather(location) })
      : weatherService.getForecast(location, { signal: controller.signal });
    void result
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
  }, [location, version, demo]);
  return {
    state,
    loading: () => setState({ status: 'loading' }),
    retry: () => {
      setState({ status: 'loading' });
      setVersion((current) => current + 1);
    },
  };
}
