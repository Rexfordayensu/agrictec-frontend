// Lending partners through the API. Only active lenders are offered to farmers; the API refuses
// switching one off while applications are under review, or deleting one with any history.

import { api } from '@/services/api';
import type { Lender, LenderInput } from '@/types/admin';

const lender = (id: string) => `/admin/lenders/${encodeURIComponent(id)}`;

export const lendersService = {
  /** Active lenders only, unless `includeInactive` (read by the farmer app too). */
  async list({ includeInactive = false }: { includeInactive?: boolean } = {}): Promise<Lender[]> {
    return api<Lender[]>('/platform/lenders', { query: { includeInactive } });
  },

  async create(input: LenderInput): Promise<Lender> {
    return api<Lender>('/admin/lenders', { method: 'POST', body: input });
  },

  async update(id: string, patch: Partial<LenderInput>): Promise<Lender> {
    return api<Lender>(lender(id), { method: 'PATCH', body: patch });
  },

  async toggleActive(id: string): Promise<Lender> {
    return api<Lender>(`${lender(id)}/toggle`, { method: 'POST' });
  },

  /** Only a lender with no applications at all can be deleted: deactivate it instead. */
  async remove(id: string): Promise<void> {
    await api(lender(id), { method: 'DELETE' });
  },
};
