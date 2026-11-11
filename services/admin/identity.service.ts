// Ghana Card identity checks in the console. There is deliberately no call that verifies an
// identity: only the identity provider's answer can (backend ghana_card_verification.py).

import { api } from '@/services/api';
import type { IdentityAttempt, IdentityLevel } from '@/types/identity';

export interface IdentityReviewItem extends IdentityAttempt {
  userId: string;
  farmer: string;
}

export interface IdentityRequirementsConfig {
  requirements: Record<string, IdentityLevel>;
  features: Record<string, string>;
  levels: IdentityLevel[];
}

export const adminIdentityService = {
  /** Checks the provider left for a closer look. */
  async reviewQueue(): Promise<IdentityReviewItem[]> {
    return api<IdentityReviewItem[]>('/admin/identity-verifications');
  },

  /** Ends a check under review as not verified (audited). The farmer can try again. */
  async close(id: string, note: string): Promise<IdentityAttempt> {
    return api<IdentityAttempt>(`/admin/identity-verifications/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      body: { note },
    });
  },

  async requirements(): Promise<IdentityRequirementsConfig> {
    return api<IdentityRequirementsConfig>('/admin/identity-requirements');
  },

  async saveRequirements(requirements: Record<string, IdentityLevel>): Promise<IdentityRequirementsConfig> {
    return api<IdentityRequirementsConfig>('/admin/identity-requirements', {
      method: 'PUT',
      body: { requirements },
    });
  },
};
