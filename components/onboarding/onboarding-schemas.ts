// The onboarding wizard's validation (one zod schema per step) and the mapping between each
// step's form values and the Profile fields they fill. Shared by the wizard, the profile page's
// edit dialogs and onboardingService.complete (which checks the whole profile once more).

import { z } from 'zod';
import { CROPS } from '@/constants/crops';
import { isConstituencyOf } from '@/constants/constituencies';
import { REGIONS } from '@/constants/regions';
import { FARM_TYPES, SIZE_UNITS, fromAcres, ghanaCard, toAcres } from '@/lib/profile';
import type { Crop, FarmType, Profile, SizeUnit } from '@/types';

/** The pin must be inside Ghana's bounding box. */
export const GHANA_BOUNDS = { minLat: 4.5, maxLat: 11.2, minLng: -3.3, maxLng: 1.3 } as const;
export const GHANA_CENTER = { lat: 7.9465, lng: -1.0232 } as const;

export const insideGhana = ({ lat, lng }: { lat: number; lng: number }) =>
  lat >= GHANA_BOUNDS.minLat &&
  lat <= GHANA_BOUNDS.maxLat &&
  lng >= GHANA_BOUNDS.minLng &&
  lng <= GHANA_BOUNDS.maxLng;

export const OUTSIDE_GHANA = 'This location is outside Ghana.';
export const MAX_FARM_SIZE = 10_000;

const gpsSchema = z
  .object({ lat: z.number().finite(), lng: z.number().finite() })
  .refine(insideGhana, OUTSIDE_GHANA);

// ---------- Step 1: farm name ----------

export const farmNameSchema = z.object({
  useNameAsFarmName: z.boolean(),
  farmName: z
    .string()
    .trim()
    .min(2, 'Enter a farm name of at least 2 characters.')
    .max(80, 'Keep the farm name to 80 characters.'),
});
export type FarmNameValues = z.infer<typeof farmNameSchema>;

// ---------- Step 2: location ----------

export const locationSchema = z
  .object({
    region: z.enum(REGIONS, { error: 'Choose your region.' }),
    constituency: z.string().min(1, 'Choose your constituency.'),
    community: z.string().trim().max(80, 'Keep it to 80 characters.'),
    gps: gpsSchema.nullable(),
  })
  .refine((v) => !v.constituency || isConstituencyOf(v.region, v.constituency), {
    path: ['constituency'],
    message: 'Choose a constituency in this region.',
  });
export type LocationValues = z.infer<typeof locationSchema>;

// ---------- Step 3: farm size ----------

export const farmSizeSchema = z.object({
  size: z
    .number({ error: 'Enter your farm size.' })
    .finite('Enter your farm size.')
    .gt(0, 'Farm size must be more than 0.')
    .max(MAX_FARM_SIZE, `Farm size can be at most ${MAX_FARM_SIZE.toLocaleString()}.`),
  sizeUnit: z.enum(SIZE_UNITS),
});
export type FarmSizeValues = z.infer<typeof farmSizeSchema>;

// ---------- Step 4: crops ----------

export const cropsSchema = z
  .object({
    primaryCrops: z.array(z.enum(CROPS)).min(1, 'Choose at least one crop.'),
    otherCrops: z.string().trim().max(120, 'Keep it to 120 characters.'),
  })
  .refine((v) => !v.primaryCrops.includes('Other') || v.otherCrops.length >= 2, {
    path: ['otherCrops'],
    message: 'Type the name of your other crop(s).',
  });
export type CropsValues = z.infer<typeof cropsSchema>;

// ---------- Step 5: farm type ----------

export const farmTypeSchema = z
  .object({
    farmType: z.enum(FARM_TYPES, { error: 'Choose your farm type.' }),
    cooperativeName: z.string().trim().max(100, 'Keep it to 100 characters.'),
    outgrowerCompany: z.string().trim().max(100, 'Keep it to 100 characters.'),
  })
  .refine((v) => v.farmType !== 'Cooperative' || v.cooperativeName.length >= 2, {
    path: ['cooperativeName'],
    message: 'Enter the name of your cooperative.',
  });
export type FarmTypeValues = z.infer<typeof farmTypeSchema>;

// ---------- Step 6: Ghana Card ----------

/**
 * "have": a new number (validated and confirmed) or the card already saved in the draft (only
 * its mask and hash are kept, so it can't be shown again in full). "later": no card.
 */
export const ghanaCardStepSchema = z
  .object({
    choice: z.enum(['have', 'later'], { error: 'Choose an option.' }),
    cardNumber: z.string(),
    confirmOwner: z.boolean(),
    /** The masked card already in the draft (kept when the number field is left empty). */
    savedMasked: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.choice !== 'have') return;
    if (v.savedMasked && !v.cardNumber) return;
    if (!ghanaCard.test(v.cardNumber))
      ctx.addIssue({
        code: 'custom',
        path: ['cardNumber'],
        message: 'Enter your Ghana Card number as GHA-123456789-0.',
      });
    if (!v.confirmOwner)
      ctx.addIssue({
        code: 'custom',
        path: ['confirmOwner'],
        message: 'Confirm that this Ghana Card belongs to you.',
      });
  });
export type GhanaCardStepValues = z.infer<typeof ghanaCardStepSchema>;

