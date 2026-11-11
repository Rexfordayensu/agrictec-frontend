// Words for lender fields, shared by the console and the farmer marketplace. A value the
// institution did not provide is shown as NOT_PROVIDED, never guessed.

import type {
  InstitutionType,
  LicenceStatus,
  PartnershipStatus,
  PublicationStatus,
} from '@/types/admin';

export const NOT_PROVIDED = 'Not provided';

export const INSTITUTION_TYPE_LABELS: Record<InstitutionType, string> = {
  universal_bank: 'Universal bank',
  rural_community_bank: 'Rural or community bank',
  savings_and_loans: 'Savings and loans company',
  microfinance: 'Microfinance institution',
  finance_house: 'Finance house',
  credit_union: 'Credit union',
  development_finance: 'Development finance institution',
  other: 'Other financial institution',
};

export const LICENCE_LABELS: Record<LicenceStatus, string> = {
  unverified: 'Not verified',
  verified: 'Licence verified',
  expired: 'Licence expired',
  revoked: 'Licence revoked',
};

export const PUBLICATION_LABELS: Record<PublicationStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  unpublished: 'Unpublished',
  suspended: 'Suspended',
};

export const PARTNERSHIP_LABELS: Record<PartnershipStatus, string> = {
  none: 'No partnership',
  in_discussion: 'Partnership in discussion',
  partner: 'AgriCtec partner',
};

/** "Yes", "No" or "Not provided" for a yes/no the institution may not have stated. */
export const yesNo = (value: boolean | undefined | null) =>
  value === true ? 'Yes' : value === false ? 'No' : NOT_PROVIDED;

/** Up to two initials, for a lender without a logo. */
export const lenderInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');

/** Only http(s) links are ever made clickable. */
export const safeWebsite = (url: string | undefined) =>
  url && /^https?:\/\//i.test(url) ? url : undefined;
