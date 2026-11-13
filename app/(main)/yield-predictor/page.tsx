import type { Metadata } from 'next';
import { FeatureGate } from '@/components/shared/feature-gate';
import { YieldForm } from '@/components/yield-predictor/yield-form';
import { YieldHero } from '@/components/yield-predictor/yield-hero';

import '@/components/yield-predictor/yield-page.css';

export const metadata: Metadata = { title: 'AI Yield Predictor' };

export default function YieldPredictorPage() {
  return (
    <FeatureGate flag="yieldPredictor">
      <div className="yield-reference @container space-y-4">
        <YieldHero />
        <YieldForm />
      </div>
    </FeatureGate>
  );
}
