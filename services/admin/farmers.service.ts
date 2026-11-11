// Farmer administration through the API. The API checks the admin's permission on every call
// and writes the audit entry in the same transaction as the change.

import { api, apiBlob, apiFile } from '@/services/api';
import type { FarmerAccount, FarmerDetail } from '@/types/admin';
import type { FinancialReport, FinancialSummary, ReportMonths } from '@/types/financial';

const farmer = (id: string) => `/admin/farmers/${encodeURIComponent(id)}`;

/** A page of the farmers list from GET /admin/farmers/page. */
export interface FarmerPage {
  items: FarmerAccount[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  /** Everyone (guests aside), by status: the counts on the status tabs. */
  summary: Record<'all' | FarmerAccount['status'], number>;
  /** The options the filters offer. */
  facets: { regions: string[]; crops: string[]; tags: string[] };
  /** Every matching ID, only when asked for with ids=1. */
  ids?: string[];
}

export const farmersService = {
  /**
   * One page of the farmers list, searched, filtered and sorted by the API (guests left out).
   * `params` are the list's URL parameters (q, region, status, sort, dir, page…).
   */
  async page(params: Record<string, string>, signal?: AbortSignal): Promise<FarmerPage> {
    return api<FarmerPage>('/admin/farmers/page', { query: params, signal });
  },

  /** Only the farmers named (at most 500): the ones behind the queues the console shows. */
  async lookup(ids: string[]): Promise<FarmerAccount[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return [];
    const pages: string[][] = [];
    for (let i = 0; i < unique.length; i += 500) pages.push(unique.slice(i, i + 500));
    const found = await Promise.all(
      pages.map((chunk) =>
        api<FarmerAccount[]>('/admin/farmers/lookup', { method: 'POST', body: { ids: chunk } }),
      ),
    );
    return found.flat();
  },

  /** Records, MoMo, diagnoses, the score breakdown and the live rules it was calculated with. */
  async getDetail(id: string): Promise<FarmerDetail> {
    return api<FarmerDetail>(`${farmer(id)}/detail`);
  },

  /** The farmer's own figures (farmers.view). Each look is written to the audit log. */
  async financialSummary(id: string, months: ReportMonths): Promise<FinancialSummary> {
    return api<FinancialSummary>(`${farmer(id)}/financial-summary`, { query: { months } });
  },

  async reports(id: string): Promise<FinancialReport[]> {
    return api<FinancialReport[]>(`${farmer(id)}/reports`);
  },

  /** A report the farmer generated (each download is audited). */
  async reportFile(id: string, reportId: string): Promise<Blob> {
    return apiBlob(`${farmer(id)}/reports/${encodeURIComponent(reportId)}/file`);
  },

  async get(id: string): Promise<FarmerAccount> {
    return api<FarmerAccount>(farmer(id));
  },

  /** The farmer is signed out everywhere at once. */
  async suspend(id: string, reason: string): Promise<FarmerAccount> {
    return api<FarmerAccount>(`${farmer(id)}/suspend`, { method: 'POST', body: { reason } });
  },

  async reactivate(id: string): Promise<FarmerAccount> {
    return api<FarmerAccount>(`${farmer(id)}/reactivate`, { method: 'POST' });
  },

  /**
   * Permanently deletes the farmer and their data. Loan applications stay on record as
   * "Farmer deleted". `confirmation` must be their email or name.
   */
  async remove(id: string, confirmation: string): Promise<void> {
    await api(`${farmer(id)}/delete`, { method: 'POST', body: { confirmation } });
  },

  async addNote(id: string, text: string): Promise<FarmerAccount['adminNotes'][number]> {
    return api(`${farmer(id)}/notes`, { method: 'POST', body: { text } });
  },

  async setTags(id: string, tags: string[]): Promise<string[]> {
    return api<string[]>(`${farmer(id)}/tags`, { method: 'PUT', body: { tags } });
  },

  /** A one-time password, shown once; never logged. */
  async resetPassword(id: string): Promise<string> {
    const { temporaryPassword } = await api<{ temporaryPassword: string }>(
      `${farmer(id)}/reset-password`,
      { method: 'POST' },
    );
    return temporaryPassword;
  },

  /** One farmer's records as CSV (newest first). Only the count is logged. */
  async exportRecordsCSV(id: string): Promise<string> {
    return (await apiFile(`${farmer(id)}/records.csv`)).content;
  },

  /** CSV of the given farmers (or all). Never a password hash or Ghana Card digits. */
  async exportCSV(ids?: string[]): Promise<string> {
    return (await apiFile('/admin/farmers/export', { method: 'POST', body: { ids } })).content;
  },
};
