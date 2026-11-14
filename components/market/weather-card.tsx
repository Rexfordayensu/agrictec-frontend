'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  CloudLightning,
  CloudOff,
  CloudRain,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  Sprout,
  Sun,
  Thermometer,
  Umbrella,
  Wind,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { DashboardWeather } from '@/components/dashboard/dashboard-weather';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { WeatherIcon } from '@/components/ui/weather-icon';
import { REGIONS } from '@/constants/regions';
import { useLocationWeather } from '@/hooks/use-location-weather';
import {
  conditionOf,
  dayLabel,
  farmAdvice,
  ghanaDate,
  hourLabel,
  updatedLabel,
  weatherWarnings,
  type AdviceTone,
  type WeatherWarning,
} from '@/lib/market/weather-insights';
import {
  DEFAULT_WEATHER_LOCATION,
  GHANA_WEATHER_PLACES,
  requestWeatherLocation,
  validWeatherLocation,
  weatherLocationKey,
  nameWeatherLocation,
} from '@/lib/market/weather-location';
import { cn } from '@/lib/utils';
import { geocodingService } from '@/services/geocoding.service';
import { sessionStore } from '@/services/storage';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { useProfileStore } from '@/store/profile-store';
import type { WeatherLocation, WeatherReport } from '@/types/market';

/**
 * The farm's map pin as a weather location, rounded to 2 decimals (about 1 km) exactly like the
 * weather alerts, so this page and the alerts read the same forecast.
 */
export function farmLocation(gps: { lat: number; lng: number }, region?: string): WeatherLocation {
  return {
    kind: 'coordinates',
    label: region ? `Your farm · ${region}` : 'Your farm',
    latitude: Math.round(gps.lat * 100) / 100,
    longitude: Math.round(gps.lng * 100) / 100,
  };
}

export function WeatherCard({
  scope = 'farmer',
  compact = false,
  dashboard = false,
}: {
  scope?: 'farmer' | 'admin';
  compact?: boolean;
  dashboard?: boolean;
}) {
  const farmerId = useProfileStore((s) => s.userId);
  const farmRegion = useProfileStore((s) => s.profile?.region);
  const gps = useProfileStore((s) => s.profile?.gps);
  const adminId = useAdminAuthStore((s) => s.admin?.id);
  const farm = scope === 'farmer' && gps ? farmLocation(gps, farmRegion) : null;
  const key = `weather-location:${scope}:${scope === 'admin' ? (adminId ?? 'unknown') : (farmerId ?? 'unknown')}`;
  return (
    <WeatherPanel
      // A new pin starts the card again on the farm.
      key={`${key}:${farm ? `${farm.latitude},${farm.longitude}` : ''}`}
      storageKey={key}
      farm={farm}
      region={scope === 'farmer' ? farmRegion : undefined}
      compact={compact}
      dashboard={dashboard}
      weatherHref={scope === 'admin' ? '/admin/content/weather' : '/weather'}
    />
  );
}

