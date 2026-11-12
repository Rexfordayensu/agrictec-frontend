'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowDownToLine,
  ArrowDownLeft,
  ArrowUpFromLine,
  ArrowUpRight,
  Check,
  Coins,
  FileText,
  Info,
  Landmark,
  ShieldCheck,
  Signal,
  Smartphone,
  type LucideIcon,
} from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { dashPanel, IconTile, type Tone } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useMomoSummary } from '@/hooks/use-momo-summary';
import { vsLastMonth } from '@/lib/momo-display';
import { formatSignedMoney } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { usePlatformStore } from '@/store/platform-store';
import type { MomoSummary } from '@/types/momo-summary';

export const ghs = formatSignedMoney;

const negative = (value: string) => value.startsWith('-') && Number(value) !== 0;

const monthLabel = (key: string, withYear = false) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GH', {
    month: 'short',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  });

const NETWORK_COLORS: Record<string, string> = {
  MTN: '#f5c400',
  Telecel: '#e60000',
  AirtelTigo: '#1d6fd8',
};

/**
 * Everything above the transactions table. All figures are the server's
 * (GET /me/momo/summary): nothing is added up in the browser.
 */
export function MomoOverview() {
  const { summary, status, error, retry } = useMomoSummary();
  if (!summary)
    return status === 'error' ? (
      <div role="alert" className={cn(dashPanel, 'text-text-dim text-sm')}>
        {error}{' '}
        <button type="button" onClick={retry} className="text-ink-green font-semibold">
          Try again
        </button>
      </div>
    ) : (
      <div className="space-y-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <Skeleton className="rounded-card h-44" />
          <Skeleton className="rounded-card h-44" />
        </div>
        <Skeleton className="rounded-card h-24" />
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <WalletCard summary={summary} />
        <ThisMonth summary={summary} />
      </div>
      <Tiles summary={summary} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
        <Trend summary={summary} />
        <Sources summary={summary} />
        <UseRecords className="lg:col-span-2 2xl:col-span-1" />
      </div>
    </div>
  );
}

function WalletCard({ summary }: { summary: MomoSummary }) {
  const net = summary.allTime.net;
  return (
    <section
      aria-labelledby="wallet-title"
      className="rounded-card relative isolate overflow-hidden p-5 text-white sm:p-6"
      style={{ background: 'linear-gradient(120deg, #053d2c 0%, #0a5c40 60%, #0d6b49 100%)' }}
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
        <Smartphone size={14} aria-hidden="true" /> MoMo wallet
      </span>
      <h2
        id="wallet-title"
        className="mt-4 flex items-center gap-1.5 text-sm font-semibold sm:text-base"
      >
        Net MoMo flow (all time)
        <span title="Money received minus money sent, from every MoMo entry you have saved.">
          <Info size={15} aria-hidden="true" className="opacity-80" />
          <span className="sr-only">Money received minus money sent, from every saved entry.</span>
        </span>
      </h2>
      <p className="mt-1 text-[clamp(30px,4.5vw,44px)] leading-tight font-extrabold tracking-tight tabular-nums">
        {ghs(net)}
      </p>
      <p className="mt-1 text-xs opacity-80">
        {summary.allTime.count} transaction{summary.allTime.count === 1 ? '' : 's'} · up to{' '}
        {new Date(`${summary.asOf}T00:00:00Z`).toLocaleDateString('en-GH', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        })}
      </p>
      {/* Decoration: a phone with the MoMo mark. */}
      <div
        aria-hidden="true"
        className="absolute -right-4 -bottom-10 hidden h-44 w-32 rotate-12 rounded-[28px] border-4 border-[#0b2d22] bg-[#11352a] shadow-2xl sm:block"
      >
        <span className="absolute top-2.5 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-[#0b2d22]" />
        <span className="absolute top-10 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-2xl bg-[#f5c400] text-[#3a2c00]">
          <Coins size={26} />
        </span>
        <span className="absolute top-27 left-1/2 -translate-x-1/2 text-sm font-bold text-[#f5c400]">
          MoMo
        </span>
      </div>
    </section>
  );
}

