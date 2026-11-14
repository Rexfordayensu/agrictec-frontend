'use client';

import Link from 'next/link';
import { BarChart3, Info, Coins, Wallet, ArrowDownRight } from 'lucide-react';
import { dashPanel, IconTile, type Tone } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardSummary } from '@/lib/dashboard-summary';

import { SCORE_EXPLANATION } from '@/lib/loans/score-policy';
import { cn } from '@/lib/utils';
import { useCreditStore } from '@/store/credit-store';
import type { LucideIcon } from 'lucide-react';

const MAX = 850;
const BAND_TONE: Record<string, string> = {
  Building: 'bg-accent',
  Fair: 'bg-accent',
  Good: 'bg-accent/70',
  Excellent: 'bg-accent',
};

/**
 * The four headline figures: the AgriCtec score (GET /me/credit) and the period's income,
 * expenses and net cash flow (GET /me/financial-summary). All are the server's figures.
 */
export function OverviewStats({
  summary,
  score,
}: {
  summary: DashboardSummary | null;
  /** The guest demo's score, worked out in the browser from its entries (lib/demo-summary.ts). */
  score?: { score: number; band: string };
}) {
  const credit = useCreditStore((s) => s.summary);
  const shown = score ?? (credit ? { score: credit.credit.score, band: credit.band } : null);
  const period = summary ? `Last ${summary.months} months` : '';
  return (
    <dl className="dash-stats">
      <div className={cn(dashPanel, 'col-span-2 sm:col-span-1')} data-tour="score">
        <dt className="flex items-center gap-3">
          <IconTile icon={BarChart3} />
          <span className="text-text flex items-center gap-1 text-sm font-semibold">
            AgriCtec Financial Score
            <span title={SCORE_EXPLANATION} className="text-text-mute">
              <Info size={14} aria-hidden="true" />
              <span className="sr-only">{SCORE_EXPLANATION}</span>
            </span>
          </span>
        </dt>
        <dd className="mt-3">
          {shown ? (
            <Link href="/loans" className="block">
              <span className="flex items-center justify-between gap-2">
                <span className="text-text text-2xl leading-none font-bold tabular-nums">
                  {shown.score}
                  <span className="text-text-mute text-sm font-medium"> / {MAX}</span>
                </span>
                <span className="bg-accent/12 text-ink-green rounded-lg px-2 py-0.5 text-xs font-semibold">
                  {shown.band}
                </span>
              </span>
              <span className="bg-border mt-3 block h-1.5 overflow-hidden rounded-full">
                <span
                  className={cn('block h-full rounded-full', BAND_TONE[shown.band] ?? 'bg-accent')}
                  style={{
                    width: `${(Math.min(MAX, Math.max(0, shown.score)) / MAX) * 100}%`,
                  }}
                />
              </span>
            </Link>
          ) : (
            <Skeleton className="h-10 w-full rounded-xl" />
          )}
        </dd>
      </div>
      <Money
        icon={Wallet}
        tone="green"
        label="Total Income"
        period={period}
        value={summary?.income}
        valueClass="text-ink-green"
      />
      <Money
        icon={ArrowDownRight}
        tone="red"
        label="Total Expenses"
        period={period}
        value={summary?.expenses}
        valueClass="text-ink-red"
      />
      <Money
        icon={Coins}
        tone="green"
        label="Net Cash Flow"
        wide
        period={period}
        value={summary?.profit}
        valueClass={summary && summary.profit < 0 ? 'text-ink-red' : 'text-text'}
      />
    </dl>
  );
}

function Money({
  icon,
  tone,
  label,
  period,
  value,
  valueClass,
  wide = false,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  period: string;
  value: number | undefined;
  valueClass: string;
  /** Full width on phones (the third of three cards would sit alone). */
  wide?: boolean;
}) {
  return (
    <div className={cn(dashPanel, wide && 'col-span-2 sm:col-span-1')}>
      <dt className="flex items-start gap-3">
        <IconTile icon={icon} tone={tone} />
        <span className="min-w-0">
          <span className="text-text block text-sm font-semibold">{label}</span>
          {period && <span className="text-text-mute block text-xs">({period})</span>}
        </span>
      </dt>
      <dd className="mt-3">
        {value === undefined ? (
          <Skeleton className="h-8 w-28 rounded-lg" />
        ) : (
          <span
            className={cn(
              'block text-2xl leading-none font-bold tabular-nums sm:text-2xl',
              valueClass,
            )}
          >
            {`${value < 0 ? '-' : ''}GHS ${Math.abs(value).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </span>
        )}
      </dd>
    </div>
  );
}
