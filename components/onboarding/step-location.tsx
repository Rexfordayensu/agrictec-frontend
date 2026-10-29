'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { zodResolver } from '@hookform/resolvers/zod';
import { Crosshair, Info, Loader2, MapPin, MapPinned, X } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { CommunityField } from '@/components/onboarding/community-field';
import type { MapFocus } from '@/components/onboarding/farm-map';
import {
  OUTSIDE_GHANA,
  insideGhana,
  locationDefaults,
  locationPatch,
  locationSchema,
  type LocationValues,
} from '@/components/onboarding/onboarding-schemas';
import { StepHeader, type StepProps } from '@/components/onboarding/wizard-nav';
import { Button } from '@/components/ui/button';
import { FormField, fieldErrorId, fieldHintId } from '@/components/ui/form-field';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { constituenciesOf } from '@/constants/constituencies';
import { REGIONS } from '@/constants/regions';
import { formatGPS } from '@/lib/format';
import { geocodingService, type PlaceResult } from '@/services/geocoding.service';

/** Leaflet needs `window`, so the map loads in the browser only. */
const FarmMap = dynamic(() => import('@/components/onboarding/farm-map'), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-2xl" />,
});

const GEO_ERRORS: Record<number, string> = {
  1: 'Location permission was denied. Allow location access in your browser settings, or tap the map instead.',
  2: 'Your location is unavailable right now. Tap the map to place the pin instead.',
  3: 'Finding your location took too long. Try again, or tap the map instead.',
};

/** How long to wait after the last change before saving the answers to the draft. */
const AUTOSAVE_MS = 500;

/**
 * Step 2: region, constituency, community and (optionally) a pin on the map. The map follows
 * the answers: a region zooms to the region, a constituency to its main town, and a community
 * found with "Find on map" to that town or village, ready to tap the farm. In the wizard every
 * answer (and the pin) is saved to the draft as it changes, not only on Continue.
 */
