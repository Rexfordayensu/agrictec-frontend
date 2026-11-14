// The guest demo's figures, worked out in the browser from the entries the guest added
// (lib/demo-entries.ts). Never sample data: an empty demo shows zeros. The same rules as the
// server's: farm income and expenses only (MoMo is tracked separately), the score from
// lib/calculations/credit-score.ts (app/domain/credit.py's twin), where a demo entry counts as
// unchecked because nobody reviews it.

import { endOfDay, format, startOfMonth, subMonths } from 'date-fns';
import { calculateCreditScore, scoreLabel } from '@/lib/calculations/credit-score';
import type { DashboardRange, DashboardSummary } from '@/lib/dashboard-summary';
import { parseISODate } from '@/lib/format';
import type { FarmRecord, MomoTransaction, Profile } from '@/types';
import type { CreditConfig } from '@/types/admin';

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

/** The dashboard's figures for the last `months` months (this one included). */
export function demoDashboardSummary(
  records: FarmRecord[],
  momo: MomoTransaction[],
  months: DashboardRange,
  now = new Date(),
): DashboardSummary {
  const from = startOfMonth(subMonths(now, months - 1));
  const to = endOfDay(now);
  const inPeriod = <T extends { date: string }>(items: T[]) =>
    items.filter((item) => {
      const day = parseISODate(item.date);
      return day >= from && day <= to;
    });
  const farm = inPeriod(records);
  const moneyIn = inPeriod(momo);
  const amountOf = (type: FarmRecord['type']) => (r: FarmRecord) =>
    r.type === type ? r.amount : 0;
  const income = sum(farm.map(amountOf('income')));
  const expenses = sum(farm.map(amountOf('expense')));
  const profit = income - expenses;
  const buckets = Array.from({ length: months }, (_, i) =>
    subMonths(startOfMonth(now), months - 1 - i),
  );
  const sameMonth = (iso: string, month: Date) =>
    format(parseISODate(iso), 'yyyy-MM') === format(month, 'yyyy-MM');
  const monthsWithRecords = buckets.filter((month) =>
    [...farm, ...moneyIn].some((entry) => sameMonth(entry.date, month)),
  ).length;
  const stamps = [...records, ...momo].map((entry) => entry.createdAt).sort();
  return {
    income,
    expenses,
    profit,
    margin: income > 0 ? Math.round((profit / income) * 1000) / 10 : null,
    // Nobody reviews a demo entry: none of it is verified.
    verifiedShare: { income: 0, expenses: 0, entries: 0 },
    recordCount: farm.length,
    financialRecordCount: farm.filter((r) => r.type !== 'activity').length,
    momoCount: moneyIn.length,
    momoNet: sum(moneyIn.map((t) => (t.direction === 'in' ? t.amount : -t.amount))),
    periodLabel: `${format(from, 'MMM yyyy')} – ${format(now, 'MMM yyyy')}`,
    start: format(from, 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd'),
    dataAsOf: stamps.at(-1) ?? null,
    insufficient: monthsWithRecords < months,
    monthsWithRecords,
    months,
    series: {
      labels: buckets.map((month) => format(month, 'MMM')),
      income: buckets.map((month) =>
        sum(farm.filter((r) => sameMonth(r.date, month)).map(amountOf('income'))),
      ),
      expense: buckets.map((month) =>
        sum(farm.filter((r) => sameMonth(r.date, month)).map(amountOf('expense'))),
      ),
    },
  };
}

/** The AgriCtec score of the demo's entries, under the live credit rules. */
export function demoScore(
  records: FarmRecord[],
  momo: MomoTransaction[],
  profile: Profile | null,
  config: CreditConfig,
): { score: number; band: string } {
  const { score } = calculateCreditScore(records, momo, profile, config);
  return { score, band: scoreLabel(score, config.bands) };
}
