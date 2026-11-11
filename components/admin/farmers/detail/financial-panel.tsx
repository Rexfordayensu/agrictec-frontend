'use client';

import { useState } from 'react';
import { Download, Eye, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatGHS, formatGhanaDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { farmersService } from '@/services/admin/farmers.service';
import type {
  FinancialReport,
  FinancialSummary,
  ReportMonths,
  VerifiedLine,
} from '@/types/financial';

const money = (v: string) => formatGHS(Number(v));

/**
 * A farmer's recorded figures and the reports they generated, read-only. Loaded only when an
 * admin asks (each look and each download is written to the audit log), never by default.
 */
export function FinancialPanel({ userId }: { userId: string }) {
  const [months, setMonths] = useState<ReportMonths>(6);
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [reports, setReports] = useState<FinancialReport[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(period: ReportMonths) {
    setBusy(true);
    try {
      const [figures, list] = await Promise.all([
        farmersService.financialSummary(userId, period),
        reports ? Promise.resolve(reports) : farmersService.reports(userId),
      ]);
      setMonths(period);
      setSummary(figures);
      setReports(list);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not load the figures');
    } finally {
      setBusy(false);
    }
  }

  async function download(report: FinancialReport) {
    try {
      const blob = await farmersService.reportFile(userId, report.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AgriCtec_Financial_Summary_${report.periodEnd}_${report.periodMonths}m.pdf`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not download the report');
    }
  }

  const line = (label: string, l: VerifiedLine) => (
    <div className="border-border rounded-xl border p-3">
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className="text-text font-semibold tabular-nums">{money(l.total)}</dd>
      <dd className="text-text-mute text-xs">{Number(l.verifiedShare)}% verified</dd>
    </div>
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-text text-base font-semibold">Recorded finances</h3>
          <p className="text-text-mute mt-1 flex items-center gap-1.5 text-xs">
            <ShieldAlert size={13} aria-hidden="true" /> The farmer’s own figures. Viewing them is
            recorded in the audit log.
          </p>
        </div>
        {summary ? (
          <div role="group" aria-label="Period" className="flex gap-1">
            {([3, 6, 12] as const).map((m) => (
              <Button
                key={m}
                size="sm"
                variant="ghost"
                aria-pressed={months === m}
                className={cn(months === m && 'bg-accent/20 text-ink-green')}
                disabled={busy}
                onClick={() => load(m)}
              >
                {m} months
              </Button>
            ))}
          </div>
        ) : (
          <Button size="sm" icon={Eye} loading={busy} onClick={() => load(months)}>
            Show figures
          </Button>
        )}
      </div>

      {summary && (
        <div className="mt-4 space-y-4">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {line('Farm income', summary.farm.income)}
            {line('Farm expenses', summary.farm.expenses)}
            <div className="border-border rounded-xl border p-3">
              <dt className="text-text-mute text-xs">Net farm cash flow</dt>
              <dd className="text-text font-semibold tabular-nums">{money(summary.farm.net)}</dd>
            </div>
            <div className="border-border rounded-xl border p-3">
              <dt className="text-text-mute text-xs">MoMo net (separate)</dt>
              <dd className="text-text font-semibold tabular-nums">{money(summary.momo.net)}</dd>
            </div>
          </dl>
          <p className="text-text-dim text-xs">
            {summary.counts.total} entries, {Number(summary.verifiedShare.byCount)}% verified ·
            loans as recorded: {money(summary.obligations.outstanding)} outstanding
            {summary.insufficient
              ? ` · records cover ${summary.monthsWithRecords} of ${summary.period.months} months`
              : ''}
          </p>
          <div>
            <p className="text-text text-sm font-semibold">Reports the farmer generated</p>
            {reports && reports.length > 0 ? (
              <ul className="divide-border mt-1 divide-y">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="text-text-dim">
                      {r.periodMonths} months to {formatGhanaDate(r.periodEnd)} · created{' '}
                      {formatGhanaDate(r.generatedAt)}
                    </span>
                    <Button size="sm" variant="ghost" icon={Download} onClick={() => download(r)}>
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-text-mute mt-1 text-sm">None yet.</p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
