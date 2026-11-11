import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import type {
  EligibilityIssue,
  EligibilityResult,
  FarmRecord,
  GhanaCardStatus,
  RepaymentResult,
} from '@/types';
import type { CreditConfig } from '@/types/admin';

export type EligibilityRules = CreditConfig['eligibility'];

/**
 * No longer set by AgriCtec (lenders' loan products state their own amounts). Kept for older
 * rule versions that still carry a multiple; 0 when there is none.
 */
export const borrowingLimit = (
  annualizedProfit: number,
  rules: EligibilityRules = DEFAULT_CREDIT_CONFIG.eligibility,
) => Math.max(0, (rules.maxProfitMultiplier ?? 0) * annualizedProfit);

const round2 = (value: number) => Math.round(value * 100) / 100;

/** Standard amortized repayment: equal monthly payments covering principal and interest. */
export function monthlyRepayment(
  principal: number,
  annualRatePct: number,
  months: number,
): RepaymentResult {
  if (principal <= 0 || months <= 0) return { monthly: 0, total: 0, interest: 0 };

  const r = annualRatePct / 100 / 12;
  const monthly = r === 0 ? principal / months : (principal * r) / (1 - Math.pow(1 + r, -months));
  const total = monthly * months;
  return {
    monthly: round2(monthly),
    total: round2(total),
    interest: round2(total - principal),
  };
}

/** Loans need a verified Ghana Card. What to tell a farmer whose card isn't verified yet. */
export const ghanaCardLoanMessage = (status: GhanaCardStatus) =>
  status === 'pending'
    ? 'Your Ghana Card is being reviewed. You can apply once it is verified.'
    : 'Verify your Ghana Card to apply for loans.';

/** The line the assistant and recommendations use instead of promising a loan. */
export const LOANS_LOCKED_HINT = 'Verify your Ghana Card before you apply to a lender.';

/**
 * AgriCtec's own check before an application, as on the server (app/domain/loans.py): a verified
 * Ghana Card. The AgriCtec score and AgriCtec limits never decide a loan; each lender's product
 * requirements do. The other arguments are accepted for older callers and ignored.
 */
export function checkEligibility({
  ghanaCard = 'verified',
}: {
  amount?: number;
  records?: FarmRecord[];
  score?: number;
  rules?: EligibilityRules;
  /** The farmer's Ghana Card status: applying needs a verified card. */
  ghanaCard?: GhanaCardStatus;
}): EligibilityResult {
  const issues: EligibilityIssue[] =
    ghanaCard === 'verified'
      ? []
      : [{ code: 'ghana-card', message: ghanaCardLoanMessage(ghanaCard) }];
  return { eligible: issues.length === 0, reasons: issues.map((i) => i.message), issues };
}
