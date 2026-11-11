import { z } from 'zod';
import { pastOrTodayDate } from '@/components/records/record-schema';
import type { MomoNetwork } from '@/types';

export const MOMO_NETWORKS = [
  'MTN',
  'Telecel',
  'AirtelTigo',
] as const satisfies readonly MomoNetwork[];

export const momoSchema = z.object({
  direction: z.enum(['in', 'out']),
  counterparty: z
    .string()
    .trim()
    .min(2, 'Enter who paid you or who you paid (min 2 characters)')
    .max(80),
  amount: z.coerce.number({ error: 'Enter a number' }).gt(0, 'Enter an amount greater than 0'),
  reference: z.string().trim().max(30, 'Reference is too long').optional(),
  network: z.enum(MOMO_NETWORKS).optional(),
  category: z.string().optional(),
  paymentMethod: z.string().max(80).optional(),
  externalReference: z.string().max(120).optional(),
  date: pastOrTodayDate,
});

export type MomoFormInput = z.input<typeof momoSchema>;
export type MomoFormValues = z.output<typeof momoSchema>;

