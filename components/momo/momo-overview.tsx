'use client';

import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUpRight,
  ChartNoAxesColumnIncreasing,
  Check,
  Coins,
  Download,
  FileText,
  Info,
  Landmark,
  ShieldCheck,
  Smartphone,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { BarChart } from '@/components/charts/bar-chart';
import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { dashPanel, IconTile, type Tone } from '@/components/dashboard/dashboard-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useMomoSummary } from '@/hooks/use-momo-summary';
import { movedLabel, vsLastMonth } from '@/lib/momo-display';
import { formatSignedMoney } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import type { MomoSummary } from '@/types/momo-summary';

export const ghs = formatSignedMoney;

const negative = (value: string) => value.startsWith('-') && Number(value) !== 0;

const monthLabel = (key: string, withYear = false) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'short',
    ...(withYear && { year: 'numeric' }),
    timeZone: 'UTC',
  });

const NETWORK_COLORS: Record<string, string> = {
  MTN: '#f5c400',
  Telecel: '#1677ff',
  AirtelTigo: '#ff3948',
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
        <div className="grid gap-4 @4xl:grid-cols-2">
          <Skeleton className="rounded-card h-44" />
          <Skeleton className="rounded-card h-44" />
        </div>
        <Skeleton className="rounded-card h-24" />
      </div>
    );
  return (
    <div className="momo-overview space-y-4">
      <div className="momo-hero-row grid grid-cols-1 gap-4 @4xl:grid-cols-2">
        <WalletCard summary={summary} />
        <ThisMonth summary={summary} />
      </div>
      <Tiles summary={summary} />
      <div className="momo-chart-row grid grid-cols-1 gap-4 @4xl:grid-cols-2 @6xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.85fr)]">
        <Trend summary={summary} />
        <Sources summary={summary} />
        <UseRecords className="@4xl:col-span-2 @6xl:col-span-1" />
      </div>
    </div>
  );
}

function WalletCard({ summary }: { summary: MomoSummary }) {
  const net = summary.allTime.net;
  return (
    <section
      aria-labelledby="wallet-title"
      className="momo-wallet rounded-card relative isolate flex min-h-44 flex-col justify-center overflow-hidden p-6 text-white"
      style={{ background: 'linear-gradient(115deg, #04432f 0%, #075a3d 55%, #0a6b48 100%)' }}
    >
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
        <Smartphone size={14} aria-hidden="true" /> MoMo Wallet
      </span>
      <h2 id="wallet-title" className="mt-5 flex items-center gap-2 text-base font-semibold">
        Net MoMo Flow (All Time)
        <span title="Money received minus money sent, from every MoMo entry you have saved.">
          <Info size={17} aria-hidden="true" />
          <span className="sr-only">Money received minus money sent, from every saved entry.</span>
        </span>
      </h2>
      <p className="text-stat-lg mt-1 leading-tight font-extrabold tracking-tight tabular-nums">
        {negative(net) ? `– ${ghs(net).slice(1)}` : ghs(net)}
      </p>
      <PhoneArt />
    </section>
  );
}

/** Decoration: a tilted phone with the MoMo mark among leaves. */
function PhoneArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 260 200"
      className="pointer-events-none absolute right-0 bottom-0 -z-10 hidden h-full max-h-48 w-auto opacity-95 @md:block"
    >
      <defs>
        <linearGradient id="momo-phone-frame" x2="1" y2="1">
          <stop stopColor="#9dc6d1" />
          <stop offset=".5" stopColor="#538697" />
          <stop offset="1" stopColor="#b3d1d7" />
        </linearGradient>
        <linearGradient id="momo-phone-screen" x2=".8" y2="1">
          <stop stopColor="#174957" />
          <stop offset="1" stopColor="#092d34" />
        </linearGradient>
      </defs>
      <path d="M40 200 C 52 150, 92 128, 120 140 C 98 154, 76 176, 70 200 Z" fill="#1f9d4d" />
      <path d="M60 200 C 40 160, 46 120, 76 104 C 80 136, 82 168, 92 200 Z" fill="#2fb35c" />
      <path d="M232 200 C 238 160, 252 140, 260 132 L 260 200 Z" fill="#1f9d4d" />
      <g transform="rotate(14 160 110)">
        <rect x="104" y="10" width="112" height="216" rx="22" fill="url(#momo-phone-frame)" />
        <rect x="110" y="16" width="100" height="204" rx="17" fill="url(#momo-phone-screen)" />
        <rect x="143" y="28" width="34" height="6" rx="3" fill="#0b2f24" />
        <rect x="134" y="74" width="52" height="52" rx="12" fill="#f5c400" />
        <path
          d="M147 92 h22 a4 4 0 0 1 4 4 v14 a4 4 0 0 1 -4 4 h-22 a4 4 0 0 1 -4 -4 v-14 a4 4 0 0 1 4 -4 z M163 101 h10 v6 h-10 a3 3 0 0 1 0 -6 z"
          fill="#3a2c00"
        />
        <text x="160" y="152" textAnchor="middle" fontSize="18" fontWeight="800" fill="#f5c400">
          MoMo
        </text>
      </g>
      <path d="M150 200 C 160 172, 188 160, 212 166 C 196 178, 182 190, 178 200 Z" fill="#2fb35c" />
    </svg>
  );
}

