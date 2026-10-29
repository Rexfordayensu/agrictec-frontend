// Validation for everything an admin can save or import. Services parse with these before writing,
// so a bad form or a hand-edited backup file can never corrupt what farmers see.

import { z } from 'zod';
import { marketPriceSchema, publicationError } from '@/lib/market/evidence';
import { CROPS } from '@/constants/crops';
import { REGIONS } from '@/constants/regions';
import { MESSAGE_MAX, TITLE_MAX } from '@/lib/admin/announcements';
import { ASSISTANT_FALLBACK_ID } from '@/lib/admin/defaults';

const text = (max: number) => z.string().trim().min(1).max(max);
const timestamp = z.iso.datetime({ offset: true });
const percent = z.number().int().min(0).max(100);
const score = z.number().int().min(300).max(850);
const knownCrop = z.enum([
  'Maize',
  'Cassava',
  'Rice',
  'Cocoa',
  'Yam',
  'Plantain',
  'Groundnut',
  'Tomato',
]);

export const creditConfigInputSchema = z
  .object({
    weights: z.object({
      paymentHistory: percent,
      recordCompleteness: percent,
      incomeStability: percent,
      momoActivity: percent,
      verification: percent,
    }),
    targets: z.object({
      recordsForFull: z.number().int().min(1).max(1000),
      momoForFull: z.number().int().min(1).max(1000),
      monthsWindow: z.number().int().min(1).max(24),
    }),
    bands: z.object({ fair: score, good: score, excellent: score }),
    eligibility: z.object({
      minRecords: z.number().int().min(0).max(1000),
      minScore: score,
      maxProfitMultiplier: z.number().min(0.5).max(20),
    }),
  })
  .superRefine((config, ctx) => {
    const total = Object.values(config.weights).reduce((a, b) => a + b, 0);
    if (total !== 100) {
      ctx.addIssue({
        code: 'custom',
        path: ['weights'],
        message: `Weights must add up to 100 (they add up to ${total}).`,
      });
    }
    const { fair, good, excellent } = config.bands;
    if (!(fair < good && good < excellent)) {
      ctx.addIssue({
        code: 'custom',
        path: ['bands'],
        message: 'Bands must rise: Fair < Good < Excellent.',
      });
    }
  });

export const creditConfigSchema = z.intersection(
  creditConfigInputSchema,
  z.object({
    version: z.number().int().min(1),
    updatedAt: timestamp,
    updatedBy: z.string(),
    note: z.string().max(500).optional(),
    restoredFrom: z.number().int().min(1).optional(),
  }),
);

export const featureFlagsSchema = z.object({
  signupOpen: z.boolean(),
  guestMode: z.boolean(),
  aiAssistant: z.boolean(),
  cropDoctor: z.boolean(),
  yieldPredictor: z.boolean(),
  loans: z.boolean(),
  market: z.boolean(),
  pdfReports: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().trim().max(300),
  maintenanceEndsAt: z.iso.datetime({ offset: true }).optional(),
});

export const plansSchema = z
  .array(
    z.object({
      id: z.enum(['free', 'basic', 'premium', 'advanced']),
      name: text(40),
      priceGHS: z.number().min(0).max(10000),
      features: z.array(text(80)).max(12),
      active: z.boolean(),
      access: z
        .object({
          pdfReports: z.boolean(),
          aiAssistant: z.boolean(),
          cropDoctor: z.boolean(),
          yieldPredictor: z.boolean(),
        })
        .optional(),
      aiCredits: z.number().int().min(0).max(1000000).nullable().optional(),
    }),
  )
  .refine(
    (plans) => new Set(plans.map((p) => p.id)).size === plans.length,
    'Each plan appears once.',
  )
  .refine(
    (plans) => plans.some((p) => p.id === 'free' && p.active && p.priceGHS === 0),
    'Free must remain available at GHS 0.',
  )
  .refine(
    (plans) =>
      plans.every(
        (p) =>
          p.id !== 'premium' ||
          p.aiCredits === undefined ||
          (p.aiCredits !== null && p.aiCredits >= 1),
      ),
    'Premium needs a limited allowance of at least 1 AI credit.',
  )
  .refine(
    (plans) => plans.every((p) => p.id === 'free' || p.priceGHS >= 1),
    'Paid plans need a price of at least GHS 1.',
  );

