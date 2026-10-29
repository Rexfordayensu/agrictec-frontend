'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CloudOff, CloudSun, LocateFixed, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { REGIONS } from '@/constants/regions';
import { useLocationWeather } from '@/hooks/use-location-weather';
import {
  GHANA_WEATHER_PLACES,
  requestWeatherLocation,
  requestInitialWeatherLocation,
  validWeatherLocation,
} from '@/lib/market/weather-location';
import { DEMO_WEATHER_LOCATION } from '@/lib/market/demo-weather';
import { sessionStore } from '@/services/storage';
import { useProfileStore } from '@/store/profile-store';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import type { WeatherLocation, WeatherReport } from '@/types/market';

const timeLabel = (value: string) =>
  new Date(value).toLocaleString('en-GH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Accra',
  });

export function WeatherCard({
  scope = 'farmer',
  compact = false,
}: {
  scope?: 'farmer' | 'admin';
  compact?: boolean;
}) {
  const farmerId = useProfileStore((s) => s.userId);
  const farmRegion = useProfileStore((s) => s.profile?.region);
  const adminId = useAdminAuthStore((s) => s.admin?.id);
  const key = `weather-location:${scope}:${scope === 'admin' ? (adminId ?? 'unknown') : (farmerId ?? 'unknown')}`;
  return (
    <WeatherPanel
      key={key}
      storageKey={key}
      initialRegion={scope === 'farmer' ? farmRegion : undefined}
      compact={compact}
      weatherHref={scope === 'admin' ? '/admin/content/weather' : '/weather'}
    />
  );
}

