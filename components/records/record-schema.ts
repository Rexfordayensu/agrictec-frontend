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
    type: z.enum(['income', 'expense', 'activity', 'financing']),
    description: z.string().trim().min(3, 'Describe the record (min 3 characters)').max(120),
    crop: z.enum(CROPS),
    amount: z.coerce.number({ error: 'Enter a number' }).min(0, 'Amount cannot be negative'),
    date: pastOrTodayDate,
    category: z.string().optional(),
    direction: z.enum(['in', 'out']).optional(),
    paymentMethod: z.enum(['', 'cash', 'bank', 'mobile_money']).optional(),
    network: z.enum(['', 'MTN', 'Telecel', 'AirtelTigo']).optional(),
    bankName: z.string().trim().max(80).optional(),
    externalReference: z.string().trim().max(120).optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.type === 'activity' || d.amount > 0, {
    message: 'Enter an amount greater than 0',
    path: ['amount'],
  })
  // How the money was paid (not for activities): cash; bank with its name and reference; or
  // mobile money with its network (the receipt is checked by the form).
  .refine((d) => d.type === 'activity' || Boolean(d.paymentMethod), {
    message: 'Choose how the money was paid',
    path: ['paymentMethod'],
  })
  .refine((d) => d.type === 'activity' || d.paymentMethod !== 'bank' || Boolean(d.bankName), {
    message: 'Enter the name of the bank',
    path: ['bankName'],
  })
  .refine(
    (d) => d.type === 'activity' || d.paymentMethod !== 'bank' || Boolean(d.externalReference),
    { message: 'Enter the bank reference for this payment', path: ['externalReference'] },
  )
  .refine(
    (d) => d.type === 'activity' || d.paymentMethod !== 'mobile_money' || Boolean(d.network),
    { message: 'Choose the MoMo network', path: ['network'] },
  );

/** What the form fields hold (amount is still raw input before coercion). */
export type RecordFormInput = z.input<typeof recordSchema>;
/** What the form produces after validation. */
export type RecordFormValues = z.output<typeof recordSchema>;
