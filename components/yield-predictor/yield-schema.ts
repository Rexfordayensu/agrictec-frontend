import { z } from 'zod';
import { YIELD_CROPS } from '@/constants/crops';

// Presets have yield data; Other lets farmers enter a crop name.
export { YIELD_CROPS };

export const yieldSchema = z
  .object({
    crop: z.enum([...YIELD_CROPS, 'Other']),
    otherCrop: z.string().trim().max(80, 'Use 80 characters or fewer').default(''),
    acres: z.coerce
      .number({ error: 'Enter your acreage' })
      .min(0.1, 'Minimum 0.1 acres')
      .max(1000, 'Maximum 1000 acres'),
    season: z.enum(['major', 'minor']),
    fertilizer: z.enum(['both', 'inorganic', 'organic', 'none']),
    irrigation: z.enum(['rainfed', 'drip', 'sprinkler']),
  })
  .superRefine((values, ctx) => {
    if (values.crop === 'Other' && !values.otherCrop) {
      ctx.addIssue({ code: 'custom', path: ['otherCrop'], message: 'Enter your crop name' });
    }
  });

/** Only published crop presets may be submitted to the estimator. */
export function resolveYieldCrop(crop: string, otherCrop = '') {
  const name = (crop === 'Other' ? otherCrop : crop).trim().replace(/\s+/g, ' ').toLowerCase();
  return YIELD_CROPS.find((option) => option.toLowerCase() === name) ?? null;
}

export type YieldFormInput = z.input<typeof yieldSchema>;
export type YieldFormValues = z.output<typeof yieldSchema>;
