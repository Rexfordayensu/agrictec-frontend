import type { Metadata } from 'next';
import { AiRecommendations } from '@/components/dashboard/ai-recommendations';
import { AnnouncementBanner } from '@/components/dashboard/announcement-banner';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { GhanaCardPrompt } from '@/components/dashboard/ghana-card-prompt';
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart';
import { LoanReadinessCard } from '@/components/dashboard/loan-readiness-card';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StatsRow } from '@/components/dashboard/stats-row';
import { WeatherCard } from '@/components/market/weather-card';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * Server Component: only arranges the client components.
 * `@container` makes the grids respond to the dashboard's own width (which changes with the
 * sidebar), not the window's: 1 column on phones, a 2/3 + 1/3 bento layout when wide.
 */
export default function DashboardPage() {
  return (
    <div className="@container space-y-5 sm:space-y-6">
      <AnnouncementBanner />
      <GhanaCardPrompt />

      <div className="grid grid-cols-1 gap-5 sm:gap-6 @4xl:grid-cols-3">
        <DashboardHero className="@4xl:col-span-2" />
        <LoanReadinessCard />
      </div>

      <StatsRow />
      <WeatherCard compact />

      <div className="grid grid-cols-1 gap-5 sm:gap-6 @4xl:grid-cols-3">
        <IncomeExpenseChart className="@4xl:col-span-2" />
        <RecentActivity />
      </div>

      <AiRecommendations />
    </div>
  );
}
