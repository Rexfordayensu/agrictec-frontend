// Loan applications through the API. The farmer app creates them (services/loans.service.ts);
// lenders' decisions move them along the pipeline here, and every move is audited.

import type { StatusChangeInput } from '@/lib/admin/loan-pipeline';
import { api, ApiError, apiFile } from '@/services/api';
import type { LoanApplication, LoanApplicationFilter, LoanStatus } from '@/types/admin';

const application = (id: string) => `/admin/loan-applications/${encodeURIComponent(id)}`;

export const loanApplicationsService = {
  /** Newest first. */
  async list(filter: LoanApplicationFilter = {}): Promise<LoanApplication[]> {
    return api<LoanApplication[]>('/admin/loan-applications', {
      query: { status: filter.status, partnerId: filter.partnerId, userId: filter.userId },
    });
  },

  /** False once the farmer's account was permanently deleted (the application stays on record). */
  async farmerExists(userId: string): Promise<boolean> {
    try {
      await api(`/admin/farmers/${encodeURIComponent(userId)}`);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return false;
      throw error;
    }
  },

  async get(id: string): Promise<LoanApplication> {
    return api<LoanApplication>(application(id));
  },

  /** A farmer's own applications, newest first (the farmer app). */
  async listForFarmer(_userId: string): Promise<LoanApplication[]> {
    return api<LoanApplication[]>('/me/loans/applications');
  },

  /**
   * Moves an application along the pipeline. Invalid jumps are refused; approved, rejected and
   * defaulted need a note; disbursed needs the date and the transfer reference.
   */
  async updateStatus(
    id: string,
    status: LoanStatus,
    input: string | StatusChangeInput = {},
  ): Promise<LoanApplication> {
    const details = typeof input === 'string' ? { note: input } : input;
    return api<LoanApplication>(`${application(id)}/status`, {
      method: 'POST',
      body: { status, ...details },
    });
  },

  /** The applications (all, or these IDs) as CSV. No farmer contact details. Audited. */
  async exportCSV(ids?: string[]): Promise<string> {
    return (await apiFile('/admin/loan-applications/export', { method: 'POST', body: { ids } })).content;
  },
};
