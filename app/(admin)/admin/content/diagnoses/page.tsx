import type { Metadata } from 'next';
import { DiagnosesLibrary } from '@/components/admin/content/diagnoses-library';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Crop Diagnoses' };

/** The crop doctor's disease library. Guarded by content.manage (checked again on save). */
export default function DiagnosesContentPage() {
  return (
    <RequirePermission permission="content.manage">
      <DiagnosesLibrary />
    </RequirePermission>
  );
}