export const lenderInputSchema = z
  .object({
    name: text(80),
    rate: z.number().min(1, 'The rate must be 1% to 60%.').max(60, 'The rate must be 1% to 60%.'),
    maxAmount: z.number().min(500, 'The maximum amount must be at least GHS 500.').max(10_000_000),
    minMonths: z
      .number()
      .int()
      .min(1, 'Terms are 1 to 60 months.')
      .max(60, 'Terms are 1 to 60 months.'),
    maxMonths: z
      .number()
      .int()
      .min(1, 'Terms are 1 to 60 months.')
      .max(60, 'Terms are 1 to 60 months.'),
    minScore: z
      .number()
      .int()
      .min(300, 'Scores run from 300 to 850.')
      .max(850, 'Scores run from 300 to 850.'),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour such as #10b981.'),
    active: z.boolean(),
    description: z
      .string()
      .trim()
      .max(200, 'Keep the description under 200 characters.')
      .optional(),
  })
  .refine((l) => l.maxMonths >= l.minMonths, {
    path: ['maxMonths'],
    message: 'Maximum months must be at least the minimum.',
  });

export const lenderSchema = z.intersection(
  lenderInputSchema,
  z.object({ id: text(80), createdAt: timestamp }),
);

export const marketPricesSchema = z
  .array(marketPriceSchema)
  .max(1000)
  .superRefine((prices, ctx) => {
    const ids = new Set<string>();
    prices.forEach((price, index) => {
      if (price.id && ids.has(price.id))
        ctx.addIssue({
          code: 'custom',
          path: [index, 'id'],
          message: 'Each observation needs its own ID.',
        });
      if (price.id) ids.add(price.id);
      if (price.status === 'published') {
        const error = publicationError(price, new Date().toISOString().slice(0, 10));
        if (error) ctx.addIssue({ code: 'custom', path: [index], message: error });
      }
    });
  });

export const weatherSchema = z.object({
  condition: z.enum(['sunny', 'partly-cloudy', 'showers', 'storm']),
  temp: z.number().min(-10).max(60),
  description: text(80),
  humidity: percent,
  rainChance: percent,
});

export const cropContentSchema = z.array(
  z.object({
    crop: knownCrop,
    emoji: z.string().trim().min(1).max(8),
    yieldPerAcre: z.number().positive().max(1000),
    pricePerTonne: z.number().positive().max(1_000_000),
    tips: z.array(text(240)).max(10),
  }),
);

const assistantReplySchema = z.object({
  title: text(120),
  intro: z.string().trim().max(600).optional(),
  bullets: z.array(text(400)).max(10).optional(),
  tip: z.string().trim().max(400).optional(),
});

export const assistantKbSchema = z.array(
  z
    .object({
      id: text(80),
      // The fallback reply (no match) has no keywords; every other item needs at least one.
      keywords: z.array(z.string().trim().toLowerCase().min(1).max(60)).max(30),
      reply: assistantReplySchema,
      active: z.boolean(),
      priority: z.number().int().min(0).max(1000),
    })
    .refine((item) => item.id === ASSISTANT_FALLBACK_ID || item.keywords.length > 0, {
      path: ['keywords'],
      message: 'Add at least one keyword.',
    }),
);

export const diagnosesContentSchema = z.array(
  z
    .object({
      id: text(80),
      disease: text(80),
      severity: z.enum(['None', 'Moderate', 'High']),
      confidence: z.number().min(0).max(100),
      confidenceMin: z.number().int().min(1).max(100).optional(),
      confidenceMax: z.number().int().min(1).max(100).optional(),
      treatment: text(1000),
      prevention: z.array(text(240)).max(8).optional(),
      crop: z.enum(CROPS).optional(),
      active: z.boolean(),
    })
    .refine(
      (d) =>
        (d.confidenceMin === undefined) === (d.confidenceMax === undefined) &&
        (d.confidenceMin === undefined || d.confidenceMin <= (d.confidenceMax ?? 0)),
      { path: ['confidenceMax'], message: 'The confidence range must run from low to high.' },
    ),
);

export const announcementInputSchema = z
  .object({
    title: text(TITLE_MAX),
    message: text(MESSAGE_MAX),
    type: z.enum(['info', 'success', 'warning', 'critical']),
    audience: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('all') }),
      z.object({ kind: z.literal('region'), regions: z.array(z.enum(REGIONS)).min(1) }),
      z.object({ kind: z.literal('crop'), crops: z.array(z.enum(CROPS)).min(1) }),
    ]),
    startsAt: timestamp,
    endsAt: timestamp.optional(),
    active: z.boolean(),
    dismissible: z.boolean(),
  })
  .refine((a) => !a.endsAt || a.endsAt > a.startsAt, {
    path: ['endsAt'],
    message: 'The end must be after the start.',
  });

/** Readable message from the first zod issue, for toasts. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  return issue ? issue.message : 'Invalid data.';
}

/** Parses or throws an Error with a readable message. */
export function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(firstIssue(result.error));
  return result.data;
}
