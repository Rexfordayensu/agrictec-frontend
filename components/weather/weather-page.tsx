'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WeatherHero } from '@/components/weather/weather-hero';
import './weather-page.css';
import Link from 'next/link';
import {
  AlertTriangle,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudLightning,
  CloudOff,
  CloudRain,
  Droplets,
  FileText,
  Leaf,
  LocateFixed,
  MapPin,
  RefreshCw,
  Sprout,
  Sun,
  TrendingUp,
  Umbrella,
  Wind,
  XCircle,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { farmLocation } from '@/components/market/weather-card';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { WeatherIcon } from '@/components/ui/weather-icon';
import { REGIONS } from '@/constants/regions';
import { useLocationWeather } from '@/hooks/use-location-weather';
import { outlookFor, seasonFor } from '@/lib/market/season';
import {
  conditionOf,
  dayLabel,
  farmAdvice,
  ghanaDate,
  hourLabel,
  updatedLabel,
  weatherWarnings,
  HEAVY_RAIN_MM,
  RAIN_CHANCE_MIN,
  type AdviceTone,
  type WeatherWarning,
} from '@/lib/market/weather-insights';
import {
  DEFAULT_WEATHER_LOCATION,
  GHANA_WEATHER_PLACES,
  nameWeatherLocation,
  requestInitialWeatherLocation,
  requestWeatherLocation,
  validWeatherLocation,
  weatherLocationKey,
} from '@/lib/market/weather-location';
import { geocodingService } from '@/services/geocoding.service';
import { cn } from '@/lib/utils';
import { sessionStore } from '@/services/storage';
import { useModalStore } from '@/store/modal-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import type { WeatherLocation, WeatherReport } from '@/types/market';

/**
 * The Weather page: the provider's forecast for the farm (its map pin, region or a place the
 * farmer chooses), with the same warnings the weather alerts send and rule-based farm advice.
 * Nothing is filled in: a value the provider did not give is shown as missing.
 */
export function WeatherPage() {
  const farmerId = useProfileStore((s) => s.userId);
  const farmRegion = useProfileStore((s) => s.profile?.region);
  const gps = useProfileStore((s) => s.profile?.gps);
  const farm = gps ? farmLocation(gps, farmRegion) : null;
  const key = `weather-location:farmer:${farmerId ?? 'unknown'}`;
  return (
    <WeatherView
      key={`${key}:${farm ? `${farm.latitude},${farm.longitude}` : ''}`}
      storageKey={key}
      farm={farm}
      farmRegion={farmRegion}
    />
  );
}

function WeatherView({
  storageKey,
  farm,
  farmRegion,
}: {
  storageKey: string;
  farm: WeatherLocation | null;
  farmRegion?: string;
}) {
  // Same order as the weather card: this tab's choice, the farm's pin, its region, then Accra.
  const [location, setLocation] = useState<WeatherLocation>(() => {
    const saved = sessionStore.get<WeatherLocation | null>(storageKey, null);
    if (validWeatherLocation(saved)) return saved;
    if (farm) return farm;
    return farmRegion && REGIONS.includes(farmRegion)
      ? { kind: 'place', region: farmRegion, label: `${farmRegion}, Ghana` }
      : DEFAULT_WEATHER_LOCATION;
  });
  const [picking, setPicking] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const selection = useRef(0);
  const { state, loading, retry } = useLocationWeather(location);
  const report = state.status === 'ready' ? state.data : null;
  const today = ghanaDate();

  // A position (the farm's pin or the device's) is named separately, so the forecast loads at
  // once and the town and region fill in beside it (GET /geocoding/reverse).
  const [named, setNamed] = useState<{ key: string; location: WeatherLocation } | null>(null);
  const key = weatherLocationKey(location);
  const needsName = location.kind === 'coordinates' && !location.city;
  useEffect(() => {
    if (!needsName) return;
    let active = true;
    void nameWeatherLocation(location, geocodingService.reverse).then((next) => {
      if (active) setNamed({ key, location: next });
    });
    return () => {
      active = false;
    };
  }, [key, needsName, location]);
  const shown = named && named.key === key ? named.location : location;
  const isFarm = farm !== null && location.label === farm.label && location.kind === 'coordinates';
  const naming = needsName && !(named && named.key === key);
  const seasonRegion = shown.region ?? (isFarm ? farmRegion : undefined);
  const placeName = shown.village ?? shown.city ?? shown.region ?? shown.label;

  function choose(next: WeatherLocation, remember = true) {
    selection.current++;
    setLocating(false);
    setLocationError('');
    loading();
    setLocation(next);
    setPicking(false);
    sessionStore.set(storageKey, remember ? next : null);
  }

  async function locate() {
    const version = ++selection.current;
    setLocating(true);
    setLocationError('');
    try {
      const here = await requestWeatherLocation();
      if (version === selection.current) choose(here);
    } catch (cause) {
      if (version === selection.current) {
        setLocating(false);
        setLocationError(
          `${cause instanceof Error ? cause.message : 'Location is unavailable.'} Choose your town or region, or try again.`,
        );
      }
    }
  }

  // The weather follows where the farmer is: once per tab, unless they already chose a place,
  // ask the browser for the current position (the browser asks permission). Refused or failed:
  // the page stays on the farm.
  useEffect(() => {
    if (validWeatherLocation(sessionStore.get<WeatherLocation | null>(storageKey, null))) return;
    let active = true;
    const version = selection.current;
    void requestInitialWeatherLocation(storageKey)
      .then((here) => {
        if (active && version === selection.current && here) choose(here);
      })
      .catch((cause: unknown) => {
        if (active && version === selection.current)
          setLocationError(
            `${cause instanceof Error ? cause.message : 'Location is unavailable.'} Showing the selected area; tap its name to choose a town or region.`,
          );
      });
    return () => {
      active = false;
    };
    // Runs once per page visit: `choose` only sets state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return (
    <div className="weather-reference @container space-y-5">
      <WeatherHero
        location={shown}
        isCurrent={location.label === 'Your current location'}
        isFarm={isFarm}
        naming={naming}
        locating={locating}
        error={locationError}
        onLocate={() => void locate()}
        onChange={() => setPicking(true)}
      />

      {report ? (
        <>
          <CurrentPanel report={report} onChange={() => setPicking(true)} />
          <Guidance report={report} today={today} />
          <div className="grid grid-cols-1 items-start gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="min-w-0 space-y-5">
              <Hourly report={report} />
              <Alerts warnings={weatherWarnings(report, seasonRegion, today)} place={placeName} />
            </div>
            <Daily report={report} today={today} />
          </div>
          <div className="grid grid-cols-1 gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <Outlook report={report} today={today} region={seasonRegion} />
            <QuickActions />
          </div>
        </>
      ) : state.status === 'loading' || state.status === 'idle' ? (
        <div className="space-y-5" role="status" aria-label="Loading the forecast">
          <Skeleton className="rounded-card h-36" />
          <Skeleton className="rounded-card h-40" />
          <Skeleton className="rounded-card h-72" />
        </div>
      ) : (
        <section className={dashPanel} role="alert">
          <p className="text-text flex items-center gap-2 font-semibold">
            <CloudOff size={18} aria-hidden="true" /> The weather service didn’t answer
          </p>
          <p className="text-text-dim mt-2 text-sm">
            {state.status === 'error'
              ? state.message
              : state.status === 'unavailable'
                ? state.reason
                : 'Try again in a moment.'}{' '}
            Nothing is shown rather than a guess.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={retry}>
              Check again
            </Button>
            <Button variant="ghost" size="sm" icon={MapPin} onClick={() => setPicking(true)}>
              Change location
            </Button>
          </div>
        </section>
      )}

      <LocationPicker
        key={`${picking}:${key}`}
        open={picking}
        onClose={() => setPicking(false)}
        farm={farm}
        current={location}
        onChoose={choose}
      />
    </div>
  );
}

/** A value the provider didn't give is shown as missing, never as 0 (0 mm would mean "dry"). */
const orDash = (value: number | null, unit: string) => (value === null ? '—' : `${value} ${unit}`);

function CurrentPanel({ report, onChange }: { report: WeatherReport; onChange: () => void }) {
  const { current } = report;
  const metrics: { icon: LucideIcon; label: string; value: string; tone: string }[] = [
    { icon: Droplets, label: 'Humidity', value: `${current.humidity}%`, tone: 'text-ink-green' },
    {
      icon: CloudRain,
      label: 'Rain (this hour)',
      value: orDash(current.rainMm, 'mm'),
      tone: 'text-ink-blue',
    },
    {
      icon: Umbrella,
      label: 'Chance of rain',
      value: current.rainChance === null ? '—' : `${current.rainChance}%`,
      tone: 'text-ink-purple',
    },
    { icon: Wind, label: 'Wind', value: orDash(current.windKph, 'km/h'), tone: 'text-ink-blue' },
  ];
  return (
    <section
      aria-label="Weather now"
      className={cn(
        dashPanel,
        'grid grid-cols-1 gap-4 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]',
      )}
    >
      <div className="border-accent/25 bg-accent/8 flex items-center justify-between gap-4 rounded-2xl border p-5">
        <div>
          <span className="bg-accent/15 text-ink-green rounded-md px-2 py-0.5 text-xs font-semibold">
            Now
          </span>
          <p className="text-ink-green mt-1.5 text-5xl leading-none font-extrabold tracking-tight tabular-nums">
            {current.temp}°<span className="text-3xl">C</span>
          </p>
          <p className="text-text mt-3 text-lg font-semibold">{current.description}</p>
        </div>
        <WeatherIcon
          condition={conditionOf(current.description, report.daily[0]?.storm)}
          size={76}
          className="shrink-0"
        />
      </div>
      <div className="flex min-w-0 flex-col justify-between gap-3">
        <dl className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="border-border rounded-2xl border p-3.5">
              <dt className="text-text-dim flex items-center gap-2 text-small">
                <m.icon size={18} aria-hidden="true" className={m.tone} />
                {m.label}
              </dt>
              <dd className="text-text mt-2 text-xl font-bold tabular-nums">{m.value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-text-mute text-xs">
            Source: {report.provider} · Last updated{' '}
            <time dateTime={report.updatedAt}>{updatedLabel(report.updatedAt)}</time> (Ghana time)
          </p>
          <button
            type="button"
            onClick={onChange}
            className="text-ink-green inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
          >
            <MapPin size={16} aria-hidden="true" /> Change location
          </button>
        </div>
      </div>
    </section>
  );
}

const TONE: Record<AdviceTone, { icon: LucideIcon; label: string; badge: string; card: string }> = {
  good: {
    icon: CheckCircle2,
    label: 'Good',
    badge: 'bg-accent/15 text-ink-green',
    card: 'border-accent/20 bg-accent/6',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Take care',
    badge: 'bg-gold/20 text-ink-gold',
    card: 'border-gold/25 bg-gold/8',
  },
  avoid: {
    icon: XCircle,
    label: 'Wait',
    badge: 'bg-danger/15 text-ink-red',
    card: 'border-danger/25 bg-danger/6',
  },
};

const ADVICE_ICON: Record<string, LucideIcon> = {
  spraying: Leaf,
  fertilizer: FileText,
  drying: Sprout,
  heat: Sun,
};

/** Rule-based advice for today's work, from the forecast's own figures (not AI). */
function Guidance({ report, today }: { report: WeatherReport; today: string }) {
  const advice = farmAdvice(report, today);
  return (
    <section aria-labelledby="guidance-title" className={dashPanel}>
      <Heading
        id="guidance-title"
        icon={Leaf}
        title="Farm guidance for today"
        sub="What the current weather means for your farm activities."
      />
      <ul className="mt-4 grid grid-cols-1 gap-3 @3xl:grid-cols-3">
        {advice.map((item) => {
          const tone = TONE[item.tone];
          const Icon = ADVICE_ICON[item.key] ?? Leaf;
          return (
            <li key={item.key} className={cn('rounded-2xl border p-4', tone.card)}>
              <div className="flex items-start gap-3">
                <span className="bg-glass-strong text-ink-green inline-flex size-11 shrink-0 items-center justify-center rounded-xl">
                  <Icon size={22} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-text font-bold">{item.title}</span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold',
                        tone.badge,
                      )}
                    >
                      <tone.icon size={13} aria-hidden="true" /> {tone.label}
                    </span>
                  </p>
                  <p className="text-text-dim mt-1.5 text-sm leading-relaxed">{item.text}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Hourly({ report }: { report: WeatherReport }) {
  const hours = report.upcoming.slice(0, 12);
  return (
    <section aria-labelledby="hourly-title" className={dashPanel}>
      <Heading
        id="hourly-title"
        icon={Clock3}
        title="Hourly forecast"
        titleNote="(Next 12 hours)"
        sub="Expected weather conditions, hour by hour."
      />
      {hours.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">The provider gave no hourly forecast.</p>
      ) : (
        <ol className="mt-4 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
          {hours.map((h) => (
            <li
              key={h.time}
              className="border-border flex w-[4.4rem] shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3"
            >
              <span className="text-text-dim text-small">{hourLabel(h.time)}</span>
              <WeatherIcon condition={conditionOf(h.description)} size={34} />
              <span className="text-text text-sm font-bold tabular-nums">{h.temp}°C</span>
              <span className="text-ink-blue text-xs font-semibold tabular-nums">
                {h.rainChance === null ? '—' : `${h.rainChance}%`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const WARNING: Record<WeatherWarning['kind'], { icon: LucideIcon; className: string }> = {
  storm: { icon: CloudLightning, className: 'border-danger/30 bg-danger/8 text-ink-red' },
  rain: { icon: CloudRain, className: 'border-info/30 bg-info/8 text-ink-blue' },
  dry: { icon: Sun, className: 'border-gold/30 bg-gold/10 text-ink-gold' },
};

/** The same warnings the weather alerts send (identical rules), so page and inbox agree. */
function Alerts({ warnings, place }: { warnings: WeatherWarning[]; place: string }) {
  return (
    <section aria-labelledby="alerts-title" className={dashPanel}>
      <Heading
        id="alerts-title"
        icon={AlertTriangle}
        iconClass="text-ink-gold"
        title="Weather alerts"
        sub="Important weather updates for your area."
      />
      {warnings.length === 0 ? (
        <div className="bg-accent/8 mt-4 flex items-start gap-3 rounded-2xl p-4">
          <CheckCircle2 size={24} aria-hidden="true" className="text-ink-green shrink-0" />
          <div>
            <p className="text-text font-bold">No active weather alerts</p>
            <p className="text-text-dim mt-1 text-sm">
              There are no severe weather warnings for {place} at the moment.
            </p>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {warnings.map((w) => {
            const style = WARNING[w.kind];
            return (
              <li
                key={w.kind}
                role="alert"
                className={cn('rounded-2xl border p-4', style.className)}
              >
                <p className="flex items-center gap-2 text-sm font-bold">
                  <style.icon size={18} aria-hidden="true" className="shrink-0" />
                  {w.title}
                </p>
                <p className="text-text mt-1 text-sm leading-relaxed">{w.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Daily({ report, today }: { report: WeatherReport; today: string }) {
  const [full, setFull] = useState(false);
  const days = report.daily.filter((d) => d.date >= today).slice(0, 7);
  const scale = Math.max(5, ...days.map((d) => d.rainMm ?? 0));
  return (
    <section aria-labelledby="daily-title" className={dashPanel}>
      <Heading
        id="daily-title"
        icon={CalendarDays}
        title="7-day forecast"
        sub="Expected weather, rainfall and temperature."
        aside={
          <button
            type="button"
            aria-expanded={full}
            onClick={() => setFull((v) => !v)}
            className="border-accent/40 text-ink-green hover:bg-accent/8 inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold"
          >
            {full ? 'Show less' : 'View full forecast'} <span aria-hidden="true">→</span>
          </button>
        }
      />
      <ul className="divide-border mt-3 divide-y">
        {days.map((d) => {
          const wet =
            (d.rainMm ?? 0) >= HEAVY_RAIN_MM / 4 || (d.rainChance ?? 0) >= RAIN_CHANCE_MIN;
          const rain =
            d.rainMm === null
              ? d.rainChance === null
                ? '—'
                : `${d.rainChance}%`
              : `${d.rainMm} mm${d.rainChance === null ? '' : ` (${d.rainChance}%)`}`;
          return (
            <li key={d.date} className="py-2.5">
              <div className="grid grid-cols-[5.25rem_2rem_minmax(0,1fr)_auto] items-center gap-2 text-sm @sm:grid-cols-[6.5rem_2.5rem_5.5rem_minmax(0,1fr)_auto]">
                <span className="text-text font-semibold">{dayLabel(d.date, today)}</span>
                <WeatherIcon condition={conditionOf(d.description, d.storm)} size={28} />
                <span className="text-text-dim tabular-nums">
                  {Math.round(d.minTemp)}° – {Math.round(d.maxTemp)}°C
                </span>
                <span
                  aria-hidden="true"
                  className="bg-border hidden h-2 overflow-hidden rounded-full @sm:block"
                >
                  <span
                    className="block h-full rounded-full bg-[#3b82f6]"
                    style={{ width: `${Math.min(100, ((d.rainMm ?? 0) / scale) * 100)}%` }}
                  />
                </span>
                <span
                  className={cn(
                    'text-right whitespace-nowrap tabular-nums',
                    wet ? 'text-ink-blue font-semibold' : 'text-text',
                  )}
                >
                  {rain}
                </span>
              </div>
              {full && (
                <p className="text-text-mute mt-1 pl-[5.25rem] text-xs @sm:pl-[6.5rem]">
                  {d.description}
                  {d.windKph === null ? '' : ` · wind ${d.windKph} km/h`}
                  {d.storm ? ' · thunderstorm' : ''}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Outlook({
  report,
  today,
  region,
}: {
  report: WeatherReport;
  today: string;
  region?: string;
}) {
  const month = Number(today.slice(5, 7));
  const days = report.daily.filter((d) => d.date >= today).slice(0, 7);
  return (
    <section aria-labelledby="outlook-title" className={dashPanel}>
      <Heading id="outlook-title" icon={Leaf} title="Seasonal outlook" />
      <dl className="mt-4 space-y-4 text-sm">
        <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-start gap-3">
          <dt className="text-text-dim flex items-center gap-2">
            <CalendarDays size={18} aria-hidden="true" className="text-ink-green" /> Current season
          </dt>
          <dd className="text-ink-green font-semibold">{seasonFor(region, month)}</dd>
        </div>
        <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] items-start gap-3">
          <dt className="text-text-dim flex items-center gap-2">
            <TrendingUp size={18} aria-hidden="true" className="text-ink-green" /> Outlook (next 7
            days)
          </dt>
          <dd className="text-text-dim">{outlookFor(days)}</dd>
        </div>
      </dl>
    </section>
  );
}

function QuickActions() {
  const openRecordWithDefaults = useModalStore((s) => s.openRecordWithDefaults);
  const assistant = usePlatformStore((s) => s.flags.aiAssistant);
  const tile =
    'border-border bg-glass hover:bg-glass-strong text-text flex min-h-14 items-center gap-3 rounded-2xl border px-4 text-sm font-semibold';
  return (
    <section aria-labelledby="weather-actions-title" className={dashPanel}>
      <Heading id="weather-actions-title" icon={Zap} title="Quick actions" />
      <div className="mt-4 grid grid-cols-1 gap-3 @lg:grid-cols-3">
        <button
          type="button"
          onClick={() => openRecordWithDefaults({ type: 'activity' })}
          className={tile}
        >
          <CalendarDays size={20} aria-hidden="true" className="text-ink-green" /> Plan field
          activities
        </button>
        <Link href="/settings/preferences" className={tile}>
          <BellRing size={20} aria-hidden="true" className="text-ink-green" /> Set weather alert
        </Link>
        <Link href={assistant ? '/assistant' : '/crop-doctor'} className={tile}>
          <FileText size={20} aria-hidden="true" className="text-ink-green" /> Get crop advice
        </Link>
      </div>
    </section>
  );
}

function Heading({
  id,
  icon: Icon,
  iconClass = 'text-ink-green',
  title,
  titleNote,
  sub,
  aside,
}: {
  id: string;
  icon: LucideIcon;
  iconClass?: string;
  title: string;
  titleNote?: string;
  sub?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Icon size={26} aria-hidden="true" className={cn('mt-0.5 shrink-0', iconClass)} />
      <div className="min-w-[12rem] flex-1">
        <h2 id={id} className="text-text text-lg font-bold">
          {title}{' '}
          {titleNote && <span className="text-text-dim text-sm font-medium">{titleNote}</span>}
        </h2>
        {sub && <p className="text-text-dim mt-0.5 text-small">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Farm pin, current position, or a region and town: the same choices as before. */
function LocationPicker({
  open,
  onClose,
  farm,
  current,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  farm: WeatherLocation | null;
  current: WeatherLocation;
  onChoose: (next: WeatherLocation, remember?: boolean) => void;
}) {
  const id = useId();
  const request = useRef(0);
  const [region, setRegion] = useState(current.region ?? '');
  const [city, setCity] = useState(current.city ?? '');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState<Awaited<ReturnType<typeof geocodingService.searchPlaces>>>(
    [],
  );
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );

  async function locate() {
    const version = ++request.current;
    setLocating(true);
    setError('');
    try {
      const next = await requestWeatherLocation();
      if (request.current === version) onChoose(next);
    } catch (cause) {
      if (request.current === version)
        setError(cause instanceof Error ? cause.message : 'Choose your town below.');
    } finally {
      if (request.current === version) setLocating(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!REGIONS.includes(region)) return setError('Choose a Ghanaian region.');
    if (!city.trim()) {
      onChoose({ kind: 'place', region, label: `${region}, Ghana` });
      return;
    }
    const version = ++request.current;
    setLocating(true);
    setError('');
    setMatches([]);
    try {
      const results = await geocodingService.searchPlaces(
        `${city.trim()}, ${region} Region`.slice(0, 120),
      );
      if (version !== request.current) return;
      setMatches(results);
      if (!results.length)
        setError(
          'No matching town or village was found. Check the spelling, or choose the region only.',
        );
    } catch (cause) {
      if (version === request.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Place search is unavailable. Try the region only.',
        );
    } finally {
      if (version === request.current) setLocating(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Change location">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {farm && (
            <Button variant="ghost" size="sm" icon={Sprout} onClick={() => onChoose(farm, false)}>
              Show my farm
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={LocateFixed}
            loading={locating}
            onClick={() => void locate()}
          >
            Use my current location
          </Button>
        </div>
        <form onSubmit={(event) => void submit(event)} className="space-y-3">
          <label className="block">
            <span className="text-text-dim mb-1.5 block text-xs font-semibold">Region</span>
            <Select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
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
          <label className="block">
            <span className="text-text-dim mb-1.5 block text-xs font-semibold">
              Village, town or city (optional)
            </span>
            <Input
              list={`${id}-cities`}
              value={city}
              maxLength={120}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Accra, Kumasi, Tamale"
            />
            <datalist id={`${id}-cities`}>
              {GHANA_WEATHER_PLACES.filter((p) => !region || p.region === region).map((p) => (
                <option key={p.city} value={p.city} />
              ))}
            </datalist>
          </label>
          {error && (
            <p role="alert" className="text-ink-gold text-sm">
              {error}
            </p>
          )}
          {matches.length > 0 && (
            <ul className="space-y-2" aria-label="Matching places">
              {matches.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="border-border text-text hover:bg-glass-strong w-full rounded-xl border p-3 text-left"
                    onClick={() =>
                      onChoose({
                        kind: 'coordinates',
                        latitude: place.lat,
                        longitude: place.lng,
                        label: [place.name, place.detail].filter(Boolean).join(', '),
                      })
                    }
                  >
                    <span className="block text-sm font-semibold">{place.name}</span>
                    <span className="text-text-dim text-xs">{place.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Button type="submit" loading={locating} className="w-full">
            Show weather
          </Button>
        </form>
        <p className="text-text-mute text-xs">
          Your browser controls location permission. You can also choose a matching village or town,
          or a region-wide forecast.
        </p>
      </div>
    </Modal>
  );
}
