import { format, parseISO } from 'date-fns';

const wholeNumber = new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 });
const compactNumber = new Intl.NumberFormat('en-GH', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** formatGHS(1234.5) → "GHS 1,235", formatGHS(-500) → "-GHS 500" */
export function formatGHS(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}GHS ${wholeNumber.format(Math.abs(amount))}`;
}

/** formatCompactGHS(150000) → "GHS 150K" */
export function formatCompactGHS(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return `${sign}GHS ${compactNumber.format(Math.abs(amount))}`;
}

/** Parses "yyyy-MM-dd" as a local date (new Date() would treat it as UTC midnight). */
export function parseISODate(value: string): Date {
  return parseISO(value);
}

/** formatDate('2026-10-18') → "18 Oct 2026" */
export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? parseISODate(value) : value;
  return format(date, 'd MMM yyyy');
}

/** formatGPS(5.6037, -0.187) → "5.6037° N, 0.1870° W" */
export function formatGPS(lat: number, lng: number): string {
  const latDir = lat < 0 ? 'S' : 'N';
  const lngDir = lng < 0 ? 'W' : 'E';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
}

/** Today's local date as "yyyy-MM-dd". */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** formatCountdown(299000) → "4:59" (minutes:seconds, never negative). */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
