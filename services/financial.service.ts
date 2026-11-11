// The farmer's financial summary and server-generated reports (app/routers/me.py).

import { api, apiBlob } from '@/services/api';
import type { FinancialReport, FinancialSummary, ReportMonths } from '@/types/financial';

export const financialService = {
  /** Exact totals for the last 3, 6 or 12 months, verified vs self-reported. */
  async summary(months: ReportMonths, signal?: AbortSignal): Promise<FinancialSummary> {
    return api<FinancialSummary>('/me/financial-summary', { query: { months }, signal });
  },

  async reports(): Promise<FinancialReport[]> {
    return api<FinancialReport[]>('/me/reports/financial');
  },

  /** Builds a PDF of the recorded figures on the server and keeps it. */
  async createReport(months: ReportMonths): Promise<FinancialReport> {
    return api<FinancialReport>('/me/reports/financial', { method: 'POST', body: { months } });
  },

  /** The stored PDF (authenticated like every API call, read-only view included). */
  async downloadReport(report: FinancialReport): Promise<{ blob: Blob; filename: string }> {
    const blob = await apiBlob(`/me/reports/financial/${encodeURIComponent(report.id)}/file`);
    return {
      blob,
      filename: `AgriCtec_Financial_Summary_${report.periodEnd}_${report.periodMonths}m.pdf`,
    };
  },

  async deleteReport(id: string): Promise<void> {
    await api(`/me/reports/financial/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
};
