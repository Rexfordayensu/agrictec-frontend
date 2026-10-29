import type { Metadata } from 'next';
import { PageHeader } from '@/components/admin/layout/page-header';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { WeatherCard } from '@/components/market/weather-card';

export const metadata: Metadata = { title: 'Weather' };

export default function AdminWeatherPage() {
  return (
    <RequirePermission permission="content.manage">
      <PageHeader
        title="Weather"
        description="View conditions and forecasts for your current location or another place in Ghana."
      />
      <WeatherCard scope="admin" />
    </RequirePermission>
  );
}
