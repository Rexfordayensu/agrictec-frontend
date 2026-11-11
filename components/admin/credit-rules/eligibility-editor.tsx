'use client';

import { HandCoins } from 'lucide-react';
import { NumberField, RuleSection } from '@/components/admin/credit-rules/fields';
import { LIMITS } from '@/lib/admin/credit-rules';
import type { CreditConfig } from '@/types/admin';

type Eligibility = CreditConfig['eligibility'];

/** AgriCtec's record-keeping guidance: a target shown to farmers, never a loan rule. */
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
  const changed = value.minRecords !== live.minRecords;
  return (
    <RuleSection
      icon={HandCoins}
      title="Records guidance"
      description="A target shown to farmers to help them prepare. The AgriCtec score informs farmers and never decides a loan: each lender’s published product requirements do."
      changed={changed}
      error={error}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <NumberField
          label="Records target"
          value={value.minRecords}
          live={live.minRecords}
          onChange={(v) => onChange({ ...value, minRecords: v })}
          {...LIMITS.minRecords}
          unit="records"
        />
      </div>
    </RuleSection>
  );
}
