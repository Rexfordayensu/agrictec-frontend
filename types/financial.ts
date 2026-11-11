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
