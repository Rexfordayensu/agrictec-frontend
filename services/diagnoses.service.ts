import { api } from '@/services/api';
import type { Diagnosis, NewDiagnosisInput } from '@/types';

// The API scopes every call to the signed-in farmer; `userId` is kept so callers don't change.

export const diagnosesService = {
  async list(_userId: string): Promise<Diagnosis[]> {
    return api<Diagnosis[]>('/me/diagnoses');
  },

  /** Puts the new diagnosis first; the API keeps only the 10 most recent. */
  async create(_userId: string, input: NewDiagnosisInput): Promise<Diagnosis> {
    return api<Diagnosis>('/me/diagnoses', { method: 'POST', body: input });
  },

  async remove(_userId: string, id: string): Promise<void> {
    await api(`/me/diagnoses/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async clear(_userId: string): Promise<void> {
    await api('/me/diagnoses', { method: 'DELETE' });
  },
};
