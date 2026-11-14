'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { format, subMonths } from 'date-fns';
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  CalendarDays,
  Coins,
  Download,
  FileSpreadsheet,
  FileText,
  Info,
  ReceiptText,
  Trash2,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { dashPanel } from '@/components/dashboard/dashboard-ui';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import {
  CashFlowPanel,
  CategoryPanel,
  ReadinessPanel,
  RecentTransactionsPanel,
} from '@/components/reports/report-panels';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LogoLoader } from '@/components/ui/logo-loader';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { financialReportError, hasReportableFigures } from '@/lib/financial-report-state';
import { formatGhanaDate } from '@/lib/format';
import { saveBlob } from '@/lib/loans/application-status';
import { formatSignedMoney } from '@/lib/transactions';
import { cn } from '@/lib/utils';
import { DemoNote, useDemo } from '@/components/shared/demo-note';
import { financialService } from '@/services/financial.service';
import { useModalStore } from '@/store/modal-store';
import type { FinancialReport, FinancialSummary, ReportMonths } from '@/types/financial';

const panel = 'border-border bg-glass rounded-card min-w-0 border p-5 sm:p-6';
const title = 'text-text text-lg font-semibold';
const MONTHS: ReportMonths[] = [3, 6, 12];

/** "Jun 2026 – Nov 2026" for the last `months` months to today (display only). */
export function reportRangeLabel(months: number, today = new Date(), compact = false) {
  const start = subMonths(today, months - 1);
  const firstFormat = compact && start.getFullYear() === today.getFullYear() ? 'MMM' : 'MMM yyyy';
  return `${format(start, firstFormat)} – ${format(today, 'MMM yyyy')}`;
}

/**
 * Financial reports: the farmer's recorded figures for 3, 6 or 12 months, worked out by the
 * server with exact decimals (GET /me/financial-summary), and PDF reports generated and kept on
 * the server. Not a bank statement and not a loan decision.
 */
export function FinancialReportsView() {
  return useDemo() ? <DemoReports /> : <AccountReports />;
}

/** The guest demo: reports are built from a farmer's saved records on their account. */
function DemoReports() {
  return (
    <div className="financial-reference @container space-y-5">
      <header className="report-hero">
        <div className="min-w-0">
          <h2 className="text-text text-display leading-tight font-bold tracking-tight">
            Your financial report at a glance.
          </h2>
          <p className="text-text-dim mt-1.5 text-sm">
            A summary of your recorded farm transactions and financial performance.
          </p>
        </div>
      </header>
      <DemoNote title="Financial reports">
        Income, expenses, cash flow and the PDF reports lenders ask for are worked out from your own
        saved records. Create a free account to start recording and see them here.
      </DemoNote>
    </div>
  );
}

function AccountReports() {
  const [months, setMonths] = useState<ReportMonths>(6);
  const figures = useFinancialSummary(months);
  const summary = figures.summary?.period.months === months ? figures.summary : null;
  const saved = useSavedReports();
  const periodLabel = summary
    ? `${format(new Date(`${summary.period.from}T00:00:00`), 'MMM yyyy')} – ${format(new Date(`${summary.period.to}T00:00:00`), 'MMM yyyy')}`
    : reportRangeLabel(months);

  return (
    <div className="financial-reference @container space-y-5">
      <header className="report-hero">
        <div className="min-w-0">
          <h2 className="text-text text-display leading-tight font-bold tracking-tight">
            Your financial report at a glance.
          </h2>
          <p className="text-text-dim mt-1.5 text-sm">
            A summary of your recorded farm transactions and financial performance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="relative">
            <span className="sr-only">Reporting period</span>
            <CalendarDays
              size={17}
              aria-hidden="true"
              className="text-text pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
            />
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value) as ReportMonths)}
              className="border-border bg-glass text-text h-12 min-w-52 rounded-xl border pr-10 pl-11 text-sm font-semibold"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  Last {m} months
                </option>
              ))}
            </select>
          </label>
          <span className="report-hero-dates">
            <CalendarDays size={16} aria-hidden="true" />
            {periodLabel}
          </span>
        </div>
      </header>

      {figures.status === 'error' && !summary ? (
        <div role="alert" className={panel}>
          <h3 className={title}>Your figures could not be loaded</h3>
          <p className="text-text-dim mt-2 text-sm">{figures.error}</p>
          <p className="text-text-mute mt-2 text-xs">
            We have not shown zero totals because your records could not be checked.
          </p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={figures.retry}>
            Try again
          </Button>
        </div>
      ) : !summary ? (
        <div className={panel}>
          <LogoLoader center label="Loading your recorded figures" className="min-h-56" />
        </div>
      ) : (
        <>
          <Stats summary={summary} />
          <div className="report-layout">
            <CashFlowPanel summary={summary} />
            <CategoryPanel summary={summary} />
            <DownloadPanel
              key={months}
              pageMonths={months}
              summary={summary}
              onCreated={saved.add}
            />
            <RecentTransactionsPanel summary={summary} />
            <ReadinessPanel summary={summary} />
          </div>
        </>
      )}

      <details className="report-saved">
        <summary className="text-text-dim cursor-pointer text-sm font-semibold">
          Saved reports{saved.reports ? ` (${saved.reports.length})` : ''}
        </summary>
        <div className="mt-3">
          <SavedReports saved={saved} />
        </div>
      </details>
    </div>
  );
}

