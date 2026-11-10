import { api } from '@/services/api';
import type { Diagnosis } from '@/types';

// The API scopes every call to the signed-in farmer; `userId` is kept so callers don't change.
// Diagnoses are saved by the API when a scan is made (POST /me/crop-doctor), never from here.

export const diagnosesService = {
  async list(_userId: string): Promise<Diagnosis[]> {
    return api<Diagnosis[]>('/me/diagnoses');
  },

  async remove(_userId: string, id: string): Promise<void> {
    await api(`/me/diagnoses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async clear(_userId: string): Promise<void> {
    await api('/me/diagnoses', { method: 'DELETE' });
  },
};
