import type { Metadata } from 'next';
import { AssistantContent } from '@/components/admin/content/assistant-content';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'AI Assistant' };

/** The assistant's knowledge base. Guarded by content.manage (checked again on save). */
export default function AssistantContentPage() {
  return (
    <RequirePermission permission="content.manage">
      <AssistantContent />
    </RequirePermission>
  );
}
