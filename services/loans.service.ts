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
export interface ScoreFactor {
  key: string;
  label: string;
  weight: number;
  value: number;
  points: number;
  maxPoints: number;
  measures: string;
  improve: string;
}

/**
 * The AgriCtec score, how it is built and what is missing (GET /me/credit). AgriCtec's own
 * measure of record keeping: not a credit bureau score and never a loan decision.
 */
export interface CreditSummary {
  credit: CreditScoreBreakdown;
  band: string;
  readiness: ReadinessItem[];
  underReview: boolean;
  scoreName?: string;
  /** When the server calculated it (it follows every change to the records). */
  computedAt?: string;
  /** When the newest entry was saved. */
  dataAsOf?: string;
  /** The credit-rules version used. */
  methodologyVersion?: number;
  factors?: ScoreFactor[];
  evidence?: {
    byStatus: Record<string, number>;
    total: number;
    verified: number;
    withEvidence: number;
    /** Percent, e.g. "35.00". */
    verifiedShare: string;
  };
  /** Plain-language gaps, from the farmer's real data. */
  missing?: string[];
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

  /** GET /me/credit: what the loans page and the dashboard show about the farmer's credit. */
  async getCreditSummary(signal?: AbortSignal): Promise<CreditSummary> {
    return api<CreditSummary>('/me/credit', { signal });
  },

  /**
   * The server's eligibility check for one loan (amount 0: only the records, score and Ghana
   * Card rules). With a lender, its own minimum score and largest amount apply too.
   */
  async checkEligibility(
    amount: number,
    partnerId?: string,
    signal?: AbortSignal,
  ): Promise<EligibilityResult> {
    return api<EligibilityResult>('/me/loans/eligibility', {
      method: 'POST',
      body: { amount, partnerId },
      signal,
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
