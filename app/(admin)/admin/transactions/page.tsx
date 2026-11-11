import { Suspense } from 'react';
import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { TransactionReview } from '@/components/admin/transactions/transaction-review';
import AdminLoading from '@/app/(admin)/admin/loading';
export const metadata: Metadata = { title: 'Transactions review' };
export default function Page() {
  return <RequirePermission permission="transactions.review"><Suspense fallback={<AdminLoading />}><TransactionReview /></Suspense></RequirePermission>;
}
