import { z } from 'zod';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import { FARM_TYPES, ghanaPhone } from '@/lib/profile';

export const personalSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(160),
  phone: z
    .string()
    .trim()
    .regex(ghanaPhone, 'Enter a valid Ghana number, e.g. 0244123456')
    .or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').or(z.literal('')),
  region: z.enum(REGIONS),
});
export const farmSchema = z.object({
  farmName: z.string().trim().max(80),
  acres: z.coerce.number({ error: 'Enter a valid acreage' }).min(0).max(10000),
  farmType: z.enum(FARM_TYPES),
  primaryCrops: z.array(z.enum(CROPS)),
});
export type PersonalValues = z.output<typeof personalSchema>;
/** The farmer's own form: the region is edited with the farm location (and constituency). */
export const contactSchema = personalSchema.omit({ region: true });
export type ContactValues = z.output<typeof contactSchema>;
export type FarmInput = z.input<typeof farmSchema>;
export type FarmValues = z.output<typeof farmSchema>;
