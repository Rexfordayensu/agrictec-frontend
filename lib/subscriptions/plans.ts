import type { Plan } from '@/types/admin';
import type { PlanAccess, PlanFeature, PlanId } from '@/types/subscription';

export const PLAN_IDS: PlanId[] = ['free', 'basic', 'premium', 'advanced'];
export const FEATURE_NAMES: Record<PlanFeature, string> = {
  pdfReports: 'PDF downloads',
  aiAssistant: 'AI Assistant',
  cropDoctor: 'AI Crop Doctor',
  yieldPredictor: 'Yield Predictor',
};
export const AI_COSTS = { aiAssistant: 1, cropDoctor: 5 } as const;
const noAi = { aiAssistant: false, cropDoctor: false, yieldPredictor: false };
const allTools: PlanAccess = {
  pdfReports: true,
  aiAssistant: true,
  cropDoctor: true,
  yieldPredictor: true,
};

export const PLAN_CATALOG: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    priceGHS: 0,
    active: true,
    access: { pdfReports: false, ...noAi },
    aiCredits: 0,
    features: [
      'Farm records and MoMo tracking',
      'Credit score and loan comparisons',
      'Market and weather information',
    ],
  },
  {
    id: 'basic',
    name: 'Basic',
    priceGHS: 25,
    active: true,
    access: { pdfReports: true, ...noAi },
    aiCredits: 0,
    features: ['Everything in Free', 'Download financial reports as PDFs'],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceGHS: 50,
    active: true,
    access: allTools,
    aiCredits: 100,
    features: [
      'Everything in Basic',
      'AI Assistant and Crop Doctor',
      'Harvest and income estimates',
      '100 shared AI credits each month',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    priceGHS: 100,
    active: true,
    access: allTools,
    aiCredits: null,
    features: ['All available farmer tools', 'Unlimited AI credits', 'Unlimited PDF reports'],
  },
];

export const isPlanId = (value: unknown): value is PlanId => PLAN_IDS.includes(value as PlanId);

/** Upgrade the old two-plan catalogue without dropping saved names or custom prices. */
export function normalizePlans(saved: Plan[] | null | undefined): Plan[] {
  return PLAN_CATALOG.map((base) => {
    const old = saved?.find((plan) => plan.id === base.id);
    const legacy = old && !old.access;
    return {
      ...base,
      ...old,
      id: base.id,
      priceGHS:
        base.id === 'free'
          ? 0
          : legacy && base.id === 'premium' && old.priceGHS === 25
            ? 50
            : (old?.priceGHS ?? base.priceGHS),
      active: base.id === 'free' ? true : (old?.active ?? base.active),
      features: legacy && base.id === 'free' ? base.features : (old?.features ?? base.features),
      access: { ...base.access!, ...old?.access },
      aiCredits: old?.aiCredits !== undefined ? old.aiCredits : base.aiCredits,
    };
  });
}

export function planAccess(plan: Plan): PlanAccess {
  if (plan.id === 'free') return { pdfReports: false, ...noAi };
  if (plan.id === 'basic') return { pdfReports: plan.access?.pdfReports ?? true, ...noAi };
  if (plan.id === 'advanced') return { ...allTools };
  return { ...PLAN_CATALOG.find((p) => p.id === plan.id)!.access!, ...plan.access };
}
