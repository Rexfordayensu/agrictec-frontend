// The farmer side of lending. The API checks every rule again (a verified Ghana Card, records,
// affordability, score, the lender's limits and term) and sets the rate, the monthly payment and
// the score itself.

import { api } from '@/services/api';
import type {
  CreditScoreBreakdown,
  EligibilityResult,
  LoanApplication,
  LoanApplicationInput,
  ReadinessItem,
} from '@/types';
import type { Lender } from '@/types/admin';

/** GET /me/credit: the score with the live rules, its band, readiness and the borrowing limit. */
export interface CreditSummary {
  credit: CreditScoreBreakdown;
  band: string;
  readiness: ReadinessItem[];
  annualizedProfit: number;
  maxAffordable: number;
  underReview: boolean;
}

export const loansService = {
  /** Active lenders only (the admin can switch lenders off). */
  async getPartners(): Promise<Lender[]> {
    return api<Lender[]>('/platform/lenders');
  },

  /** The farmer's applications with their status history, newest first. */
  async listApplications(_userId: string): Promise<LoanApplication[]> {
    return api<LoanApplication[]>('/me/loans/applications');
  },

  async checkEligibility(amount: number, partnerId?: string): Promise<EligibilityResult> {
    return api<EligibilityResult>('/me/loans/eligibility', {
      method: 'POST',
      body: { amount, partnerId },
    });
  },

  /**
   * Sends an application to the lender. It starts as "submitted" and the admin moves it on.
   * `scoreAtApplication` is ignored: the API records the score it calculates.
   */
  async submitApplication(
    _userId: string,
    data: LoanApplicationInput,
    _scoreAtApplication: number,
  ): Promise<LoanApplication> {
    const { partnerId, amount, purpose, months } = data;
    return api<LoanApplication>('/me/loans/applications', {
      method: 'POST',
      body: { partnerId, amount, purpose, months },
    });
  },
};
