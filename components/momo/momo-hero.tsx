'use client';

import {
  ArrowDownLeft,
  ArrowUpRight,
  Gauge,
  Minus,
  Signal,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { NETWORK_STYLES, networkTotals } from '@/components/momo/momo-filters';
import { NetworkLogo } from '@/components/momo/network-logo';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { RECORD_GRACE_DAYS, recordedOnTime } from '@/lib/calculations/credit-score';
import { percentChange } from '@/lib/calculations/finance';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';

/**
 * Month-over-month change. For money out, a fall is the good direction, so it shows green.
 * `current` tells "nothing yet" apart from "new this month" when last month was zero.
 */
function Change({
  value,
  current,
  goodWhenDown = false,
}: {
  value: number | null;
  current: number;
  goodWhenDown?: boolean;
}) {
  if (value === null) {
    return current > 0 ? (
      <span className="text-text-mute">New this month</span>
    ) : (
      <span className="text-text-mute inline-flex items-center gap-1">
        <Minus size={12} aria-hidden="true" />
        Nothing yet this month
      </span>
    );
  }
  const up = value >= 0;
  const good = value === 0 || up !== goodWhenDown;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold',
        good ? 'text-ink-green' : 'text-ink-red',
      )}
    >
      <Icon size={12} aria-hidden="true" />
      {up ? '+' : ''}
      {value}% vs last month
    </span>
  );
}

