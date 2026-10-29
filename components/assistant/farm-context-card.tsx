'use client';

import Link from 'next/link';
import { ArrowUpRight, ClipboardList, MapPin, SlidersHorizontal, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useFarmStore } from '@/store/farm-store';
import { useProfileStore } from '@/store/profile-store';

export function FarmContextCard() {
  const profile = useProfileStore((state) => state.profile);
  const recordCount = useFarmStore((state) => state.records.length);
  return (
    <Card className="rounded-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-text-mute text-[10px] font-semibold tracking-[0.14em] uppercase">
          Your farm context
        </p>
        <SlidersHorizontal size={14} aria-hidden="true" className="text-text-mute" />
      </div>
      <p className="text-text mt-3 truncate text-sm font-bold">
        {profile?.farmName.trim() || 'Let’s get to know your farm'}
      </p>
      <div className="text-text-dim mt-3 space-y-3 text-xs">
        <p className="flex items-center gap-2">
          <MapPin size={14} aria-hidden="true" className="text-ink-green shrink-0" />
          {profile?.region || 'Add your region'}
        </p>
        <p className="flex items-start gap-2">
          <Sprout size={14} aria-hidden="true" className="text-ink-green shrink-0" />
          <span>
            {profile?.primaryCrops.length
              ? profile.primaryCrops.join(', ')
              : 'Add your primary crops'}
          </span>
        </p>
        <p className="flex items-center gap-2">
          <ClipboardList size={14} aria-hidden="true" className="text-ink-green shrink-0" />
          {recordCount} farm {recordCount === 1 ? 'record' : 'records'} informing your answers
        </p>
      </div>
      <Link
        href="/profile"
        className="text-ink-green mt-5 inline-flex min-h-9 items-center gap-1.5 text-xs font-semibold hover:underline"
      >
        Update farm profile
        <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </Card>
  );
}
