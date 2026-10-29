import { matchPercentage, monthlyRepayment } from '@/lib/calculations/loan';
import type { LoanPartner, RepaymentResult } from '@/types';

export interface LoanOffer {
  partner: LoanPartner;
  repayment: RepaymentResult;
  /** How well the farmer's score fits this lender (40–98%). */
  match: number;
  /** The lender offers the chosen repayment period (otherwise it can't be picked). */
  offersTerm: boolean;
  /** The amount is above this lender's maximum. */
  overMax: boolean;
  /** Points still needed to reach the lender's minimum score (0 when met). */
  scoreGap: number;
  /** Term offered, amount within the maximum and score high enough. */
  qualifies: boolean;
  tags: ('Lowest payment' | 'Best match')[];
}

/**
 * Every lender priced for the same loan, best first: lenders that qualify, then those that
 * offer the term, then the rest; cheapest monthly payment first within each group.
 */
export function rankOffers(
  amount: number,
  months: number,
  score: number,
  lenders: LoanPartner[],
): LoanOffer[] {
  const offers = lenders.map((partner) => {
    const offersTerm = months >= partner.minMonths && months <= partner.maxMonths;
    const overMax = amount > partner.maxAmount;
    const scoreGap = Math.max(0, partner.minScore - score);
    return {
      partner,
      repayment: monthlyRepayment(Math.max(0, amount), partner.rate, months),
      match: matchPercentage(score, partner),
      offersTerm,
      overMax,
      scoreGap,
      qualifies: offersTerm && !overMax && scoreGap === 0,
      tags: [] as LoanOffer['tags'],
    };
  });

  const pickable = offers.filter((o) => o.offersTerm);
  const lowest = Math.min(...pickable.map((o) => o.repayment.monthly));
  const bestMatch = Math.max(...pickable.map((o) => o.match));
  for (const o of pickable) {
    if (o.repayment.monthly === lowest) o.tags.push('Lowest payment');
    if (o.match === bestMatch) o.tags.push('Best match');
  }

  const rank = (o: LoanOffer) => (o.qualifies ? 0 : o.offersTerm ? 1 : 2);
  return offers.sort((a, b) => rank(a) - rank(b) || a.repayment.monthly - b.repayment.monthly);
}

/** The offer to preselect: the best one that offers the term, if any. */
export const defaultOfferId = (offers: LoanOffer[]): string =>
  offers.find((o) => o.offersTerm)?.partner.id ?? '';
