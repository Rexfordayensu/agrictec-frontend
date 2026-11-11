import type { Metadata } from 'next';
import { RequirePermission } from '@/components/admin/layout/require-permission';
import { ProductEditor } from '@/components/admin/lenders/product-editor';

export const metadata: Metadata = { title: 'Loan product' };

/** One loan product: its draft, published versions and requirements. Needs lenders.manage. */
export default async function LoanProductPage({
  params,
}: PageProps<'/admin/lenders/[id]/products/[productId]'>) {
  const { id, productId } = await params;
  return (
    <RequirePermission permission="lenders.manage">
      <ProductEditor lenderId={id} productId={productId} />
    </RequirePermission>
  );
}
