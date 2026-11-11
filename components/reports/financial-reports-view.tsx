'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Download, FileText, Info, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { LineChart } from '@/components/charts/line-chart';
import { useChartTheme } from '@/components/charts/use-chart-theme';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useFinancialSummary } from '@/hooks/use-financial-summary';
import { fromFinancialSummary } from '@/lib/dashboard-summary';
import { formatGHS, formatGhanaDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { financialService } from '@/services/financial.service';
import { useCreditStore } from '@/store/credit-store';
import type {
  FinancialReport,
  FinancialSummary,
  ReportMonths,
  VerifiedLine,
} from '@/types/financial';

const panel = 'border-border bg-glass rounded-card min-w-0 border p-5 sm:p-6';
const title = 'text-text text-[17px] font-semibold';
const sub = 'text-text-mute mt-1 text-xs leading-relaxed';
const money = (value: string) => formatGHS(Number(value));

/**
 * Financial reports: the farmer's recorded figures for 3, 6 or 12 months, worked out by the
 * server with exact decimals, and PDF reports generated and kept on the server. Every figure
 * shows how much of it is verified. Not a bank statement and not a loan decision.
 */
export function FinancialReportsView() {
  const [months, setMonths] = useState<ReportMonths>(6);
  const figures = useFinancialSummary(months);
  const summary = figures.summary?.period.months === months ? figures.summary : null;
  const missing = useCreditStore((s) => s.summary?.missing ?? []);

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
          <p className="text-ink-red text-sm">{figures.error}</p>
          <Button size="sm" variant="ghost" className="mt-3" onClick={figures.retry}>
            Try again
          </Button>
        </div>
      ) : !summary ? (
        <Skeleton className="rounded-card h-64 w-full" />
      ) : (
        <Figures summary={summary} />
      )}

      <div className="grid grid-cols-1 items-start gap-6 @4xl:grid-cols-[minmax(0,1fr)_360px]">
        <Reports months={months} />
        <section aria-labelledby="missing-title" className={panel}>
          <h3 id="missing-title" className={title}>
            What would strengthen your records
          </h3>
          {missing.length === 0 ? (
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
  return (
    <section aria-labelledby="figures-title" className={cn(panel, 'space-y-5')}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="figures-title" className={title}>
          {view.periodLabel}
        </h3>
        <p className="text-text-mute text-xs">
          {counts.total} entries · {Number(summary.verifiedShare.byCount)}% verified
          {summary.dataAsOf ? ` · updated ${formatGhanaDate(summary.dataAsOf)}` : ''}
        </p>
      </div>
      {summary.insufficient && (
        <p className="border-gold/40 bg-gold/10 text-text rounded-xl border px-3 py-2 text-xs">
          Your records cover {summary.monthsWithRecords} of these {summary.period.months} months.
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

function Reports({ months }: { months: ReportMonths }) {
  const [reports, setReports] = useState<FinancialReport[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FinancialReport | null>(null);

  useEffect(() => {
    let active = true;
    financialService.reports().then(
      (list) => active && setReports(list),
      () => active && setReports([]),
    );
    return () => {
      active = false;
    };
  }, []);

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
      toast.error(cause instanceof Error ? cause.message : 'Could not download the report');
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
      toast.error(cause instanceof Error ? cause.message : 'Could not create the report');
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
      toast.error(cause instanceof Error ? cause.message : 'Could not delete the report');
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
        <Button icon={FileText} mutates loading={busy === 'new'} onClick={generate}>
          Create {months}-month report
        </Button>
      </div>
      {reports === null ? (
        <p className="text-text-mute mt-4 flex items-center gap-2 text-sm">
          <Loader2 size={14} aria-hidden="true" className="animate-spin" /> Loading…
        </p>
      ) : reports.length === 0 ? (
        <p className="text-text-dim mt-4 text-sm">No reports yet.</p>
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
