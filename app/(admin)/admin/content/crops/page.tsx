import type { Metadata } from 'next';
import { CropsEditor } from '@/components/admin/content/crops-editor';
import { PageHeader } from '@/components/admin/layout/page-header';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Crops & Yields' };

/** Crop yields, prices and tips. Guarded by content.manage (checked again on save). */
export default function CropsContentPage() {
  return (
    <RequirePermission permission="content.manage">
      <PageHeader
        title="Crops & yields"
        description="Base yield, farm-gate price and tips for each crop. The yield predictor and the assistant use them as soon as you save."
      />
      <CropsEditor />
    </RequirePermission>
  );
}
