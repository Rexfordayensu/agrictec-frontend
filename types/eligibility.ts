// Preliminary loan eligibility (backend app/domain/loan_assessment.py). Money is exact decimal
// text ("2400.00"): format it, never add it up here. Never a loan decision.

export type EligibilityOutcome =
  | 'meets_preliminary'
  | 'additional_information'
  | 'does_not_meet'
  | 'unable_to_assess';

export type RuleStatus =
  | 'met'
  | 'not_met'
  | 'needs_info'
  | 'unknown'
  | 'expired'
  | 'not_yet_in_effect';

export interface EligibilityRule {
  key: string;
  name: string;
  category: string;
  required: boolean;
  metric: string | null;
  label: string;
  threshold: string;
  status: RuleStatus;
  value: string | null;
  explanation: string;
  source: string | null;
  effectiveFrom: string | null;
  reviewedOn: string | null;
  reviewBy: string | null;
}

export interface EligibilityResult {
  id: string;
  createdAt: string;
  outcome: EligibilityOutcome;
  outcomeLabel: string;
  summary: string;
  request: { amount: string; months: number };
  period: { months: number; from: string; to: string; source: 'lender' | 'default' };
  figures: {
    income: string;
    expenses: string;
    net: string;
    averageMonthlyNet: string;
    borrowed: string;
    otherMoneyIn: string;
    otherMoneyOut: string;
    existingMonthlyDebtService: string;
    outstandingRecordedLoans: string;
    entries: number;
    farmRecords: number;
    momoEntries: number;
    matchedMomo: number;
    verifiedEntries: number;
    verifiedShare: string | null;
    monthsWithRecords: number;
    monthsWithIncome: number;
    historyMonths: number;
    firstEntry: string | null;
  };
  repayment:
    | { available: false; reason: string }
    | {
        available: true;
        frequency: string;
        payments: number;
        instalment: string;
        totalRepayment: string;
        totalInterest: string;
        totalFees: string;
        averageMonthly: string;
      };
  affordability:
    | { available: false; ruled: boolean; reason: string }
    | {
        available: true;
        ruled: boolean;
        averageMonthlyNet: string;
        existingMonthlyDebtService: string;
        proposedAverageMonthly: string;
        leftAfterRepayments: string;
        note: string | null;
      };
  rules: EligibilityRule[];
  toProvide: {
    key: string;
    name: string;
    category: string;
    required: boolean;
    fieldType: string;
    conditional: boolean;
  }[];
  notes: string[];
  disclaimer: string;
  product: {
    id: string;
    name: string;
    version: number;
    lender: { id: string; name: string };
    source: string | null;
    sourceCheckedOn: string | null;
  };
  identityLevel: 'none' | 'reviewed' | 'nia_verified';
}

/** The farmer's latest check of a product (dashboard readiness). */
export interface EligibilitySummary {
  id: string;
  productId: string;
  productVersion: number;
  productName: string | null;
  lenderName: string | null;
  outcome: EligibilityOutcome;
  outcomeLabel: string;
  summary: string | null;
  amount: string;
  months: number;
  createdAt: string;
}
