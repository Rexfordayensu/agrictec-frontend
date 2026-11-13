import type { Metadata } from 'next';
import '@/components/records/records-page.css';
import { CropDistributionChart } from '@/components/records/crop-distribution-chart';
import { ExpenseBreakdown } from '@/components/records/expense-breakdown';
import { MonthlyNetChart } from '@/components/records/monthly-net-chart';
import { RecordTemplates } from '@/components/records/record-templates';
import { RecordsView } from '@/components/records/records-view';

export const metadata: Metadata = { title: 'Farm Records' };

/**
 * The farmer's records (GET /me/records): totals, the list and charts, all from the saved
 * records. `@container`: the layout responds to the content width (which depends on the sidebar).
 */
export default function RecordsPage() {
  return (
    <div className="records-reference @container space-y-5">
      <RecordsView />
      <div className="records-charts grid grid-cols-1 gap-5 @2xl:grid-cols-2 @7xl:grid-cols-4">
        <CropDistributionChart className="records-crop-chart" />
        <ExpenseBreakdown className="records-expense-chart" />
        <MonthlyNetChart className="records-net-chart" />
        <RecordTemplates />
      </div>
    </div>
  );
}