function ThisMonth({ summary }: { summary: MomoSummary }) {
  const { thisMonth, lastMonth, changeOnLastMonth } = summary;
  const inNote = vsLastMonth(changeOnLastMonth.in, thisMonth.in, lastMonth.in);
  const outNote = vsLastMonth(changeOnLastMonth.out, thisMonth.out, lastMonth.out);
  return (
    <section
      aria-labelledby="month-title"
      className={cn(dashPanel, 'momo-this-month flex flex-col justify-center')}
    >
      <h2 id="month-title" className="text-text text-lg font-bold">
        This Month{' '}
        <span className="text-text-dim text-sm font-semibold">
          ({monthLabel(thisMonth.month, true)})
        </span>
      </h2>
      <dl className="divide-border mt-5 grid grid-cols-1 gap-4 @md:grid-cols-3 @md:gap-0 @md:divide-x">
        <MonthFigure
          icon={ArrowDown}
          tone="green"
          label="Money In"
          value={ghs(thisMonth.in)}
          valueClass="text-ink-green"
          note={inNote}
          noteClass="text-ink-green"
        />
        <MonthFigure
          icon={ArrowUpRight}
          tone="red"
          label="Money Out"
          value={ghs(thisMonth.out)}
          valueClass="text-text"
          note={outNote}
        />
        <MonthFigure
          icon={Coins}
          tone="gold"
          label="Net Flow"
          value={ghs(thisMonth.net)}
          valueClass={negative(thisMonth.net) ? 'text-ink-red' : 'text-ink-green'}
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
  noteClass,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  valueClass: string;
  note?: string;
  noteClass?: string;
}) {
  return (
    <div className="flex gap-3 @md:px-4 @md:first:pl-0 @md:last:pr-0">
      <IconTile icon={icon} tone={tone} size="sm" />
      <div className="min-w-0">
        <dt className="text-text-dim text-small font-medium">{label}</dt>
        <dd
          className={cn(
            'mt-1 text-lg leading-tight font-bold whitespace-nowrap tabular-nums @6xl:text-xl',
            valueClass,
          )}
        >
          {value}
        </dd>
        {note && <dd className={cn('text-text-mute mt-1.5 text-xs', noteClass)}>{note}</dd>}
      </div>
    </div>
  );
}

function Tiles({ summary }: { summary: MomoSummary }) {
  const a = summary.allTime;
  const main = summary.mainNetwork;
  return (
    <dl className="momo-summary-tiles grid grid-cols-2 gap-3 @3xl:grid-cols-3 @6xl:grid-cols-5">
      <Tile icon={Download} tone="green" label="Total Received" sub="(All Time)">
        {ghs(a.in)}
      </Tile>
      <Tile icon={Upload} tone="red" label="Total Sent" sub="(All Time)">
        {ghs(a.out)}
      </Tile>
      <Tile
        icon={FileText}
        tone="blue"
        label="Total Transactions"
        note={`${a.countIn} received • ${a.countOut} sent`}
      >
        {a.count}
      </Tile>
      <Tile icon={ShieldCheck} tone="green" label="Verified Transactions">
        {a.verified}{' '}
        <span className="text-lg font-semibold">({Math.round(Number(a.verifiedShare))}%)</span>
      </Tile>
      <Tile
        icon={ChartNoAxesColumnIncreasing}
        tone="green"
        label="Main Network"
        note={
          main
            ? `${Math.round(Number(main.countShare))}% of transactions`
            : 'No network recorded yet'
        }
        className="col-span-2 @3xl:col-span-1"
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
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0">
        <dt className="text-text text-small font-semibold @6xl:text-xs @6xl:whitespace-nowrap">
          {label} {sub && <span className="text-text-dim font-normal">{sub}</span>}
        </dt>
        <dd className="text-text mt-1.5 text-lg font-bold whitespace-nowrap tabular-nums @6xl:text-2xl">
          {children}
        </dd>
        {note && <dd className="text-text-dim mt-1 text-xs">{note}</dd>}
      </div>
    </div>
  );
}

