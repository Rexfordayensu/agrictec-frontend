// Farmer administration through the API. The API checks the admin's permission on every call
// and writes the audit entry in the same transaction as the change.

import { api, apiFile } from '@/services/api';
import type { FarmerAccount, FarmerDetail } from '@/types/admin';

const farmer = (id: string) => `/admin/farmers/${encodeURIComponent(id)}`;

export const farmersService = {
  /** Every farmer account (including guests) with their data summarised. */
  async list(): Promise<FarmerAccount[]> {
    return api<FarmerAccount[]>('/admin/farmers');
  },

  /** Records, MoMo, diagnoses, the score breakdown and the live rules it was calculated with. */
  async getDetail(id: string): Promise<FarmerDetail> {
    return api<FarmerDetail>(`${farmer(id)}/detail`);
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
