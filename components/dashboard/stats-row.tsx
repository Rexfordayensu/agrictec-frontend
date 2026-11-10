import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react';
import type { DashboardSummary } from '@/lib/dashboard-summary';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

/** A single reporting period for income, expenses and the net result. MoMo stays separate. */
export function StatsRow({ summary }: { summary: DashboardSummary }) {
  const figures = [
    {
      label: 'Net result',
      value: summary.profit,
      description: 'Farm income minus expenses',
      icon: Wallet,
      tone: 'result',
    },
    {
      label: 'Farm income',
      value: summary.income,
      description: 'Sales and other farm income',
      icon: ArrowUpRight,
      tone: 'income',
    },
    {
      label: 'Farm expenses',
      value: summary.expenses,
      description: 'Costs recorded for your farm',
      icon: ArrowDownLeft,
      tone: 'expenses',
    },
  ];
  return (
    <dl className="farmer-dashboard-figures">
      {figures.map(({ label, value, description, icon: Icon, tone }) => (
        <div key={label} className={cn('farmer-dashboard-figure', `figure-${tone}`)}>
          <dt>
            <span className="farmer-dashboard-figure-icon">
              <Icon size={18} aria-hidden="true" />
            </span>
            {label}
          </dt>
          <dd className={cn('farmer-dashboard-value', value < 0 && 'text-ink-red')}>
            {formatGHS(value)}
          </dd>
          <dd className="farmer-dashboard-figure-caption">{description}</dd>
        </div>
      ))}
    </dl>
  );
}
