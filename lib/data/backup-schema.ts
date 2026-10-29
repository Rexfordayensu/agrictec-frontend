import { z } from 'zod';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import { FARM_TYPES, SIZE_UNITS, ghanaPhone, normalizePhone } from '@/lib/profile';

const id = z.string().min(1).max(160);
const date = z.iso.date();
const timestamp = z.iso.datetime({ offset: true });
const money = z.number().nonnegative();
export const backupProfileSchema = z
  .object({
    userId: id,
    name: z.string().trim().max(160),
    phone: z.string().trim().regex(ghanaPhone).or(z.literal('')).transform(normalizePhone),
    email: z.string().trim().email().or(z.literal('')),
    region: z.enum(REGIONS).or(z.literal('')),
    constituency: z.string().max(80).optional(),
    community: z.string().max(80).optional(),
    farmName: z.string().max(80),
    useNameAsFarmName: z.boolean().optional(),
    acres: z.number().min(0).max(25000),
    sizeUnit: z.enum(SIZE_UNITS).optional(),
    farmType: z.enum(FARM_TYPES),
    cooperativeName: z.string().max(100).optional(),
    outgrowerCompany: z.string().max(100).optional(),
    primaryCrops: z.array(z.enum(CROPS)).max(CROPS.length),
    otherCrops: z.string().max(120).optional(),
    gps: z
      .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
      .optional(),
    /** Older backups: a verified card's last four digits (the status is never imported). */
    ghanaCardLast4: z
      .string()
      .regex(/^\d{4}$/)
      .optional(),
    onboardingCompletedAt: timestamp.optional(),
    verification: z.object({ phone: z.boolean(), location: z.boolean(), ghanaCard: z.boolean() }),
  })
  .superRefine((profile, ctx) => {
    if (profile.verification.phone && !profile.phone)
      ctx.addIssue({ code: 'custom', path: ['phone'], message: 'Verified phone is missing' });
    if (profile.verification.location && !profile.gps)
      ctx.addIssue({ code: 'custom', path: ['gps'], message: 'Verified location is missing' });
  });
const record = z.object({
  id,
  userId: id,
  type: z.enum(['income', 'expense', 'activity']),
  description: z.string().max(120),
  crop: z.enum(CROPS),
  amount: money,
  date,
  notes: z.string().max(500).optional(),
  createdAt: timestamp,
});
const momo = z.object({
  id,
  userId: id,
  direction: z.enum(['in', 'out']),
  counterparty: z.string().max(160),
  amount: money,
  reference: z.string().max(160),
  network: z.enum(['MTN', 'Telecel', 'AirtelTigo']).optional(),
  date,
  createdAt: timestamp,
});
// imageThumb is deliberately omitted: imports and exports do not carry photos.
const diagnosis = z.object({
  id,
  userId: id,
  disease: z.string().max(500),
  severity: z.enum(['None', 'Moderate', 'High']),
  confidence: z.number().min(0).max(100),
  treatment: z.string().max(10000),
  crop: z.enum(CROPS).optional(),
  date,
});
const reply = z.object({
  title: z.string().max(1000),
  intro: z.string().max(10000).optional(),
  bullets: z.array(z.string().max(10000)).max(50).optional(),
  tip: z.string().max(10000).optional(),
});
const chat = z
  .object({
    id,
    role: z.enum(['user', 'ai']),
    content: z.union([z.string().max(10000), reply]),
    createdAt: timestamp,
  })
  .refine(
    (message) =>
      message.role !== 'user' ||
      (typeof message.content === 'string' && message.content.length <= 500),
    'User messages must be plain text up to 500 characters',
  );
const settings = z.object({
  language: z.enum(['en', 'tw', 'ga', 'ee', 'ha']),
  notifications: z.object({
    aiInsights: z.boolean(),
    weatherAlerts: z.boolean(),
    priceAlerts: z.boolean(),
  }),
});
const loan = z.object({
  id,
  userId: id,
  partnerId: id,
  amount: money,
  purpose: z.string().max(500),
  months: z.number().int().min(1).max(360),
  monthly: money,
  reference: z.string().max(160),
  // Lenders/admins move applications along, so any status can appear in a backup.
  status: z.enum([
    'submitted',
    'under_review',
    'approved',
    'rejected',
    'disbursed',
    'repaid',
    'defaulted',
  ]),
  createdAt: timestamp,
});

export const backupSchema = z
  .object({
    version: z.literal(1),
    exportedAt: timestamp,
    profile: backupProfileSchema,
    records: z.array(record).max(100000),
    momo: z.array(momo).max(100000),
    diagnoses: z.array(diagnosis).max(10),
    chat: z.array(chat).max(10000),
    settings,
    loanApplications: z.array(loan).max(10000).default([]),
  })
  .superRefine((backup, ctx) => {
    for (const name of ['records', 'momo', 'diagnoses', 'chat', 'loanApplications'] as const) {
      const ids = backup[name].map((item) => item.id);
      if (new Set(ids).size !== ids.length)
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: 'Duplicate identifiers are not allowed',
        });
    }
  });
export type DataBackup = z.output<typeof backupSchema>;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export function parseDataBackup(text: string): DataBackup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON. Choose an AgriCtec data export.');
  }
  const result = backupSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Invalid backup${issue.path.length ? ` (${issue.path.join('.')})` : ''}: ${issue.message}`,
    );
  }
  return result.data;
}
