'use client';

import { useEffect, useRef, useState } from 'react';
import { Circle, ExternalLink, LocateFixed, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { IconTile } from '@/components/ui/icon-tile';
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
          const saved = await useProfileStore.getState().save({
            gps: { lat: coords.latitude, lng: coords.longitude },
          });
          // An admin reviews the pin on the map; it is verified once approved.
          if (saved.gps)
            await usePlatformStore
              .getState()
              .submitLocation(`${saved.gps.lat.toFixed(4)}, ${saved.gps.lng.toFixed(4)}`);
          if (active.current) toast.success('Farm location saved and sent for review');
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
    <div id="farm-location" className="verification-gps scroll-mt-24">
      <IconTile icon={LocateFixed} tone="gold" size="lg" />
      <div className="verification-gps-content">
        <h3>Farm GPS location</h3>
        <p>
          {gps
            ? formatGPS(gps.lat, gps.lng)
            : 'Not set. Add your current farm GPS location for better verification and loan processing.'}
        </p>
        {gps && (
          <a
            href={`https://www.google.com/maps?q=${gps.lat},${gps.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-green inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
          >
            Open in Google Maps <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
      <div className="verification-gps-actions">
        <Badge color={gps ? 'blue' : 'gold'}>
          <Circle size={12} aria-hidden="true" />
          {gps ? 'Set' : 'Not set'}
        </Badge>
        <Button
          mutates
          variant="ghost"
          icon={MapPin}
          loading={loading}
          onClick={locate}
          className="verification-primary-action"
        >
          Get Current Location
        </Button>
      </div>
    </div>
  );
}
