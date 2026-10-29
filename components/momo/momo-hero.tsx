'use client';

import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Gauge,
  Signal,
  Smartphone,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { NETWORK_STYLES, networkTotals } from '@/components/momo/momo-filters';
import { NetworkLogo } from '@/components/momo/network-logo';
import { useFarmStats } from '@/hooks/use-farm-stats';
import { percentChange } from '@/lib/calculations/finance';
import { formatCompactGHS, formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';

/** 20 logged transactions max out the MoMo activity factor of the credit score. */
const CREDIT_TARGET = 20;

/** Month-over-month change. For money out, a fall is the good direction, so it shows green. */
function Change({ value, goodWhenDown = false }: { value: number | null; goodWhenDown?: boolean }) {
  if (value === null) return <span className="text-text-mute">New this month</span>;
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

/** Wallet-style summary: net flow, money in and out, network mix and credit progress. */
export function MomoHero() {
  const momoList = useFarmStore((s) => s.momo);
  const openMomo = useModalStore((s) => s.openMomoWithDefaults);
  const readOnly = useReadOnly();
  const { momo } = useFarmStats();

  const inThisMonth = momo.monthly6.income[5] ?? 0;
  const outThisMonth = momo.monthly6.expense[5] ?? 0;
  const inChange = percentChange(inThisMonth, momo.monthly6.income[4] ?? 0);
  const outChange = percentChange(outThisMonth, momo.monthly6.expense[4] ?? 0);
  const networks = networkTotals(momoList);
  const networkSum = networks.reduce((sum, n) => sum + n.total, 0);
  const creditProgress = Math.min(100, (momo.count / CREDIT_TARGET) * 100);

  return (
    <section aria-label="MoMo summary" className="@container">
      <div className="grid grid-cols-1 gap-4 @4xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* Wallet card: always dark green, so its white text reads in both themes */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-[#064e3b] via-[#065f46] to-[#0f766e] p-5 text-white shadow-[0_24px_60px_-24px_rgba(6,95,70,0.8)] sm:p-7">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-16 size-64 rounded-full bg-white/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-10 size-56 rounded-full bg-[#f5c451]/15"
          />

          <div className="relative flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
              <Smartphone size={13} aria-hidden="true" /> MoMo Wallet
            </span>
            <span className="text-xs text-white/70">
              {momo.count} transaction{momo.count === 1 ? '' : 's'}
            </span>
          </div>

          <p className="relative mt-6 text-xs font-medium tracking-wider text-white/70 uppercase">
            Net MoMo flow
          </p>
          <div className="relative mt-1 flex flex-wrap items-end justify-between gap-3">
            <p className="font-display text-4xl leading-none font-bold tabular-nums sm:text-5xl">
              {momo.net < 0 ? '−' : ''}
              {formatGHS(Math.abs(momo.net))}
            </p>
            <Sparkline
              data={momo.netSeries6}
              ariaLabel="Net MoMo flow over the last 6 months"
              className="h-10 w-28 text-[#a7f3d0]"
            />
          </div>

          <dl className="relative mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#34d399] text-[#022c22]">
                  <ArrowDownLeft size={13} aria-hidden="true" />
                </span>
                Received
              </dt>
              <dd className="mt-1.5 text-lg font-bold tabular-nums">{formatGHS(momo.inflow)}</dd>
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <dt className="flex items-center gap-1.5 text-xs text-white/75">
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#fca5a5] text-[#450a0a]">
                  <ArrowUpRight size={13} aria-hidden="true" />
                </span>
                Sent
              </dt>
              <dd className="mt-1.5 text-lg font-bold tabular-nums">{formatGHS(momo.outflow)}</dd>
            </div>
          </dl>

          <div className="relative mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              {...readOnlyProps(readOnly)}
              onClick={readOnly ? undefined : () => openMomo({ direction: 'in' })}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-[#065f46] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-white',
                readOnly && READ_ONLY_CLASS,
              )}
            >
              <ArrowDownLeft size={16} aria-hidden="true" /> Log received
            </button>
            <button
              type="button"
              {...readOnlyProps(readOnly)}
              onClick={readOnly ? undefined : () => openMomo({ direction: 'out' })}
              className={cn(
                'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/40 px-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white',
                readOnly && READ_ONLY_CLASS,
              )}
            >
              <ArrowUpRight size={16} aria-hidden="true" /> Log sent
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 @xl:grid-cols-2 @4xl:grid-cols-1">
          {/* This month */}
          <div className="border-border bg-glass rounded-3xl border p-5">
            <p className="text-text-mute text-[11px] font-semibold tracking-wider uppercase">
              This month
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-text-dim text-xs">Money in</dt>
                <dd className="text-ink-green mt-0.5 text-xl font-bold tabular-nums">
                  {formatCompactGHS(inThisMonth)}
                </dd>
                <dd className="mt-1 text-[11px]">
                  <Change value={inChange} />
                </dd>
              </div>
              <div>
                <dt className="text-text-dim text-xs">Money out</dt>
                <dd className="text-ink-red mt-0.5 text-xl font-bold tabular-nums">
                  {formatCompactGHS(outThisMonth)}
                </dd>
                <dd className="mt-1 text-[11px]">
                  <Change value={outChange} goodWhenDown />
                </dd>
              </div>
            </dl>
          </div>

          {/* Network mix + credit progress */}
          <div className="border-border bg-glass space-y-5 rounded-3xl border p-5">
            <div>
              <p className="text-text-mute flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                <Signal size={12} aria-hidden="true" /> Network mix
              </p>
              <div
                className="bg-glass-strong mt-3 flex h-2.5 overflow-hidden rounded-full"
                role="img"
                aria-label={
                  networkSum > 0
                    ? networks
                        .map((n) => `${n.network} ${Math.round((n.total / networkSum) * 100)}%`)
                        .join(', ')
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
                <span className="text-text-mute inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
                  <Gauge size={12} aria-hidden="true" /> Credit score boost
                </span>
                <span className="text-text font-semibold tabular-nums">
                  {Math.min(momo.count, CREDIT_TARGET)}/{CREDIT_TARGET}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="MoMo activity toward your credit score"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(creditProgress)}
                className="bg-glass-strong mt-2 h-2 overflow-hidden rounded-full"
              >
                <div
                  className="animate-progress-grow h-full rounded-full bg-linear-to-r from-[#10b981] to-[#34d399]"
                  style={{ width: `${creditProgress}%` }}
                />
              </div>
              <p className="text-text-mute mt-2 text-[11px] leading-snug">
                {momo.count >= CREDIT_TARGET
                  ? 'Your MoMo activity is maxing out its part of your credit score.'
                  : `Log ${CREDIT_TARGET - momo.count} more transaction${CREDIT_TARGET - momo.count === 1 ? '' : 's'} to max out MoMo activity in your credit score.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
