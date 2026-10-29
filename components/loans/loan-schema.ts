import { z } from 'zod';
import { LOAN_PERIODS, LOAN_PURPOSES } from '@/constants/loan-partners';
import type { LoanPartner } from '@/types';

export const MIN_LOAN = 500;
export const MAX_LOAN = 500_000;

export const loanSchema = z.object({
  amount: z.coerce
    .number({ error: 'Enter an amount' })
    .min(MIN_LOAN, 'Minimum loan is GHS 500')
    .max(MAX_LOAN, 'Maximum is GHS 500,000'),
  purpose: z.enum(LOAN_PURPOSES, { error: 'Choose a purpose' }),
  months: z.coerce.number().refine((m) => LOAN_PERIODS.includes(m), 'Choose a repayment period'),
  partnerId: z.string().min(1, 'Choose a lender'),
});

export type LoanFormInput = z.input<typeof loanSchema>;
export type LoanFormValues = z.output<typeof loanSchema>;

/** A lender from the admin's list (pass the active lenders from the platform store). */
export function findPartner(id: string, lenders: LoanPartner[]): LoanPartner | undefined {
  return lenders.find((p) => p.id === id);
}