function WeatherPanel({
  storageKey,
  initialRegion,
  compact,
  weatherHref,
}: {
  storageKey: string;
  initialRegion?: string;
  compact: boolean;
  weatherHref: string;
}) {
  const id = useId();
  const request = useRef(0);
  const alive = useRef(true);
  const [location, setLocation] = useState<WeatherLocation | null>(() => {
    const saved = sessionStore.get<WeatherLocation | null>(storageKey, null);
    if (validWeatherLocation(saved)) return saved;
    return initialRegion && REGIONS.includes(initialRegion)
      ? { kind: 'place', region: initialRegion, label: `${initialRegion}, Ghana` }
      : DEMO_WEATHER_LOCATION;
  });
  const [region, setRegion] = useState(location?.region ?? initialRegion ?? '');
  const [city, setCity] = useState(location?.city ?? '');
  const [locating, setLocating] = useState(false);
  const [autoChecking, setAutoChecking] = useState(true);
  const [locationError, setLocationError] = useState('');
  const { state, loading, retry } = useLocationWeather(location, true);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const version = ++request.current;
    void requestInitialWeatherLocation(storageKey)
      .then((next) => {
        if (!active || request.current !== version || !next) return;
        setLocation(next);
        setRegion('');
        setCity('');
        sessionStore.set(storageKey, next);
      })
      .catch((error: unknown) => {
        if (active && request.current === version)
          setLocationError(
            error instanceof Error ? error.message : 'Choose your location manually.',
          );
      })
      .finally(() => {
        if (active && request.current === version) setAutoChecking(false);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [storageKey]);

  function selectLocation(next: WeatherLocation) {
    request.current++;
    setLocating(false);
    setAutoChecking(false);
    setLocationError('');
    loading();
    setLocation(next);
    if (next.kind === 'coordinates') {
      setRegion('');
      setCity('');
    }
    sessionStore.set(storageKey, next);
  }
  async function locate() {
    setAutoChecking(false);
    const version = ++request.current;
    setLocating(true);
    setLocationError('');
    try {
      const next = await requestWeatherLocation();
      if (alive.current && request.current === version) selectLocation(next);
    } catch (error) {
      if (alive.current && request.current === version)
        setLocationError(error instanceof Error ? error.message : 'Select a location manually.');
    } finally {
      if (alive.current && request.current === version) setLocating(false);
    }
  }
  function manual(event: FormEvent) {
    event.preventDefault();
    if (!REGIONS.includes(region)) return setLocationError('Choose a Ghanaian region.');
    selectLocation({
      kind: 'place',
      region,
      city: city.trim() || undefined,
      label: [city.trim(), region, 'Ghana'].filter(Boolean).join(', '),
    });
  }

  if (compact)
    return (
      <Card className="min-w-0 rounded-3xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <CloudSun size={18} aria-hidden="true" className="text-ink-blue" />
              Local weather
            </CardTitle>
            <p className="text-ink-gold mt-2 text-xs font-semibold">
              Demo weather · sample measurements
            </p>
            <p className="text-text-dim mt-2 text-sm break-words">
              {state.status === 'ready'
                ? state.data.location.label
                : (location?.label ?? 'Choose your location on the Weather page')}
            </p>
            {autoChecking && (
              <p role="status" className="text-text-dim mt-2 text-xs">
                Detecting your location… Allow access in your browser if prompted.
              </p>
            )}
            {locationError && (
              <p role="status" className="text-ink-gold mt-2 text-xs">
                {locationError}
              </p>
            )}
            <div className="text-text mt-2 text-sm" aria-live="polite">
              {state.status === 'ready' ? (
                <>
                  <p className="font-semibold">
                    {state.data.current.temp}°C · {state.data.current.description}
                  </p>
                  <p className="text-text-dim mt-1">
                    Rain probability: {state.data.current.rainChance}%
                  </p>
                  <p className="text-text-mute mt-1 text-xs">
                    Demo generated: {timeLabel(state.data.updatedAt)} · Not live weather
                  </p>
                </>
              ) : (
                <p>
                  {state.status === 'loading' || state.status === 'idle'
                    ? 'Preparing demo measurements…'
                    : state.status === 'error'
                      ? 'Weather could not load. Open Weather to try again.'
                      : 'Demo measurements could not load.'}
                </p>
              )}
            </div>
          </div>
          <Link
            href={weatherHref}
            className="border-border text-ink-green hover:bg-glass-strong inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold"
          >
            View weather forecast
          </Link>
        </div>
      </Card>
    );

  return (
    <Card className="@container/weather min-w-0 rounded-3xl">
      <CardHeader className="flex-wrap gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CloudSun size={18} aria-hidden="true" className="text-ink-blue" />
            Local weather
          </CardTitle>
          <CardSub>Conditions and forecast for your selected location.</CardSub>
        </div>
      </CardHeader>
      <p className="text-ink-gold mb-3 text-xs font-semibold">
        Demo weather: sample measurements, not live weather observations.
      </p>
      {autoChecking && (
        <p role="status" className="text-text-dim mb-3 text-sm">
          Detecting your location… Allow access in your browser if prompted.
        </p>
      )}
      <p className="text-text mb-3 flex items-start gap-2 text-sm font-semibold">
        <MapPin size={16} className="text-ink-green mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {state.status === 'ready'
            ? state.data.location.label
            : (location?.label ?? 'Choose a region or city in Ghana')}
        </span>
      </p>
      {locationError && (
        <p role="alert" className="text-ink-gold mt-3 text-sm">
          {locationError}
        </p>
      )}
      <div className="mt-4" aria-live="polite">
        {state.status === 'ready' ? (
          <WeatherReadings report={state.data} showForecasts={false} />
        ) : state.status === 'loading' || state.status === 'idle' ? (
          <p role="status" className="text-text-dim text-sm">
            Preparing demo measurements for this location…
          </p>
        ) : (
          <div className="bg-bg-2/40 rounded-2xl p-4">
            <p className="text-text flex items-center gap-2 font-semibold">
              <CloudOff size={18} aria-hidden="true" />
              {state.status === 'error' ? 'Weather could not load' : 'Weather data unavailable'}
            </p>
            <p className="text-text-dim mt-2 text-sm">
              {state.status === 'error'
                ? state.message
                : state.status === 'unavailable'
                  ? state.reason
                  : 'Select your current location or choose a region and city. Live readings will appear when a weather provider is connected.'}
            </p>
            <p className="text-text-mute mt-2 text-xs">
              Temperature, humidity, rainfall, wind and forecasts are not available yet. Last
              updated: unavailable.
            </p>
            {location && (
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={retry} className="mt-3">
                Check again
              </Button>
            )}
          </div>
        )}
      </div>
      <details className="border-border mt-5 rounded-2xl border p-4">
        <summary className="text-ink-green cursor-pointer text-sm font-semibold">
          Change location
        </summary>
        <div className="mt-4 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            icon={LocateFixed}
            loading={locating || autoChecking}
            onClick={() => void locate()}
          >
            Use my current location
          </Button>
          {location?.kind === 'coordinates' && (
            <p className="text-text-mute mb-3 text-xs">
              Detected coordinates: {location.latitude!.toFixed(4)},{' '}
              {location.longitude!.toFixed(4)}. Demo measurements use this position; choose a city
              below if you prefer a named location.
            </p>
          )}
          <form
            onSubmit={manual}
            className="grid min-w-0 gap-3 @xl/weather:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] @xl/weather:items-end"
          >
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-xs font-semibold">Region</span>
              <Select
                value={region}
                onChange={(event) => {
                  setRegion(event.target.value);
                  setCity('');
                }}
                aria-label="Weather region"
              >
                <option value="">Select a region</option>
                {REGIONS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </Select>
            </label>
            <label className="min-w-0">
              <span className="text-text-dim mb-1.5 block text-xs font-semibold">
                City or town (optional)
              </span>
              <Input
                list={`${id}-cities`}
                value={city}
                maxLength={120}
                onChange={(event) => setCity(event.target.value)}
                placeholder="e.g. Accra, Kumasi, Tamale"
              />
              <datalist id={`${id}-cities`}>
                {GHANA_WEATHER_PLACES.filter((place) => !region || place.region === region).map(
                  (place) => (
                    <option key={place.city} value={place.city} />
                  ),
                )}
              </datalist>
            </label>
            <Button type="submit" variant="ghost" className="whitespace-normal">
              Update demo weather
            </Button>
          </form>
          <p className="text-text-mute mt-3 text-xs">
            Your browser asks for location permission automatically on your first visit in this tab.
            If access is denied, the saved region or demo default stays selected. You can adjust it
            at any time.
          </p>
        </div>
      </details>
      {state.status === 'ready' && <WeatherForecasts report={state.data} />}
    </Card>
  );
}

/** Present provider observations as supplied; never derive or fill in missing readings. */
export function WeatherReadings({
  report,
  showForecasts = true,
}: {
  report: WeatherReport;
  showForecasts?: boolean;
}) {
  const metrics = [
    ['Temperature', `${report.current.temp}°C`],
    ['Conditions', report.current.description],
    ['Humidity', `${report.current.humidity}%`],
    ['Rainfall', `${report.current.rainMm} mm`],
    ['Rain probability', `${report.current.rainChance}%`],
    ['Wind speed', `${report.current.windKph} km/h`],
  ];
  return (
    <div className="space-y-5">
      <div className="border-accent/20 bg-accent/5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div>
          <p className="text-text-dim text-sm">
            {report.demo ? 'Demo conditions' : 'Current conditions'}
          </p>
          <p className="text-ink-green mt-2 text-5xl font-bold tracking-tight">
            {report.current.temp}°<span className="text-2xl">C</span>
          </p>
          <p className="text-text mt-2 font-semibold">{report.current.description}</p>
          {report.demo && (
            <p className="text-text-mute mt-1 text-xs">Sample data · Not live measurements</p>
          )}
        </div>
        <CloudSun className="text-ink-gold size-16 shrink-0 sm:size-20" aria-hidden="true" />
      </div>
      <dl className="grid min-w-0 grid-cols-2 gap-3 @2xl/weather:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="border-border min-w-0 rounded-xl border p-3">
            <dt className="text-text-mute text-xs">{label}</dt>
            <dd className="text-text mt-1 text-base font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-text-mute text-xs">
        Source: {report.provider} · {report.demo ? 'Demo generated' : 'Last updated'}:{' '}
        <time dateTime={report.updatedAt}>{timeLabel(report.updatedAt)}</time>
      </p>
      {showForecasts && <WeatherForecasts report={report} />}
    </div>
  );
}

function WeatherForecasts({ report }: { report: WeatherReport }) {
  return (
    <div className="mt-5 space-y-5">
      <div>
        <h4 className="text-text mb-3 text-sm font-semibold">
          {report.demo ? 'Daily forecast (demo)' : 'Daily forecast'}
        </h4>
        {report.daily.length ? (
          <ul className="grid gap-3 @xl/weather:grid-cols-2">
            {report.daily.map((day) => (
              <li key={day.date} className="border-border rounded-xl border p-3 text-sm">
                <p className="text-text font-semibold">{day.date}</p>
                <p className="text-text-dim mt-1">
                  {day.description} · {day.minTemp}–{day.maxTemp}°C
                </p>
                <p className="text-text-mute mt-1 text-xs">
                  Rain: {day.rainMm} mm · {day.rainChance}% · Wind: {day.windKph} km/h
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-mute text-sm">Daily forecast unavailable.</p>
        )}
      </div>
      <div>
        <h4 className="text-text mb-3 text-sm font-semibold">
          {report.demo ? 'Upcoming conditions (demo)' : 'Upcoming conditions'}
        </h4>
        {report.upcoming.length ? (
          <ul className="grid gap-3 @xl/weather:grid-cols-2">
            {report.upcoming.map((hour) => (
              <li key={hour.time} className="border-border rounded-xl border p-3 text-sm">
                <time dateTime={hour.time} className="text-text font-semibold">
                  {timeLabel(hour.time)}
                </time>
                <p className="text-text-dim mt-1">
                  {hour.description} · {hour.temp}°C · {hour.rainChance}% rain probability
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-mute text-sm">Upcoming conditions unavailable.</p>
        )}
      </div>
    </div>
  );
}
