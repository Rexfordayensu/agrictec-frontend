'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { MeterBar, Panel } from '@/components/admin/overview/panel';
import { farmersByRegion } from '@/lib/admin/analytics';
import { regionHref } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

const TOP = 7;

/** Farmers per region, most first. Each row opens the farmers list for that region. */
export function RegionChart({ className }: { className?: string }) {
  const farmers = useAdminDataStore((s) => s.farmers);
  const [showAll, setShowAll] = useState(false);
  const regions = farmersByRegion(farmers);
  const total = regions.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(1, regions[0]?.count ?? 0);
  const covered = regions.filter((r) => r.count > 0).length;
  const shown = showAll ? regions : regions.slice(0, TOP);

  return (
    <Panel
      title="Regions"
      description={`Farmers in ${covered} of ${regions.length} regions`}
      className={className}
    >
      <ul className="space-y-0.5">
        {shown.map((r, index) => (
          <li key={r.region}>
            <Link
              href={regionHref(r.region)}
              className="hover:bg-glass-strong -mx-2 grid min-h-10 grid-cols-[1.25rem_minmax(0,6.5rem)_minmax(0,1fr)_2rem] items-center gap-2.5 rounded-lg px-2 transition-colors"
            >
              <span className="text-text-mute text-xs tabular-nums">{index + 1}</span>
              <span className="text-text truncate text-sm">{r.region}</span>
              <MeterBar
                value={r.count}
                max={max}
                barClassName={cn(index < 3 ? 'bg-purple' : 'bg-purple/50')}
              />
              <span className="text-text text-right text-sm font-semibold tabular-nums">
                {r.count}
                <span className="sr-only">
                  {' '}
                  farmers, {total ? Math.round((r.count / total) * 100) : 0}%
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {regions.length > TOP && (
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
          className="text-ink-purple mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold"
        >
          {showAll ? 'Show top regions' : `Show all ${regions.length} regions`}
          <ChevronDown
            size={14}
            aria-hidden="true"
            className={cn('transition-transform', showAll && 'rotate-180')}
          />
        </button>
      )}
    </Panel>
  );
}
