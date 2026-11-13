'use client';

import Link from 'next/link';
import { ArrowRight, CloudRain, Droplet, Droplets, MapPin, Wind } from 'lucide-react';
import { WeatherIcon } from '@/components/ui/weather-icon';
import { conditionOf, updatedLabel } from '@/lib/market/weather-insights';
import { dashPanel } from './dashboard-ui';
import type { WeatherReport } from '@/types/market';

/** A compact view of the same live forecast used by the farm's weather page. */
export function DashboardWeather({
  report,
  location,
  loading,
  onRetry,
}: {
  report: WeatherReport | null;
  location: string;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <section className={`${dashPanel} dash-weather`} aria-labelledby="dashboard-weather-title">
      <h2 id="dashboard-weather-title">
        <CloudRain aria-hidden="true" />
        Local Weather
      </h2>
      <p className="dash-weather-place">
        <MapPin size={17} aria-hidden="true" />
        {location}
      </p>
      <div className="dash-weather-conditions" aria-live="polite">
        {report ? (
          <>
            <div className="dash-weather-temperature">
              <WeatherIcon
                condition={conditionOf(report.current.description, report.daily[0]?.storm)}
                size={49}
              />
              <div>
                <strong>{report.current.temp}°C</strong>
                <span>{report.current.description}</span>
              </div>
            </div>
            <dl>
              {[
                {
                  icon: Droplet,
                  label: 'Rain chance',
                  value: report.current.rainChance == null ? '—' : `${report.current.rainChance}%`,
                },
                { icon: Droplets, label: 'Humidity', value: `${report.current.humidity}%` },
                {
                  icon: Wind,
                  label: 'Wind',
                  value: report.current.windKph == null ? '—' : `${report.current.windKph} km/h`,
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label}>
                  <Icon size={14} aria-hidden="true" />
                  <dt>{label}:</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </>
        ) : (
          <div className="dash-weather-unavailable">
            <p>{loading ? 'Loading local weather…' : 'Local weather is unavailable right now.'}</p>
            {!loading && (
              <button type="button" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        )}
      </div>
      {report && (
        <p className="dash-weather-source">
          {report.provider} ·{' '}
          <time dateTime={report.updatedAt}>{updatedLabel(report.updatedAt)}</time> (Ghana time)
        </p>
      )}
      <Link href="/weather" className="dash-weather-link">
        View full forecast <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