function WeatherPanel({
  storageKey,
  farm,
  region: farmRegion,
  compact,
  dashboard,
  weatherHref,
}: {
  storageKey: string;
  farm: WeatherLocation | null;
  region?: string;
  compact: boolean;
  dashboard?: boolean;
  weatherHref: string;
}) {
  const id = useId();
  const request = useRef(0);
  // The farmer's own choice in this tab first, then the farm's pin, then its region, then Accra.
  // Nothing asks for the browser's location until "Use my current location" is tapped.
  const [location, setLocation] = useState<WeatherLocation>(() => {
    const saved = sessionStore.get<WeatherLocation | null>(storageKey, null);
    if (validWeatherLocation(saved)) return saved;
    if (farm) return farm;
    return farmRegion && REGIONS.includes(farmRegion)
      ? { kind: 'place', region: farmRegion, label: `${farmRegion}, Ghana` }
      : DEFAULT_WEATHER_LOCATION;
  });
  const [region, setRegion] = useState(location.region ?? farmRegion ?? '');
  const [city, setCity] = useState(location.city ?? '');
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const { state, loading, retry } = useLocationWeather(location);
  const onFarm = farm !== null && location.label === farm.label && location.kind === 'coordinates';
  // Growing seasons differ north and south: the place shown decides (the farm's region on its pin).
  const seasonRegion = location.region ?? farmRegion;

  function selectLocation(next: WeatherLocation, remember = true) {
    request.current++;
    setLocating(false);
    setLocationError('');
    loading();
    setLocation(next);
    if (next.kind === 'coordinates') {
      setRegion('');
      setCity('');
    }
    if (remember) sessionStore.set(storageKey, next);
  }
  async function locate() {
    const version = ++request.current;
    setLocating(true);
    setLocationError('');
    try {
      const next = await requestWeatherLocation();
      if (request.current === version) selectLocation(next);
    } catch (error) {
      if (request.current === version)
        setLocationError(error instanceof Error ? error.message : 'Choose your town below.');
    } finally {
      if (request.current === version) setLocating(false);
    }
  }
  function showFarm() {
    if (!farm) return;
    sessionStore.set(storageKey, null);
    selectLocation(farm, false);
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

  const [named, setNamed] = useState<{ key: string; label: string } | null>(null);
  const locationKey = weatherLocationKey(location);
  useEffect(() => {
    if (!dashboard || location.kind !== 'coordinates') return;
    let active = true;
    void nameWeatherLocation(location, geocodingService.reverse).then((next) => {
      const label =
        [next.village || next.city, next.region].filter(Boolean).join(', ') || next.label;
      if (active) setNamed({ key: locationKey, label });
    });
    return () => {
      active = false;
    };
  }, [dashboard, location, locationKey]);
  const dashboardPlace = named?.key === locationKey ? named.label : location.label;

  const report = state.status === 'ready' ? state.data : null;
  const today = ghanaDate();
  const warnings = report ? weatherWarnings(report, seasonRegion, today) : [];

  if (compact && dashboard)
    return (
      <DashboardWeather
        report={report}
        location={dashboardPlace}
        loading={state.status === 'loading' || state.status === 'idle'}
        onRetry={retry}
      />
    );

  if (compact)
    return (
      // Laid out by its own width: side by side when wide, stacked in a narrow column.
      <Card className="@container h-full min-w-0 rounded-3xl">
        <div className="flex h-full flex-col gap-4 @lg:flex-row @lg:items-center @lg:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              {report ? (
                <WeatherIcon
                  condition={conditionOf(report.current.description, report.daily[0]?.storm)}
                  size={22}
                />
              ) : (
                <Sun size={18} aria-hidden="true" className="text-ink-gold" />
              )}
              Local weather
            </CardTitle>
            <p className="text-text-dim mt-2 flex items-center gap-1.5 text-sm break-words">
              <MapPin size={14} aria-hidden="true" className="text-ink-green shrink-0" />
              {location.label}
            </p>
            <div className="text-text mt-2 text-sm" aria-live="polite">
              {report ? (
                <>
                  <p className="font-semibold">
                    {report.current.temp}°C · {report.current.description}
                  </p>
                  {warnings[0] ? (
                    <p className="text-ink-gold mt-1 flex items-center gap-1.5 font-semibold">
                      <AlertTriangle size={14} aria-hidden="true" className="shrink-0" />
                      {warnings[0].title}
                    </p>
                  ) : (
                    <p className="text-text-dim mt-1">
                      Rain chance now: {chanceLabel(report.current.rainChance)}
                    </p>
                  )}
                  <p className="text-text-mute mt-1 text-xs">
                    {report.provider} · updated {updatedLabel(report.updatedAt)} (Ghana time)
                  </p>
                </>
              ) : (
                <p>
                  {state.status === 'loading' || state.status === 'idle'
                    ? 'Loading weather…'
                    : 'The weather service didn’t answer. Open Weather to try again.'}
                </p>
              )}
            </div>
          </div>
          <Link
            href={weatherHref}
            className="border-border text-ink-green hover:bg-glass-strong mt-auto inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border px-4 text-center text-sm font-semibold @lg:mt-0"
          >
            View weather forecast
          </Link>
        </div>
      </Card>
    );

  return (
    <div className="@container/weather min-w-0 space-y-6">
      <Card className="min-w-0 rounded-3xl">
        <CardHeader className="flex-wrap gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <MapPin size={18} aria-hidden="true" className="text-icon" />
              <span className="break-words">{location.label}</span>
            </CardTitle>
            <CardSub>
              {onFarm
                ? 'The forecast at your farm’s map pin: the same one your weather alerts use.'
                : location.kind === 'coordinates'
                  ? 'The forecast at your current position.'
                  : 'The forecast for this place.'}
            </CardSub>
          </div>
          {farm && !onFarm && (
            <Button variant="ghost" size="sm" icon={Sprout} onClick={showFarm}>
              Show my farm
            </Button>
          )}
        </CardHeader>

        {locationError && (
          <p role="alert" className="text-ink-gold mb-3 text-sm">
            {locationError} Showing {location.label} instead.
          </p>
        )}

        <div aria-live="polite">
          {report ? (
            <WeatherReadings report={report} showForecasts={false} />
          ) : state.status === 'loading' || state.status === 'idle' ? (
            <p role="status" className="text-text-dim text-sm">
              Loading weather for this location…
            </p>
          ) : (
            <div className="bg-bg-2/40 rounded-2xl p-4">
              <p className="text-text flex items-center gap-2 font-semibold">
                <CloudOff size={18} aria-hidden="true" />
                The weather service didn’t answer
              </p>
              <p className="text-text-dim mt-2 text-sm">
                {state.status === 'error'
                  ? state.message
                  : state.status === 'unavailable'
                    ? state.reason
                    : 'Try again in a moment.'}{' '}
                Nothing is shown rather than a guess.
              </p>
              <Button variant="ghost" size="sm" icon={RefreshCw} onClick={retry} className="mt-3">
                Check again
              </Button>
            </div>
          )}
        </div>

        <details className="border-border mt-5 rounded-2xl border p-4">
          <summary className="text-ink-green cursor-pointer text-sm font-semibold">
            Change location
          </summary>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={LocateFixed}
                loading={locating}
                onClick={() => void locate()}
              >
                Use my current location
              </Button>
              {farm && !onFarm && (
                <Button variant="ghost" size="sm" icon={Sprout} onClick={showFarm}>
                  Show my farm
                </Button>
              )}
            </div>
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
                Show weather
              </Button>
            </form>
            <p className="text-text-mute text-xs">
              Your browser only asks for your location when you tap “Use my current location”.
            </p>
          </div>
        </details>
      </Card>

      {report && warnings.length > 0 && <WarningList warnings={warnings} />}
      {report && <FarmAdviceCard report={report} today={today} />}
      {report && <WeatherForecasts report={report} today={today} />}
    </div>
  );
}

