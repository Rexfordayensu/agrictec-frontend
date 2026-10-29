import { formatGHS } from '@/lib/format';
import type { FarmStats } from '@/hooks/use-farm-stats';

export interface HealthCheck {
  key: string;
  label: string;
  detail: string;
  pass: boolean;
  /** What to do when this check fails. */
  action: { label: string; href: string };
}

/** Five lender-style checks behind the financial health score. */
export function healthChecks(stats: FarmStats): HealthCheck[] {
  // The admin's loan rules (default: 5 records).
  const minRecords = stats.loanRules.minRecords;
  const costRatio = stats.income > 0 ? Math.round((stats.expenses / stats.income) * 100) : null;
  return [
    {
      key: 'profit',
      label: 'Profitable',
      detail:
        stats.profit > 0
          ? `You kept ${formatGHS(stats.profit)} after costs.`
          : stats.hasData
            ? `Costs are ${formatGHS(Math.abs(stats.profit))} above income.`
            : 'No income or costs recorded yet.',
      pass: stats.profit > 0,
      action: { label: 'Review your costs', href: '/records' },
    },
    {
      key: 'margin',
      label: 'Margin of 20% or more',
      detail: `Your margin is ${stats.margin}%. Lenders like at least 20%.`,
      pass: stats.margin >= 20,
      action: { label: 'Find costs to cut', href: '/records' },
    },
    {
      key: 'costs',
      label: 'Costs under 60% of income',
      detail:
        costRatio === null
          ? 'Record income to compare your costs.'
          : `Costs are ${costRatio}% of income.`,
      pass: costRatio !== null && costRatio <= 60,
      action: { label: 'See your expense breakdown', href: '/records' },
    },
    {
      key: 'history',
      label: `At least ${minRecords} farm records`,
      detail: `${stats.recordCount} recorded so far.`,
      pass: stats.recordCount >= minRecords,
      action: { label: 'Add farm records', href: '/records' },
    },
    {
      key: 'momo',
      label: 'Mobile money history',
      detail:
        stats.momo.count > 0
          ? `${stats.momo.count} MoMo transaction${stats.momo.count === 1 ? '' : 's'} logged.`
          : 'Log your MoMo payments to prove cash flow.',
      pass: stats.momo.count > 0,
      action: { label: 'Log a MoMo transaction', href: '/momo' },
    },
  ];
}
