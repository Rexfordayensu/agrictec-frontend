'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import type { DashboardSummary } from '@/lib/dashboard-summary';
import { formatGHS } from '@/lib/format';

export function IncomeExpenseChart({ summary }: { summary: DashboardSummary }) {
  const { palette } = useChartTheme();
  return (
    <Card className="farmer-dashboard-trend farmer-dashboard-panel">
      <CardHeader>
        <div>
          <CardTitle>Income &amp; expenses</CardTitle>
          <CardSub>{summary.periodLabel} · recorded farm activity</CardSub>
        </div>
        <Link
          href="/records"
          className="farmer-dashboard-text-link"
          aria-label="View farm records behind this chart"
        >
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </CardHeader>
      <div className="farmer-dashboard-chart-legend">
        <span>
          <i style={{ background: palette.accent }} />
          Income
        </span>
        <span>
          <i style={{ background: palette.danger }} />
          Expenses
        </span>
      </div>
      <LineChart
        height={230}
        showLegend={false}
        labels={summary.series.labels}
        datasets={[
          { label: 'Income', data: summary.series.income, color: palette.accent, fill: true },
          { label: 'Expenses', data: summary.series.expense, color: palette.danger },
        ]}
        ariaLabel={`Recorded farm income and expenses, ${summary.periodLabel}. Income ${formatGHS(summary.income)}; expenses ${formatGHS(summary.expenses)}.`}
      />
      <p className="farmer-dashboard-footnote">
        Historical records · MoMo transactions are tracked separately.
      </p>
    </Card>
  );
}