const WARNING_STYLE: Record<WeatherWarning['kind'], { icon: LucideIcon; className: string }> = {
  storm: { icon: CloudLightning, className: 'border-danger/40 bg-danger/10 text-ink-red' },
  rain: { icon: CloudRain, className: 'border-info/40 bg-info/10 text-ink-blue' },
  dry: { icon: Sun, className: 'border-gold/40 bg-gold/10 text-ink-gold' },
};

/** The same warnings the weather alerts send (identical rules), so page and inbox agree. */
function WarningList({ warnings }: { warnings: WeatherWarning[] }) {
  return (
    <ul className="space-y-3" aria-label="Weather warnings">
      {warnings.map((w) => {
        const style = WARNING_STYLE[w.kind];
        const Icon = style.icon;
        return (
          <li key={w.kind} role="alert" className={cn('rounded-2xl border p-4', style.className)}>
            <p className="flex items-center gap-2 text-sm font-bold">
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {w.title}
            </p>
            <p className="text-text mt-1 text-sm leading-relaxed">{w.body}</p>
          </li>
        );
      })}
    </ul>
  );
}

const TONE_STYLE: Record<AdviceTone, { icon: LucideIcon; className: string; label: string }> = {
  good: { icon: CheckCircle2, className: 'text-ink-green', label: 'Good' },
  caution: { icon: AlertTriangle, className: 'text-ink-gold', label: 'Take care' },
  avoid: { icon: XCircle, className: 'text-ink-red', label: 'Wait' },
};

