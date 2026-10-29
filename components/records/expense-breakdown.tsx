'use client';

import {
  Bug,
  FlaskConical,
  Package,
  Sprout,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Fertilizer: FlaskConical,
  'Pest control': Bug,
  Seeds: Sprout,
  Labour: Users,
  Transport: Truck,
  Equipment: Wrench,
};

/** Where the money goes: expenses per category, largest first, with share bars. */
export function ExpenseBreakdown({ className }: { className?: string }) {
  const { expenseByCategory, expenses } = useFarmStats();
  const entries = Object.entries(expenseByCategory)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Card className={className}>
      <CardHeader>
        <div>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardSub>Where your money goes</CardSub>
        </div>
        {expenses > 0 && (
          <span className="text-ink-red text-sm font-bold tabular-nums">{formatGHS(expenses)}</span>
        )}
      </CardHeader>

      {entries.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No expenses yet"
          description="Record costs like fertilizer, seeds and labour to see them here."
        />
      ) : (
        <ul className="space-y-4">
          {entries.map(([category, total]) => {
            const Icon = CATEGORY_ICONS[category] ?? Package;
            const share = Math.round((total / expenses) * 100);
            return (
              <li key={category}>
                <div className="flex items-center gap-3">
                  <span className="bg-danger/10 text-ink-red inline-flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span className="text-text min-w-0 flex-1 truncate text-sm font-medium">
                    {category}
                  </span>
                  <span className="text-text text-sm font-semibold tabular-nums">
                    {formatGHS(total)}
                  </span>
                  <span className="text-text-mute w-10 text-right text-xs">{share}%</span>
                </div>
                <div
                  className="bg-glass-strong mt-2 ml-11 h-1.5 overflow-hidden rounded-full"
                  role="img"
                  aria-label={`${category}: ${share}% of expenses`}
                >
                  <div
                    className="animate-progress-grow h-full rounded-full bg-linear-to-r from-[#f87171] to-[#ef4444]"
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
