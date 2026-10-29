'use client';

import type { ReactNode } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  Sprout,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { Card } from '@/components/ui/card';
import { CropLabel } from '@/components/ui/crop-icon';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

/** "▲ 12.5%" pill. `upIsGood` is false for expenses, where a rise is bad news. */
function TrendPill({ change, upIsGood = true }: { change: number | null; upIsGood?: boolean }) {
  if (change === null) {
    return (
      <span className="bg-info/15 text-ink-blue rounded-full px-2 py-0.5 text-[11px] font-semibold">
        New
      </span>
    );
  }
  const up = change >= 0;
  const good = change === 0 || up === upIsGood;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        good ? 'bg-accent/15 text-ink-green' : 'bg-danger/15 text-ink-red',
      )}
      title="This month vs last month"
    >
      <Arrow size={12} aria-hidden="true" />
      {Math.abs(change)}%<span className="sr-only"> {up ? 'up' : 'down'} vs last month</span>
    </span>
  );
}

function KpiTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  trend,
  children,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: ReactNode;
  hint: string;
  trend?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card
      padding="none"
      className="flex flex-col p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'inline-flex size-9 shrink-0 items-center justify-center rounded-xl',
              tone,
            )}
          >
            <Icon size={18} aria-hidden="true" />
          </span>
          <p className="text-text-mute truncate text-[11px] font-semibold tracking-wider uppercase">
            {label}
          </p>
        </div>
        {trend}
      </div>
      <p className="text-text mt-3 text-2xl leading-tight font-extrabold tracking-tight break-words">
        {value}
      </p>
      <p className="text-text-mute mt-0.5 text-xs">{hint}</p>
      {children && <div className="mt-auto pt-3">{children}</div>}
    </Card>
  );
}

/** Four KPI tiles: 1 column on phones, 2 on tablets, 4 when the dashboard is wide. */
export function StatsRow() {
  const stats = useFarmStats();
  const expenseShare = stats.income > 0 ? Math.round((stats.expenses / stats.income) * 100) : null;
  const crops = stats.activeCropList;

  return (
    <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
      <KpiTile
        icon={Wallet}
        tone="bg-accent/15 text-ink-green"
        label="Income (YTD)"
        value={formatGHS(stats.ytdIncome)}
        hint={stats.ytdIncome > 0 ? 'This year' : 'Start recording'}
        trend={stats.hasData && <TrendPill change={stats.trends.income} />}
      >
        <Sparkline
          data={stats.monthly6.income}
          ariaLabel="Income over the last 6 months"
          className="text-ink-green"
        />
      </KpiTile>

      <KpiTile
        icon={TrendingDown}
        tone="bg-danger/15 text-ink-red"
        label="Expenses"
        value={formatGHS(stats.expenses)}
        hint={expenseShare === null ? 'No income yet' : `${expenseShare}% of income`}
        trend={stats.hasData && <TrendPill change={stats.trends.expenses} upIsGood={false} />}
      >
        <Sparkline
          data={stats.monthly6.expense}
          ariaLabel="Expenses over the last 6 months"
          className="text-ink-red"
        />
      </KpiTile>

      <KpiTile
        icon={Scale}
        tone="bg-purple/15 text-ink-purple"
        label="MoMo Net"
        value={
          <span className={stats.momo.net < 0 ? 'text-ink-red' : undefined}>
            {formatGHS(stats.momo.net)}
          </span>
        }
        hint={`${stats.momo.count} transaction${stats.momo.count === 1 ? '' : 's'}`}
        trend={stats.momo.count > 0 && <TrendPill change={stats.trends.momoNet} />}
      >
        <Sparkline
          data={stats.momo.netSeries6}
          ariaLabel="MoMo net balance over the last 6 months"
          className="text-ink-purple"
        />
      </KpiTile>

      <KpiTile
        icon={Sprout}
        tone="bg-gold/15 text-ink-gold"
        label="Active Crops"
        value={stats.activeCrops}
        hint={stats.acres > 0 ? `Across ${stats.acres} acres` : 'Add your acreage in Profile'}
      >
        {crops.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5" aria-label="Active crops">
            {crops.slice(0, 4).map((crop) => (
              <li
                key={crop}
                className="border-border bg-glass text-text-dim rounded-full border px-2.5 py-1 text-xs"
              >
                <CropLabel crop={crop} />
              </li>
            ))}
            {crops.length > 4 && (
              <li className="text-text-mute rounded-full px-2 py-1 text-xs">
                +{crops.length - 4} more
              </li>
            )}
          </ul>
        ) : (
          <p className="text-text-mute text-xs">No crops recorded yet</p>
        )}
      </KpiTile>
    </div>
  );
}
