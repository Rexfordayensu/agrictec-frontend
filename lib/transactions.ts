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
/** MoMo entries need their receipt, so an entry without one is "Receipt needed", not just self-reported. */
export const momoStatusLabel = (status: VerificationStatus) =>
  status === 'self_reported' ? 'Receipt needed' : TRANSACTION_STATUSES[status];
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

/** How a money record was paid. A bank payment adds the bank and its reference; mobile money adds
 * the network and its receipt (and goes to AgriCtec's review). */
export const PAYMENT_METHODS = {
  cash: 'Cash',
  bank: 'Bank',
  mobile_money: 'Mobile Money',
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

/** Banks farmers in Ghana commonly use (suggestions only: any bank name can be typed). */
export const GHANA_BANKS = [
  'GCB Bank',
  'Agricultural Development Bank (ADB)',
  'Ecobank Ghana',
  'Absa Bank Ghana',
  'Stanbic Bank Ghana',
  'Fidelity Bank Ghana',
  'CalBank',
  'Zenith Bank Ghana',
  'Access Bank Ghana',
  'Republic Bank Ghana',
  'Standard Chartered Ghana',
  'Consolidated Bank Ghana (CBG)',
  'Prudential Bank',
  'Société Générale Ghana',
  'UBA Ghana',
  'First Atlantic Bank',
  'OmniBSIC Bank',
  'National Investment Bank (NIB)',
  'Rural or community bank',
] as const;

/** "Mobile Money (MTN)", "Bank: GCB Bank", "Cash", or an older record's own wording. */
export function paymentLabel(entry: {
  paymentMethod?: string | null;
  network?: string | null;
  bankName?: string | null;
}): string | null {
  const method = entry.paymentMethod;
  if (!method) return null;
  if (method === 'mobile_money') return `Mobile Money${entry.network ? ` (${entry.network})` : ''}`;
  if (method === 'bank') return entry.bankName ? `Bank: ${entry.bankName}` : 'Bank';
  if (method === 'cash') return 'Cash';
  return method;
}
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
/** "GHS 1,200.50", or "−GHS 100.00" for a negative amount (the server's exact decimal text). */
export function formatSignedMoney(value: string, currency = 'GHS'): string {
  return value.startsWith('-')
    ? `−${formatTransactionMoney(value.slice(1), currency)}`
    : formatTransactionMoney(value, currency);
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
