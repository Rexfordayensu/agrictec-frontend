'use client';

import Image from 'next/image';
import { CloudSun, LocateFixed, MapPin, Navigation, ChevronDown } from 'lucide-react';
import type { WeatherLocation } from '@/types/market';

export function WeatherHero({
  location,
  isFarm,
  isCurrent,
  naming,
  locating,
  error,
  onLocate,
  onChange,
}: {
  location: WeatherLocation;
  isFarm: boolean;
  isCurrent?: boolean;
  naming: boolean;
  locating: boolean;
  error: string;
  onLocate: () => void;
  onChange: () => void;
}) {
  const device =
    isCurrent ?? (location.kind === 'coordinates' && location.label === 'Your current location');
  const approximate = device && (location.accuracyMetres ?? 0) > 10_000;
  const settlement = approximate
    ? undefined
    : location.village || location.city || location.area || location.district;
  const place =
    settlement || (approximate || location.kind === 'place' ? location.region : undefined);
  const region = location.region ? `${location.region} Region` : 'Not available yet';
  return (
    <section className="weather-location-hero" aria-labelledby="weather-title">
      <Image
        src="/images/weather/weather-banner.jpg"
        alt=""
        fill
        priority
        sizes="(max-width: 768px) 100vw, 1400px"
        className="weather-hero-image"
      />
      <div className="weather-hero-shade" aria-hidden="true" />
      <div className="weather-hero-content">
        <div className="weather-hero-heading">
          <CloudSun aria-hidden="true" />
          <span aria-hidden="true" />
          <h2 id="weather-title">Weather for your farm</h2>
        </div>
        <p className="weather-hero-intro">
          Get real-time weather updates and practical advice for
          <br className="weather-wide-break" /> your farm activities.
        </p>
        <div className="weather-location-controls">
          <button
            type="button"
            className="weather-place-badge"
            onClick={onChange}
            aria-label="Choose a village, town, city or region"
          >
            <MapPin aria-hidden="true" />
            <span>
              <span>
                {isFarm
                  ? 'Farm location'
                  : device
                    ? approximate
                      ? 'Approximate location'
                      : 'Current Location'
                    : 'Forecast location'}
              </span>
              <strong>
                {naming
                  ? 'Finding your area…'
                  : place || (device ? 'Position detected' : location.label)}
              </strong>
            </span>
            <ChevronDown className="weather-badge-chevron" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="weather-place-badge weather-region-badge"
            onClick={onChange}
          >
            <svg viewBox="0 0 32 42" aria-hidden="true">
              <path
                d="M14 2l5 1 4-1 4 4-1 5 3 3-4 7-4 4-2 7-4 7-7 1-4-5-2-8 4-8 1-6 5-5z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              <span>Region</span>
              <strong>{naming ? 'Locating…' : region}</strong>
            </span>
          </button>
          <span className="weather-control-divider" aria-hidden="true" />
          <button
            type="button"
            className="weather-detect-button"
            onClick={onLocate}
            disabled={locating}
          >
            <LocateFixed aria-hidden="true" className={locating ? 'animate-spin' : ''} />
            {locating ? 'Finding your location…' : 'Use my current location'}
          </button>
        </div>
        <div className="weather-location-message" aria-live="polite">
          <Navigation aria-hidden="true" />
          <p>
            {error ||
              (device
                ? approximate
                  ? 'Your device returned an approximate position. Showing the region near that position; choose your town for a more specific forecast.'
                  : /outside Ghana/.test(location.label)
                    ? 'Your detected position is outside Ghana. Weather is for that position.'
                    : !place && !naming
                      ? 'Your position was found, but its town and region could not be named. Try again or choose your town.'
                      : 'Weather follows your detected position. Place names depend on local map coverage.'
                : isFarm
                  ? 'Showing your saved farm location. Allow location access to see weather where you are now.'
                  : 'Allow location access to get accurate and farm-relevant weather updates for your area.')}
          </p>
        </div>
        {!approximate && (location.village || location.area || location.district) && (
          <p className="weather-local-detail">
            {[
              location.village && `Village: ${location.village}`,
              location.area && `Area: ${location.area}`,
              location.city && `Town / city: ${location.city}`,
              location.district,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
      </div>
    </section>
  );
}
