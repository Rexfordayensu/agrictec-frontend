import { format, getYear, isBefore, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { parseISODate } from '@/lib/format';
import type { MomoNetwork, MomoTransaction } from '@/types';

export type DirectionFilter = 'all' | 'in' | 'out';
export type NetworkFilter = 'all' | MomoNetwork;
export type MomoPeriod = 'all' | 'month' | '3m' | 'year';

export interface MomoFilters {
  direction: DirectionFilter;
  network: NetworkFilter;
  period: MomoPeriod;
  query: string;
}

export const DEFAULT_MOMO_FILTERS: MomoFilters = {
  direction: 'all',
  network: 'all',
  period: 'all',
  query: '',
};

export const MOMO_PERIOD_LABELS: Record<MomoPeriod, string> = {
  all: 'All time',
  month: 'This month',
  '3m': 'Last 3 months',
  year: 'This year',
};

/** Dot / bar colour and tinted chip per network (MTN yellow, Telecel red, AirtelTigo blue). */
export const NETWORK_STYLES: Record<MomoNetwork, { dot: string; chip: string }> = {
  MTN: { dot: 'bg-[#f5c451]', chip: 'border-gold/40 bg-gold/10 text-ink-gold' },
  Telecel: { dot: 'bg-[#ef4444]', chip: 'border-danger/40 bg-danger/10 text-ink-red' },
  AirtelTigo: { dot: 'bg-[#3b82f6]', chip: 'border-info/40 bg-info/10 text-ink-blue' },
};

export const activeMomoFilterCount = (f: MomoFilters) =>
  [f.direction !== 'all', f.network !== 'all', f.period !== 'all', f.query.trim() !== ''].filter(
    Boolean,
  ).length;

function inPeriod(t: MomoTransaction, period: MomoPeriod, now: Date): boolean {
  if (period === 'all') return true;
  const date = parseISODate(t.date);
  if (period === 'month') return isSameMonth(date, now);
  if (period === 'year') return getYear(date) === getYear(now);
  return !isBefore(date, startOfMonth(subMonths(now, 2))); // this month + the 2 before
}

function matchesQuery(t: MomoTransaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [t.counterparty, t.reference, t.network ?? ''].some((field) =>
    field.toLowerCase().includes(q),
  );
}

/** Applies every filter except direction, so each direction tab can show its own count. */
export function filterMomo(
  momo: MomoTransaction[],
  { network, period, query }: Pick<MomoFilters, 'network' | 'period' | 'query'>,
  now = new Date(),
): MomoTransaction[] {
  return momo.filter(
    (t) =>
      (network === 'all' || t.network === network) &&
      inPeriod(t, period, now) &&
      matchesQuery(t, query),
  );
}

export interface MomoMonthGroup {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  items: MomoTransaction[];
}

/** Newest month first; transactions inside a month newest first. */
export function groupMomoByMonth(rows: MomoTransaction[]): MomoMonthGroup[] {
  const sorted = [...rows].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  const groups = new Map<string, MomoMonthGroup>();
  for (const t of sorted) {
    const date = parseISODate(t.date);
    const key = format(date, 'yyyy-MM');
    const group = groups.get(key) ?? {
      key,
      label: format(date, 'MMMM yyyy'),
      inflow: 0,
      outflow: 0,
      items: [],
    };
    if (t.direction === 'in') group.inflow += t.amount;
    else group.outflow += t.amount;
    group.items.push(t);
    groups.set(key, group);
  }
  return [...groups.values()];
}

export interface Counterparty {
  name: string;
  received: number;
  sent: number;
  count: number;
}

/** People and businesses with the most money moved, largest first. */
export function topCounterparties(momo: MomoTransaction[], limit = 5): Counterparty[] {
  const map = new Map<string, Counterparty>();
  for (const t of momo) {
    const key = t.counterparty.trim().toLowerCase();
    const entry = map.get(key) ?? { name: t.counterparty.trim(), received: 0, sent: 0, count: 0 };
    if (t.direction === 'in') entry.received += t.amount;
    else entry.sent += t.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  return [...map.values()]
    .sort((a, b) => b.received + b.sent - (a.received + a.sent))
    .slice(0, limit);
}

/** Amount moved per network, for the network mix bar. Untagged transactions are left out. */
export function networkTotals(
  momo: MomoTransaction[],
): { network: MomoNetwork; total: number; count: number }[] {
  const networks: MomoNetwork[] = ['MTN', 'Telecel', 'AirtelTigo'];
  return networks.map((network) => {
    const items = momo.filter((t) => t.network === network);
    return { network, total: items.reduce((sum, t) => sum + t.amount, 0), count: items.length };
  });
}
