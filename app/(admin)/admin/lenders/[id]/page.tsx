import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { LenderDetail } from '@/components/admin/lenders/lender-detail';

export const metadata: Metadata = { title: 'Lender' };

/** One lender: its details, licence check, listing and publication. Needs lenders.manage. */
export default async function LenderPage({ params }: PageProps<'/admin/lenders/[id]'>) {
  const { id } = await params;
  return (
    <RequirePermission permission="lenders.manage">
      <LenderDetail id={id} />
    </RequirePermission>
  );
}
