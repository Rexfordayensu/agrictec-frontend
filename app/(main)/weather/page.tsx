import type { Metadata } from 'next';
import { WeatherCard } from '@/components/market/weather-card';
import { FeatureGate } from '@/components/shared/feature-gate';

export const metadata: Metadata = { title: 'Weather' };

export default function WeatherPage() {
  return (
    <FeatureGate flag="market">
      <WeatherCard />
    </FeatureGate>
  );
}
