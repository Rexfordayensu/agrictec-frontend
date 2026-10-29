'use client';

import Link from 'next/link';
import { ArrowRight, CircleCheck, Lightbulb, Send, XCircle } from 'lucide-react';
import { RepaymentBreakdown } from '@/components/loans/repayment-breakdown';
import { Button } from '@/components/ui/button';
import { formatGHS } from '@/lib/format';
import type {
  EligibilityIssueCode,
  EligibilityResult as Result,
  LoanPartner,
  RepaymentResult,
} from '@/types';
import { MIN_LOAN } from '@/components/loans/loan-schema';

/** How to fix each failing rule. Amount problems are fixed in place, not on another page. */
const FIXES: Record<EligibilityIssueCode, { label: string; href: string } | null> = {
  records: { label: 'Add records', href: '/records' },
  affordability: { label: 'Add records', href: '/records' },
  score: { label: 'Complete profile', href: '/settings/profile' },
  'lender-max': null,
  'ghana-card': { label: 'Verify Ghana Card', href: '/settings/verification' },
};

export interface EligibilityResultProps {
  eligibility: Result;
  repayment: RepaymentResult;
  amount: number;
  months: number;
  partner: LoanPartner;
  onApply: () => void;
  onUseAmount: (amount: number) => void;
  applyDisabled?: boolean;
}

export function EligibilityResult({
  eligibility,
  repayment,
  amount,
  months,
  partner,
  onApply,
  onUseAmount,
  applyDisabled = false,
}: EligibilityResultProps) {
  if (eligibility.eligible) {
    return (
      <section
        aria-live="polite"
        className="animate-fade-in border-accent/40 bg-accent/5 rounded-2xl border p-4 sm:p-5"
      >
        <h3 className="text-ink-green flex items-center gap-2 font-bold">
          <CircleCheck size={20} aria-hidden="true" /> You can continue to review
        </h3>
        <p className="text-text-dim mt-1 mb-4 text-sm">
          Your records meet this app&apos;s checks for {formatGHS(amount)} with {partner.name}. The
          lender still decides whether to approve your application.
        </p>
        <RepaymentBreakdown
          amount={amount}
          months={months}
          partner={partner}
          repayment={repayment}
        />
        <Button
          mutates
          icon={Send}
          onClick={onApply}
          disabled={applyDisabled}
          className="mt-4 w-full whitespace-normal"
        >
          Review application for {partner.name}
        </Button>
      </section>
    );
  }

  // The largest amount that would pass the affordability and lender-limit rules.
  const suggested = Math.floor(Math.min(eligibility.maxAffordable, partner.maxAmount) / 100) * 100;
  const amountIssue = eligibility.issues.some(
    (i) => i.code === 'affordability' || i.code === 'lender-max',
  );

  return (
    <section
      aria-live="polite"
      className="animate-fade-in border-danger/40 bg-danger/5 rounded-2xl border p-4 sm:p-5"
    >
      <h3 className="text-ink-red flex items-center gap-2 font-bold">
        <XCircle size={20} aria-hidden="true" /> A few things to complete
      </h3>
      <p className="text-text-dim mt-1 text-sm">
        {eligibility.issues.length === 1 ? 'One thing' : `${eligibility.issues.length} things`} to
        complete before you can apply to {partner.name} through this app:
      </p>
      <ul className="mt-3 space-y-2">
        {eligibility.issues.map((issue) => {
          const fix = FIXES[issue.code];
          return (
            <li
              key={issue.code}
              className="border-border bg-glass flex flex-col gap-1 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="text-text text-sm">{issue.message}</span>
              {fix && (
                <Link
                  href={fix.href}
                  className="group text-ink-green inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-semibold"
                >
                  {fix.label}
                  <ArrowRight
                    size={14}
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {amountIssue && suggested >= MIN_LOAN && (
        <div className="border-gold/30 bg-gold/10 mt-4 flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-text flex items-center gap-2 text-sm">
            <Lightbulb size={16} aria-hidden="true" className="text-ink-gold shrink-0" />
            Try a smaller amount: {formatGHS(suggested)}
          </p>
          <Button size="sm" variant="ghost" onClick={() => onUseAmount(suggested)}>
            Use {formatGHS(suggested)}
          </Button>
        </div>
      )}
    </section>
  );
}
