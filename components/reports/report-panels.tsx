'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import '@/components/charts/register';
import {
  BarController,
  Chart as ChartJS,
  LineController,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  ChartPie,
  ClipboardCheck,
  Layers,
  List,
  Plus,
  CircleCheck,
  Landmark,
  MoreHorizontal,
  Package,
  PawPrint,
  Pencil,
  ShieldCheck,
  Sprout,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { DoughnutChart } from '@/components/charts/doughnut-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { TransactionReviewModal } from '@/components/transactions/transaction-tools';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { Badge } from '@/components/ui/badge';
import { formatDate, parseISODate } from '@/lib/format';
import { readOnlyProps, READ_ONLY_CLASS, useReadOnly } from '@/lib/read-only';
import { reportReadiness } from '@/lib/report-readiness';
import { formatTransactionMoney, STATUS_COLORS, TRANSACTION_STATUSES } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { useModalStore } from '@/store/modal-store';
import { useProfileStore } from '@/store/profile-store';
import type { FinancialSummary } from '@/types/financial';

ChartJS.register(BarController, LineController);

const INCOME = '#3dbb72';
const EXPENSES = '#f59c9c';
const NET = '#127a45';

const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });

/** Monthly recorded income and expenses (bars) and net cash flow (line), the server's totals. */
export function CashFlowPanel({ summary }: { summary: FinancialSummary }) {
  const { baseOptions } = useChartTheme();
  const rows = summary.monthly;
  const data: ChartData<'bar' | 'line'> = {
    labels: rows.map((r) => monthLabel(r.month)),
    datasets: [
      {
        type: 'line',
        label: 'Net cash flow',
        data: rows.map((r) => Number(r.net)),
        borderColor: NET,
        backgroundColor: NET,
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0,
        order: 1,
      },
      {
        type: 'bar',
        label: 'Income',
        data: rows.map((r) => Number(r.income)),
        backgroundColor: INCOME,
        borderRadius: 2,
        maxBarThickness: 22,
        order: 2,
      },
      {
        type: 'bar',
        label: 'Expenses',
        data: rows.map((r) => Number(r.expenses)),
        backgroundColor: EXPENSES,
        borderRadius: 2,
        maxBarThickness: 22,
        order: 2,
      },
    ],
  };
  const empty = rows.every((r) => Number(r.income) === 0 && Number(r.expenses) === 0);
  const options: ChartOptions<'bar' | 'line'> = {
    ...baseOptions,
    maintainAspectRatio: false,
    plugins: {
      ...baseOptions.plugins,
      legend: { display: false },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (c) =>
            `${c.dataset.label}: GHS ${Number(c.raw).toLocaleString('en-GH', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ...baseOptions.scales.x, grid: { display: false } },
      y: {
        ...baseOptions.scales.y,
        beginAtZero: true,
        suggestedMax: empty ? 1000 : undefined,
        ticks: {
          ...baseOptions.scales.y.ticks,
          callback: (value, index, ticks) =>
            `${index === ticks.length - 1 ? 'GHS ' : ''}${Number(value).toLocaleString('en-GH')}`,
        },
      },
    },
  };
  return (
    <section
      aria-labelledby="cashflow-title"
      className={cn(dashPanel, 'report-cashflow flex flex-col')}
    >
      <h2 id="cashflow-title" className="text-text text-lg font-bold">
        <IconTile icon={ChartNoAxesColumnIncreasing} size="sm" /> Income, expenses and cash flow
      </h2>
      <div className="text-text mt-3 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <i className="size-3 rounded-[3px]" style={{ background: INCOME }} /> Income
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-3 rounded-[3px]" style={{ background: EXPENSES }} /> Expenses
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="22" height="10" aria-hidden="true">
            <line x1="0" y1="5" x2="22" y2="5" stroke={NET} strokeWidth="2" />
            <circle cx="11" cy="5" r="3.5" fill="white" stroke={NET} strokeWidth="2" />
          </svg>
          Net cash flow
        </span>
      </div>
      <div className="mt-2 h-52 min-h-0 flex-1">
        <Chart
          type="bar"
          data={data}
          options={options}
          role="img"
          aria-label={`Recorded farm income, expenses and net cash flow by month. ${rows
            .map(
              (r) =>
                `${monthLabel(r.month)}: income GHS ${r.income}, expenses GHS ${r.expenses}, net GHS ${r.net}`,
            )
            .join('; ')}.`}
        />
      </div>
      {empty && (
        <p className="text-text-mute mt-2 text-xs">
          Your chart starts with your first sale or expense.
        </p>
      )}
    </section>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  crop_sales: '#22a35a',
  livestock_sales: '#f5c84c',
  farm_inputs: '#3b9be0',
  labour_services: '#9b6cf0',
  other: '#b8bcc4',
};

/** Farm income and expenses in the period by category group (the server's figures). */
export function CategoryPanel({ summary }: { summary: FinancialSummary }) {
  const groups = summary.byCategory;
  return (
    <section
      aria-labelledby="category-title"
      className={cn(dashPanel, 'report-category @container')}
    >
      <h2 id="category-title" className="text-text text-lg font-bold">
        <IconTile icon={ChartPie} size="sm" /> Transaction by category
      </h2>
      {!groups ? (
        <p className="text-text-dim mt-4 text-sm">
          Categories will appear here once the AgriCtec server is updated.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-1 items-center gap-3 @[18rem]:grid-cols-[8rem_minmax(0,1fr)]">
          <div className="mx-auto w-32">
            <DoughnutChart
              emptyLabel={null}
              aspectRatio={1}
              showLegend={false}
              labels={groups.map((g) => g.label)}
              data={groups.map((g) => Number(g.amount))}
              colors={groups.map((g) => CATEGORY_COLORS[g.key])}
              ariaLabel={`Farm income and expenses by category: ${groups
                .map((g) => `${g.label} GHS ${g.amount} (${g.share}%)`)
                .join(', ')}.`}
              centerLabel={
                <span className="block text-center leading-tight">
                  <span className="text-text-dim block text-xs">Total</span>
                  <span className="text-text block text-base font-extrabold">
                    {formatTransactionMoney(summary.categoryTotal ?? '0.00')}
                  </span>
                </span>
              }
            />
          </div>
          <ul className="space-y-3.5 text-xs">
            {groups.map((g) => (
              <li key={g.key} className="flex items-center gap-2.5">
                <i
                  className="size-3 shrink-0 rounded-[3px]"
                  style={{ background: CATEGORY_COLORS[g.key] }}
                />
                <span className="text-text min-w-0 flex-1">{g.label}</span>
                <span className="text-text shrink-0 tabular-nums">
                  {Math.round(Number(g.share))}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

const GROUP_ICON: { match: string[]; icon: LucideIcon; color: string }[] = [
  { match: ['crop_sale', 'produce_delivery'], icon: Sprout, color: 'text-ink-green' },
  { match: ['livestock_sale'], icon: PawPrint, color: 'text-ink-gold' },
  { match: ['fertilizer', 'seed', 'equipment', 'irrigation'], icon: Package, color: 'text-text' },
  { match: ['labour', 'transport'], icon: Users, color: 'text-text' },
  {
    match: ['loan_disbursement', 'loan_repayment', 'interest_payment', 'other_financing'],
    icon: Landmark,
    color: 'text-ink-blue',
  },
];

/** The same groups as the category chart (backend CATEGORY_GROUPS); financing is its own. */
const GROUP_LABELS: { match: string[]; label: string }[] = [
  { match: ['crop_sale', 'produce_delivery'], label: 'Crop sales' },
  { match: ['livestock_sale'], label: 'Livestock sales' },
  { match: ['fertilizer', 'seed', 'equipment', 'irrigation'], label: 'Farm inputs' },
  { match: ['labour', 'transport'], label: 'Labour & services' },
  {
    match: ['loan_disbursement', 'loan_repayment', 'interest_payment', 'other_financing'],
    label: 'Financing',
  },
];

const groupLabel = (category?: string | null) =>
  GROUP_LABELS.find((g) => category && g.match.includes(category))?.label ?? 'Other';

function categoryIcon(category?: string | null) {
  return (
    GROUP_ICON.find((g) => category && g.match.includes(category)) ?? {
      icon: Tag,
      color: 'text-text-mute',
    }
  );
}

type ReportRecord = NonNullable<FinancialSummary['recentTransactions']>[number];
const money = (n: string) => formatTransactionMoney(n).replace(/^GHS /, '');

/** The farmer's latest farm money entries (GET /me/records), newest first. */
export function RecentTransactionsPanel({ summary }: { summary: FinancialSummary }) {
  const rows = summary.recentTransactions;
  return (
    <section
      aria-labelledby="recent-tx-title"
      className={cn(dashPanel, 'report-recent @container')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-tx-title" className="text-text text-lg font-bold">
          <IconTile icon={List} size="sm" /> Recent transactions
        </h2>
        <Link
          href="/records?view=all"
          className="text-ink-green inline-flex items-center gap-1.5 text-sm font-semibold hover:underline"
        >
          View all transactions <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </div>
      {!rows ? (
        <p className="text-text-dim py-6 text-center text-sm">
          Recent transactions are not available yet. Refresh after the server update.
        </p>
      ) : (
        <>
          <div className="hidden overflow-x-auto @2xl:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-glass-strong text-text text-small text-left">
                  <th className="rounded-l-lg px-2 py-3 font-semibold">Date</th>
                  <th className="px-2 py-3 font-semibold">Description</th>
                  <th className="px-2 py-3 font-semibold">Category</th>
                  <th className="px-2 py-3 font-semibold">Type</th>
                  <th className="px-2 py-3 text-right font-semibold whitespace-nowrap">
                    Amount (GHS)
                  </th>
                  <th className="px-2 py-3 font-semibold">Status</th>
                  <th className="w-10 rounded-r-lg px-2 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-border divide-y @2xl:hidden">
            {rows.map((r) => {
              const sign = signed(r);
              return (
                <li key={r.id} className="flex items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-text truncate text-sm font-semibold">{r.description}</p>
                    <p className="text-text-mute truncate text-xs">
                      {formatDate(parseISODate(r.date))} · {groupLabel(r.category)}
                    </p>
                    <span className="mt-1.5 inline-block">
                      <Status r={r} />
                    </span>
                  </div>
                  <span className={cn('text-sm font-bold tabular-nums', sign.tone)}>
                    {sign.text}
                  </span>
                  <RowMenu r={r} />
                </li>
              );
            })}
          </ul>
          {rows.length < 5 && <RecentRecordsPrompt empty={rows.length === 0} />}
        </>
      )}
    </section>
  );
}

function RecentRecordsPrompt({ empty }: { empty: boolean }) {
  const openModal = useModalStore((s) => s.openModal);
  return (
    <div className="report-record-prompt">
      <div className="report-record-illustration" aria-hidden="true">
        <Sprout className="report-prompt-leaf" />
        <ClipboardCheck />
        <Sprout className="report-prompt-leaf" />
      </div>
      <h3>{empty ? 'No transactions yet.' : 'No more transactions yet.'}</h3>
      <p>Add your farm income or expenses to see your transaction history here.</p>
      <Button mutates icon={Plus} onClick={() => openModal('record')}>
        Add a transaction
      </Button>
    </div>
  );
}

function signed(r: ReportRecord) {
  const out = r.type === 'expense' || (r.type === 'financing' && r.direction === 'out');
  return {
    text: `${out ? '-' : '+'}${money(r.amount)}`,
    tone: out ? 'text-ink-red' : 'text-ink-green',
  };
}

function typeBadge(r: ReportRecord) {
  if (r.type === 'income') return <Badge color="green">Income</Badge>;
  if (r.type === 'expense') return <Badge color="red">Expense</Badge>;
  return <Badge color="blue">Financing</Badge>;
}

function Status({ r }: { r: ReportRecord }) {
  const s = r.verificationStatus ?? 'self_reported';
  if (s === 'verified')
    return (
      <Badge color="green">
        <span className="inline-flex items-center gap-1">
          <CircleCheck size={12} aria-hidden="true" /> Verified
        </span>
      </Badge>
    );
  return <Badge color={STATUS_COLORS[s]}>{TRANSACTION_STATUSES[s]}</Badge>;
}

function Row({ r }: { r: ReportRecord }) {
  const { icon: Icon, color } = categoryIcon(r.category);
  const sign = signed(r);
  return (
    <tr>
      <td className="text-text px-2 py-3 whitespace-nowrap">
        {parseISODate(r.date).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })}
      </td>
      <td className="text-text max-w-32 truncate px-2 py-3 @5xl:max-w-56">{r.description}</td>
      <td className="px-2 py-3 whitespace-nowrap">
        <span className="text-text inline-flex items-center gap-2">
          <Icon size={17} aria-hidden="true" className={color} />
          {groupLabel(r.category)}
        </span>
      </td>
      <td className="px-2 py-3">{typeBadge(r)}</td>
      <td className={cn('px-2 py-3 text-right font-semibold tabular-nums', sign.tone)}>
        {sign.text}
      </td>
      <td className="px-2 py-3">
        <Status r={r} />
      </td>
      <td className="px-2 py-3 text-right">
        <RowMenu r={r} />
      </td>
    </tr>
  );
}

/** Edit, or open the evidence & review dialog. Verified entries are locked for editing. */
function RowMenu({ r }: { r: ReportRecord }) {
  const openModal = useModalStore((s) => s.openModal);
  const readOnly = useReadOnly();
  const locked = readOnly || r.verificationStatus === 'verified';
  const [open, setOpen] = useState(false);
  const [review, setReview] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  const item =
    'text-text hover:bg-glass-strong flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm';
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={`Actions for ${r.description}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-8 items-center justify-center rounded-lg"
      >
        <MoreHorizontal size={18} aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="border-border bg-bg-2 absolute right-0 z-20 mt-1 w-52 rounded-xl border p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            {...readOnlyProps(locked)}
            onClick={
              locked
                ? undefined
                : () => {
                    setOpen(false);
                    openModal('record', r.id);
                  }
            }
            className={cn(item, locked && READ_ONLY_CLASS)}
          >
            <Pencil size={15} aria-hidden="true" /> Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setReview(true);
            }}
            className={item}
          >
            <ShieldCheck size={15} aria-hidden="true" /> Evidence & review
            {r.evidenceCount ? ` (${r.evidenceCount})` : ''}
          </button>
        </div>
      )}
      <TransactionReviewModal
        kind="farm"
        id={r.id}
        open={review}
        onClose={() => setReview(false)}
      />
    </div>
  );
}

