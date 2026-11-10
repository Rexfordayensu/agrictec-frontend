import { api } from '@/services/api';
import type { FarmRecord, NewRecordInput } from '@/types';

// The API scopes every call to the signed-in farmer; `userId` is kept so callers don't change.

export const recordsService = {
  /** Newest first, by date and then by creation time. */
  async list(_userId: string): Promise<FarmRecord[]> {
    return api<FarmRecord[]>('/me/records');
  },

  async create(_userId: string, input: NewRecordInput): Promise<FarmRecord> {
    return api<FarmRecord>('/me/records', { method: 'POST', body: input });
  },

  async update(_userId: string, id: string, patch: Partial<NewRecordInput>): Promise<FarmRecord> {
    return api<FarmRecord>(`/me/records/${encodeURIComponent(id)}`, { method: 'PATCH', body: patch });
  },

  async remove(_userId: string, id: string): Promise<void> {
    await api(`/me/records/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  /** Deletes every record for this farmer ("clear all"). Records are only added one by one. */
  async clear(_userId: string): Promise<void> {
    await api('/me/records', { method: 'DELETE' });
  },
};