/** "+22% vs previous 6 months" with the right arrow and colour, or why there is none. */
function Change({
  value,
  months,
  upIsGood,
}: {
  value: string | null | undefined;
  months: number;
  upIsGood: boolean;
}) {
  if (value == null)
    return (
      <span className="text-text-mute" title="No earlier figures to compare">
        No earlier comparison
      </span>
    );
  const down = value.startsWith('-');
  const good = down ? !upIsGood : upIsGood;
  const Arrow = down ? ArrowDown : ArrowUp;
  return (
    <span
      className={cn('inline-flex items-center gap-1', good ? 'text-ink-green' : 'text-ink-red')}
    >
      <Arrow size={14} aria-hidden="true" />
      {down ? '' : '+'}
      {Math.round(Number(value))}% vs previous {months} months
    </span>
  );
}

function Stats({ summary }: { summary: FinancialSummary }) {
  const { farm, counts, changeOnPrevious, period } = summary;
  const m = period.months;
  const unverified = counts.total - counts.verified;
  return (
    <dl className="report-stats grid grid-cols-1 gap-4 @xl:grid-cols-2 @5xl:grid-cols-4">
      <Stat
        icon={Coins}
        tone="green"
        label="Farm income"
        value={formatSignedMoney(farm.income.total)}
      >
        <Change value={changeOnPrevious?.income} months={m} upIsGood />
      </Stat>
      <Stat
        icon={ReceiptText}
        tone="red"
        label="Farm expenses"
        value={formatSignedMoney(farm.expenses.total)}
      >
        <Change value={changeOnPrevious?.expenses} months={m} upIsGood={false} />
      </Stat>
      <Stat
        icon={TrendingUp}
        tone="green"
        label="Net farm cash flow"
        info="Farm income minus farm expenses. MoMo and loans are reported separately and not included."
        value={formatSignedMoney(farm.net)}
        valueClass={farm.net.startsWith('-') && Number(farm.net) !== 0 ? 'text-ink-red' : undefined}
      >
        <Change value={changeOnPrevious?.net} months={m} upIsGood />
      </Stat>
      <Stat
        icon={FileSpreadsheet}
        tone="blue"
        label="Total transactions"
        info="All your farm records (including activities and financing) and MoMo entries in this reporting period. Farm income and expenses are calculated separately."
        value={String(counts.total)}
      >
        <span>
          <span className="text-ink-green font-semibold">{counts.verified} verified</span>
          <span className="text-text-dim"> • {unverified} unverified</span>
        </span>
      </Stat>
    </dl>
  );
}

