'use client';

import { ArrowDownRight, ArrowUpRight, ClipboardList, Scale, type LucideIcon } from 'lucide-react';
import { netProfit, totalExpenses, totalIncome } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FarmRecord } from '@/types';

function SummaryTile({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  valueClass,
}: {
  icon: LucideIcon;
  tone: string;
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
}) {
  return (
    <div className="border-border bg-glass flex items-center gap-3 rounded-2xl border p-3 sm:p-4">
      <span
        // Icons hide on phones so two tiles fit side by side.
        className={cn(
          'hidden size-11 shrink-0 items-center justify-center rounded-xl sm:inline-flex',
          tone,
        )}
      >
        <Icon size={20} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">{label}</p>
        <p
          className={cn(
            'text-text truncate text-lg font-extrabold tracking-tight sm:text-xl',
            valueClass,
          )}
        >
          {value}
        </p>
        <p className="text-text-mute truncate text-xs">{hint}</p>
      </div>
    </div>
  );
}

/** Totals for whatever the filters currently show. */
export function RecordsSummary({ rows, filtered }: { rows: FarmRecord[]; filtered: boolean }) {
  const income = totalIncome(rows);
  const expenses = totalExpenses(rows);
  const net = netProfit(rows);
  const scope = filtered ? 'In this view' : 'All records';
  const activities = rows.filter((r) => r.type === 'activity').length;

  return (
    <div className="grid grid-cols-2 gap-3 @4xl:grid-cols-4">
      <SummaryTile
        icon={ArrowUpRight}
        tone="bg-accent/15 text-ink-green"
        label="Income"
        value={formatGHS(income)}
        hint={scope}
      />
      <SummaryTile
        icon={ArrowDownRight}
        tone="bg-danger/15 text-ink-red"
        label="Expenses"
        value={formatGHS(expenses)}
        hint={income > 0 ? `${Math.round((expenses / income) * 100)}% of income` : scope}
      />
      <SummaryTile
        icon={Scale}
        tone="bg-purple/15 text-ink-purple"
        label="Net"
        value={formatGHS(net)}
        hint={net >= 0 ? 'Profit' : 'Loss'}
        valueClass={net < 0 ? 'text-ink-red' : undefined}
      />
      <SummaryTile
        icon={ClipboardList}
        tone="bg-info/15 text-ink-blue"
        label="Entries"
        value={String(rows.length)}
        hint={`${activities} activit${activities === 1 ? 'y' : 'ies'} logged`}
      />
    </div>
  );
}
