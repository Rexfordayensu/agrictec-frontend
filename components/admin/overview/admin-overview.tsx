'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CropPopularityChart } from '@/components/admin/overview/crop-popularity-chart';
import { KpiGrid } from '@/components/admin/overview/kpi-grid';
import { LoanFunnel } from '@/components/admin/overview/loan-funnel';
import { NeedsAttention } from '@/components/admin/overview/needs-attention';
import { RecentAdminActivity } from '@/components/admin/overview/recent-admin-activity';
import { RegionChart } from '@/components/admin/overview/region-chart';
import { ScoreDistributionChart } from '@/components/admin/overview/score-distribution-chart';
import { SignupsChart } from '@/components/admin/overview/signups-chart';
import { SystemStatus } from '@/components/admin/overview/system-status';
import { WeatherCard } from '@/components/market/weather-card';
import { useCan } from '@/hooks/admin/use-can';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import { DATE_RANGES, type DateRange } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';

/** Short labels for the period switch (the full label is read out). */
const RANGE_SHORT: Record<DateRange, string> = {
  '30d': '30D',
  '90d': '90D',
  '12m': '12M',
  all: 'All',
};

const greeting = (hour: number) =>
  hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

/**
 * The console's home: key figures first, then growth and the to-do list, the loan pipeline and
 * credit scores, then where farmers are, what they grow and what staff did. The period changes
 * the figures' deltas, the growth chart and the pipeline; regions, crops and scores always
 * describe all farmers today.
 */
export function AdminOverview() {
  const [range, setRange] = useState<DateRange>('12m');
  const [now] = useState(() => new Date());
  const status = usePlatformStatus();
  const name = useAdminAuthStore((s) => s.admin?.name.split(' ')[0]);
  const canFarmers = useCan('farmers.view');
  const canLoans = useCan('loans.view');
  const canAudit = useCan('audit.view');
  const bands = status?.creditConfig.bands;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-mute text-xs font-semibold tracking-wider uppercase">
            {format(now, 'EEEE, d MMMM')}
          </p>
          <h1 className="font-display text-text mt-1 text-2xl leading-tight font-bold sm:text-3xl">
            {greeting(now.getHours())}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="text-text-dim mt-1 text-sm">
            The health of the platform, and what needs you next.
          </p>
        </div>
        <div
          role="group"
          aria-label="Period"
          className="border-border bg-bg-2 grid shrink-0 grid-cols-4 gap-1 rounded-xl border p-1"
        >
          {DATE_RANGES.map((option) => {
            const selected = range === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => setRange(option.value)}
                className={cn(
                  'min-h-9 min-w-12 rounded-lg px-3 text-xs font-semibold transition-colors',
                  selected ? 'bg-purple/15 text-text' : 'text-text-mute hover:text-text',
                )}
              >
                {RANGE_SHORT[option.value]}
              </button>
            );
          })}
        </div>
      </header>

      <KpiGrid range={range} bands={bands} />
      <WeatherCard scope="admin" compact />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {canFarmers && <SignupsChart range={range} className="xl:col-span-2" />}
        <div className={cn('grid gap-6', !canFarmers && 'xl:col-span-3 xl:grid-cols-2')}>
          <NeedsAttention flags={status?.flags ?? null} />
          <SystemStatus status={status} />
        </div>
      </div>

      {(canLoans || canFarmers) && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {canLoans && (
            <LoanFunnel range={range} className={canFarmers ? 'xl:col-span-2' : 'xl:col-span-3'} />
          )}
          {canFarmers && (
            <ScoreDistributionChart bands={bands} className={canLoans ? '' : 'xl:col-span-3'} />
          )}
        </div>
      )}

      <div
        className={cn(
          'grid grid-cols-1 gap-6 md:grid-cols-2',
          canFarmers && canAudit && 'xl:grid-cols-3',
        )}
      >
        {canFarmers && <RegionChart />}
        {canFarmers && <CropPopularityChart />}
        {canAudit && (
          <RecentAdminActivity className={canFarmers ? 'md:col-span-2 xl:col-span-1' : ''} />
        )}
      </div>
    </div>
  );
}
