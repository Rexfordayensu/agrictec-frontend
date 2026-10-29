'use client';

import { Package } from 'lucide-react';
import { CATEGORY_ICONS } from '@/components/records/expense-breakdown';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { CropIcon, CROP_TONES } from '@/components/ui/crop-icon';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS, todayISO, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Crop } from '@/types';

const ranked = (totals: Record<string, number>) =>
  Object.entries(totals)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

/** Accounting-style amount: costs in brackets, e.g. (GHS 2,400). */
function Money({
  value,
  cost = false,
  className,
}: {
  value: number;
  cost?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('whitespace-nowrap tabular-nums', className)}>
      {cost ? `(${formatGHS(value)})` : formatGHS(value)}
    </span>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <p className="text-text-mute mt-5 mb-2 text-[11px] font-semibold tracking-wider uppercase first:mt-0">
      {children}
    </p>
  );
}

/** A real profit & loss statement: revenue by crop, costs by category, net profit. */
export function PnlSummaryCard({ className }: { className?: string }) {
  const { income, expenses, profit, margin, incomeByCrop, expenseByCategory } = useFarmStats();
  const revenue = ranked(incomeByCrop) as [Crop, number][];
  const costs = ranked(expenseByCategory);

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader>
        <div>
          <CardTitle>Profit &amp; Loss Statement</CardTitle>
          <CardSub>All recorded activity · as of {formatDate(todayISO())}</CardSub>
        </div>
        <Badge color={margin >= 0 ? 'green' : 'red'}>{margin}% margin</Badge>
      </CardHeader>

      <div className="text-sm">
        <SectionTitle>Revenue</SectionTitle>
        {revenue.length === 0 ? (
          <p className="text-text-mute py-1">No income recorded</p>
        ) : (
          <ul className="space-y-1.5">
            {revenue.map(([crop, total]) => (
              <li key={crop} className="flex items-center gap-2">
                <CropIcon crop={crop} size={14} className={CROP_TONES[crop].split(' ')[1]} />
                <span className="text-text-dim flex-1">{crop}</span>
                <Money value={total} className="text-text" />
              </li>
            ))}
          </ul>
        )}
        <div className="border-border mt-2 flex justify-between border-t pt-2 font-semibold">
          <span className="text-text">Total revenue</span>
          <Money value={income} className="text-ink-green" />
        </div>

        <SectionTitle>Operating costs</SectionTitle>
        {costs.length === 0 ? (
          <p className="text-text-mute py-1">No costs recorded</p>
        ) : (
          <ul className="space-y-1.5">
            {costs.map(([category, total]) => {
              const Icon = CATEGORY_ICONS[category] ?? Package;
              return (
                <li key={category} className="flex items-center gap-2">
                  <Icon size={14} aria-hidden="true" className="text-ink-red" />
                  <span className="text-text-dim flex-1">{category}</span>
                  <Money value={total} cost className="text-text" />
                </li>
              );
            })}
          </ul>
        )}
        <div className="border-border mt-2 flex justify-between border-t pt-2 font-semibold">
          <span className="text-text">Total costs</span>
          <Money value={expenses} cost className="text-ink-red" />
        </div>
      </div>

      {/* The bottom line */}
      <div
        className={cn(
          'mt-5 flex items-center justify-between gap-3 rounded-2xl border p-4',
          profit >= 0 ? 'border-accent/30 bg-accent/10' : 'border-danger/30 bg-danger/10',
        )}
      >
        <div>
          <p className="text-text-dim text-xs">Net profit</p>
          <p className="text-text-mute text-[11px]">Revenue minus operating costs</p>
        </div>
        <Money
          value={profit}
          className={cn('text-2xl font-extrabold', profit >= 0 ? 'text-ink-green' : 'text-ink-red')}
        />
      </div>
    </Card>
  );
}
