import { z } from 'zod';
import type { Lender, LenderInput } from '@/types/admin';

/** Brand colours offered in the picker (any hex colour can still be typed). */
export const LENDER_COLORS = [
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#f5c451',
  '#ef4444',
  '#f97316',
  '#14b8a6',
  '#ec4899',
] as const;

/** Same name, ignoring case and extra spaces (the service applies the same rule). */
export const sameLenderName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

const whole = (label: string, min: number, max: number, unit = '') =>
  z
    .number({ error: `Enter the ${label}.` })
    .int(`Use a whole number for the ${label}.`)
    .min(min, `The ${label} must be ${min}${unit} to ${max}${unit}.`)
    .max(max, `The ${label} must be ${min}${unit} to ${max}${unit}.`);

/**
 * The lender form's rules. `otherNames` are the names of every other lender, so a duplicate
 * name is caught before saving (the service checks again).
 */
export function lenderFormSchema(otherNames: string[]) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, 'Enter the lender’s name.')
        .max(80, 'Keep the name under 80 characters.')
        .refine((name) => !otherNames.some((other) => sameLenderName(other, name)), {
          message: 'A lender with this name already exists.',
        }),
      rate: z
        .number({ error: 'Enter the yearly rate.' })
        .min(1, 'The rate must be 1% to 60%.')
        .max(60, 'The rate must be 1% to 60%.'),
      maxAmount: z
        .number({ error: 'Enter the maximum amount.' })
        .min(500, 'The maximum amount must be at least GHS 500.')
        .max(10_000_000, 'The maximum amount must be under GHS 10,000,000.'),
      minMonths: whole('minimum term', 1, 60, ' months'),
      maxMonths: whole('maximum term', 1, 60, ' months'),
      minScore: whole('minimum score', 300, 850),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #10b981.'),
      description: z.string().trim().max(200, 'Keep the description under 200 characters.'),
      active: z.boolean(),
    })
    .refine((v) => v.minMonths <= v.maxMonths, {
      path: ['maxMonths'],
      message: 'The maximum term must be at least the minimum.',
    });
}

export type LenderFormValues = z.infer<ReturnType<typeof lenderFormSchema>>;

export const emptyLenderForm = (): LenderFormValues => ({
  name: '',
  rate: 18,
  maxAmount: 50_000,
  minMonths: 6,
  maxMonths: 24,
  minScore: 550,
  color: LENDER_COLORS[0],
  description: '',
  active: true,
});

export const lenderToForm = (lender: Lender): LenderFormValues => ({
  name: lender.name,
  rate: lender.rate,
  maxAmount: lender.maxAmount,
  minMonths: lender.minMonths,
  maxMonths: lender.maxMonths,
  minScore: lender.minScore,
  color: lender.color,
  description: lender.description ?? '',
  active: lender.active,
});

export const formToLenderInput = (values: LenderFormValues): LenderInput => ({
  name: values.name.trim().replace(/\s+/g, ' '),
  rate: values.rate,
  maxAmount: values.maxAmount,
  minMonths: values.minMonths,
  maxMonths: values.maxMonths,
  minScore: values.minScore,
  color: values.color.toLowerCase(),
  active: values.active,
  // Undefined (not omitted), so clearing the description in an edit removes it.
  description: values.description.trim() || undefined,
});
