// Reports & analytics through the API (reports.export). The API builds every report from the
// whole platform; every download is written to the audit log as "report.export".

import { REPORT_CATALOG, type AdminReport, type ReportId } from '@/lib/admin/admin-reports';
import type { BuilderResult, BuilderSpec } from '@/lib/admin/report-builder';
import { generateAdminReportPDF } from '@/lib/pdf/generate-admin-report';
import { api, apiFile } from '@/services/api';
import { useAdminAuthStore } from '@/store/admin/admin-auth-store';

export type ReportFormat = 'csv' | 'pdf';

/** Every ready-made report, built by the API from the latest data. */
export type ReportData = Record<ReportId, AdminReport>;

const builderBody = ({ dataset, columns, region, crop, from, to }: BuilderSpec) => ({
  dataset,
  columns,
  region: region || undefined,
  crop: crop || undefined,
  from: from || undefined,
  to: to || undefined,
});

export const reportsService = {
  /** The six ready-made reports (for the cards and their previews). */
  async load(): Promise<ReportData> {
    const reports = await Promise.all(REPORT_CATALOG.map(({ id }) => reportsService.build(id)));
    return Object.fromEntries(reports.map((report) => [report.id, report])) as ReportData;
  },

  /** One ready-made report, built from the latest data (the preview; not logged). */
  async build(id: ReportId): Promise<AdminReport> {
    return api<AdminReport>(`/admin/reports/${id}`);
  },

  /**
   * Downloads a ready-made report. CSV comes from the API; the PDF is drawn here from the
   * report the API returns. Both are logged.
   */
  async exportReport(
    id: ReportId,
    format: ReportFormat,
  ): Promise<{ filename: string; content: string | Blob }> {
    if (format === 'csv') {
      const { filename, content } = await apiFile(`/admin/reports/${id}/export`, {
        method: 'POST',
        query: { format },
      });
      return { filename, content };
    }
    const { filename, report } = await api<{ filename: string; report: AdminReport }>(
      `/admin/reports/${id}/export`,
      { method: 'POST', query: { format } },
    );
    const adminName = useAdminAuthStore.getState().admin?.name ?? 'Admin';
    return { filename, content: await generateAdminReportPDF(report, adminName) };
  },

  /** The builder's preview (no export, so not logged). */
  async preview(spec: BuilderSpec): Promise<BuilderResult> {
    return api<BuilderResult>('/admin/reports/builder/preview', { method: 'POST', body: builderBody(spec) });
  },

  /** The builder's CSV. Logged with the dataset, columns and filters used. */
  async exportCustom(spec: BuilderSpec): Promise<{ filename: string; csv: string; rows: number }> {
    const { filename, content, headers } = await apiFile('/admin/reports/builder/export', {
      method: 'POST',
      body: builderBody(spec),
    });
    return { filename, csv: content, rows: Number(headers.get('X-Row-Count') ?? 0) };
  },
};
