// The farmer's financial summary and reports (app/domain/financial_summary.py,
// app/services/financial_reports.py). Money is exact decimal text ("1200.50"): format it for
// display, never add it up in the browser.

export type DecimalText = string;
export type ReportMonths = 3 | 6 | 12;

/** A total and how much of it an AgriCtec reviewer verified from evidence. */
export interface VerifiedLine {
  total: DecimalText;
  verified: DecimalText;
  selfReported: DecimalText;
  /** Percent, e.g. "35.00". */
  verifiedShare: DecimalText;
}

export interface FinancialSummary {
  /** Latest farm income/expenses within this exact reporting period, newest first. */
  recentTransactions?: (Omit<import('@/types').FarmRecord, 'amount'> & { amount: DecimalText })[];
  recordReadiness?: { entriesWithEvidence: number; identityVerified: boolean };
  currency: 'GHS';
  period: { from: string; to: string; months: ReportMonths };
  /** When the newest entry was saved (ISO), or null with no entries. */
  dataAsOf: string | null;
  farm: { income: VerifiedLine; expenses: VerifiedLine; net: DecimalText };
  momo: { in: VerifiedLine; out: VerifiedLine; net: DecimalText };
  financing: { in: VerifiedLine; out: VerifiedLine };
  monthly: { month: string; income: DecimalText; expenses: DecimalText; net: DecimalText }[];
  counts: {
    byStatus: Record<string, number>;
    total: number;
    verified: number;
    farmRecords: number;
    financialRecords: number;
    momo: number;
  };
  verifiedShare: { byCount: DecimalText; byAmount: DecimalText };
  /** As recorded by the farmer: not a confirmed debt. */
  obligations: {
    disbursed: DecimalText;
    repaid: DecimalText;
    interestPaid: DecimalText;
    outstanding: DecimalText;
  };
  repayments: {
    date: string;
    amount: DecimalText;
    category: string;
    description: string;
    verificationStatus: string;
  }[];
  /** The same number of whole months just before this period (absent on an older API). */
  previous?: {
    from: string;
    to: string;
    income: DecimalText;
    expenses: DecimalText;
    net: DecimalText;
  };
  /**
   * Percent change on the previous period. A value is absent when the previous period had
   * nothing to compare with (the API layer turns the server's null into undefined).
   */
  changeOnPrevious?: {
    income?: DecimalText | null;
    expenses?: DecimalText | null;
    net?: DecimalText | null;
  };
  /** Farm income and expenses in this period by category group, with their share. */
  byCategory?: {
    key: 'crop_sales' | 'livestock_sales' | 'farm_inputs' | 'labour_services' | 'other';
    label: string;
    amount: DecimalText;
    share: DecimalText;
  }[];
  /** Farm income plus expenses in this period (the category chart's total). */
  categoryTotal?: DecimalText;
  monthsWithRecords: number;
  /** The farmer's first entry (any farm record or MoMo), or null: the chart starts that month. */
  firstRecordedOn?: string | null;
  /** Fewer months of records than the period asks for: nothing is projected. */
  insufficient: boolean;
}

export interface FinancialReport {
  id: string;
  periodMonths: ReportMonths;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  sizeBytes: number;
  sha256: string;
}
