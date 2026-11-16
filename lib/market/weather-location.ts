import { REGIONS } from '@/constants/regions';
import type { WeatherLocation } from '@/types/market';
import { sessionStore } from '@/services/storage';

export const GHANA_WEATHER_PLACES = [
  { city: 'Accra', region: 'Greater Accra' },
  { city: 'Tema', region: 'Greater Accra' },
  { city: 'Kumasi', region: 'Ashanti' },
  { city: 'Tamale', region: 'Northern' },
  { city: 'Takoradi', region: 'Western' },
  { city: 'Cape Coast', region: 'Central' },
  { city: 'Ho', region: 'Volta' },
  { city: 'Koforidua', region: 'Eastern' },
  { city: 'Sunyani', region: 'Bono' },
  { city: 'Wa', region: 'Upper West' },
  { city: 'Bolgatanga', region: 'Upper East' },
];

export function validWeatherLocation(location: unknown): location is WeatherLocation {
  if (!location || typeof location !== 'object') return false;
  const value = location as WeatherLocation;
  if (typeof value.label !== 'string' || !value.label.trim() || value.label.length > 200)
    return false;
  if (value.kind === 'place')
    return (
      REGIONS.includes(value.region ?? '') &&
      (!value.city || (typeof value.city === 'string' && value.city.length <= 120))
    );
  return (
    value.kind === 'coordinates' &&
    typeof value.latitude === 'number' &&
    Number.isFinite(value.latitude) &&
    Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' &&
    Number.isFinite(value.longitude) &&
    Math.abs(value.longitude) <= 180
  );
}

export const weatherLocationKey = (location: WeatherLocation) =>
  location.kind === 'coordinates'
    ? `gps:${location.latitude!.toFixed(5)}:${location.longitude!.toFixed(5)}`
    : `ghana:${location.region}:${location.city?.trim().toLowerCase() ?? ''}`;

/**
 * First a quick fix (network position, or one from the last 10 minutes); if that times out or
 * the network can't place the phone, one precise GPS attempt. Phones indoors or on a weak
 * signal often need longer than the first try allows.
 */
export const LOCATION_ATTEMPTS: PositionOptions[] = [
  { enableHighAccuracy: false, timeout: 20000, maximumAge: 600000 },
  { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
];

/** Why the device's position couldn't be had, so callers can tell a refusal from bad signal. */
export class LocationError extends Error {
  constructor(
    readonly kind: 'denied' | 'timeout' | 'unavailable' | 'insecure' | 'unsupported',
    message: string,
  ) {
    super(message);
  }
}

function position(geolocation: Geolocation, options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    geolocation.getCurrentPosition(resolve, reject, options),
  );
}

/** The label a position from the device carries until it is named. */
export const CURRENT_LOCATION_LABEL = 'Your current location';

/** A position the device reported (not a place the farmer picked). */
export const isDeviceLocation = (location: WeatherLocation | null | undefined) =>
  location?.kind === 'coordinates' && location.label === CURRENT_LOCATION_LABEL;

/** Browsers only share location on https (or localhost); elsewhere they refuse at once. */
function insecurePage() {
  return typeof window !== 'undefined' && window.isSecureContext === false;
}

/** The browser always controls permission. The position is named separately (nameWeatherLocation). */
export async function requestWeatherLocation(
  geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
): Promise<WeatherLocation> {
  if (insecurePage())
    throw new LocationError(
      'insecure',
      'Location only works when the app is opened over a secure (https) address.',
    );
  if (!geolocation)
    throw new LocationError('unsupported', 'This browser can’t share your location.');
  let found: GeolocationPosition | undefined;
  let failure: GeolocationPositionError | undefined;
  for (const options of LOCATION_ATTEMPTS) {
    try {
      found = await position(geolocation, options);
      break;
    } catch (error) {
      failure = error as GeolocationPositionError;
      if (failure.code === 1) break; // Denied: asking again only repeats the refusal.
    }
  }
  if (!found)
    throw failure?.code === 1
      ? new LocationError(
          'denied',
          'Location access was denied for this site. Allow it from the location icon in the browser’s address bar, then tap “Use my current location”.',
        )
      : failure?.code === 3
        ? new LocationError(
            'timeout',
            'Your location could not be found in time (the GPS signal may be weak).',
          )
        : new LocationError(
            'unavailable',
            'Your device could not work out its position. Check that Location (GPS) is turned on in your device settings.',
          );
  const location: WeatherLocation = {
    kind: 'coordinates',
    label: CURRENT_LOCATION_LABEL,
    latitude: found.coords.latitude,
    longitude: found.coords.longitude,
    accuracyMetres: found.coords.accuracy,
  };
  if (!validWeatherLocation(location)) throw new Error('The device returned an invalid location.');
  return location;
}

/** Something that names a position (geocodingService.reverse in the app; a stub in tests). */
type Namer = (
  lat: number,
  lng: number,
) => Promise<{
  village?: string | null;
  area?: string | null;
  town?: string | null;
  district?: string | null;
  region?: string | null;
  inGhana?: boolean;
  label: string;
}>;

/**
 * A position with its real name: town or city, Ghana region and neighbourhood, e.g.
 * "Kumasi, Ashanti, Ghana". If the lookup fails the position is kept, labelled as before:
 * the weather still loads, only the name is missing.
 */
export async function nameWeatherLocation(
  location: WeatherLocation,
  name: Namer,
): Promise<WeatherLocation> {
  if (
    location.kind !== 'coordinates' ||
    location.latitude === undefined ||
    location.longitude === undefined
  )
    return location;
  try {
    const place = await name(location.latitude, location.longitude);
    const region = place.region && REGIONS.includes(place.region) ? place.region : undefined;
    return {
      ...location,
      label: place.label?.trim() || location.label,
      region,
      city: place.town?.trim() || undefined,
      village: place.village?.trim() || undefined,
      area: place.area?.trim() || undefined,
      district: place.district?.trim() || undefined,
    };
  } catch {
    return location;
  }
}

const initialRequests = new Map<string, Promise<WeatherLocation | null>>();
/**
 * The automatic attempt when the weather page opens, shared across mounts and React Strict Mode
 * effects. It runs on every visit, so the weather follows where the farmer is now; a timeout or
 * a weak signal is simply tried again next time. Only a refusal (or an http page, where the
 * browser always refuses) stops it for the rest of the tab: the farmer said no.
 */
export function requestInitialWeatherLocation(
  key: string,
  geolocation?: Geolocation,
): Promise<WeatherLocation | null> {
  const pending = initialRequests.get(key);
  if (pending) return pending;
  const refusedKey = `${key}:auto-refused`;
  if (sessionStore.get(refusedKey, false)) return Promise.resolve(null);
  const request = requestWeatherLocation(geolocation)
    .catch((error: unknown) => {
      if (error instanceof LocationError && (error.kind === 'denied' || error.kind === 'insecure'))
        sessionStore.set(refusedKey, true);
      throw error;
    })
    .finally(() => {
      initialRequests.delete(key);
    });
  initialRequests.set(key, request);
  return request;
}

/** Where the weather card starts before the farmer's own place is known (live weather there). */
export const DEFAULT_WEATHER_LOCATION: WeatherLocation = {
  kind: 'place',
  region: 'Greater Accra',
  city: 'Accra',
  label: 'Accra, Greater Accra, Ghana',
};
