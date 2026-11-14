'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Hand } from 'lucide-react';
import { CropPopularityChart } from '@/components/admin/overview/crop-popularity-chart';
import { KpiGrid } from '@/components/admin/overview/kpi-grid';
import { LoanFunnel } from '@/components/admin/overview/loan-funnel';
import { RecentAdminActivity } from '@/components/admin/overview/recent-admin-activity';
import { RegionChart } from '@/components/admin/overview/region-chart';
import { ScoreDistributionChart } from '@/components/admin/overview/score-distribution-chart';
import { SignupsChart } from '@/components/admin/overview/signups-chart';
import { StatusSummary } from '@/components/admin/overview/status-summary';
import { WeatherCard } from '@/components/market/weather-card';
import { adminPath } from '@/lib/admin-path';
import { useCan } from '@/hooks/admin/use-can';
import { useOverview } from '@/hooks/admin/use-overview';
import { usePlatformStatus } from '@/hooks/admin/use-platform-status';
import { DATE_RANGES, type DateRange } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';
import { LogoLoader } from '@/components/ui/logo-loader';

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
 * The console's home: key figures first, the weather beside the platform's status and to-do
 * list, then growth, the loan pipeline and credit scores side by side, then where farmers are,
 * what they grow and what staff did. Every figure comes live from the API (GET /admin/overview).
 * The period changes the figures' deltas, the growth chart and the pipeline; regions, crops and
 * scores always describe all farmers today.
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
  // Every figure is computed by the API: the browser never holds the farmers' own details.
  const { data, error } = useOverview(range);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-text-mute text-xs font-semibold tracking-wider uppercase">
            {format(now, 'EEEE, d MMMM')}
          </p>
          <h1 className="font-display text-text text-display mt-1 flex items-center gap-2 leading-tight font-bold">
            {greeting(now.getHours())}
            {name ? `, ${name}` : ''}
            <Hand aria-hidden="true" className="text-ink-gold size-[0.85em] -rotate-12" />
          </h1>
          <p className="text-text-dim mt-1 text-sm">
            Here&apos;s the latest on AgriCtec: platform health, farmer activity, lending, and what
            needs your attention.
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

      {!data ? (
        <div
          role={error ? 'alert' : undefined}
          className="border-border bg-glass text-text-dim flex min-h-40 items-center justify-center rounded-2xl border p-6 text-sm"
        >
          {error ?? <LogoLoader label="Loading the overview" />}
        </div>
      ) : (
        <KpiGrid range={range} bands={bands} kpis={data.kpis} />
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <WeatherCard scope="admin" weatherHref={adminPath('/admin/content/weather')} compact />
        <StatusSummary status={status} items={data?.needsAttention ?? []} />
      </div>

      {data && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {canFarmers && <SignupsChart range={range} series={data.signups} kpis={data.kpis} />}
            {canLoans && <LoanFunnel range={range} reach={data.loanStages} />}
            {canFarmers && (
              <ScoreDistributionChart
                bands={bands}
                buckets={data.scoreDistribution}
                averageScore={data.kpis.averageScore}
                evidence={data.evidenceCoverage}
                className="lg:col-span-2 xl:col-span-1"
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {canFarmers && <RegionChart regions={data.farmersByRegion} />}
            {canFarmers && (
              <CropPopularityChart crops={data.cropPopularity} growers={data.cropGrowers} />
            )}
            {canAudit && (
              <RecentAdminActivity className={canFarmers ? 'md:col-span-2 xl:col-span-1' : ''} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