function Trend({ summary }: { summary: MomoSummary }) {
  const { palette } = useChartTheme();
  const rows = summary.monthly;
  return (
    <section aria-labelledby="momo-trend-title" className={cn(dashPanel, 'momo-trend')}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="momo-trend-title" className="text-text text-lg font-bold">
            MoMo Cash Flow Trend
          </h2>
          <p className="text-text-dim text-xs">Monthly money in and money out (last 6 months)</p>
        </div>
        <span className="text-text flex items-center gap-3 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: palette.accent }} /> Money In
          </span>
          <span className="flex items-center gap-1.5">
            <i className="size-2.5 rounded-full" style={{ background: palette.danger }} /> Money Out
          </span>
        </span>
      </div>
      <BarChart
        height={200}
        showLegend={false}
        maxBarThickness={24}
        labels={rows.map((r) => monthLabel(r.month))}
        datasets={[
          { label: 'Money In', data: rows.map((r) => Number(r.in)), color: palette.accent },
          { label: 'Money Out', data: rows.map((r) => Number(r.out)), color: palette.danger },
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
  const a = summary.allTime;
  return (
    <section aria-labelledby="sources-title" className={cn(dashPanel, 'momo-sources @container')}>
      <h2 id="sources-title" className="text-text text-lg font-bold">
        Transaction Sources
      </h2>
      <p className="text-text-dim text-xs">By amount (all time)</p>
      <div className="momo-source-content mt-4 grid grid-cols-1 items-center gap-3 @[23rem]:grid-cols-[7rem_minmax(0,1fr)]">
        <div className="momo-source-donut mx-auto w-28">
          <DoughnutChart
            aspectRatio={1}
            showLegend={false}
            labels={[
              ...nets.map((n) => n.network),
              ...(summary.untagged.count ? ['Not provided'] : []),
            ]}
            data={[
              ...nets.map((n) => Number(n.amount)),
              ...(summary.untagged.count ? [Number(summary.untagged.amount)] : []),
            ]}
            colors={[
              ...nets.map((n) => NETWORK_COLORS[n.network]),
              ...(summary.untagged.count ? ['#a4b4bf'] : []),
            ]}
            ariaLabel={`Money moved by network: ${nets.map((n) => `${n.network} ${ghs(n.amount)}`).join(', ')}.`}
            centerLabel={
              <span className="block text-center leading-tight">
                <span className="text-text block text-xs font-bold">GHS</span>
                <span className="text-text block text-base font-extrabold">
                  {ghs(a.moved).replace(/^GHS /, '')}
                </span>
                <span className="text-text-dim block text-xs">
                  {movedLabel(a.countIn, a.countOut)}
                </span>
              </span>
            }
          />
        </div>
        <ul className="space-y-3 text-xs">
          {nets.map((n) => (
            <li key={n.network} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2">
              <i
                className="size-2.5 rounded-full"
                style={{ background: NETWORK_COLORS[n.network] }}
              />
              <span className="text-text font-semibold">{n.network}</span>
              <span className="text-text w-9 text-right tabular-nums">
                {Math.round(Number(n.amountShare))}%
              </span>
              <span className="text-text text-right font-medium whitespace-nowrap tabular-nums">
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
  return (
    <section
      aria-labelledby="use-title"
      className={cn(
        'rounded-card border-accent/25 from-accent/12 to-accent/5 min-w-0 border bg-linear-to-br p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={Landmark} />
        <h2 id="use-title" className="text-text text-lg font-bold">
          Use your MoMo records
        </h2>
      </div>
      <p className="text-text-dim mt-3 text-sm leading-relaxed">
        Your MoMo transaction history can strengthen your financial profile and support loan
        applications.
      </p>
      <ul className="text-text mt-3 grid gap-2.5 text-sm @4xl:grid-cols-3 @6xl:grid-cols-1">
        {[
          'Build your income record',
          'Show regular business activity',
          'Add evidence for a loan application',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2.5">
            <Check size={18} aria-hidden="true" className="text-ink-green shrink-0" /> {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
