'use client';

import { ArrowDownRight, ArrowUpRight, Percent, Scale, type LucideIcon } from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { marginSeries, netSeries } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

function Kpi({
  icon: Icon,
  tone,
  ink,
  label,
  value,
  series,
  seriesLabel,
}: {
  icon: LucideIcon;
  tone: string;
  ink: string;
  label: string;
  value: string;
  series: number[];
  seriesLabel: string;
}) {
  return (
    <div className="border-border bg-glass flex min-w-0 flex-col rounded-2xl border p-3 transition-transform duration-200 hover:-translate-y-0.5 sm:p-4">
      <div className="flex items-center gap-2.5">
        <span
          className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-xl', tone)}
        >
          <Icon size={17} aria-hidden="true" />
        </span>
        <p className="text-text-mute min-w-0 truncate text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'mt-3 truncate text-lg leading-tight font-extrabold tracking-tight sm:text-2xl',
          ink,
        )}
      >
        {value}
      </p>
      <Sparkline data={series} ariaLabel={seriesLabel} className={cn('mt-3', tone.split(' ')[1])} />
      <p className="text-text-mute mt-1 text-[11px]">Last 12 months</p>
    </div>
  );
}

/** Headline figures with 12-month trend lines. */
export function ReportsKpis() {
  const { income, expenses, profit, margin, monthly12 } = useFarmStats();
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 @4xl:grid-cols-4">
      <Kpi
        icon={ArrowUpRight}
        tone="bg-accent/15 text-ink-green"
        ink="text-text"
        label="Gross income"
        value={formatGHS(income)}
        series={monthly12.income}
        seriesLabel="Income over the last 12 months"
      />
      <Kpi
        icon={ArrowDownRight}
        tone="bg-danger/15 text-ink-red"
        ink="text-text"
        label="Expenses"
        value={formatGHS(expenses)}
        series={monthly12.expense}
        seriesLabel="Expenses over the last 12 months"
      />
      <Kpi
        icon={Scale}
        tone="bg-purple/15 text-ink-purple"
        ink={profit < 0 ? 'text-ink-red' : 'text-text'}
        label="Net profit"
        value={formatGHS(profit)}
        series={netSeries(monthly12)}
        seriesLabel="Net profit over the last 12 months"
      />
      <Kpi
        icon={Percent}
        tone="bg-gold/15 text-ink-gold"
        ink="text-text"
        label="Profit margin"
        value={`${margin}%`}
        series={marginSeries(monthly12)}
        seriesLabel="Profit margin over the last 12 months"
      />
    </div>
  );
}
