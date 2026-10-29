import { z } from 'zod';
import { CROPS } from '@/constants/crops';
import { todayISO } from '@/lib/format';

/** A yyyy-MM-dd date that is today or earlier. (ISO dates compare correctly as strings.) */
export const pastOrTodayDate = z
  .string()
  .min(1, 'Pick a date')
  .refine((value) => value <= todayISO(), 'Date cannot be in the future');

export const recordSchema = z
  .object({
    type: z.enum(['income', 'expense', 'activity']),
    description: z.string().trim().min(3, 'Describe the record (min 3 characters)').max(120),
    crop: z.enum(CROPS),
    amount: z.coerce.number({ error: 'Enter a number' }).min(0, 'Amount cannot be negative'),
    date: pastOrTodayDate,
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.type === 'activity' || d.amount > 0, {
    message: 'Enter an amount greater than 0',
    path: ['amount'],
  });

/** What the form fields hold (amount is still raw input before coercion). */
export type RecordFormInput = z.input<typeof recordSchema>;
/** What the form produces after validation. */
export type RecordFormValues = z.output<typeof recordSchema>;