function ThisMonth({ summary }: { summary: MomoSummary }) {
  const { thisMonth, lastMonth, changeOnLastMonth } = summary;
  const vs = vsLastMonth;
  return (
    <section aria-labelledby="month-title" className={dashPanel}>
      <h2 id="month-title" className="text-text text-[17px] font-bold">
        This month{' '}
        <span className="text-text-mute text-sm font-medium">
          ({monthLabel(thisMonth.month, true)})
        </span>
      </h2>
      <dl className="divide-border mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0 sm:divide-x">
        <MonthFigure
          icon={ArrowDownLeft}
          tone="green"
          label="Money in"
          value={ghs(thisMonth.in)}
          valueClass="text-ink-green"
          note={vs(changeOnLastMonth.in, thisMonth.in, lastMonth.in)}
        />
        <MonthFigure
          icon={ArrowUpRight}
          tone="red"
          label="Money out"
          value={ghs(thisMonth.out)}
          valueClass="text-text"
          note={vs(changeOnLastMonth.out, thisMonth.out, lastMonth.out)}
        />
        <MonthFigure
          icon={Coins}
          tone="gold"
          label="Net flow"
          value={ghs(thisMonth.net)}
          valueClass={negative(thisMonth.net) ? 'text-ink-red' : 'text-ink-green'}
          note={`${thisMonth.count} transaction${thisMonth.count === 1 ? '' : 's'}`}
        />
      </dl>
    </section>
  );
}

function MonthFigure({
  icon,
  tone,
  label,
  value,
  valueClass,
  note,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  valueClass: string;
  note: string;
}) {
  return (
    <div className="flex gap-3 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0">
        <dt className="text-text-dim text-xs font-medium">{label}</dt>
        <dd
          className={cn(
            'mt-1 text-base leading-tight font-bold whitespace-nowrap tabular-nums 2xl:text-lg',
            valueClass,
          )}
        >
          {value}
        </dd>
        <dd className="text-text-mute mt-1 text-[11px]">{note}</dd>
      </div>
    </div>
  );
}

function Tiles({ summary }: { summary: MomoSummary }) {
  const a = summary.allTime;
  const main = summary.mainNetwork;
  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Tile icon={ArrowDownToLine} tone="green" label="Total received" sub="(all time)">
        {ghs(a.in)}
      </Tile>
      <Tile icon={ArrowUpFromLine} tone="red" label="Total sent" sub="(all time)">
        {ghs(a.out)}
      </Tile>
      <Tile
        icon={FileText}
        tone="blue"
        label="Total transactions"
        note={`${a.countIn} received · ${a.countOut} sent`}
      >
        {a.count}
      </Tile>
      <Tile
        icon={ShieldCheck}
        tone="green"
        label="Verified transactions"
        note="Checked by AgriCtec from evidence"
      >
        {a.verified}{' '}
        <span className="text-text-mute text-base font-semibold">
          ({Math.round(Number(a.verifiedShare))}%)
        </span>
      </Tile>
      <Tile
        icon={Signal}
        tone="green"
        label="Main network"
        note={
          main
            ? `${Math.round(Number(main.countShare))}% of transactions`
            : 'No network recorded yet'
        }
        className="col-span-2 md:col-span-1"
      >
        {main ? main.network : '—'}
      </Tile>
    </dl>
  );
}

function Tile({
  icon,
  tone,
  label,
  sub,
  note,
  className,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  sub?: string;
  note?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(dashPanel, 'flex flex-col gap-2 sm:flex-row sm:gap-3', className)}>
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0">
        <dt className="text-text text-[13px] font-semibold">
          {label} {sub && <span className="text-text-mute block font-normal">{sub}</span>}
        </dt>
        <dd className="text-text mt-1 text-base font-bold whitespace-nowrap tabular-nums sm:text-lg 2xl:text-[22px]">
          {children}
        </dd>
        {note && <dd className="text-text-mute mt-0.5 text-[11px]">{note}</dd>}
      </div>
    </div>
  );
}

