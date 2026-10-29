import { format, getYear, isBefore, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { totalExpenses, totalIncome } from '@/lib/calculations/finance';
import { parseISODate } from '@/lib/format';
import type { Crop, FarmRecord, RecordType } from '@/types';

export type RecordTab = 'all' | RecordType;
export type CropFilter = 'all' | Crop;
export type PeriodFilter = 'all' | 'month' | '3m' | 'year';
export type RecordSort = 'newest' | 'oldest' | 'highest' | 'lowest';

export interface RecordFilters {
  tab: RecordTab;
  crop: CropFilter;
  period: PeriodFilter;
  query: string;
  sort: RecordSort;
}

export const DEFAULT_FILTERS: RecordFilters = {
  tab: 'all',
  crop: 'all',
  period: 'all',
  query: '',
  sort: 'newest',
};

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'All time',
  month: 'This month',
  '3m': 'Last 3 months',
  year: 'This year',
};

export const SORT_LABELS: Record<RecordSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  highest: 'Highest amount',
  lowest: 'Lowest amount',
};

function inPeriod(record: FarmRecord, period: PeriodFilter, now: Date): boolean {
  if (period === 'all') return true;
  const date = parseISODate(record.date);
  if (period === 'month') return isSameMonth(date, now);
  if (period === 'year') return getYear(date) === getYear(now);
  return !isBefore(date, startOfMonth(subMonths(now, 2))); // this month + the 2 before
}

function matchesQuery(record: FarmRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [record.description, record.notes ?? '', record.crop].some((field) =>
    field.toLowerCase().includes(q),
  );
}

/** Applies every filter except the type tab (so each tab can show its own count). */
export function filterRecords(
  records: FarmRecord[],
  { crop, period, query }: Pick<RecordFilters, 'crop' | 'period' | 'query'>,
  now = new Date(),
): FarmRecord[] {
  return records.filter(
    (r) =>
      (crop === 'all' || r.crop === crop) && inPeriod(r, period, now) && matchesQuery(r, query),
  );
}

/** +amount for income, −amount for expenses, null for activities (they have no money value). */
export function signedAmount(record: FarmRecord): number | null {
  if (record.type === 'activity') return null;
  return record.type === 'income' ? record.amount : -record.amount;
}

export function sortRecords(records: FarmRecord[], sort: RecordSort): FarmRecord[] {
  const byDate = (a: FarmRecord, b: FarmRecord) =>
    a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
  const sorted = [...records];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => byDate(b, a));
    case 'oldest':
      return sorted.sort(byDate);
    case 'highest':
    case 'lowest': {
      const dir = sort === 'highest' ? -1 : 1;
      // Activities (no amount) always go last.
      return sorted.sort((a, b) => {
        const x = signedAmount(a);
        const y = signedAmount(b);
        if (x === null) return y === null ? byDate(b, a) : 1;
        if (y === null) return -1;
        return (x - y) * dir;
      });
    }
  }
}

export interface MonthGroup {
  key: string; // yyyy-MM
  label: string; // "October 2026"
  records: FarmRecord[];
  income: number;
  expenses: number;
}

/** Groups already-sorted records by calendar month, keeping their order. */
export function groupByMonth(records: FarmRecord[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const record of records) {
    const date = parseISODate(record.date);
    const key = format(date, 'yyyy-MM');
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      group = { key, label: format(date, 'MMMM yyyy'), records: [], income: 0, expenses: 0 };
      groups.push(group);
    }
    group.records.push(record);
  }
  for (const group of groups) {
    group.income = totalIncome(group.records);
    group.expenses = totalExpenses(group.records);
  }
  return groups;
}

/** How many filters differ from the defaults (shown as a badge, and enables "Clear filters"). */
export function activeFilterCount(filters: RecordFilters): number {
  return (
    Number(filters.tab !== 'all') +
    Number(filters.crop !== 'all') +
    Number(filters.period !== 'all') +
    Number(filters.query.trim() !== '')
  );
}