function Stat({
  icon,
  tone,
  label,
  info,
  value,
  valueClass,
  children,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  info?: string;
  value: string;
  valueClass?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(dashPanel, 'report-stat flex gap-4', `report-stat-${tone}`)}>
      {label !== 'Total transactions' && (
        <span className="report-stat-direction" aria-hidden="true">
          {tone === 'red' ? <ArrowDownRight size={24} /> : <TrendingUp size={24} />}
        </span>
      )}
      <span className="pt-1">
        <IconTile icon={icon} tone={tone} />
      </span>
      <div className="min-w-0">
        <dt className="text-text flex items-center gap-1.5 text-sm">
          {label}
          {info && (
            <span title={info}>
              <Info size={15} aria-hidden="true" className="text-text-dim" />
              <span className="sr-only">{info}</span>
            </span>
          )}
        </dt>
        <dd
          className={cn(
            'text-text mt-1 text-xl leading-tight font-bold tabular-nums @6xl:text-2xl',
            valueClass,
          )}
        >
          {value}
        </dd>
        <dd className="@7xl:text-small mt-1.5 text-xs @6xl:whitespace-nowrap">{children}</dd>
      </div>
    </div>
  );
}

/** Creates a PDF on the server for the chosen period and saves it. */
function DownloadPanel({
  pageMonths,
  summary,
  onCreated,
  className,
}: {
  pageMonths: ReportMonths;
  summary: FinancialSummary;
  onCreated: (report: FinancialReport) => void;
  className?: string;
}) {
  const [months, setMonths] = useState<ReportMonths>(pageMonths);
  const [busy, setBusy] = useState(false);
  // For the period on screen we know whether there is anything to report; otherwise the
  // server checks.
  const blocked = months === pageMonths && !hasReportableFigures(summary);

  async function download() {
    setBusy(true);
    try {
      const report = await financialService.createReport(months);
      onCreated(report);
      const { blob, filename } = await financialService.downloadReport(report);
      saveBlob(blob, filename);
      toast.success('Report ready');
    } catch (cause) {
      toast.error(financialReportError(cause, 'pdf'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="download-title"
      className={cn(
        'report-download rounded-card border-accent/25 from-accent/10 to-accent/4 min-w-0 border bg-linear-to-br p-4 sm:p-5',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <IconTile icon={FileText} />
        <h2 id="download-title" className="text-text text-lg font-bold">
          Download financial report
        </h2>
      </div>
      <p className="text-text-dim mt-3 text-sm leading-relaxed">
        Get a professional PDF summary of your transactions, income, expenses and cash flow.
      </p>
      <label htmlFor="download-period" className="text-text mt-4 block text-sm font-semibold">
        Reporting period
      </label>
      <select
        id="download-period"
        value={months}
        onChange={(e) => setMonths(Number(e.target.value) as ReportMonths)}
        className="border-border bg-glass text-text mt-2 h-11 w-full rounded-xl border px-3 text-sm"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            Last {m} months ({reportRangeLabel(m, new Date(), true)})
          </option>
        ))}
      </select>
      <Button
        icon={Download}
        mutates
        loading={busy}
        disabled={blocked}
        onClick={() => void download()}
        className="mt-4 w-full"
      >
        Download PDF Report
      </Button>
      {blocked && (
        <p className="text-text-mute mt-2 text-xs">
          Add an income, expense, financing or MoMo entry in this period first.
        </p>
      )}
    </section>
  );
}

/** The farmer's saved PDF reports (GET /me/reports/financial), shared with the download card. */
function useSavedReports() {
  const [reports, setReports] = useState<FinancialReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    let version = 0;
    function refresh() {
      if (document.visibilityState !== 'visible') return;
      const request = ++version;
      financialService.reports().then(
        (list) => {
          if (!active || request !== version) return;
          setReports(list);
          setError(null);
        },
        (cause) => {
          if (active && request === version) setError(financialReportError(cause, 'reports'));
        },
      );
    }
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [attempt]);
  return {
    reports,
    error,
    retry: () => {
      setError(null);
      setAttempt((n) => n + 1);
    },
    add: (report: FinancialReport) => {
      setReports((list) => [report, ...(list ?? []).filter((r) => r.id !== report.id)]);
      setAttempt((n) => n + 1);
    },
    remove: (id: string) => {
      setReports((list) => (list ?? []).filter((r) => r.id !== id));
      setAttempt((n) => n + 1);
    },
  };
}

function SavedReports({ saved }: { saved: ReturnType<typeof useSavedReports> }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FinancialReport | null>(null);
  const { reports, error } = saved;

  async function download(report: FinancialReport) {
    setBusy(report.id);
    try {
      const { blob, filename } = await financialService.downloadReport(report);
      saveBlob(blob, filename);
    } catch (cause) {
      toast.error(financialReportError(cause, 'download'));
    } finally {
      setBusy(null);
    }
  }

  async function remove(report: FinancialReport) {
    setBusy(report.id);
    try {
      await financialService.deleteReport(report.id);
      saved.remove(report.id);
      toast.success('Report deleted');
    } catch (cause) {
      toast.error(financialReportError(cause, 'reports'));
    } finally {
      setBusy(null);
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="saved-title" className={dashPanel}>
      <h2 id="saved-title" className="text-text text-lg font-bold">
        Saved reports
      </h2>
      <p className="text-text-dim mt-0.5 text-xs">
        PDFs you created, kept in your account. Not a bank statement and not a loan decision: you
        choose whether to share them.
      </p>
      {error ? (
        <div role="alert" className="mt-3 flex flex-wrap items-center gap-3">
          <p className="text-text-dim text-sm">{error}</p>
          <Button size="sm" variant="ghost" onClick={saved.retry}>
            Try again
          </Button>
        </div>
      ) : reports === null ? (
        <LogoLoader size="sm" label="Loading your reports" className="mt-3" />
      ) : reports.length === 0 ? (
        <p className="text-text-dim mt-3 text-sm">No saved reports yet.</p>
      ) : (
        <ul className="divide-border mt-2 divide-y">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-center gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-text text-sm font-semibold">
                  {report.periodMonths} months to {formatGhanaDate(report.periodEnd)}
                </p>
                <p className="text-text-mute text-xs">
                  Created {formatGhanaDate(report.generatedAt)} ·{' '}
                  {Math.ceil(report.sizeBytes / 1024)} KB
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={Download}
                loading={busy === report.id}
                onClick={() => void download(report)}
              >
                Download
              </Button>
              <button
                type="button"
                aria-label={`Delete the report created ${formatGhanaDate(report.generatedAt)}`}
                onClick={() => setDeleting(report)}
                className="text-text-dim hover:bg-glass-strong hover:text-text inline-flex size-9 items-center justify-center rounded-lg"
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this report?"
        message="The PDF is removed from your account. Your records are not affected."
        confirmLabel="Delete report"
        danger
        loading={busy !== null && busy === deleting?.id}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
      />
    </section>
  );
}

/** Shown above the figures when the period has no money entries: how to start. */
export function EmptyFinancialReport({
  months,
  firstRecord,
}: {
  months: ReportMonths;
  firstRecord: boolean;
}) {
  const openModal = useModalStore((s) => s.openModal);
  return (
    <section className={cn(panel, 'space-y-5')} aria-labelledby="empty-report-title">
      <div className="bg-icon-bg text-icon inline-flex size-12 items-center justify-center rounded-xl">
        <FileText size={24} aria-hidden="true" />
      </div>
      <div>
        <h3 id="empty-report-title" className={title}>
          {firstRecord
            ? 'Your report starts with your first record'
            : 'No financial entries in this reporting period'}
        </h3>
        <p className="text-text-dim mt-2 max-w-2xl text-sm leading-relaxed">
          {firstRecord
            ? 'You have not recorded any financial activity yet.'
            : `No income, expenses, financing or MoMo entries were found for these ${months} months.`}{' '}
          {firstRecord ? 'Your chart starts the month you record your first entry.' : ''}
        </p>
      </div>
      <p className="text-text-mute text-xs">
        Only recorded activity appears in a report. No example transactions or estimated earnings
        are added.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button mutates icon={FileText} onClick={() => openModal('record')}>
          {firstRecord ? 'Add your first record' : 'Add a record'}
        </Button>
        <Link
          href="/momo"
          className="text-ink-green inline-flex min-h-11 items-center text-sm font-semibold hover:underline"
        >
          Record a MoMo payment
        </Link>
      </div>
    </section>
  );
}
