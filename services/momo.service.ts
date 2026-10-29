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

  /** Replaces every transaction for this farmer (sample data and "clear all"). */
  async replaceAll(_userId: string, items: MomoTransaction[]): Promise<MomoTransaction[]> {
    const body = items.map(({ direction, counterparty, amount, reference, network, date }) => ({
      direction,
      counterparty,
      amount,
      reference,
      network,
      date,
    }));
    return api<MomoTransaction[]>('/me/momo', { method: 'PUT', body });
  },
};
