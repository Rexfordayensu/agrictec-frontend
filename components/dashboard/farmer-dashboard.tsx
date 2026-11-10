'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Sprout } from 'lucide-react';
import { AiRecommendations } from '@/components/dashboard/ai-recommendations';
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { LoanReadinessCard } from '@/components/dashboard/loan-readiness-card';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatsRow } from '@/components/dashboard/stats-row';
import { WeatherCard } from '@/components/market/weather-card';
import { dashboardSummary, type DashboardRange } from '@/lib/dashboard-summary';
import { formatGHS } from '@/lib/format';
import { useFarmStore } from '@/store/farm-store';
import './dashboard.css';

export function FarmerDashboard() {
  const records = useFarmStore((state) => state.records);
  const momo = useFarmStore((state) => state.momo);
  const [range, setRange] = useState<DashboardRange>(6);
  const summary = dashboardSummary(records, momo, range);
  const hasRecords = records.length > 0;
  const hasActivity = hasRecords || momo.length > 0;
  return (
    <div className="farmer-dashboard">
      <AnnouncementBanner />
      <DashboardHero />
      <QuickActions />

      {hasRecords ? (
        <section aria-labelledby="farm-summary-title" className="farmer-dashboard-finances">
          <div className="farmer-dashboard-section-heading">
            <div>
              <h2 id="farm-summary-title">Your farm at a glance</h2>
              <p>{summary.periodLabel} · through today</p>
            </div>
            <div
              role="group"
              aria-label="Financial reporting period"
              className="farmer-dashboard-period"
            >
              {([6, 12] as const).map((months) => (
                <button
                  key={months}
                  type="button"
                  aria-pressed={range === months}
                  onClick={() => setRange(months)}
                >
                  Last {months} months
                </button>
              ))}
            </div>
          </div>
          <div aria-live="polite" aria-atomic="true">
            <StatsRow summary={summary} />
          </div>
          <div className="farmer-dashboard-finance-footer">
            <p>
              {summary.recordCount} farm record{summary.recordCount === 1 ? '' : 's'} in this period
            </p>
            <Link href="/momo">
              MoMo net: <strong>{formatGHS(summary.momoNet)}</strong>
              <ArrowRight size={14} aria-hidden="true" />
              <span className="sr-only">View mobile money transactions</span>
            </Link>
          </div>
          <p className="farmer-dashboard-footnote">
            MoMo is tracked separately and is not added to farm income.
          </p>
        </section>
      ) : (
        <section className="farmer-dashboard-welcome" aria-labelledby="first-record-title">
          <div className="farmer-dashboard-welcome-icon">
            <Sprout size={30} aria-hidden="true" />
          </div>
          <div>
            <p className="farmer-dashboard-eyebrow">A SIMPLE PLACE TO START</p>
            <h2 id="first-record-title">Every farm story starts with one record.</h2>
            <p>
              Record a sale, a cost, or work on your farm. Your financial picture will grow as you
              add real activity.
            </p>
            <p className="farmer-dashboard-welcome-tip">
              <BookOpen size={17} aria-hidden="true" />
              For example: a maize sale, fertilizer, or planting.
            </p>
          </div>
        </section>
      )}

      <div className="farmer-dashboard-grid" data-empty={!hasActivity}>
        <RecentActivity className="farmer-dashboard-activity farmer-dashboard-panel" limit={4} />
        {hasActivity && <AiRecommendations />}
        {hasRecords &&
          (summary.financialRecordCount ? (
            <IncomeExpenseChart summary={summary} />
          ) : (
            <section className="farmer-dashboard-trend farmer-dashboard-period-empty">
              <BookOpen size={24} aria-hidden="true" />
              <h2>No sales or expenses in this period</h2>
              <p>
                Your records are still saved. Choose a longer period, or use Add record to log a
                sale or cost.
              </p>
              <Link href="/records" className="farmer-dashboard-text-link">
                View all farm records
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </section>
          ))}
        {hasActivity && <LoanReadinessCard />}
        <div className="farmer-dashboard-weather">
          <WeatherCard compact />
        </div>
      </div>
    </div>
  );
}
