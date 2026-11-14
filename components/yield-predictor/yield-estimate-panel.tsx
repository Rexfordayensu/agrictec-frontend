'use client';

import {
  Banknote,
  ChartNoAxesCombined,
  Droplet,
  Info,
  Layers,
  ShieldCheck,
  Sprout,
  TrendingUp,
  Wheat,
} from 'lucide-react';
import type { Ref } from 'react';
import { findCrop } from '@/lib/calculations/yield';
import { formatGHS } from '@/lib/format';
import { usePlatformStore } from '@/store/platform-store';
import { inputStrength } from './yield-options';
import type { Crop, YieldInput } from '@/types';
import type { HarvestEstimate } from '@/services/yield.service';

export function YieldEstimatePanel({
  input,
  result,
  crop,
  cropName = crop,
  unavailable = false,
  stale,
  headingRef,
}: {
  input: YieldInput | null;
  result: HarvestEstimate | null;
  crop: Crop;
  cropName?: string;
  unavailable?: boolean;
  stale: boolean;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const crops = usePlatformStore((s) => s.crops);
  const tips = result?.tips ?? findCrop(crop, crops)?.tips ?? [];
  const icons = [Sprout, ShieldCheck, Droplet, Layers];
  const strength = input ? inputStrength(input) : null;
  return (
    <section className="yield-estimate" aria-labelledby="yield-results-title" aria-live="polite">
      <div className="yield-estimate-top">
        <header className="yield-section-heading">
          <span className="yield-icon">
            <ChartNoAxesCombined aria-hidden="true" />
          </span>
          <div>
            <h2 id="yield-results-title" ref={headingRef} tabIndex={-1}>
              Your harvest estimate
            </h2>
            <p>
              {unavailable
                ? `Yield data for ${cropName} has not been published yet.`
                : result
                  ? 'Based on the details you provided.'
                  : 'Complete your plan to see your harvest estimate.'}
            </p>
          </div>
        </header>
        {stale && (
          <p role="status" className="yield-stale">
            Your choices have changed. Update your estimate to use the new plan.
          </p>
        )}
        <div className="yield-estimate-figures">
          <div>
            <Wheat aria-hidden="true" />
            <div>
              <p>Estimated yield</p>
              <strong>
                {result
                  ? `${result.expected.toLocaleString()} tonnes`
                  : unavailable
                    ? 'Not available'
                    : '—'}
              </strong>
              <small>
                {result
                  ? `(≈ ${result.perAcre.toLocaleString()} t/acre)`
                  : unavailable
                    ? 'No estimate calculated'
                    : 'Choose your crop and farm size'}
              </small>
            </div>
          </div>
          <div>
            <Banknote aria-hidden="true" />
            <div>
              <p>Estimated revenue</p>
              <strong className={!result || result.revenue === null ? 'yield-no-price' : undefined}>
                {result?.revenue != null
                  ? formatGHS(result.revenue)
                  : result
                    ? 'Not available'
                    : unavailable
                      ? 'Not available'
                      : '—'}
              </strong>
              <small>
                {result?.pricePerTonne != null
                  ? `(at ${formatGHS(result.pricePerTonne)} / tonne)`
                  : 'No published price used'}
              </small>
            </div>
          </div>
        </div>
      </div>
      <div className="yield-estimate-body">
        <div className="yield-guidance">
          <Info aria-hidden="true" />
          <p>
            This is a planning estimate, not a guaranteed harvest. Weather, pests, soil and market
            prices can change your results.
          </p>
        </div>
        <div className="yield-factors">
          <h3>
            <span className="yield-icon">
              <TrendingUp aria-hidden="true" />
            </span>
            Key factors that can increase your yield
          </h3>
          {tips.length ? (
            <ul>
              {tips.slice(0, 4).map((tip, index) => {
                const Icon = icons[index % icons.length];
                return (
                  <li key={tip}>
                    <span className="yield-icon">
                      <Icon aria-hidden="true" />
                    </span>
                    <p>{tip}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="yield-tips-empty">
              Growing guidance has not been published for this crop yet.
            </p>
          )}
        </div>
        <details className="yield-explanation">
          <summary>How your choices affect this estimate</summary>
          {input && result ? (
            <div>
              <p>{result.insight}</p>
              <p>
                The model adjusts the crop baseline for season, fertilizer and watering:{' '}
                {strength && `+${strength.boost}% versus baseline`}.
              </p>
              <p>
                Planning range: {result.low.toLocaleString()}–{result.high.toLocaleString()} tonnes
                for {input.acres} {input.acres === 1 ? 'acre' : 'acres'} of {input.crop}.
              </p>
              {result.priceSource && (
                <p>
                  Price observation: {result.priceSource.where}
                  {result.priceSource.observedAt ? `, ${result.priceSource.observedAt}` : ''}.
                  Estimated revenue is before costs.
                </p>
              )}
            </div>
          ) : (
            <p>
              Choose your inputs and select “Estimate my harvest”. The model uses the crop baseline,
              your growing choices, and a published market price when available.
            </p>
          )}
        </details>
      </div>
    </section>
  );
}
