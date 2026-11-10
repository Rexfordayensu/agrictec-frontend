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

function position(geolocation: Geolocation, options: PositionOptions) {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    geolocation.getCurrentPosition(resolve, reject, options),
  );
}

/** The browser always controls permission. No reverse-geocoding API call. */
export async function requestWeatherLocation(
  geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
): Promise<WeatherLocation> {
  if (!geolocation) throw new Error('This browser can’t share your location.');
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
    throw new Error(
      failure?.code === 1
        ? 'Location permission was denied.'
        : failure?.code === 3
          ? 'Your location could not be found in time (the GPS signal may be weak).'
          : 'Your location could not be detected.',
    );
  const location: WeatherLocation = {
    kind: 'coordinates',
    label: 'Your current location',
    latitude: found.coords.latitude,
    longitude: found.coords.longitude,
    accuracyMetres: found.coords.accuracy,
  };
  if (!validWeatherLocation(location)) throw new Error('The device returned an invalid location.');
  return location;
}

const initialRequests = new Map<string, Promise<WeatherLocation | null>>();
/** One automatic attempt per account/tab, shared across mounts and React Strict Mode effects. */
export function requestInitialWeatherLocation(
  key: string,
  geolocation?: Geolocation,
): Promise<WeatherLocation | null> {
  const pending = initialRequests.get(key);
  if (pending) return pending;
  const attemptedKey = `${key}:auto-attempted`;
  if (sessionStore.get(attemptedKey, false)) return Promise.resolve(null);
  const request = requestWeatherLocation(geolocation).finally(() => {
    sessionStore.set(attemptedKey, true);
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
