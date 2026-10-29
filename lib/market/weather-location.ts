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

/** The browser always controls permission. No reverse-geocoding API call. */
export function requestWeatherLocation(
  geolocation = typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
): Promise<WeatherLocation> {
  if (!geolocation)
    return Promise.reject(
      new Error('Location access is unavailable. Select a Ghanaian region or city below.'),
    );
  return new Promise((resolve, reject) =>
    geolocation.getCurrentPosition(
      (position) => {
        const location: WeatherLocation = {
          kind: 'coordinates',
          label: 'Your current location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMetres: position.coords.accuracy,
        };
        if (!validWeatherLocation(location))
          return reject(
            new Error('The device returned an invalid location. Please select a city.'),
          );
        resolve(location);
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? 'Location permission was denied. You can select your region or city below.'
              : error.code === 3
                ? 'Location detection timed out. Try again or select a city below.'
                : 'Your location could not be detected. Select a region or city below.',
          ),
        ),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    ),
  );
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
