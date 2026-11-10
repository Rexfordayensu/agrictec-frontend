import { api } from '@/services/api';
import type { MomoTransaction, NewMomoInput } from '@/types';

// The API scopes every call to the signed-in farmer; `userId` is kept so callers don't change.

export const momoService = {
  /** Newest first, by date and then by creation time. */
  async list(_userId: string): Promise<MomoTransaction[]> {
    return api<MomoTransaction[]>('/me/momo');
  },

  /** A blank reference gets a generated "MOMO######" one. */
  async create(_userId: string, input: NewMomoInput): Promise<MomoTransaction> {
    return api<MomoTransaction>('/me/momo', { method: 'POST', body: input });
  },

  async update(
    _userId: string,
    id: string,
    patch: Partial<NewMomoInput>,
  ): Promise<MomoTransaction> {
    return api<MomoTransaction>(`/me/momo/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },

  async remove(_userId: string, id: string): Promise<void> {
    await api(`/me/momo/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /** Deletes every transaction for this farmer ("clear all"). */
  async clear(_userId: string): Promise<void> {
    await api('/me/momo', { method: 'DELETE' });
  },
};
