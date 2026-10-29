import type { Metadata } from 'next';
import { AnnualTrendChart } from '@/components/reports/annual-trend-chart';
import { HealthCard } from '@/components/reports/health-card';
import { PnlSummaryCard } from '@/components/reports/pnl-summary-card';
import { ReportCardsGrid } from '@/components/reports/report-cards-grid';
import { ReportPreviewModal } from '@/components/reports/report-preview-modal';
import { ReportsHero } from '@/components/reports/reports-hero';
import { ReportsKpis } from '@/components/reports/reports-kpis';

export const metadata: Metadata = { title: 'Financial Reports' };

/**
 * Report center. `@container` makes every grid respond to the content width (which depends on
 * the sidebar): one column on phones, a main column plus a 360px side column when wide.
 */
export default function ReportsPage() {
  return (
    <div className="@container space-y-6">
      <ReportsHero />
      <ReportsKpis />
      <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_360px]">
        <ReportCardsGrid />
        <HealthCard />
      </div>
      <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[minmax(0,1fr)_360px]">
        <AnnualTrendChart />
        <PnlSummaryCard />
      </div>
      <ReportPreviewModal />
    </div>
  );
}
