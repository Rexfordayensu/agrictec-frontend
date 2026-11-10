import type { FarmRecord, MomoTransaction } from '@/types';

export type DashboardRange = 6 | 12;

/** Ghana's reporting day is UTC. All dashboard financial figures use this same window. */
export function dashboardSummary(
  records: FarmRecord[],
  momo: MomoTransaction[],
  months: DashboardRange,
  now = new Date(),
) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const buckets = Array.from(
    { length: months },
    (_, index) => new Date(Date.UTC(year, month - months + index + 1, 1)),
  );
  const start = buckets[0].toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  const within = (date: string) => date.slice(0, 10) >= start && date.slice(0, 10) <= end;
  const periodRecords = records.filter((record) => within(record.date));
  const periodMomo = momo.filter((transaction) => within(transaction.date));
  const sum = (type: FarmRecord['type']) =>
    periodRecords.reduce((total, record) => total + (record.type === type ? record.amount : 0), 0);
  const income = sum('income');
  const expenses = sum('expense');
  const profit = income - expenses;
  const monthKey = (date: Date) => date.toISOString().slice(0, 7);
  const monthLabel = (date: Date) =>
    date.toLocaleDateString('en-GH', { month: 'short', timeZone: 'UTC' });
  const monthly = (type: FarmRecord['type']) =>
    buckets.map((bucket) =>
      periodRecords.reduce(
        (total, record) =>
          total +
          (record.type === type && record.date.slice(0, 7) === monthKey(bucket)
            ? record.amount
            : 0),
        0,
      ),
    );
  const first = buckets[0].toLocaleDateString('en-GH', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const last = now.toLocaleDateString('en-GH', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return {
    income,
    expenses,
    profit,
    margin: income > 0 ? Math.round((profit / income) * 1000) / 10 : null,
    recordCount: periodRecords.length,
    financialRecordCount: periodRecords.filter((record) => record.type !== 'activity').length,
    momoCount: periodMomo.length,
    momoNet: periodMomo.reduce(
      (total, transaction) =>
        total + (transaction.direction === 'in' ? transaction.amount : -transaction.amount),
      0,
    ),
    periodLabel: `${first} – ${last}`,
    start,
    end,
    series: {
      labels: buckets.map(monthLabel),
      income: monthly('income'),
      expense: monthly('expense'),
    },
  };
}

export type DashboardSummary = ReturnType<typeof dashboardSummary>;
