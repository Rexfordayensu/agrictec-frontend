import { z } from 'zod';
import { REGIONS } from '@/constants/regions';
import type { AdminLender, InstitutionType, LenderInput, PartnershipStatus } from '@/types/admin';

/** Colours for a lender without a logo (its initials sit on it). */
export const LENDER_COLORS = [
  '#0f766e',
  '#1d4ed8',
  '#7c3aed',
  '#b45309',
  '#be123c',
  '#15803d',
  '#334155',
  '#0e7490',
] as const;

/** Same name, ignoring case and extra spaces (the API applies the same rule). */
export const sameLenderName = (a: string, b: string) =>
  a.trim().replace(/\s+/g, ' ').toLowerCase() === b.trim().replace(/\s+/g, ' ').toLowerCase();

const optional = (max: number, label: string) =>
  z.string().trim().max(max, `Keep the ${label} under ${max} characters.`);

/**
 * The lender form: the institution's own official information. Empty fields stay empty (they
 * show as "Not provided"); nothing is filled in for the admin.
 */
export function lenderFormSchema(otherNames: string[]) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Enter the institution’s official name.')
      .max(160, 'Keep the name under 160 characters.')
      .refine((name) => !otherNames.some((other) => sameLenderName(other, name)), {
        message: 'A lender with this name already exists.',
      }),
    institutionType: z.enum([
      'universal_bank',
      'rural_community_bank',
      'savings_and_loans',
      'microfinance',
      'finance_house',
      'credit_union',
      'development_finance',
      'other',
    ]),
    registeredName: optional(200, 'registered name'),
    description: optional(2000, 'description'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour.'),
    regulator: optional(120, 'regulator'),
    licenceRef: optional(120, 'licence reference'),
    website: z
      .string()
      .trim()
      .max(300)
      .refine(
        (v) => !v || /^https?:\/\/\S+\.\S+/.test(v),
        'Enter the full address, e.g. https://…',
      ),
    email: z
      .string()
      .trim()
      .max(160)
      .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email address.'),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine((v) => !v || /^\+?[0-9][0-9 ()-]{5,38}$/.test(v), 'Enter a valid phone number.'),
    address: optional(500, 'address'),
    region: z.string().refine((v) => !v || REGIONS.includes(v), 'Choose a region.'),
    offersAgriLoans: z.enum(['unknown', 'yes', 'no']),
    supportedRegions: z.array(z.string()),
    partnershipStatus: z.enum(['none', 'in_discussion', 'partner']),
    submissionEmail: z
      .string()
      .trim()
      .max(160)
      .refine((v) => !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Enter a valid email address.'),
    submissionAgreedOn: z
      .string()
      .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), 'The date can’t be in the future.'),
    submissionNote: optional(500, 'note'),
  }).refine((f) => !f.submissionEmail.trim() || f.submissionAgreedOn, {
    path: ['submissionAgreedOn'],
    message: 'Enter the date the lender agreed to receive applications by email.',
  });
}

export type LenderFormValues = z.infer<ReturnType<typeof lenderFormSchema>>;

export const emptyLenderForm = (): LenderFormValues => ({
  name: '',
  institutionType: 'other',
  registeredName: '',
  description: '',
  color: LENDER_COLORS[0],
  regulator: '',
  licenceRef: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  region: '',
  offersAgriLoans: 'unknown',
  supportedRegions: [],
  partnershipStatus: 'none',
  submissionEmail: '',
  submissionAgreedOn: '',
  submissionNote: '',
});

export const lenderToForm = (l: AdminLender): LenderFormValues => ({
  name: l.name,
  institutionType: l.institutionType,
  registeredName: l.registeredName ?? '',
  description: l.description ?? '',
  color: l.color,
  regulator: l.regulator ?? '',
  licenceRef: l.licenceRef ?? '',
  website: l.website ?? '',
  email: l.email ?? '',
  phone: l.phone ?? '',
  address: l.address ?? '',
  region: l.region ?? '',
  offersAgriLoans:
    l.offersAgriLoans === true ? 'yes' : l.offersAgriLoans === false ? 'no' : 'unknown',
  supportedRegions: l.supportedRegions,
  partnershipStatus: l.partnershipStatus,
  submissionEmail: l.submissionEmail ?? '',
  submissionAgreedOn: l.submissionAgreedOn ?? '',
  submissionNote: l.submissionNote ?? '',
});

const orNull = (v: string) => v.trim() || null;

export const formToLenderInput = (f: LenderFormValues): LenderInput => ({
  name: f.name.trim(),
  institutionType: f.institutionType as InstitutionType,
  registeredName: orNull(f.registeredName),
  description: orNull(f.description),
  color: f.color,
  regulator: orNull(f.regulator),
  licenceRef: orNull(f.licenceRef),
  website: orNull(f.website),
  email: orNull(f.email),
  phone: orNull(f.phone),
  address: orNull(f.address),
  region: orNull(f.region),
  offersAgriLoans: f.offersAgriLoans === 'unknown' ? null : f.offersAgriLoans === 'yes',
  supportedRegions: f.supportedRegions,
  partnershipStatus: f.partnershipStatus as PartnershipStatus,
  submissionEmail: orNull(f.submissionEmail),
  submissionAgreedOn: f.submissionAgreedOn || null,
  submissionNote: orNull(f.submissionNote),
});
