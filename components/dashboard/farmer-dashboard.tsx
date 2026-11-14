'use client';

import { useMemo, useState } from 'react';
import { ActivityTrend } from '@/components/dashboard/activity-trend';
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { LoanReadinessCard } from '@/components/dashboard/loan-readiness-card';
import { FarmInsight, NextSteps } from '@/components/dashboard/next-steps';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { WeatherCard } from '@/components/market/weather-card';
import { DemoNote, useDemo } from '@/components/shared/demo-note';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { fromFinancialSummary, type DashboardRange } from '@/lib/dashboard-summary';
import { demoDashboardSummary, demoScore } from '@/lib/demo-summary';
import { useFarmStore } from '@/store/farm-store';
import { usePlatformStore } from '@/store/platform-store';
import { useProfileStore } from '@/store/profile-store';
import './dashboard.css';

/**
 * The farmer's overview. Every figure is the server's: the score and readiness checklist
 * (GET /me/credit), the period's totals and monthly trend (GET /me/financial-summary), and the
 * farmer's own saved records, MoMo entries and profile. Nothing is sample data.
 */
export function FarmerDashboard() {
  return useDemo() ? <DemoDashboard /> : <AccountDashboard />;
}

/**
 * The guest demo: the score, totals and trend move as the guest adds records, worked out in the
 * browser from those entries only (lib/demo-summary.ts; never sample data, never sent). What
 * only AgriCtec's review of an account can say (loan readiness) needs an account.
 */
function DemoDashboard() {
  const [range, setRange] = useState<DashboardRange>(6);
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const profile = useProfileStore((s) => s.profile);
  const config = usePlatformStore((s) => s.creditConfig);
  const summary = useMemo(() => demoDashboardSummary(records, momo, range), [records, momo, range]);
  const score = useMemo(
    () => demoScore(records, momo, profile, config),
    [records, momo, profile, config],
  );

  return (
    <div className="dashboard-reference flex flex-col gap-4">
      <AnnouncementBanner />
      <DashboardHero />
      <DemoNote title="Demo figures" compact>
        Worked out on this phone from what you add in the demo, and they change as you add records.
        They stay on this phone and are never sent to AgriCtec; the demo ends after one day.
      </DemoNote>
      <OverviewStats summary={summary} score={score} />
      <div className="dash-trend-row">
        <ActivityTrend
          summary={summary}
          range={range}
          onRange={setRange}
          error={null}
          onRetry={() => {}}
        />
        <DemoNote title="Loan readiness">
          AgriCtec checks your records, receipts and Ghana Card on your account before lenders see
          them. Create a free account to start.
        </DemoNote>
      </div>
      <div className="dash-transactions-row">
        <RecentTransactions />
        <QuickActions range={range} />
      </div>
      <div className="dash-bottom-row">
        <div className="min-w-0">
          <WeatherCard compact dashboard />
        </div>
        <FarmInsight summary={summary} />
      </div>
    </div>
  );
}

function AccountDashboard() {
  const [range, setRange] = useState<DashboardRange>(6);
  const figures = useFinancialSummary(range);
  const summary =
    figures.summary && figures.summary.period.months === range
      ? fromFinancialSummary(figures.summary)
      : null;
  const error = figures.status === 'error' ? figures.error : null;

  return (
    <div className="dashboard-reference flex flex-col gap-4">
      <AnnouncementBanner />
      <DashboardHero />
      <OverviewStats summary={summary} />
      <div className="dash-trend-row">
        <ActivityTrend
          summary={summary}
          range={range}
          onRange={setRange}
          error={error}
          onRetry={figures.retry}
        />
        <LoanReadinessCard />
      </div>
      <div className="dash-transactions-row">
        <RecentTransactions />
        <QuickActions range={range} />
      </div>
      <div className="dash-bottom-row">
        <NextSteps />
        <div className="min-w-0">
          <WeatherCard compact dashboard />
        </div>
        <FarmInsight summary={summary} />
      </div>
    </div>
  );
}
