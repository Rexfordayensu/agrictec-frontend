'use client';

// Client only: Leaflet needs `window`. Import this file with next/dynamic and { ssr: false }.
//
// Leaflet is driven directly here (not through react-leaflet's MapContainer). MapContainer
// removes its map in an effect cleanup but keeps the removed map in state, so when React re-runs
// effects without remounting (Fast Refresh, Strict Mode, hidden/shown routes) its layers were
// added to a destroyed map ("reading 'appendChild'") or the container was reused ("Map container
// is being reused by another instance"). Each mount below creates a fresh element and map, and
// its cleanup removes both, so a re-run can never touch an old map.
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Map as MapIcon, Maximize2, Minimize2, Satellite, WifiOff } from 'lucide-react';
import { REGION_CENTERS } from '@/constants/constituencies';
import { GHANA_CENTER, insideGhana } from '@/components/onboarding/onboarding-schemas';
import { cn } from '@/lib/utils';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Where to fly to (a searched place). A new `key` flies again, even to the same spot. */
export interface MapFocus extends LatLng {
  zoom: number;
  key: number;
}

type Basemap = 'map' | 'satellite';

/**
 * The pin: an emerald dot drawn with CSS (.farm-pin in globals.css). A divIcon with only a class
 * avoids Leaflet's default marker images, whose paths break under bundlers.
 */
const PIN = L.divIcon({ className: 'farm-pin', iconSize: [24, 24], iconAnchor: [12, 12] });

/** Panning stays around Ghana (a little margin so border farms are easy to reach). */
const GHANA_PAN_BOUNDS = L.latLngBounds([3.9, -3.9], [11.8, 1.9]);

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const round = (value: number) => Math.round(value * 1e6) / 1e6;

const overlayButton =
  'bg-bg-1/90 text-text border-border hover:bg-bg-2 inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold shadow-lg backdrop-blur-sm transition-colors';

/**
 * OpenStreetMap with one draggable pin. Scroll (or pinch) to zoom in down to single fields,
 * drag to move around, switch to satellite to spot the farm itself, and enlarge the map.
 * Clicks outside Ghana are refused (onOutside). When tiles can't load (no internet), a message
 * replaces them; the step still works without a pin. With `interactive={false}` it is a small
 * static preview (review screen).
 */