function Trend({ summary }: { summary: MomoSummary }) {
  const { palette } = useChartTheme();
  const rows = summary.monthly;
  return (
    <section aria-labelledby="momo-trend-title" className={dashPanel}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="momo-trend-title" className="text-text text-[17px] font-bold">
            MoMo cash flow trend
          </h2>
          <p className="text-text-mute text-xs">Money in and out each month (last 6 months)</p>
        </div>
        <span className="text-text-dim flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: palette.accent }} /> Money in
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: palette.danger }} /> Money out
          </span>
        </span>
      </div>
      <BarChart
        height={210}
        showLegend={false}
        maxBarThickness={22}
        labels={rows.map((r) => monthLabel(r.month))}
        datasets={[
          { label: 'Money in', data: rows.map((r) => Number(r.in)), color: palette.accent },
          { label: 'Money out', data: rows.map((r) => Number(r.out)), color: palette.danger },
        ]}
        ariaLabel={`MoMo money in and out by month, last six months. ${rows
          .map((r) => `${monthLabel(r.month, true)}: in ${ghs(r.in)}, out ${ghs(r.out)}`)
          .join('; ')}.`}
      />
    </section>
  );
}

function Sources({ summary }: { summary: MomoSummary }) {
  const nets = summary.networks;
  return (
    <section aria-labelledby="sources-title" className={dashPanel}>
      <h2 id="sources-title" className="text-text text-[17px] font-bold">
        Transaction sources
      </h2>
      <p className="text-text-mute text-xs">By amount (all time)</p>
      <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="mx-auto w-40">
          <DoughnutChart
            aspectRatio={1}
            showLegend={false}
            labels={nets.map((n) => n.network)}
            data={nets.map((n) => Number(n.amount))}
            colors={nets.map((n) => NETWORK_COLORS[n.network])}
            ariaLabel={`Money moved by network: ${nets.map((n) => `${n.network} ${ghs(n.amount)}`).join(', ')}.`}
            centerLabel={
              <span className="block text-center">
                <span className="text-text block text-sm font-bold">
                  {ghs(summary.allTime.moved)}
                </span>
                <span className="text-text-mute block text-[10px]">Total moved</span>
              </span>
            }
          />
        </div>
        <ul className="space-y-2.5 text-xs">
          {nets.map((n) => (
            <li key={n.network} className="flex items-center gap-2">
              <i
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: NETWORK_COLORS[n.network] }}
              />
              <span className="text-text flex-1 font-semibold">{n.network}</span>
              <span className="text-text-dim w-10 text-right tabular-nums">
                {Math.round(Number(n.amountShare))}%
              </span>
              <span className="text-text w-24 text-right font-medium tabular-nums">
                {ghs(n.amount)}
              </span>
            </li>
          ))}
          {summary.untagged.count > 0 && (
            <li className="text-text-mute">
              {summary.untagged.count} without a network ({ghs(summary.untagged.amount)})
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function UseRecords({ className }: { className?: string }) {
  const loansOn = usePlatformStore((s) => s.flags.loans);
  return (
    <section
      aria-labelledby="use-title"
      className={cn(
        'rounded-card border-accent/25 from-accent/12 to-accent/4 min-w-0 border bg-linear-to-br p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={Landmark} />
        <h2 id="use-title" className="text-text text-[17px] font-bold">
          Use your MoMo records
        </h2>
      </div>
      <p className="text-text-dim mt-3 text-sm leading-relaxed">
        Your MoMo history can strengthen your financial profile and support loan applications.
      </p>
      <ul className="text-text mt-3 grid gap-2 text-sm sm:grid-cols-3 2xl:grid-cols-1">
        {[
          'Build your income record',
          'Show regular business activity',
          'Add evidence for a loan application',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2">
            <Check size={16} aria-hidden="true" className="text-ink-green shrink-0" /> {item}
          </li>
        ))}
      </ul>
      {loansOn && (
        <Link
          href="/loans"
          className="text-ink-green mt-3 inline-block text-sm font-semibold hover:underline"
        >
          See your loan readiness →
        </Link>
      )}
    </section>
  );
}
