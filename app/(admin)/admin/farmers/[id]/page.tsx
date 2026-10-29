import type { Metadata } from 'next';
import { FarmerDetail } from '@/components/admin/farmers/detail/farmer-detail';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Farmer profile' };

/** One farmer's profile. Next.js 16: params is a Promise, so it is awaited. */
export default async function FarmerDetailPage({ params }: PageProps<'/admin/farmers/[id]'>) {
  const { id } = await params;
  return (
    <RequirePermission permission="farmers.view">
      <FarmerDetail id={decodeURIComponent(id)} />
    </RequirePermission>
  );
}