/** Small uppercase caption used by every summary card on this page. */
function Caption({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-text-mute flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase',
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * Wallet-style summary of ALL logged MoMo (the list below has its own period filter and
 * totals), this month against last, the network mix and what MoMo adds to the credit score.
 */
export function MomoHero() {
  const momoList = useFarmStore((s) => s.momo);
  const { momo, creditConfig } = useFarmStats();

  const inThisMonth = momo.monthly6.income[5] ?? 0;
  const outThisMonth = momo.monthly6.expense[5] ?? 0;
  const inChange = percentChange(inThisMonth, momo.monthly6.income[4] ?? 0);
  const outChange = percentChange(outThisMonth, momo.monthly6.expense[4] ?? 0);
  const networks = networkTotals(momoList);
  const networkSum = networks.reduce((sum, n) => sum + n.total, 0);

  // Exactly what the credit score counts: the admin's target, and only transactions logged
  // within RECORD_GRACE_DAYS of their date (lib/calculations/credit-score.ts).
  const target = Math.max(1, creditConfig.targets.momoForFull);
  const counted = momoList.filter(recordedOnTime).length;
  const late = momoList.length - counted;
  const creditProgress = Math.min(100, (counted / target) * 100);
  const remaining = Math.max(0, target - counted);

  return (
    <section aria-label="MoMo summary" className="@container">
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Wallet card: always dark green, so its white text reads in both themes */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-emerald-900 via-emerald-800 to-teal-700 p-5 text-white shadow-[0_24px_60px_-24px_rgba(6,95,70,0.8)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="bg-gold/15 pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full"
          />

          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Smartphone size={13} aria-hidden="true" /> MoMo Wallet
            </span>
            <span className="text-xs text-white/70">
              {momo.count} transaction{momo.count === 1 ? '' : 's'} logged
            </span>
          </div>

          <p className="relative mt-6 text-xs font-medium tracking-wider text-white/70 uppercase">
            Net MoMo flow · all time
          </p>
          <div className="relative mt-1 flex flex-wrap items-end justify-between gap-3">
            <p className="font-display text-4xl leading-none font-bold tabular-nums sm:text-5xl">
              {momo.net < 0 ? '−' : ''}
              {formatGHS(Math.abs(momo.net))}
            </p>
            <figure className="text-right">
              <Sparkline
                data={momo.netSeries6}
                ariaLabel="Net MoMo flow per month over the last 6 months"
                className="h-10 w-28 text-emerald-200"
              />
              <figcaption className="mt-1 text-[11px] text-white/70">
                Net per month · last 6 months
              </figcaption>
            </figure>
          </div>

          <dl className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-400 text-emerald-950">
                  <ArrowDownLeft size={13} aria-hidden="true" />
                </span>
                Received · all time
              </dt>
              <dd className="mt-1.5 text-lg font-bold tabular-nums">{formatGHS(momo.inflow)}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-red-300 text-red-950">
                  <ArrowUpRight size={13} aria-hidden="true" />
                </span>
                Sent · all time
              </dt>
              <dd className="mt-1.5 text-lg font-bold tabular-nums">{formatGHS(momo.outflow)}</dd>
            </div>
          </dl>
        </div>

        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-1">
          {/* This month */}
          <div className="border-border bg-glass rounded-3xl border p-5">
            <Caption>This month</Caption>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-text-dim text-xs">Money in</dt>
                <dd className="text-ink-green mt-0.5 text-xl font-bold tabular-nums">
                  {formatCompactGHS(inThisMonth)}
                </dd>
                <dd className="mt-1 text-[11px]">
                  <Change value={inChange} current={inThisMonth} />
                </dd>
              </div>
              <div>
                <dt className="text-text-dim text-xs">Money out</dt>
                <dd className="text-ink-red mt-0.5 text-xl font-bold tabular-nums">
                  {formatCompactGHS(outThisMonth)}
                </dd>
                <dd className="mt-1 text-[11px]">
                  <Change value={outChange} current={outThisMonth} goodWhenDown />
                </dd>
              </div>
            </dl>
          </div>

          {/* Network mix + credit progress */}
          <div className="border-border bg-glass space-y-5 rounded-3xl border p-5">
            <div>
              <Caption>
                <Signal size={12} aria-hidden="true" /> Network mix · by amount
              </Caption>
              <div
                className="bg-glass-strong mt-3 flex h-2.5 overflow-hidden rounded-full"
                role="img"
                aria-label={
                  networkSum > 0
                    ? `Share of money moved by network: ${networks
                        .map((n) => `${n.network} ${Math.round((n.total / networkSum) * 100)}%`)
                        .join(', ')}`
                    : 'No network data yet'
                }
              >
                {networkSum > 0 &&
                  networks.map((n) => (
                    <span
                      key={n.network}
                      className={NETWORK_STYLES[n.network].dot}
                      style={{ width: `${(n.total / networkSum) * 100}%` }}
                    />
                  ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {networks.map((n) => (
                  <li key={n.network} className="text-text-dim inline-flex items-center gap-1.5">
                    <NetworkLogo network={n.network} size={18} />
                    {n.network}
                    <span className="text-text-mute tabular-nums">
                      {networkSum > 0 ? `${Math.round((n.total / networkSum) * 100)}%` : '0%'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="flex items-center justify-between gap-2 text-xs">
                <Caption>
                  <Gauge size={12} aria-hidden="true" /> AgriCtec score boost
                </Caption>
                <span className="text-text font-semibold tabular-nums">
                  {Math.min(counted, target)}/{target}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="MoMo activity counted toward your AgriCtec score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(creditProgress)}
                className="bg-glass-strong mt-2 h-2 overflow-hidden rounded-full"
              >
                <div
                  className="animate-progress-grow from-accent to-accent-2 h-full rounded-full bg-linear-to-r"
                  style={{ width: `${creditProgress}%` }}
                />
              </div>
              <p className="text-text-mute mt-2 text-[11px] leading-snug">
                {remaining === 0
                  ? 'Your MoMo activity is maxing out its part of your AgriCtec score.'
                  : `Log ${remaining} more transaction${remaining === 1 ? '' : 's'} to max out MoMo activity in your AgriCtec score.`}{' '}
                {late > 0 &&
                  `${late} logged more than ${RECORD_GRACE_DAYS} days after the payment ${late === 1 ? "doesn't" : "don't"} count.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