// ---------- Review ----------

export const reviewSchema = z.object({
  confirmed: z.literal(true, { error: 'Confirm that the information is correct.' }),
});

// ---------- The whole profile, checked once more on submit ----------

export const onboardingProfileSchema = z
  .object({
    farmName: farmNameSchema.shape.farmName,
    useNameAsFarmName: z.boolean(),
    region: z.enum(REGIONS),
    constituency: z.string().min(1),
    community: z.string().trim().max(80).optional(),
    gps: gpsSchema.optional(),
    acres: z
      .number()
      .finite()
      .gt(0)
      .max(MAX_FARM_SIZE * 2.48),
    sizeUnit: z.enum(SIZE_UNITS),
    primaryCrops: z.array(z.enum(CROPS)).min(1),
    otherCrops: z.string().trim().max(120).optional(),
    farmType: z.enum(FARM_TYPES),
    cooperativeName: z.string().trim().max(100).optional(),
    outgrowerCompany: z.string().trim().max(100).optional(),
    ghanaCard: z.object({
      status: z.enum(['not_provided', 'pending', 'verified', 'rejected']),
      masked: z.string().optional(),
      hash: z.string().optional(),
    }),
  })
  .refine((v) => isConstituencyOf(v.region, v.constituency), {
    path: ['constituency'],
    message: 'Choose a constituency in this region.',
  })
  .refine((v) => !v.primaryCrops.includes('Other') || (v.otherCrops ?? '').length >= 2, {
    path: ['otherCrops'],
    message: 'Type the name of your other crop(s).',
  })
  .refine((v) => v.farmType !== 'Cooperative' || (v.cooperativeName ?? '').length >= 2, {
    path: ['cooperativeName'],
    message: 'Enter the name of your cooperative.',
  })
  .refine((v) => v.ghanaCard.status === 'not_provided' || Boolean(v.ghanaCard.masked), {
    path: ['ghanaCard'],
    message: 'Add your Ghana Card again.',
  });

// ---------- Profile ⇄ step values ----------

type Data = Partial<Profile>;

export const farmNameDefaults = (data: Data): FarmNameValues => ({
  useNameAsFarmName: data.useNameAsFarmName ?? false,
  farmName: data.farmName ?? '',
});

export const locationDefaults = (data: Data): LocationValues => ({
  region: (REGIONS.includes(data.region ?? '') ? data.region : '') as LocationValues['region'],
  constituency: data.constituency ?? '',
  community: data.community ?? '',
  gps: data.gps ?? null,
});

export const locationPatch = (v: LocationValues): Data => ({
  region: v.region,
  constituency: v.constituency,
  community: v.community.trim() || undefined,
  gps: v.gps ?? undefined,
});

export const farmSizeDefaults = (data: Data): FarmSizeValues => {
  const sizeUnit: SizeUnit = data.sizeUnit ?? 'acres';
  return {
    sizeUnit,
    size: data.acres && data.acres > 0 ? fromAcres(data.acres, sizeUnit) : Number.NaN,
  };
};

/** Always stores acres; the unit is kept so the size reads back the way it was entered. */
export const farmSizePatch = (v: FarmSizeValues): Data => ({
  acres: Math.round(toAcres(v.size, v.sizeUnit) * 10_000) / 10_000,
  sizeUnit: v.sizeUnit,
});

export const cropsDefaults = (data: Data): CropsValues => ({
  primaryCrops: (data.primaryCrops ?? []).filter((c): c is Crop => (CROPS as string[]).includes(c)),
  otherCrops: data.otherCrops ?? '',
});

export const cropsPatch = (v: CropsValues): Data => ({
  primaryCrops: v.primaryCrops,
  otherCrops: v.primaryCrops.includes('Other') ? v.otherCrops.trim() : undefined,
});

export const farmTypeDefaults = (data: Data): FarmTypeValues => ({
  farmType: (data.farmType ?? '') as FarmType,
  cooperativeName: data.cooperativeName ?? '',
  outgrowerCompany: data.outgrowerCompany ?? '',
});

export const farmTypePatch = (v: FarmTypeValues): Data => ({
  farmType: v.farmType,
  cooperativeName: v.farmType === 'Cooperative' ? v.cooperativeName.trim() : undefined,
  outgrowerCompany:
    v.farmType === 'Out-grower' ? v.outgrowerCompany.trim() || undefined : undefined,
});

export const ghanaCardDefaults = (data: Data): GhanaCardStepValues => ({
  choice:
    data.ghanaCard?.status === 'not_provided'
      ? 'later'
      : data.ghanaCard?.masked
        ? 'have'
        : ('' as GhanaCardStepValues['choice']),
  cardNumber: '',
  confirmOwner: false,
  savedMasked: data.ghanaCard?.status === 'not_provided' ? '' : (data.ghanaCard?.masked ?? ''),
});

export const STEPS = [
  { id: 'farm-name', label: 'Farm name' },
  { id: 'location', label: 'Location' },
  { id: 'size', label: 'Farm size' },
  { id: 'crops', label: 'Crops' },
  { id: 'type', label: 'Farm type' },
  { id: 'ghana-card', label: 'Ghana Card' },
] as const;

/** Index of the review screen (after the six steps). */
export const REVIEW_STEP = STEPS.length;
