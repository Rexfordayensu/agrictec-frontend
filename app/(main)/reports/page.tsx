import type { Metadata } from 'next';
import { FinancialReportsView } from '@/components/reports/financial-reports-view';

export const metadata: Metadata = { title: 'Financial Reports' };

/** The farmer's recorded figures and server-generated PDF reports (app/services/financial_reports.py). */
export default function ReportsPage() {
  return <FinancialReportsView />;
}
