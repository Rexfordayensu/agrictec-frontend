import { WeatherCard } from '@/components/market/weather-card';

/** The existing admin weather section now selects a personal location, never a global override. */
export function WeatherOverride() {
  return <WeatherCard scope="admin" />;
}
