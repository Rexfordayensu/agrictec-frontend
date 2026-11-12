// Preliminary loan eligibility against a published loan product. The server works everything
// out from the signed-in farmer's recorded transactions; this only sends the request.

import { api } from '@/services/api';
import type { EligibilityResult, EligibilitySummary } from '@/types/eligibility';

export const eligibilityService = {
  /** Amount as text ("5000.00") so it stays exact. */
  async check(productId: string, amount: string, months: number): Promise<EligibilityResult> {
    return api<EligibilityResult>(
      `/me/loan-products/${encodeURIComponent(productId)}/eligibility-check`,
      { method: 'POST', body: { amount, months } },
    );
  },

  async latest(): Promise<EligibilitySummary[]> {
    return api<EligibilitySummary[]>('/me/loan-assessments');
  },
};
