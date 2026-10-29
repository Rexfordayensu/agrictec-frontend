import type { Metadata } from 'next';
import { MarketPricesEditor } from '@/components/admin/content/market-prices-editor';
import { PageHeader } from '@/components/admin/layout/page-header';
import { RequirePermission } from '@/components/admin/layout/require-permission';

export const metadata: Metadata = { title: 'Market Price Management' };

/** Source-backed market management; save operations also check content.manage. */
export default function MarketContentPage() {
  return (
    <RequirePermission permission="content.manage">
      <PageHeader
        title="Market Price Management"
        description="Review and publish source-backed crop prices from markets across Ghana."
      />
      <div className="space-y-6">
        <MarketPricesEditor />
      </div>
    </RequirePermission>
  );
}
