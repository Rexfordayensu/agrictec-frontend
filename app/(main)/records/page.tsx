import type { Metadata } from 'next';
import { CropDistributionChart } from '@/components/records/crop-distribution-chart';
import { ExpenseBreakdown } from '@/components/records/expense-breakdown';
import { MonthlyNetChart } from '@/components/records/monthly-net-chart';
import { RecordsView } from '@/components/records/records-view';

export const metadata: Metadata = { title: 'Farm Records' };

/** `@container`: the layout responds to the content width (which depends on the sidebar). */
export default function RecordsPage() {
  return (
    <div className="@container space-y-6">
      <RecordsView />
      <div className="grid grid-cols-1 gap-6 @3xl:grid-cols-2 @6xl:grid-cols-3">
        <CropDistributionChart />
        <ExpenseBreakdown />
        <MonthlyNetChart className="@3xl:col-span-2 @6xl:col-span-1" />
      </div>
    </div>
  );
}
