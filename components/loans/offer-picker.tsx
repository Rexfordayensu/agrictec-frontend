'use client';

import { Check, CircleAlert, CircleCheck, Landmark } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { LoanOffer } from '@/components/loans/loan-offers';
import { formatGHS } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Why an offer doesn't fit yet, in plain words. Null when it qualifies. */
function offerProblem(offer: LoanOffer, months: number): string | null {
  if (!offer.offersTerm) return `Doesn't offer ${months}-month loans`;
  if (offer.overMax) return `Lends up to ${formatGHS(offer.partner.maxAmount)}`;
  if (offer.scoreGap > 0) return `Needs ${offer.scoreGap} more score points`;
  return null;
}

/**
 * Lender offers for the loan being built, as radio cards. Each shows the monthly payment
 * for the current amount and term, so picking a lender is the same as comparing them.
 */
export function OfferPicker({
  offers,
  months,
  selectedId,
  registration,
  error,
}: {
  offers: LoanOffer[];
  months: number;
  selectedId: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={error ? 'loan-partner-error' : undefined}>
      <legend className="text-text mb-2 text-sm font-semibold">
        4. Compare and choose a lender
      </legend>
      <p className="text-text-mute mb-3 text-xs leading-relaxed">
        Payments use your chosen amount and repayment period. A score match does not guarantee
        approval. Your records and identity are checked next.
      </p>
      {offers.length === 0 && (
        <p className="border-border text-text-dim rounded-xl border p-4 text-sm">
          No lenders are available right now. You can still view your credit score and applications.
        </p>
      )}
      <div className="space-y-2">
        {offers.map((offer) => {
          const { partner, repayment } = offer;
          const problem = offerProblem(offer, months);
          const selected = selectedId === partner.id;
          return (
            <label
              key={partner.id}
              className={cn('relative block', !offer.offersTerm && 'opacity-55')}
            >
              <input
                type="radio"
                value={partner.id}
                disabled={!offer.offersTerm}
                className="peer sr-only"
                {...registration}
              />
              <span
                className={cn(
                  'peer-focus-visible:outline-accent flex flex-wrap items-center gap-3 rounded-2xl border p-3 transition-colors peer-focus-visible:outline-2',
                  offer.offersTerm ? 'cursor-pointer' : 'cursor-not-allowed',
                  selected
                    ? 'border-accent/60 bg-accent/10 shadow-[0_0_0_3px_var(--accent-glow)]'
                    : 'border-border bg-glass hover:border-accent/30',
                )}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: partner.color }}
                >
                  <Landmark size={18} />
                </span>
                <span className="min-w-32 flex-1">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                    <span className="text-text text-sm font-semibold">{partner.name}</span>
                    {selected && <Check size={14} aria-hidden="true" className="text-ink-green" />}
                  </span>
                  <span className="text-text-mute block text-[11px]">
                    {partner.rate}% interest per year · {partner.minMonths}–{partner.maxMonths}{' '}
                    months
                  </span>
                  <span
                    className={cn(
                      'mt-1 flex items-center gap-1 text-[11px] font-semibold',
                      problem ? 'text-ink-gold' : 'text-ink-green',
                    )}
                  >
                    {problem ? (
                      <CircleAlert size={12} aria-hidden="true" />
                    ) : (
                      <CircleCheck size={12} aria-hidden="true" />
                    )}
                    {problem ?? 'Meets score, amount and period requirements'}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {offer.offersTerm ? (
                    <>
                      <span className="text-text block text-base font-extrabold tabular-nums">
                        {formatGHS(repayment.monthly)}
                      </span>
                      <span className="text-text-mute block text-[10px]">per month</span>
                    </>
                  ) : (
                    <span className="text-text-mute text-xs">—</span>
                  )}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      {error && (
        <p id="loan-partner-error" role="alert" className="text-ink-red mt-2 text-xs">
          {error}
        </p>
      )}
    </fieldset>
  );
}
