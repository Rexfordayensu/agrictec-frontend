'use client';

import Link from 'next/link';
import { MeterBar, Panel } from '@/components/admin/overview/panel';
import { CROP_TONES, CropIcon, cropFromName } from '@/components/ui/crop-icon';
import { cropPopularity } from '@/lib/admin/analytics';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

/** Share of farmers growing each crop (a farmer can list several). Rows open those farmers. */
export function CropPopularityChart({ className }: { className?: string }) {
  const farmers = useAdminDataStore((s) => s.farmers);
  const crops = cropPopularity(farmers);
  const growers = farmers.filter((f) => !f.isGuest && f.profile.primaryCrops.length > 0).length;
  const max = Math.max(1, crops[0]?.count ?? 0);

  return (
    <Panel
      title="Crops"
      description={`What ${growers} farmers grow (several each)`}
      className={className}
    >
      <ul className="space-y-0.5">
        {crops.map((c) => {
          const crop = cropFromName(c.crop);
          const share = growers ? Math.round((c.count / growers) * 100) : 0;
          return (
            <li key={c.crop}>
              <Link
                href={`/admin/farmers?crop=${encodeURIComponent(c.crop)}`}
                className="hover:bg-glass-strong -mx-2 grid min-h-10 grid-cols-[1.75rem_minmax(0,5.5rem)_minmax(0,1fr)_2.75rem] items-center gap-2.5 rounded-lg px-2 transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-7 items-center justify-center rounded-lg',
                    CROP_TONES[crop],
                  )}
                >
                  <CropIcon crop={crop} size={14} />
                </span>
                <span className="text-text truncate text-sm">{c.crop}</span>
                <MeterBar value={c.count} max={max} barClassName="bg-accent/80" />
                <span className="text-right">
                  <span className="text-text block text-sm leading-tight font-semibold tabular-nums">
                    {share}%
                  </span>
                  <span className="text-text-mute block text-[11px] leading-tight tabular-nums">
                    {c.count}
                  </span>
                  <span className="sr-only"> farmers</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
