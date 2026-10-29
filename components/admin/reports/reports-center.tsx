'use client';

import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  Eye,
  FileSpreadsheet,
  FileText,
  Gauge,
  Landmark,
  LayoutDashboard,
  Map,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/admin/layout/page-header';
import { ReportBuilder } from '@/components/admin/reports/report-builder';
import { ReportPreview } from '@/components/admin/reports/report-preview';
import { ScheduledNote } from '@/components/admin/reports/scheduled-note';
import { Skeleton } from '@/components/ui/skeleton';
import {
  REPORT_CATALOG,
  type AdminReport,
  type ReportId,
} from '@/lib/admin/admin-reports';
import { downloadFile } from '@/lib/export/csv';
import { cn } from '@/lib/utils';
import {
  reportsService,
  type ReportData,
  type ReportFormat,
} from '@/services/admin/reports.service';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

const ICONS: Record<ReportId, { icon: LucideIcon; tone: string }> = {
  platform: { icon: LayoutDashboard, tone: 'bg-purple/12 text-ink-purple' },
  regions: { icon: Map, tone: 'bg-accent/12 text-ink-green' },
  loans: { icon: Landmark, tone: 'bg-gold/15 text-ink-gold' },
  credit: { icon: Gauge, tone: 'bg-info/12 text-ink-blue' },
  verifications: { icon: BadgeCheck, tone: 'bg-accent/12 text-ink-green' },
  risk: { icon: ShieldAlert, tone: 'bg-danger/12 text-ink-red' },
};

const iconButton =
  'border-border text-text-dim hover:text-text hover:bg-glass-strong inline-flex min-h-10 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-50';

/**
 * Reports & analytics (phase A14): six ready-made reports (preview, CSV, landscape PDF), a custom
 * report builder and a note on scheduled reports. Every download is audited.
 */
export function ReportsCenter() {
  const [data, setData] = useState<ReportData | null>(null);
  const [preview, setPreview] = useState<AdminReport | null>(null);
  const [busy, setBusy] = useState<{ id: ReportId; format: ReportFormat } | null>(null);
  const syncVersion = useAdminDataStore((s) => s.syncVersion);

  useEffect(() => {
    let active = true;
    reportsService.load().then(
      (loaded) => active && setData(loaded),
      (cause: unknown) =>
        active && toast.error(cause instanceof Error ? cause.message : 'Could not load the data'),
    );
    return () => {
      active = false;
    };
  }, [syncVersion]);

  async function exportReport(id: ReportId, format: ReportFormat) {
    setBusy({ id, format });
    try {
      const { filename, content } = await reportsService.exportReport(id, format);
      downloadFile(content, filename, format === 'pdf' ? 'application/pdf' : undefined);
      toast.success(`${filename} downloaded`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Could not export the report');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reports & analytics"
        description="Ready-made reports for partners and the board, and a builder for anything else. Every export is recorded in the audit log."
      />

      <section aria-labelledby="ready-title">
        <h2 id="ready-title" className="text-text mb-3 text-sm font-semibold">
          Ready-made reports
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {REPORT_CATALOG.map((meta) => {
            const { icon: Icon, tone } = ICONS[meta.id];
            const report = data?.[meta.id] ?? null;
            const working = busy?.id === meta.id;
            return (
              <li
                key={meta.id}
                className="border-border bg-glass hover:border-purple/40 flex flex-col rounded-2xl border p-5 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'inline-flex size-11 shrink-0 items-center justify-center rounded-xl',
                      tone,
                    )}
                  >
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-text text-[15px] font-semibold">{meta.title}</h3>
                    <p className="text-text-mute mt-0.5 text-xs leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {report
                    ? report.summary.slice(0, 2).map((item) => (
                        <div key={item.label} className="bg-bg-2/60 rounded-xl px-3 py-2">
                          <dt className="text-text-mute truncate text-[11px]">{item.label}</dt>
                          <dd className="text-text font-display truncate text-base font-bold tabular-nums">
                            {item.value}
                          </dd>
                        </div>
                      ))
                    : [0, 1].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </dl>

                <div className="mt-4 flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={!report}
                    onClick={() => report && setPreview(report)}
                    className="bg-purple/12 text-ink-purple hover:bg-purple/20 inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors disabled:opacity-50"
                  >
                    <Eye size={15} aria-hidden="true" />
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void exportReport(meta.id, 'csv')}
                    aria-label={`Download ${meta.title} as CSV`}
                    className={iconButton}
                  >
                    <FileSpreadsheet size={15} aria-hidden="true" />
                    {working && busy?.format === 'csv' ? 'Exporting…' : 'CSV'}
                  </button>
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void exportReport(meta.id, 'pdf')}
                    aria-label={`Download ${meta.title} as PDF`}
                    className={iconButton}
                  >
                    <FileText size={15} aria-hidden="true" />
                    {working && busy?.format === 'pdf' ? 'Exporting…' : 'PDF'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ReportBuilder />
      <ScheduledNote />

      <ReportPreview
        report={preview}
        onClose={() => setPreview(null)}
        busy={preview && busy?.id === preview.id ? busy.format : null}
        onExport={(format) => preview && void exportReport(preview.id, format)}
      />
    </div>
  );
}
