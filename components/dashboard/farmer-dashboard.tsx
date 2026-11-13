'use client';

import { useState } from 'react';
import { ActivityTrend } from '@/components/dashboard/activity-trend';
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { LoanReadinessCard } from '@/components/dashboard/loan-readiness-card';
import { FarmInsight, NextSteps } from '@/components/dashboard/next-steps';
import { OverviewStats } from '@/components/dashboard/overview-stats';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentTransactions } from '@/components/dashboard/recent-transactions';
import { WeatherCard } from '@/components/market/weather-card';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { fromFinancialSummary, type DashboardRange } from '@/lib/dashboard-summary';
import './dashboard.css';

/**
 * The farmer's overview. Every figure is the server's: the score and readiness checklist
 * (GET /me/credit), the period's totals and monthly trend (GET /me/financial-summary), and the
 * farmer's own saved records, MoMo entries and profile. Nothing is sample data.
 */
export function FarmerDashboard() {
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
