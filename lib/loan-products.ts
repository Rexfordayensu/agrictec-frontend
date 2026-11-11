// Words and formatting for loan products, shared by the console and the farmer marketplace.
// Values the lender did not state are NOT_PROVIDED; decimals are formatted, never re-calculated.

import { formatGHS } from '@/lib/format';
import { NOT_PROVIDED } from '@/lib/lenders';
import type {
  Category,
  CheckOp,
  Fee,
  FieldType,
  Metric,
  ProductTerms,
  RateMethod,
  RepaymentFrequency,
  Requirement,
  RequirementCheck,
  Verification,
} from '@/types/products';

export const CATEGORY_LABELS: Record<Category, string> = {
  identity: 'Identity',
  agricultural: 'Farm',
  financial: 'Financial',
  other: 'Other',
};

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  none: 'Nothing (AgriCtec checks it)',
  yes_no: 'Yes or no',
  text: 'Short text',
  number: 'Number',
  amount: 'Amount in GHS',
  date: 'Date',
  select: 'A choice from a list',
  document: 'A document upload',
};

export const VERIFICATION_LABELS: Record<Verification, string> = {
  self_declared: 'Stated by the farmer',
  document_review: 'Checked from a document',
  agrictec_verified: 'Verified by AgriCtec',
  lender_verifies: 'Checked by the lender',
};

export const RATE_METHOD_LABELS: Record<RateMethod, string> = {
  reducing_balance: 'Reducing balance',
  flat: 'Flat rate',
  other: 'Other method',
};

export const FREQUENCY_LABELS: Record<RepaymentFrequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  end_of_season: 'At the end of the season',
  lump_sum: 'In one payment',
  other: 'Other schedule',
};

export const DOCUMENT_FORMATS = ['pdf', 'jpg', 'png', 'webp'] as const;

/** What AgriCtec can check about a farmer (app/domain/loan_products.METRICS). */
export const METRICS: Record<
  Metric,
  { label: string; kind: 'bool' | 'number' | 'amount' | 'choice' }
> = {
  ghana_card_verified: { label: 'Ghana Card verified', kind: 'bool' },
  phone_verified: { label: 'Phone number verified', kind: 'bool' },
  location_verified: { label: 'Farm location verified', kind: 'bool' },
  profile_complete: { label: 'Farm profile complete', kind: 'bool' },
  cooperative_member: { label: 'Member of a cooperative', kind: 'bool' },
  farm_size_acres: { label: 'Farm size (acres)', kind: 'number' },
  farm_region: { label: 'Farm region', kind: 'choice' },
  primary_crop: { label: 'Main crop', kind: 'choice' },
  farm_type: { label: 'Farm type', kind: 'choice' },
  months_of_records: { label: 'Months with farm records', kind: 'number' },
  record_count: { label: 'Number of farm records', kind: 'number' },
  income_12m: { label: 'Recorded income, last 12 months', kind: 'amount' },
  net_12m: { label: 'Recorded net result, last 12 months', kind: 'amount' },
};

export const OPS_BY_KIND: Record<'bool' | 'number' | 'amount' | 'choice', CheckOp[]> = {
  bool: ['is_true'],
  number: ['gte', 'lte'],
  amount: ['gte', 'lte'],
  choice: ['in'],
};

const ghs = (value: string | null | undefined) =>
  value === null || value === undefined || value === '' ? null : formatGHS(Number(value));

/** "Ghana Card verified", "Months with farm records: at least 6", "Farm region: Ashanti or Bono". */
export function describeCheck(check: RequirementCheck): string {
  const spec = METRICS[check.metric];
  if (spec.kind === 'bool') return spec.label;
  if (spec.kind === 'choice') {
    const values = Array.isArray(check.value) ? check.value : [];
    return `${spec.label}: ${values.join(' or ')}`;
  }
  const raw = String(check.value ?? '');
  const shown = spec.kind === 'amount' ? (ghs(raw) ?? raw) : raw;
  return `${spec.label}: ${check.op === 'gte' ? 'at least' : 'at most'} ${shown}`;
}

/** "GHS 1,000 – GHS 50,000", "Up to GHS 50,000", or Not provided. */
export function amountRange(terms: ProductTerms): string {
  const min = ghs(terms.minAmount);
  const max = ghs(terms.maxAmount);
  if (min && max) return `${min} – ${max}`;
  if (max) return `Up to ${max}`;
  if (min) return `From ${min}`;
  return NOT_PROVIDED;
}

/** "6 – 12 months", "Up to 12 months", or Not provided. */
export function monthRange(terms: ProductTerms): string {
  const { minMonths: min, maxMonths: max } = terms;
  if (min && max) return min === max ? `${min} months` : `${min} – ${max} months`;
  if (max) return `Up to ${max} months`;
  if (min) return `From ${min} months`;
  return NOT_PROVIDED;
}

/** "28.5% a year, reducing balance", or Not provided. */
export function rateText(terms: ProductTerms): string {
  if (!terms.interestRate) return NOT_PROVIDED;
  const period =
    terms.ratePeriod === 'month' ? 'a month' : terms.ratePeriod === 'year' ? 'a year' : '';
  const method = terms.rateMethod ? `, ${RATE_METHOD_LABELS[terms.rateMethod].toLowerCase()}` : '';
  return `${Number(terms.interestRate)}% ${period}${method}`.replace(/\s+,/, ',').trim();
}

export const feeText = (fee: Fee) =>
  `${fee.name}: ${fee.kind === 'percent' ? `${Number(fee.value)}%` : formatGHS(Number(fee.value))}`;

/** Requirements grouped by category, in the lender's order. */
export function requirementGroups(requirements: Requirement[]) {
  const order: Category[] = ['identity', 'agricultural', 'financial', 'other'];
  return order
    .map((category) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: requirements.filter((r) => r.category === category),
    }))
    .filter((group) => group.items.length > 0);
}

/** What the farmer gives for a requirement, in plain words. */
export function requirementAsk(r: Requirement): string | null {
  if (r.fieldType === 'none') return r.check ? `AgriCtec checks: ${describeCheck(r.check)}` : null;
  if (r.fieldType === 'document')
    return `Upload ${r.allowedFormats.map((f) => f.toUpperCase()).join(', ') || 'a file'}${r.maxSizeMb ? `, up to ${r.maxSizeMb} MB` : ''}`;
  if (r.fieldType === 'select') return `Choose: ${r.options.join(', ')}`;
  const limits =
    r.min && r.max
      ? ` (${r.min} – ${r.max})`
      : r.min
        ? ` (at least ${r.min})`
        : r.max
          ? ` (at most ${r.max})`
          : '';
  return `${FIELD_TYPE_LABELS[r.fieldType]}${limits}`;
}
