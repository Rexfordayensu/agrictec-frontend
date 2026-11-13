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
export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return (
    <div className="records-reference @container space-y-5">
      <RecordsView
        key={view === 'all' ? 'transactions' : 'records'}
        initialView={view === 'all' ? 'transactions' : 'records'}
      />
      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-2">
        <CropDistributionChart />
        <ExpenseBreakdown />
      </div>
      <div className="grid grid-cols-1 gap-5 @3xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <MonthlyNetChart />
        <RecordTemplates />
      </div>
    </div>
  );
}
