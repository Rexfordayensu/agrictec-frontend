import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { DemoDataNotice } from '@/components/market/demo-data-notice';
import { MarketView } from '@/components/market/market-view';

export const metadata: Metadata = { title: 'Market Prices' };

export default function MarketPage() {
  return (
    <FeatureGate flag="market">
      <div className="@container space-y-6">
        <DemoDataNotice />
        <MarketView />
      </div>
    </FeatureGate>
  );
}
