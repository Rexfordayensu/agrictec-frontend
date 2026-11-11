'use client';

import { Hourglass, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCredit } from '@/hooks/use-credit';
import { useLoanStore } from '@/store/loan-store';

/**
 * The one banner on /loans: the Ghana Card, which every lender needs before an application.
 * (An account review is the page header's own message.) Nothing shows once it is verified.
 */
export function LoansNotice() {
  const credit = useCredit();
  const setGhanaCardOpen = useLoanStore((s) => s.setGhanaCardOpen);
  if (!credit || credit.ghanaCard === 'verified') return null;
  const pending = credit.ghanaCard === 'pending';
  const rejected = credit.ghanaCard === 'rejected';

  return (
    <section
      aria-labelledby="loans-card-title"
      className="border-gold/40 bg-gold/10 rounded-card flex flex-wrap items-center gap-3 border p-4"
    >
      <span className="bg-gold/20 text-ink-gold inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
        {pending ? (
          <Hourglass size={20} aria-hidden="true" />
        ) : (
          <Lock size={20} aria-hidden="true" />
        )}
      </span>
      <div className="min-w-48 flex-1">
        <h2 id="loans-card-title" className="text-text text-sm font-semibold">
          {pending
            ? 'Your Ghana Card is being reviewed'
            : rejected
              ? 'Resubmit your Ghana Card to apply'
              : 'Verify your Ghana Card to apply'}
        </h2>
        <p className="text-text-dim mt-0.5 text-sm">
          {pending
            ? 'You can see lenders while you wait. Applying opens once it is verified.'
            : rejected
              ? (credit.rejectedReason ?? 'Your last card was not accepted. Please send it again.')
              : 'You can see lenders and your score now. Lenders need it before you apply.'}
        </p>
      </div>
      {!pending && (
        <Button icon={ShieldCheck} mutates onClick={() => setGhanaCardOpen(true)}>
          {rejected ? 'Resubmit card' : 'Verify now'}
        </Button>
      )}
    </section>
  );
}
