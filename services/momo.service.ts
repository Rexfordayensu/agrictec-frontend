import { api, apiBlob, apiUpload } from '@/services/api';
import type { MomoTransaction, NewMomoInput } from '@/types';
import type { MomoSummary } from '@/types/momo-summary';

// The API scopes every call to the signed-in farmer; `userId` is kept so callers don't change.

export const momoService = {
  statement: (filters: Record<string, string | boolean | undefined>) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== '') query.set(key, String(value));
    return apiBlob(`/me/momo/statement?${query.toString()}`);
  },
  /** Newest first, by date and then by creation time. */
  async list(_userId: string): Promise<MomoTransaction[]> {
    return api<MomoTransaction[]>('/me/momo');
  },

  /** Exact totals for the MoMo page, worked out by the server from the saved entries. */
  async summary(signal?: AbortSignal): Promise<MomoSummary> {
    return api<MomoSummary>('/me/momo/summary', { signal });
  },

  /**
   * Saves the transaction together with its MoMo receipt; the server sends it straight to
   * AgriCtec's review. A missing reference stays unknown; no reference is invented.
   */
  async create(_userId: string, input: NewMomoInput, receipt: File): Promise<MomoTransaction> {
    const form = new FormData();
    form.append('data', JSON.stringify(input));
    form.append('receipt', receipt, receipt.name);
    return apiUpload<MomoTransaction>('/me/momo', form, () => undefined);
  },

  async update(
    _userId: string,
    id: string,
    patch: Partial<NewMomoInput>,
  ): Promise<MomoTransaction> {
    return api<MomoTransaction>(`/me/momo/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: patch,
    });
  },

  async remove(_userId: string, id: string): Promise<void> {
    await api(`/me/momo/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /** Deletes every transaction for this farmer ("clear all"). */
  async clear(_userId: string): Promise<void> {
    await api('/me/momo', { method: 'DELETE' });
  },
};
