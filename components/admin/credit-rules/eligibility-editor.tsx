'use client';

import { HandCoins } from 'lucide-react';
import { NumberField, RuleSection } from '@/components/admin/credit-rules/fields';
import { LIMITS, SCORE_MAX, SCORE_MIN } from '@/lib/admin/credit-rules';
import type { CreditConfig } from '@/types/admin';

type Eligibility = CreditConfig['eligibility'];

/** Who can apply for a loan, and how much they can ask for. */
export function EligibilityEditor({
  value,
  live,
  error,
  onChange,
}: {
  value: Eligibility;
  live: Eligibility;
  error?: string;
  onChange: (next: Eligibility) => void;
}) {
  const changed = (Object.keys(value) as (keyof Eligibility)[]).some((k) => value[k] !== live[k]);
  return (
    <RuleSection
      icon={HandCoins}
      title="Loan eligibility"
      description="The platform minimum; a lender’s own minimum score can be higher."
      changed={changed}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          label="Minimum records"
          value={value.minRecords}
          live={live.minRecords}
          onChange={(v) => onChange({ ...value, minRecords: v })}
          {...LIMITS.minRecords}
          unit="records"
        />
        <NumberField
          label="Minimum score"
          value={value.minScore}
          live={live.minScore}
          onChange={(v) => onChange({ ...value, minScore: v })}
          min={SCORE_MIN}
          max={SCORE_MAX}
        />
        <NumberField
          label="Max loan"
          value={value.maxProfitMultiplier}
          live={live.maxProfitMultiplier}
          onChange={(v) => onChange({ ...value, maxProfitMultiplier: v })}
          {...LIMITS.maxProfitMultiplier}
          step={0.5}
          unit="× yearly profit"
          format={(v) => `${v}×`}
        />
      </div>
    </RuleSection>
  );
}
