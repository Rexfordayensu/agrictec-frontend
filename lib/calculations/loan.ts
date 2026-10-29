import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { annualizedNetProfit } from '@/lib/calculations/finance';
import { formatGHS } from '@/lib/format';
import type {
  EligibilityIssue,
  EligibilityResult,
  FarmRecord,
  GhanaCardStatus,
  LoanPartner,
  RepaymentResult,
} from '@/types';
import type { CreditConfig } from '@/types/admin';

export type EligibilityRules = CreditConfig['eligibility'];

/** The most a farmer can borrow: the admin's multiple of their annualized profit. */
export const borrowingLimit = (
  annualizedProfit: number,
  rules: EligibilityRules = DEFAULT_CREDIT_CONFIG.eligibility,
) => Math.max(0, rules.maxProfitMultiplier * annualizedProfit);

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
export const LOANS_LOCKED_HINT = 'Verify your Ghana Card to unlock loan offers.';

/**
 * Checks every eligibility rule and collects ALL failing reasons, not just the first.
 * `rules` come from the admin's credit config. A chosen lender's own minimum score replaces
 * the platform minimum, as before; the platform minimum applies when no lender is chosen.
 */
export function checkEligibility({
  amount,
  records,
  score,
  partner,
  rules = DEFAULT_CREDIT_CONFIG.eligibility,
  ghanaCard = 'verified',
}: {
  amount: number;
  records: FarmRecord[];
  score: number;
  partner?: LoanPartner;
  rules?: EligibilityRules;
  /** The farmer's Ghana Card status: loans need a verified card. */
  ghanaCard?: GhanaCardStatus;
}): EligibilityResult {
  const issues: EligibilityIssue[] = [];
  const maxAffordable = borrowingLimit(annualizedNetProfit(records), rules);
  const minScore = partner?.minScore ?? rules.minScore;

  if (ghanaCard !== 'verified') {
    issues.push({ code: 'ghana-card', message: ghanaCardLoanMessage(ghanaCard) });
  }

  if (records.length < rules.minRecords) {
    issues.push({
      code: 'records',
      message: `You need at least ${rules.minRecords} farm records (you have ${records.length}).`,
    });
  }
  if (amount > maxAffordable) {
    issues.push({
      code: 'affordability',
      message: `Requested amount is above ${rules.maxProfitMultiplier}× your yearly profit (max ${formatGHS(maxAffordable)}).`,
    });
  }
  if (score < minScore) {
    issues.push({
      code: 'score',
      message: `Credit score must be at least ${minScore} (yours is ${score}).`,
    });
  }
  if (partner && amount > partner.maxAmount) {
    issues.push({
      code: 'lender-max',
      message: `Above this lender's maximum of ${formatGHS(partner.maxAmount)}.`,
    });
  }

  return {
    eligible: issues.length === 0,
    reasons: issues.map((issue) => issue.message),
    issues,
    maxAffordable,
  };
}

/** How well the user's score matches a lender, from 40% to 98%. */
export function matchPercentage(score: number, partner: LoanPartner): number {
  const raw = 70 + (score - partner.minScore) / 5;
  return Math.round(Math.min(98, Math.max(40, raw)));
}
