import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { WeatherPage } from '@/components/weather/weather-page';

export const metadata: Metadata = { title: 'Weather' };

/** The forecast at the farm, with alerts, farm guidance and a seasonal outlook. */
export default function Page() {
  return (
    <FeatureGate flag="market">
      <WeatherPage />
    </FeatureGate>
  );
}
