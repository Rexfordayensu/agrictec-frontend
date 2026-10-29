// The farmers list's search, filters, sorting and role abilities (phase A7). Pure, so the table,
// shareable URLs and the tests all use exactly the same rules.

import { differenceInCalendarDays } from 'date-fns';
import { DEFAULT_CREDIT_CONFIG } from '@/lib/admin/defaults';
import { can } from '@/lib/admin/permissions';
import { scoreLabel, type ScoreLabel } from '@/lib/calculations/credit-score';
import { normalizePhone } from '@/lib/profile';
import type { AdminRole, CreditConfig, FarmerAccount } from '@/types/admin';

/** URL parameter names. Multi-value filters are comma-separated: ?region=Northern,Ashanti */
export const FARMER_FILTERS = [
  'region',
  'crop',
  'status',
  'band',
  'verification',
  'joinedFrom',
  'joinedTo',
  'records',
  'tag',
  'active',
] as const;
export type FarmerFilterName = (typeof FARMER_FILTERS)[number];

export const SCORE_BANDS: { value: string; label: ScoreLabel }[] = [
  { value: 'building', label: 'Building' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'excellent', label: 'Excellent' },
];

export const VERIFICATION_FILTERS = [
  { value: 'full', label: 'Fully verified' },
  { value: 'no-card', label: 'Missing Ghana Card' },
  { value: 'no-phone', label: 'Missing phone' },
] as const;

export const splitValues = (value: string) =>
  value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

/** How many of phone, location and Ghana Card are verified (0–3). */
export const verifiedCount = (f: FarmerAccount) =>
  [
    f.profile.verification.phone,
    f.profile.verification.location,
    f.profile.verification.ghanaCard,
  ].filter(Boolean).length;

export const bandOf = (f: FarmerAccount, bands: CreditConfig['bands']) =>
  scoreLabel(f.stats.score, bands).toLowerCase();

/** Each filter: does the farmer pass, given the URL value? (Empty values never reach here.) */
export function farmerFilterFns(
  bands: CreditConfig['bands'] = DEFAULT_CREDIT_CONFIG.bands,
  now = new Date(),
): Record<FarmerFilterName, (f: FarmerAccount, value: string) => boolean> {
  return {
    region: (f, value) => splitValues(value).includes(f.profile.region),
    crop: (f, value) => splitValues(value).some((crop) => f.profile.primaryCrops.includes(crop)),
    status: (f, value) => f.status === value,
    band: (f, value) => splitValues(value).includes(bandOf(f, bands)),
    verification: (f, value) => {
      const v = f.profile.verification;
      if (value === 'full') return v.phone && v.location && v.ghanaCard;
      if (value === 'no-card') return !v.ghanaCard;
      if (value === 'no-phone') return !v.phone;
      return true;
    },
    // Dates are "yyyy-MM-dd"; both ends are inclusive.
    joinedFrom: (f, value) => f.createdAt.slice(0, 10) >= value,
    joinedTo: (f, value) => f.createdAt.slice(0, 10) <= value,
    records: (f, value) => (value === 'yes' ? f.stats.records > 0 : f.stats.records === 0),
    tag: (f, value) => f.tags.includes(value),
    // Active within the last N days (the overview's "Active (30 days)" link uses ?active=30).
    active: (f, value) =>
      Boolean(f.lastActiveAt) &&
      differenceInCalendarDays(now, new Date(f.lastActiveAt!)) <= Number(value || 30),
  };
}

/** Both "+233241234567" and "0241234567", so a phone matches however it is typed. */
const phoneForms = (phone: string) => {
  if (!phone) return '';
  const intl = normalizePhone(phone);
  return `${intl} ${intl.replace('+233', '0')}`;
};

/** What the search box matches: name, email, phone and farm name. */
export const FARMER_SEARCH_KEYS: ((f: FarmerAccount) => string)[] = [
  (f) => f.profile.name,
  (f) => f.email,
  (f) => phoneForms(f.profile.phone),
  (f) => f.profile.farmName,
];

const STATUS_ORDER = { active: 0, pending_verification: 1, suspended: 2 } as const;

/** Sort values per column key (every column except the checkbox and the menu sorts). */
export const FARMER_SORT: Record<string, (f: FarmerAccount) => string | number> = {
  farmer: (f) => (f.profile.name || f.email).toLowerCase(),
  region: (f) => f.profile.region,
  crops: (f) => f.profile.primaryCrops.join(', '),
  score: (f) => f.stats.score,
  records: (f) => f.stats.records,
  income: (f) => f.stats.income,
  verified: (f) => verifiedCount(f),
  status: (f) => STATUS_ORDER[f.status],
  joined: (f) => f.createdAt,
};

/**
 * Applies search and filters from URL parameters, exactly like the table does. Guests are
 * left out of the admin list (they are a shared demo account, not a farmer).
 */
export function filterFarmers(
  farmers: FarmerAccount[],
  params: URLSearchParams,
  bands?: CreditConfig['bands'],
  now = new Date(),
): FarmerAccount[] {
  const fns = farmerFilterFns(bands, now);
  const needle = (params.get('q') ?? '').trim().toLowerCase();
  return farmers.filter(
    (f) =>
      !f.isGuest &&
      (!needle || FARMER_SEARCH_KEYS.some((key) => key(f).toLowerCase().includes(needle))) &&
      FARMER_FILTERS.every((name) => {
        const value = params.get(name);
        return !value || fns[name](f, value);
      }),
  );
}

/** "60 farmers · 51 active · 3 suspended · 6 pending". */
export function farmerCountSummary(farmers: FarmerAccount[]): string {
  const people = farmers.filter((f) => !f.isGuest);
  const count = (status: FarmerAccount['status']) =>
    people.filter((f) => f.status === status).length;
  return [
    `${people.length} farmer${people.length === 1 ? '' : 's'}`,
    `${count('active')} active`,
    `${count('suspended')} suspended`,
    `${count('pending_verification')} pending`,
  ].join(' · ');
}

/** What the current role may do in the farmers list (the services check again on every call). */
export function farmerAbilities(role: AdminRole | undefined) {
  const suspend = can(role, 'farmers.suspend');
  const edit = can(role, 'farmers.edit');
  const announce = can(role, 'announcements.send');
  return {
    suspend,
    resetPassword: edit,
    addNote: edit,
    tag: edit,
    impersonate: can(role, 'farmers.impersonate'),
    export: can(role, 'reports.export'),
    announce,
    riskScan: can(role, 'risk.review'),
    /** Checkboxes only appear when there is a bulk action the role can take. */
    select: suspend || edit || announce,
  };
}
export type FarmerAbilities = ReturnType<typeof farmerAbilities>;
