'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { formatGPS } from '@/lib/format';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';

export function GpsField() {
  const gps = useProfileStore((state) => state.profile?.gps);
  const [loading, setLoading] = useState(false);
  const pending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function locate() {
    if (pending.current) return;
    if (!navigator.geolocation) return toast.error('Location unavailable');
    const userId = useProfileStore.getState().userId;
    pending.current = true;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          if (!active.current || useProfileStore.getState().userId !== userId) return;
          await useProfileStore.getState().save({
            gps: { lat: coords.latitude, lng: coords.longitude },
            verification: { location: true },
          });
          // Location checks stay instant; this only records the approved check for the admin.
          void usePlatformStore
            .getState()
            .logInstantCheck(
              'location',
              `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
            )
            .catch(() => {});
          if (active.current) toast.success('Farm location saved and verified');
        } catch (error) {
          if (active.current)
            toast.error(error instanceof Error ? error.message : 'Could not save your location');
        } finally {
          pending.current = false;
          if (active.current) setLoading(false);
        }
      },
      (error) => {
        pending.current = false;
        if (!active.current) return;
        setLoading(false);
        toast.error(
          error.code === 1
            ? 'Permission denied — allow location access in your browser settings'
            : error.code === 3
              ? 'Request timed out'
              : 'Location unavailable',
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
  return (
    <div id="farm-location" className="border-border scroll-mt-24 border-t pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-text text-sm font-semibold">Farm GPS location</p>
          <p className="text-text-mute mt-1 text-xs tabular-nums">
            {gps ? formatGPS(gps.lat, gps.lng) : 'Not set'}
          </p>
        </div>
        <Button mutates variant="ghost" icon={MapPin} loading={loading} onClick={locate}>
          Get Current Location
        </Button>
      </div>
      {gps && (
        <a
          href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ink-green mt-3 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold hover:underline"
        >
          Open in Google Maps
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  );
}
