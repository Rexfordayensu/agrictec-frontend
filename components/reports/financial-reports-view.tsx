'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileText, Info, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { financialReportError, hasReportableFigures } from '@/lib/financial-report-state';
import { formatTransactionMoney } from '@/lib/transactions';
import { useFarmStore } from '@/store/farm-store';
import { useModalStore } from '@/store/modal-store';
import { fromFinancialSummary } from '@/lib/dashboard-summary';
import { formatGhanaDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { financialService } from '@/services/financial.service';
import { useCreditStore } from '@/store/credit-store';
import type {
  FinancialReport,
  FinancialSummary,
  ReportMonths,
  VerifiedLine,
} from '@/types/financial';
import { LogoLoader } from '@/components/ui/logo-loader';

const panel = 'border-border bg-glass rounded-card min-w-0 border p-5 sm:p-6';
const title = 'text-text text-[17px] font-semibold';
const sub = 'text-text-mute mt-1 text-xs leading-relaxed';
const money = (value: string) => formatTransactionMoney(value);
const NO_GAPS: string[] = [];

/**
 * Financial reports: the farmer's recorded figures for 3, 6 or 12 months, worked out by the
 * server with exact decimals, and PDF reports generated and kept on the server. Every figure
 * shows how much of it is verified. Not a bank statement and not a loan decision.
 */
export function FinancialReportsView() {
  const [months, setMonths] = useState<ReportMonths>(6);
  const figures = useFinancialSummary(months);
  const summary = figures.summary?.period.months === months ? figures.summary : null;
  // Select the stored array itself: a `?? []` inside the selector makes a new array on every
  // read before the summary loads, which re-renders forever.
  const storedMissing = useCreditStore((s) => s.summary?.missing);
  const creditStatus = useCreditStore((s) => s.status);
  const records = useFarmStore((s) => s.records);
  const momo = useFarmStore((s) => s.momo);
  const farmStatus = useFarmStore((s) => s.status);
  const knownEmpty =
    farmStatus === 'ready' && !records.some((r) => r.type !== 'activity') && momo.length === 0;
  const emptyPeriod = summary ? !hasReportableFigures(summary) : knownEmpty;
  const canGenerate = Boolean(
    summary && hasReportableFigures(summary) && figures.status !== 'error',
  );
  const disabledReason = !summary
    ? figures.status === 'error'
      ? 'Report creation will be available when your recorded figures can be loaded.'
      : 'Loading your recorded figures before creating a report.'
    : emptyPeriod
      ? 'Add a farm income, expense, financing or MoMo entry in this period before creating a report.'
      : undefined;

  const missing = storedMissing ?? NO_GAPS;

  return (
    <div className="@container space-y-6">
      <header className="flex flex-col gap-4 @2xl:flex-row @2xl:items-end @2xl:justify-between">
        <div className="min-w-0">
          <p className="text-ink-green text-[11px] font-semibold tracking-[1.6px] uppercase">
            Financial reports
          </p>
          <h2 className="text-text mt-2 text-[clamp(24px,3vw,32px)] leading-tight font-semibold">
            Your recorded figures
          </h2>
          <p className="text-text-dim mt-2 max-w-2xl text-sm leading-relaxed">
            Worked out by AgriCtec from the records in your account. Verified means an AgriCtec
            reviewer checked the evidence; everything else is self-reported.
          </p>
        </div>
        <div
          role="group"
          aria-label="Reporting period"
          className="glass inline-flex gap-1 self-start rounded-2xl p-1"
        >
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={months === m}
              onClick={() => setMonths(m)}
              className={cn(
                'min-h-10 rounded-xl px-4 text-sm font-semibold whitespace-nowrap',
                months === m ? 'bg-accent/20 text-ink-green' : 'text-text-dim hover:text-text',
              )}
            >
              {m} months
            </button>
          ))}
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
        // The figures and the chart always show; with nothing recorded yet, a prompt sits above.
        <>
          {emptyPeriod && (
            <EmptyFinancialReport
              months={months}
              firstRecord={
                summary.firstRecordedOn === undefined ? knownEmpty : summary.firstRecordedOn === null
              }
            />
          )}
          <Figures summary={summary} />
        </>
      )}

      <div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_360px]">
        <Reports months={months} canGenerate={canGenerate} disabledReason={disabledReason} />
        <section aria-labelledby="missing-title" className={panel}>
          <h3 id="missing-title" className={title}>
            What would strengthen your records
          </h3>
          {emptyPeriod ? (
            <p className="text-text-dim mt-3 text-sm">
              Start with a sale, a farm cost or a MoMo payment. Add the actual date and amount, then
              attach a receipt if you have one.
            </p>
          ) : storedMissing === undefined ? (
            creditStatus === 'loading' ? (
              <LogoLoader size="sm" label="Checking your records" className="mt-3" />
            ) : (
              <p className="text-text-mute mt-3 text-sm">
                Keep clear descriptions and supporting receipts with your entries. Guidance will
                update when your records can be checked.
              </p>
            )
          ) : missing.length === 0 ? (
            <p className="text-text-dim mt-3 text-sm">Nothing missing right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {missing.map((item) => (
                <li key={item} className="text-text-dim flex gap-2 text-sm">
                  <Info size={15} aria-hidden="true" className="text-ink-gold mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
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
      <div className="bg-accent/10 text-ink-green inline-flex size-12 items-center justify-center rounded-2xl">
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

function Figure({
  label,
  line,
  children,
}: {
  label: string;
  line?: VerifiedLine;
  children?: ReactNode;
}) {
  return (
    <div className="border-border min-w-0 rounded-2xl border p-4">
      <dt className="text-text-dim text-xs font-semibold">{label}</dt>
      <dd className="text-text mt-1.5 text-xl font-semibold wrap-break-word tabular-nums">
        {line ? money(line.total) : children}
      </dd>
      {line && (
        <dd className="text-text-mute mt-1 text-xs">
          {money(line.verified)} verified · {Number(line.verifiedShare)}%
        </dd>
      )}
    </div>
  );
}

function Figures({ summary }: { summary: FinancialSummary }) {
  const { palette } = useChartTheme();
  const view = fromFinancialSummary(summary);
  const { farm, momo, financing, obligations, counts } = summary;
  // Recording began inside this period: the chart starts that month, not at the period's start.
  const started = summary.firstRecordedOn;
  const startedLabel =
    started && started.slice(0, 7) > summary.period.from.slice(0, 7)
      ? new Date(`${started.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString('en-GH', {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;
  return (
    <section aria-labelledby="figures-title" className={cn(panel, 'space-y-5')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="figures-title" className={title}>
          {view.periodLabel}
        </h3>
        <p className="text-text-mute text-xs">
          {counts.total} {counts.total === 1 ? 'entry' : 'entries'} ·{' '}
          {Number(summary.verifiedShare.byCount)}% verified
          {summary.dataAsOf ? ` · updated ${formatGhanaDate(summary.dataAsOf)}` : ''}
        </p>
      </div>
      {summary.insufficient && summary.counts.total > 0 && (
        <p className="border-gold/40 bg-gold/10 text-text rounded-xl border px-3 py-2 text-xs">
          {startedLabel
            ? `You started recording in ${startedLabel}, so the chart starts there. `
            : `Your records cover ${summary.monthsWithRecords} of these ${summary.period.months} months. `}
          The figures show only what was recorded; nothing is projected.
        </p>
      )}
      <dl className="grid grid-cols-1 gap-3 @lg:grid-cols-3">
        <Figure label="Farm income" line={farm.income} />
        <Figure label="Farm expenses" line={farm.expenses} />
        <Figure label="Net farm cash flow">
          <span className={Number(farm.net) < 0 ? 'text-ink-red' : ''}>{money(farm.net)}</span>
        </Figure>
      </dl>
      <LineChart
        height={210}
        showLegend={false}
        labels={view.series.labels}
        datasets={[
          { label: 'Income', data: view.series.income, color: palette.accent, fill: true },
          { label: 'Expenses', data: view.series.expense, color: palette.danger },
        ]}
        ariaLabel={`Recorded farm income and expenses by month, ${view.periodLabel}.`}
      />
      <dl className="grid grid-cols-1 gap-3 @lg:grid-cols-3">
        <Figure label="Mobile Money (kept separate)">{`${money(momo.net)} net`}</Figure>
        <Figure label="Loans and financing in" line={financing.in} />
        <Figure label="Loans and financing out" line={financing.out} />
      </dl>
      <p className="text-text-mute text-xs">
        Loans as you recorded them: {money(obligations.disbursed)} received,{' '}
        {money(obligations.repaid)} repaid, {money(obligations.outstanding)} outstanding. This is
        your own record, not a confirmed balance.
      </p>
    </section>
  );
}

function Reports({
  months,
  canGenerate,
  disabledReason,
}: {
  months: ReportMonths;
  canGenerate: boolean;
  disabledReason?: string;
}) {
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reports, setReports] = useState<FinancialReport[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FinancialReport | null>(null);

  useEffect(() => {
    let active = true;
    financialService.reports().then(
      (list) => {
        if (active) {
          setReports(list);
          setLoadError(null);
        }
      },
      (error) => {
        if (active) setLoadError(financialReportError(error, 'reports'));
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  async function save(report: FinancialReport) {
    setBusy(report.id);
    try {
      const { blob, filename } = await financialService.downloadReport(report);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) {
      toast.error(financialReportError(cause, 'download'));
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy('new');
    try {
      const report = await financialService.createReport(months);
      setReports((list) => [report, ...(list ?? [])]);
      toast.success('Report ready');
      await save(report);
    } catch (cause) {
      toast.error(financialReportError(cause, 'pdf'));
    } finally {
      setBusy(null);
    }
  }

  async function remove(report: FinancialReport) {
    setBusy(report.id);
    try {
      await financialService.deleteReport(report.id);
      setReports((list) => (list ?? []).filter((r) => r.id !== report.id));
      toast.success('Report deleted');
    } catch (cause) {
      toast.error(financialReportError(cause, 'reports'));
    } finally {
      setBusy(null);
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="reports-title" className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="reports-title" className={title}>
            PDF reports
          </h3>
          <p className={sub}>
            A summary of your recorded figures, prepared by AgriCtec. It is not a bank statement and
            not a loan decision. You choose whether to share it.
          </p>
        </div>
        <Button
          icon={FileText}
          mutates
          loading={busy === 'new'}
          disabled={!canGenerate || Boolean(loadError)}
          aria-describedby="report-requirement"
          onClick={generate}
        >
          Create {months}-month report
        </Button>
      </div>
      {disabledReason && (
        <p id="report-requirement" className="text-text-mute mt-3 text-xs">
          {disabledReason}
        </p>
      )}
      {loadError ? (
        <div role="alert" className="mt-4 space-y-2">
          <p className="text-text-dim text-sm">{loadError}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setLoadError(null);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </Button>
        </div>
      ) : reports === null ? (
        <LogoLoader size="sm" label="Loading your reports" className="mt-4" />
      ) : reports.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">
          No saved reports yet. Your PDFs will appear here after you create a report.
        </p>
      ) : (
        <ul className="divide-border mt-3 divide-y">
          {reports.map((report) => (
            <li key={report.id} className="flex flex-wrap items-center gap-3 py-3">
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
                onClick={() => save(report)}
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