export default function FarmMap({
  value,
  onChange,
  onOutside,
  region,
  focus,
  interactive = true,
  className,
}: {
  value: LatLng | null;
  onChange?: (value: LatLng) => void;
  onOutside?: () => void;
  region?: string;
  focus?: MapFocus | null;
  interactive?: boolean;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>('map');
  const [expanded, setExpanded] = useState(false);
  // The first view: the pin, else the region, else all of Ghana (read once, when mounting).
  const [initialView] = useState(() => {
    const regionCenter = region ? REGION_CENTERS[region] : undefined;
    return {
      center: value ?? regionCenter ?? GHANA_CENTER,
      zoom: value ? 15 : regionCenter ? 9 : 7,
    };
  });

  // The latest props for Leaflet's event handlers (they are attached once per map).
  const latest = useRef({ value, onChange, onOutside });
  useEffect(() => {
    latest.current = { value, onChange, onOutside };
  });

  /** A tap or a dragged pin: inside Ghana → the new pin; outside → refused. */
  const pickRef = useRef((point: LatLng): boolean => {
    if (!insideGhana(point)) {
      latest.current.onOutside?.();
      return false;
    }
    latest.current.onChange?.({ lat: round(point.lat), lng: round(point.lng) });
    return true;
  });

  // ---- Create the map (a fresh element each time, removed with the map) ----
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const element = document.createElement('div');
    element.className = 'h-full w-full rounded-2xl';
    element.style.background = 'var(--bg-2)';
    host.appendChild(element);

    const map = L.map(element, {
      center: [initialView.center.lat, initialView.center.lng],
      zoom: initialView.zoom,
      minZoom: 6,
      maxZoom: 19,
      maxBounds: interactive ? GHANA_PAN_BOUNDS : undefined,
      maxBoundsViscosity: 0.8,
      scrollWheelZoom: interactive,
      wheelPxPerZoomLevel: 90,
      dragging: interactive,
      zoomControl: interactive,
      doubleClickZoom: interactive,
      touchZoom: interactive,
      keyboard: interactive,
      boxZoom: interactive,
      attributionControl: true,
    });
    if (interactive) map.on('click', (event) => void pickRef.current(event.latlng));
    mapRef.current = map;

    return () => {
      map.off();
      map.remove();
      element.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive, initialView]);

  // ---- Base layer: street map, or satellite imagery with place names ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const events = {
      tileerror: () => setTilesFailed(true),
      tileload: () => setTilesFailed(false),
    };
    const layers =
      basemap === 'map'
        ? [
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: OSM_ATTRIBUTION,
              maxZoom: 19,
            }).on(events),
          ]
        : [
            L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
              {
                attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
                maxZoom: 19,
                maxNativeZoom: 18,
              },
            ).on(events),
            // Town and village names on top of the photo.
            L.tileLayer(
              'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
              { maxZoom: 19, maxNativeZoom: 18 },
            ),
          ];
    layers.forEach((layer) => layer.addTo(map));
    return () => {
      layers.forEach((layer) => {
        layer.off();
        layer.remove();
      });
    };
  }, [basemap, interactive, initialView]);

  // ---- The pin ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([value.lat, value.lng]);
      return;
    }
    const marker = L.marker([value.lat, value.lng], {
      icon: PIN,
      draggable: interactive,
      keyboard: false,
      title: 'Your farm',
    }).addTo(map);
    marker.on('dragend', () => {
      const moved = pickRef.current(marker.getLatLng());
      // Outside Ghana: snap back to the last valid spot.
      const last = latest.current.value;
      if (!moved && last) marker.setLatLng([last.lat, last.lng]);
    });
    markerRef.current = marker;
  }, [value, interactive, initialView]);

  // ---- Moving the view ----
  // Only a region picked after the map opened moves it (the first view already fits the pin or
  // the region), so reopening a saved location never hides its pin.
  const shownRegion = useRef(region);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactive || region === shownRegion.current) return;
    shownRegion.current = region;
    const center = region ? REGION_CENTERS[region] : undefined;
    if (center) map.flyTo([center.lat, center.lng], 9, { duration: 0.6 });
  }, [region, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && focus && interactive)
      map.flyTo([focus.lat, focus.lng], focus.zoom, { duration: 0.8 });
  }, [focus, interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (map && value && interactive && !map.getBounds().contains([value.lat, value.lng]))
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 13));
  }, [value, interactive]);

  // The container changed size: let Leaflet fill the new area.
  useEffect(() => {
    const timer = window.setTimeout(() => mapRef.current?.invalidateSize(), 220);
    return () => window.clearTimeout(timer);
  }, [expanded]);

  return (
    <div
      className={cn('relative transition-[height] duration-200', className)}
      // Larger map: most of the screen, so small villages and field edges are easy to find.
      style={expanded ? { height: 'min(75vh, 640px)' } : undefined}
    >
      <div ref={hostRef} className="h-full w-full" />

      {interactive && (
        <div className="absolute top-2.5 right-2.5 z-500 flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTilesFailed(false);
              setBasemap(basemap === 'map' ? 'satellite' : 'map');
            }}
            aria-pressed={basemap === 'satellite'}
            className={overlayButton}
          >
            {basemap === 'map' ? (
              <Satellite size={14} aria-hidden="true" />
            ) : (
              <MapIcon size={14} aria-hidden="true" />
            )}
            {basemap === 'map' ? 'Satellite' : 'Map'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-pressed={expanded}
            className={overlayButton}
          >
            {expanded ? (
              <Minimize2 size={14} aria-hidden="true" />
            ) : (
              <Maximize2 size={14} aria-hidden="true" />
            )}
            {expanded ? 'Smaller' : 'Larger map'}
          </button>
        </div>
      )}

      {tilesFailed && (
        <div
          role="status"
          className="bg-bg-2/90 text-text-dim absolute inset-0 z-500 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 text-center text-sm"
        >
          <WifiOff size={22} aria-hidden="true" className="text-text-mute" />
          <p className="text-text font-semibold">The map can&apos;t load right now</p>
          <p className="max-w-xs text-xs">
            Check your internet connection. You can still continue without a pin, or use your
            current location.
          </p>
        </div>
      )}
    </div>
  );
}
