// Verifications through the API: phone and location checks pass at once; a Ghana Card waits
// for an admin. Only a masked card number and a fingerprint are ever stored.

import { api } from '@/services/api';
import type { VerificationFilter, VerificationKind, VerificationRequest } from '@/types/admin';

const request = (id: string) => `/admin/verifications/${encodeURIComponent(id)}`;

export const verificationsService = {
  /** A farmer's own requests, newest first (the farmer app). */
  async listForFarmer(_userId: string): Promise<VerificationRequest[]> {
    return api<VerificationRequest[]>('/me/verifications');
  },

  /** Newest first. */
  async list(filter: VerificationFilter = {}): Promise<VerificationRequest[]> {
    return api<VerificationRequest[]>('/admin/verifications', {
      query: { status: filter.status, kind: filter.kind, userId: filter.userId },
    });
  },

  /** The farmer app: phone and location pass at once, a Ghana Card waits for review. */
  async submit(_userId: string, kind: VerificationKind, value: string): Promise<VerificationRequest> {
    return api<VerificationRequest>('/me/verifications', { method: 'POST', body: { kind, value } });
  },

  async approve(id: string): Promise<VerificationRequest> {
    return api<VerificationRequest>(`${request(id)}/approve`, { method: 'POST' });
  },

  /** One of REJECT_REASONS and an optional note (required for "Other"); the farmer sees both. */
  async reject(id: string, reason: string, note = ''): Promise<VerificationRequest> {
    return api<VerificationRequest>(`${request(id)}/reject`, { method: 'POST', body: { reason, note } });
  },

  /** Phone and location checks together (each audited); Ghana Cards are reviewed one by one. */
  async approveMany(ids: string[]): Promise<VerificationRequest[]> {
    return api<VerificationRequest[]>('/admin/verifications/approve-many', {
      method: 'POST',
      body: { ids },
    });
  },
};
