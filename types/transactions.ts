import type { VerificationStatus } from '@/lib/transactions';
export interface StatusHistory {
  id: string;
  fromStatus?: VerificationStatus;
  toStatus: VerificationStatus;
  actorType: 'farmer' | 'admin' | 'system';
  actorId: string;
  actorName: string;
  reason?: string;
  at: string;
}
export interface TransactionMetadata {
  category?: string | null;
  currency?: string;
  sourceType?: 'farmer_entry' | 'statement_upload';
  verificationStatus?: VerificationStatus;
  externalReference?: string | null;
  paymentMethod?: string | null;
  updatedAt?: string;
  evidenceCount?: number;
  history?: StatusHistory[];
  notes?: string;
  confirmDuplicate?: boolean;
}
export interface Evidence {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  kind: 'receipt' | 'statement' | 'other';
  uploadedAt: string;
}
export interface TransactionItem extends TransactionMetadata {
  id: string;
  userId: string;
  kind: 'farm' | 'momo';
  amount: string;
  date: string;
  createdAt: string;
  type?: 'income' | 'expense' | 'activity' | 'financing';
  direction?: 'in' | 'out';
  description?: string;
  counterparty?: string;
  reference?: string;
  network?: string;
  /** A farm record paid by bank: the bank's name. */
  bankName?: string | null;
  crop?: string;
  evidence: Evidence[];
  referenceDuplicate?: boolean;
}
export interface TransactionPage {
  items: TransactionItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
export interface TransactionSummary {
  income: string;
  expenses: string;
  net: string;
  momoIn: string;
  momoOut: string;
  financingIn: string;
  financingOut: string;
  currency: string;
  totalCount: number;
  countsByStatus: Record<VerificationStatus, number>;
  verifiedShareByCount: string;
  verifiedShareByAmount: string;
  period: { from: string; to: string; months: number };
}
export interface ReviewItem {
  farmerName: string;
  region: string;
  entry: TransactionItem;
  /** Same receipt file or MoMo transaction ID on another farmer's account: check before verifying. */
  warnings?: string[];
}
export interface ReviewPage {
  items: ReviewItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}
