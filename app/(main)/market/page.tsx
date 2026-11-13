import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { MarketView } from '@/components/market/market-view';

export const metadata: Metadata = { title: 'Market Prices' };

/** Published, source-backed crop prices across Ghana (GET /market/prices). */
export default function MarketPage() {
  return (
    <FeatureGate flag="market">
      <div className="@container">
        <MarketView />
      </div>
    </FeatureGate>
  );
}
