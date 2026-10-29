'use client';

import {
  CheckCircle2,
  Circle,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
  ClipboardList,
} from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { KpiCard } from '@/components/admin/shared/kpi-card';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { monthlySeries } from '@/lib/calculations/finance';
import { buildReadiness } from '@/lib/calculations/readiness';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Income, expenses, profit, records and MoMo; the 6-month chart; the readiness checklist. */
export function OverviewTab({ data }: TabProps) {
  const { palette } = useChartTheme();
  const { account, records, momo, creditConfig } = data.detail;
  const profit = account.stats.income - account.stats.expenses;
  const series = monthlySeries(records, 6);
  // The same checklist the farmer sees on their dashboard.
  const readiness = buildReadiness({
    records,
    momo,
    profile: account.profile,
    minRecords: creditConfig.eligibility.minRecords,
    cardUnderReview: Boolean(
      data.verifications?.some((v) => v.kind === 'ghanaCard' && v.status === 'pending'),
    ),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Income" icon={TrendingUp} value={formatGHS(account.stats.income)} />
        <KpiCard label="Expenses" icon={TrendingDown} value={formatGHS(account.stats.expenses)} />
        <KpiCard
          label="Profit"
          icon={Wallet}
          value={formatGHS(profit)}
          hint={
            account.stats.income > 0
              ? `${Math.round((profit / account.stats.income) * 100)}% margin`
              : 'No income yet'
          }
        />
        <KpiCard label="Farm records" icon={ClipboardList} value={String(account.stats.records)} />
        <KpiCard label="MoMo transactions" icon={Smartphone} value={String(account.stats.momo)} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Last 6 months</CardTitle>
              <CardSub>Income and expenses from the farmer’s records</CardSub>
            </div>
          </CardHeader>
          <BarChart
            labels={series.labels}
            datasets={[
              { label: 'Income', data: series.income, color: palette.accent },
              { label: 'Expenses', data: series.expense, color: palette.danger },
            ]}
            height={240}
            ariaLabel="Income and expenses over the last 6 months"
          />
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Loan readiness</CardTitle>
              <CardSub>What the farmer sees on their dashboard</CardSub>
            </div>
          </CardHeader>
          <ul className="space-y-3">
            {readiness.map((item) => {
              const Icon = item.done ? CheckCircle2 : Circle;
              return (
                <li key={item.key} className="flex items-start gap-2.5">
                  <Icon
                    size={18}
                    aria-hidden="true"
                    className={cn(
                      'mt-0.5 shrink-0',
                      item.done ? 'text-ink-green' : 'text-text-mute',
                    )}
                  />
                  <span>
                    <span className="text-text block text-sm font-semibold">
                      {item.label}
                      <span className="sr-only">{item.done ? ' (done)' : ' (to do)'}</span>
                    </span>
                    <span className="text-text-mute block text-xs">{item.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
