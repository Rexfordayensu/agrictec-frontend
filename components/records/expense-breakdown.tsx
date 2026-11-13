'use client';

import { Ellipsis, Layers, Package, Sprout, Tractor, Users, type LucideIcon } from 'lucide-react';
import { ChartCard } from '@/components/records/chart-card';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { formatGHS } from '@/lib/format';

/** The four main farm costs, then everything else (transport, irrigation, land rent…) as Others. */
const MAIN: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'fertilizer', label: 'Fertilizer', icon: Package },
  { key: 'seed', label: 'Seeds', icon: Sprout },
  { key: 'labour', label: 'Labour', icon: Users },
  { key: 'equipment', label: 'Equipment', icon: Tractor },
];

export function expenseRows(byCategory: Record<string, number>) {
  const main = MAIN.map((m) => ({ ...m, total: byCategory[m.key] ?? 0 }));
  const others = Object.entries(byCategory)
    .filter(([key]) => !MAIN.some((m) => m.key === key))
    .reduce((sum, [, total]) => sum + total, 0);
  return [...main, { key: 'others', label: 'Others', icon: Ellipsis, total: others }];
}

/** Where the money goes: each main cost with its share of all expenses. */
export function ExpenseBreakdown({ className }: { className?: string }) {
  const { expenseByCategory, expenses } = useFarmStats();
  const rows = expenseRows(expenseByCategory);

  return (
    <ChartCard
      id="expense-breakdown-title"
      icon={Layers}
      title="Expense Breakdown"
      sub="Where your money goes"
      className={className}
    >
      <ul className="divide-border mt-4 divide-y" aria-label="Expenses by category">
        {rows.map(({ key, label, icon: Icon, total }) => (
          <li key={key} className="flex items-center gap-3 py-2">
            <span className="bg-gold/15 text-ink-gold inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="text-text min-w-0 flex-1 truncate text-sm font-semibold">{label}</span>
            <span className="text-text-dim w-11 text-right text-sm tabular-nums">
              {expenses > 0 ? Math.round((total / expenses) * 100) : 0}%
            </span>
            <span className="text-text w-24 text-right text-sm font-semibold tabular-nums">
              {formatGHS(total)}
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