/** Plain advice for today's farm work, from the forecast's own figures (rule-based, not AI). */
function FarmAdviceCard({ report, today }: { report: WeatherReport; today: string }) {
  const advice = farmAdvice(report, today);
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sprout size={18} aria-hidden="true" className="text-icon" />
            What this means for your farm
          </CardTitle>
          <CardSub>Based on the forecast below: wind, rain chances and temperatures</CardSub>
        </div>
      </CardHeader>
      <ul className="grid grid-cols-1 gap-3 @2xl/weather:grid-cols-2">
        {advice.map((item) => {
          const tone = TONE_STYLE[item.tone];
          const Icon = tone.icon;
          return (
            <li key={item.key} className="border-border bg-bg-2/40 rounded-2xl border p-4">
              <p className="flex items-center justify-between gap-2">
                <span className="text-text text-sm font-semibold">{item.title}</span>
                <span
                  className={cn('inline-flex items-center gap-1 text-xs font-bold', tone.className)}
                >
                  <Icon size={14} aria-hidden="true" />
                  {tone.label}
                </span>
              </p>
              <p className="text-text-dim mt-1.5 text-sm leading-relaxed">{item.text}</p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** A value the provider didn't give is shown as missing, never as 0 (0 mm would mean "dry"). */
function given(value: number | null, unit: string) {
  return value === null ? 'not given by this source' : `${value} ${unit}`;
}

/** A provider without a probability of rain (MET Norway, for Ghana) shows that, not a number. */
function chanceLabel(chance: number | null) {
  return chance === null ? 'not given by this source' : `${chance}%`;
}

/** Current conditions as the provider supplied them; nothing is derived or filled in. */
export function WeatherReadings({
  report,
  showForecasts = true,
}: {
  report: WeatherReport;
  showForecasts?: boolean;
}) {
  const today = ghanaDate();
  const metrics: [LucideIcon, string, string][] = [
    [Droplets, 'Humidity', `${report.current.humidity}%`],
    [Umbrella, 'Rain this hour', given(report.current.rainMm, 'mm')],
    [CloudRain, 'Rain chance now', chanceLabel(report.current.rainChance)],
    [Wind, 'Wind', given(report.current.windKph, 'km/h')],
  ];
  return (
    <div className="space-y-5">
      <div className="border-accent/20 bg-accent/5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5">
        <div>
          <p className="text-text-dim text-sm">Now</p>
          <p className="text-ink-green font-display mt-1 text-5xl font-bold tracking-tight">
            {report.current.temp}°<span className="text-2xl">C</span>
          </p>
          <p className="text-text mt-2 font-semibold">{report.current.description}</p>
        </div>
        <WeatherIcon
          condition={conditionOf(report.current.description, report.daily[0]?.storm)}
          size={80}
          className="shrink-0"
        />
      </div>
      <dl className="grid min-w-0 grid-cols-2 gap-3 @2xl/weather:grid-cols-4">
        {metrics.map(([Icon, label, value]) => (
          <div key={label} className="border-border min-w-0 rounded-xl border p-3">
            <dt className="text-text-mute flex items-center gap-1.5 text-xs">
              <Icon size={13} aria-hidden="true" />
              {label}
            </dt>
            <dd className="text-text mt-1 text-base font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-text-mute text-xs">
        Source: {report.provider} · Last updated{' '}
        <time dateTime={report.updatedAt}>{updatedLabel(report.updatedAt)}</time> · Ghana time
      </p>
      {showForecasts && <WeatherForecasts report={report} today={today} />}
    </div>
  );
}

/** The next 24 hours as one sideways strip, then a row per day for the week. */
function WeatherForecasts({ report, today }: { report: WeatherReport; today: string }) {
  const days = report.daily.filter((d) => d.date >= today);
  const maxRain = Math.max(1, ...days.map((d) => d.rainMm ?? 0));
  return (
    <>
      <Card className="min-w-0 rounded-3xl">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Thermometer size={18} aria-hidden="true" className="text-ink-gold" />
              Next 24 hours
            </CardTitle>
            <CardSub>Hour by hour, in Ghana time</CardSub>
          </div>
        </CardHeader>
        {report.upcoming.length ? (
          <ol
            aria-label="Hourly forecast"
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
          >
            {report.upcoming.map((hour) => (
              <li
                key={hour.time}
                className="border-border bg-bg-2/40 flex w-20 shrink-0 snap-start flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-center"
              >
                <time dateTime={hour.time} className="text-text-mute text-xs font-semibold">
                  {hourLabel(hour.time)}
                </time>
                <WeatherIcon condition={conditionOf(hour.description)} size={30} />
                <span className="text-text text-sm font-bold">{Math.round(hour.temp)}°</span>
                <span className="text-ink-blue text-xs font-semibold">
                  {hour.rainChance === null ? '–' : `${hour.rainChance}%`}
                  <span className="sr-only"> chance of rain, {hour.description}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-text-mute text-sm">The hourly forecast isn’t available right now.</p>
        )}
      </Card>

      <Card className="min-w-0 rounded-3xl">
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <CloudRain size={18} aria-hidden="true" className="text-ink-blue" />
              {days.length > 1 ? `Next ${days.length} days` : 'Daily forecast'}
            </CardTitle>
            <CardSub>Low and high temperature, and how much rain is expected</CardSub>
          </div>
        </CardHeader>
        {days.length ? (
          <ul className="divide-border divide-y">
            {days.map((day) => (
              <li
                key={day.date}
                className="grid grid-cols-[5.5rem_2.25rem_minmax(0,1fr)] items-center gap-3 py-3 @xl/weather:grid-cols-[6.5rem_2.25rem_minmax(0,1fr)_minmax(0,1.2fr)]"
              >
                <span className="text-text text-sm font-semibold">{dayLabel(day.date, today)}</span>
                <WeatherIcon condition={conditionOf(day.description, day.storm)} size={32} />
                <span className="min-w-0">
                  <span className="text-text block truncate text-sm">{day.description}</span>
                  <span className="text-text-mute text-xs tabular-nums">
                    {Math.round(day.minTemp)}° – {Math.round(day.maxTemp)}° · wind{' '}
                    {given(day.windKph, 'km/h')}
                  </span>
                </span>
                <span className="col-span-3 flex items-center gap-2 @xl/weather:col-span-1">
                  <span
                    aria-hidden="true"
                    className="bg-glass-strong h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                  >
                    <span
                      className="bg-info block h-full rounded-full"
                      style={{ width: `${((day.rainMm ?? 0) / maxRain) * 100}%` }}
                    />
                  </span>
                  <span className="text-ink-blue w-28 shrink-0 text-right text-xs font-semibold tabular-nums">
                    {day.rainMm === null ? 'rain not given' : `${day.rainMm} mm`}
                    {day.rainChance === null ? '' : ` · ${day.rainChance}%`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-mute text-sm">The daily forecast isn’t available right now.</p>
        )}
      </Card>
    </>
  );
}