export function StepLocation({
  formId,
  data,
  onSubmit,
  onDraft,
  autoFocusHeading = true,
}: StepProps & { autoFocusHeading?: boolean }) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<LocationValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: locationDefaults(data),
  });
  const region = useWatch({ control, name: 'region' });
  const constituency = useWatch({ control, name: 'constituency' });
  const community = useWatch({ control, name: 'community' });
  const gps = useWatch({ control, name: 'gps' });
  const constituencies = constituenciesOf(region);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const [mapHint, setMapHint] = useState<string | null>(null);
  const [focus, setFocus] = useState<MapFocus | null>(null);
  const [locating, setLocating] = useState(false);
  const [finding, setFinding] = useState(false);
  // The constituency lookup in flight (a newer choice cancels it).
  const [lookup, setLookup] = useState<AbortController | null>(null);

  // Record the answers as they change (the wizard's draft), so a refresh keeps them.
  const saved = useRef<string | null>(null);
  useEffect(() => {
    if (!onDraft) return;
    const patch = locationPatch({ region, constituency, community, gps });
    const key = JSON.stringify(patch);
    // The first run only remembers what was loaded; later changes are saved.
    if (saved.current === null) {
      saved.current = key;
      return;
    }
    if (key === saved.current) return;
    const timer = window.setTimeout(() => {
      saved.current = key;
      onDraft(patch);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [onDraft, region, constituency, community, gps]);

  useEffect(() => () => lookup?.abort(), [lookup]);

  const setPin = (point: { lat: number; lng: number } | null) => {
    setMapMessage(null);
    setMapHint(point ? null : 'Pin removed. Tap the map to place it again.');
    setValue('gps', point, { shouldDirty: true, shouldValidate: true });
  };

  const show = (place: Pick<PlaceResult, 'lat' | 'lng' | 'zoom'>, hint: string) => {
    setMapMessage(null);
    // A new key moves the map again, even back to the same place.
    setFocus((prev) => ({
      lat: place.lat,
      lng: place.lng,
      zoom: place.zoom,
      key: (prev?.key ?? 0) + 1,
    }));
    setMapHint(hint);
  };

  /** A constituency was chosen: move the map to it (its main town). */
  async function showConstituency(name: string) {
    lookup?.abort();
    if (!name || !region) {
      setFinding(false);
      return;
    }
    const controller = new AbortController();
    setLookup(controller);
    setFinding(true);
    try {
      const place = await geocodingService.locateConstituency(name, region, controller.signal);
      if (controller.signal.aborted) return;
      if (place)
        show(place, `Showing ${name}. Find your town below, or zoom in and tap your farm.`);
      else
        setMapHint(
          `Couldn’t find ${name} on the map. Find your town below, or zoom in and tap your farm.`,
        );
    } catch {
      if (!controller.signal.aborted)
        setMapHint('The map couldn’t move there (no connection?). You can still zoom and tap.');
    } finally {
      if (!controller.signal.aborted) setFinding(false);
    }
  }

  function locateMe() {
    if (!('geolocation' in navigator)) {
      setMapMessage('This browser can’t share your location. Tap the map to place the pin.');
      return;
    }
    setLocating(true);
    setMapMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        const point = {
          lat: Math.round(coords.latitude * 1e6) / 1e6,
          lng: Math.round(coords.longitude * 1e6) / 1e6,
        };
        if (!insideGhana(point)) {
          setMapMessage(OUTSIDE_GHANA);
          return;
        }
        setPin(point);
      },
      (error) => {
        setLocating(false);
        setMapMessage(GEO_ERRORS[error.code] ?? GEO_ERRORS[2]);
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  return (
    <form
      id={formId}
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(locationPatch(values)))}
    >
      <StepHeader
        icon={MapPinned}
        title="Where is your farm?"
        description="Choose your area, find your town, then pin your farm on the map."
        autoFocus={autoFocusHeading}
      />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Region" htmlFor="onb-region" error={errors.region?.message}>
            <Select
              id="onb-region"
              error={Boolean(errors.region)}
              aria-describedby={errors.region ? fieldErrorId('onb-region') : undefined}
              {...register('region', {
                // A new region clears the constituency (it belonged to the old one).
                onChange: (event: { target: { value: string } }) => {
                  setValue('constituency', '');
                  lookup?.abort();
                  setFinding(false);
                  setMapHint(
                    event.target.value ? `Showing the ${event.target.value} Region.` : null,
                  );
                },
              })}
            >
              <option value="">Choose a region</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Constituency"
            htmlFor="onb-constituency"
            error={errors.constituency?.message}
            hint={region ? undefined : 'Choose a region first.'}
          >
            <Select
              id="onb-constituency"
              disabled={!region}
              error={Boolean(errors.constituency)}
              aria-describedby={
                errors.constituency
                  ? fieldErrorId('onb-constituency')
                  : region
                    ? undefined
                    : fieldHintId('onb-constituency')
              }
              {...register('constituency', {
                onChange: (event: { target: { value: string } }) =>
                  void showConstituency(event.target.value),
              })}
            >
              <option value="">{region ? 'Choose a constituency' : 'Pick a region first'}</option>
              {constituencies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          label="Community / town (optional)"
          htmlFor="onb-community"
          error={errors.community?.message}
        >
          <Controller
            control={control}
            name="community"
            render={({ field }) => (
              <CommunityField
                id="onb-community"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                region={region || undefined}
                error={errors.community?.message}
                onPick={(place) =>
                  show(
                    place,
                    `Showing ${place.name}. Zoom in, then tap your farm to place the pin.`,
                  )
                }
              />
            )}
          />
          <p className="text-text-mute text-xs">
            Type your town or village and press <span className="font-semibold">Find on map</span>{' '}
            to move the map there.
          </p>
        </FormField>

        <section
          aria-labelledby="onb-map-title"
          className="border-border bg-glass rounded-2xl border p-4"
        >
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3
                id="onb-map-title"
                className="text-text flex items-center gap-1.5 text-sm font-semibold"
              >
                <MapPin size={15} aria-hidden="true" className="text-ink-green" />
                Pin your farm on the map
              </h3>
              <p className="text-text-mute mt-0.5 text-xs">
                Optional but recommended. Scroll or pinch to zoom in, drag to move around, then tap
                your farm. Drag the pin to adjust it.
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              icon={Crosshair}
              loading={locating}
              onClick={locateMe}
              className="min-h-11"
            >
              Use my current location
            </Button>
          </div>

          <Controller
            control={control}
            name="gps"
            render={() => (
              <FarmMap
                value={gps}
                region={region || undefined}
                focus={focus}
                onChange={setPin}
                onOutside={() => setMapMessage(OUTSIDE_GHANA)}
                className="h-80 w-full sm:h-95"
              />
            )}
          />

          <div className="mt-3 flex min-h-11 flex-wrap items-center justify-between gap-2">
            <p className="text-text-dim text-sm tabular-nums" aria-live="polite">
              {gps ? formatGPS(gps.lat, gps.lng) : 'No pin yet'}
            </p>
            {gps && (
              <Button type="button" size="sm" variant="ghost" icon={X} onClick={() => setPin(null)}>
                Remove pin
              </Button>
            )}
          </div>
          {(finding || (mapHint && !mapMessage)) && (
            <p
              role="status"
              className="text-ink-green mt-1 flex items-center gap-1.5 text-xs font-semibold"
            >
              {finding && <Loader2 size={13} aria-hidden="true" className="animate-spin" />}
              {finding ? `Finding ${constituency} on the map…` : mapHint}
            </p>
          )}
          {(mapMessage || errors.gps?.message) && (
            <p role="alert" className="text-ink-red mt-1 text-xs font-semibold">
              {mapMessage ?? errors.gps?.message}
            </p>
          )}
          <p className="text-text-mute mt-2 flex items-start gap-1.5 text-xs">
            <Info size={13} aria-hidden="true" className="mt-px shrink-0" />
            <span>
              Adding your exact location helps verify your farm and can raise your credit score.
              {onDraft ? ' Your answers on this step are saved as you go.' : ''}
            </span>
          </p>
        </section>
      </div>
    </form>
  );
}
