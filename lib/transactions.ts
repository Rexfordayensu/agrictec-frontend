import type { BadgeColor } from '@/components/ui/badge';

export const TRANSACTION_STATUSES = {
  self_reported: 'Self-reported',
  evidence_submitted: 'Evidence submitted',
  verification_pending: 'Under review',
  verified: 'Verified by AgriCtec',
  rejected: 'Rejected',
  disputed: 'Disputed',
} as const;
export type VerificationStatus = keyof typeof TRANSACTION_STATUSES;
export const STATUS_COLORS: Record<VerificationStatus, BadgeColor> = {
  self_reported: 'blue',
  evidence_submitted: 'gold',
  verification_pending: 'purple',
  verified: 'green',
  rejected: 'red',
  disputed: 'gold',
};
export const CATEGORIES = {
  income: ['crop_sale', 'livestock_sale', 'produce_delivery', 'other_farm_income'],
  expense: [
    'fertilizer',
    'seed',
    'equipment',
    'transport',
    'labour',
    'irrigation',
    'land_rent',
    'other_farm_expense',
  ],
  financing: ['loan_disbursement', 'loan_repayment', 'interest_payment', 'other_financing'],
  activity: [],
} as const;
export const ALL_CATEGORIES = Object.values(CATEGORIES).flat();
export const categoryLabel = (category?: string | null) =>
  category ? category.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase()) : 'Uncategorised';
export const SOURCE_LABELS = {
  farmer_entry: 'Farmer entry',
  statement_upload: 'Statement upload',
} as const;
export function formatTransactionMoney(value: string, currency = 'GHS'): string {
  // Keep the server's decimal digits: no Number conversion or client-side re-summing.
  const [integer, fraction] = value.split('.');
  return `${currency} ${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction === undefined ? '' : `.${fraction}`}`;
}
export function isPossibleDuplicate(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'possible_duplicate'
  );
}
export const duplicateRetry = <T extends object>(input: T): T & { confirmDuplicate: true } => ({
  ...input,
  confirmDuplicate: true,
});
