'use client';

import { Target } from 'lucide-react';
import { NumberField, RuleSection } from '@/components/admin/credit-rules/fields';
import { LIMITS } from '@/lib/admin/credit-rules';
import type { CreditConfig } from '@/types/admin';

type Targets = CreditConfig['targets'];

/**
 * What "full marks" means for completeness and MoMo, how far back consistency looks, and how much
 * an entry nobody has checked yet counts against one verified from its receipt.
 */
export function TargetsEditor({
  value,
  live,
  error,
  onChange,
}: {
  value: Targets;
  live: Targets;
  error?: string;
  onChange: (next: Targets) => void;
}) {
  const changed = (Object.keys(value) as (keyof Targets)[]).some((k) => value[k] !== live[k]);
  return (
    <RuleSection
      icon={Target}
      title="Targets"
      description="The amounts that earn a factor its full 100%, and how much unchecked entries count."
      changed={changed}
      error={error}
    >
      <div className="@container">
        <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-4">
          <NumberField
            label="Records for full completeness"
            value={value.recordsForFull}
            live={live.recordsForFull}
            onChange={(v) => onChange({ ...value, recordsForFull: v })}
            {...LIMITS.recordsForFull}
            unit="entries"
            hint="Records + MoMo"
          />
          <NumberField
            label="MoMo for full activity"
            value={value.momoForFull}
            live={live.momoForFull}
            onChange={(v) => onChange({ ...value, momoForFull: v })}
            {...LIMITS.momoForFull}
            unit="txns"
          />
          <NumberField
            label="Consistency window"
            value={value.monthsWindow}
            live={live.monthsWindow}
            onChange={(v) => onChange({ ...value, monthsWindow: v })}
            {...LIMITS.monthsWindow}
            unit="months"
            hint="For payment history"
            format={(v) => `${v} months`}
          />
          <NumberField
            label="Unchecked entries count"
            value={value.unverifiedWeight}
            live={live.unverifiedWeight}
            onChange={(v) => onChange({ ...value, unverifiedWeight: v })}
            {...LIMITS.unverifiedWeight}
            unit="%"
            hint="Verified entries count 100%"
            format={(v) => `${v}%`}
          />
        </div>
      </div>
    </RuleSection>
  );
}
