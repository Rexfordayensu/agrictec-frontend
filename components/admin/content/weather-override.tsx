import { WeatherCard } from '@/components/market/weather-card';
import { adminPath } from '@/lib/admin-path';

/** The existing admin weather section now selects a personal location, never a global override. */
export function WeatherOverride() {
  return <WeatherCard scope="admin" weatherHref={adminPath('/admin/content/weather')} />;
}