/** How ready the records are for a loan application, from the server's figures. */
export function ReadinessPanel({ summary }: { summary: FinancialSummary }) {
  const ghanaCard = useProfileStore((s) => s.profile?.ghanaCard.status);
  const { checks, percent } = reportReadiness(summary, ghanaCard);
  const missing = checks.find((c) => !c.done);
  const r = 34;
  const circumference = 2 * Math.PI * r;
  return (
    <section aria-labelledby="readiness-report-title" className={cn(dashPanel, 'report-readiness')}>
      <h2
        id="readiness-report-title"
        className="text-text flex items-center gap-2 text-lg font-bold"
      >
        <IconTile icon={Layers} size="sm" /> Financial record readiness
        <span title="What a lender usually looks for in your records, checked against your recorded figures. It is not a loan decision.">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="text-text-dim"
          >
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 16v-4M12 8h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="sr-only">
            What a lender usually looks for in your records. Not a loan decision.
          </span>
        </span>
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <div className="relative size-24 shrink-0" role="img" aria-label={`${percent}% ready`}>
          <svg viewBox="0 0 80 80" className="size-24 -rotate-90">
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth="7"
              className="text-border"
            />
            <circle
              cx="40"
              cy="40"
              r={r}
              fill="none"
              stroke="#0b8a55"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
            />
          </svg>
          <span className="text-text absolute inset-0 flex items-center justify-center text-xl font-extrabold">
            {percent}%
          </span>
        </div>
        <p className="text-text-dim text-sm leading-relaxed">
          Your records meet {percent}% of this checklist.
        </p>
      </div>
      <ul className="mt-4 space-y-3">
        {checks.map((c) => (
          <li key={c.key} className="flex items-center gap-3 text-sm">
            {c.done ? (
              <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0b8a55] text-white">
                <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="border-text-mute size-5 shrink-0 rounded-full border-2"
              />
            )}
            <span className="text-text">{c.label}</span>
            <span className="sr-only">{c.done ? '(done)' : '(missing)'}</span>
          </li>
        ))}
      </ul>
      {missing && (
        <Link
          href={missing.href}
          className="border-accent/50 text-ink-green hover:bg-accent/8 mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold"
        >
          View missing items <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}
