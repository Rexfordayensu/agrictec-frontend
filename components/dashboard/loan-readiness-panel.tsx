'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Landmark } from 'lucide-react';
import { Badge, type BadgeColor } from '@/components/ui/badge';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { formatGHS, formatGhanaDate } from '@/lib/format';
import { eligibilityService } from '@/services/eligibility.service';
import { identityService } from '@/services/identity.service';
import { useCreditStore } from '@/store/credit-store';
import { usePlatformStore } from '@/store/platform-store';
import type { EligibilityOutcome, EligibilitySummary } from '@/types/eligibility';
import type { FinancialSummary } from '@/types/financial';
import type { IdentityLevel } from '@/types/identity';

const OUTCOME_COLOR: Record<EligibilityOutcome, BadgeColor> = {
  meets_preliminary: 'green',
  additional_information: 'gold',
  does_not_meet: 'red',
  unable_to_assess: 'blue',
};

const IDENTITY: Record<IdentityLevel, string> = {
  none: 'Not added yet',
  reviewed: 'Reviewed by AgriCtec',
  nia_verified: 'Verified with NIA',
};

/**
 * Loan readiness: how much financial evidence the farmer has, their identity status, recorded
 * loans, and their latest preliminary checks against lenders' products. Separate from the
 * AgriCtec score (record-keeping progress), and never a loan amount or decision.
 */
export function LoanReadinessPanel({ summary }: { summary: FinancialSummary | null }) {
  const enabled = usePlatformStore((s) => s.flags.loans);
  const evidence = useCreditStore((s) => s.summary?.evidence);
  const [checks, setChecks] = useState<EligibilitySummary[] | null>(null);
  const [identity, setIdentity] = useState<IdentityLevel | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    eligibilityService.latest().then(
      (list) => active && setChecks(list),
      () => active && setChecks([]),
    );
    identityService.status().then(
      (state) => active && setIdentity(state.level),
      () => active && setIdentity(null),
    );
    return () => {
      active = false;
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <Card className="farmer-dashboard-panel">
      <CardHeader>
        <div>
          <CardTitle>Loan readiness</CardTitle>
          <CardSub>The evidence lenders look at, and your latest checks</CardSub>
        </div>
        <Landmark size={21} aria-hidden="true" className="text-ink-green" />
      </CardHeader>
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Fact
          label="Financial history"
          value={
            summary
              ? `${summary.monthsWithRecords} of ${summary.period.months} months`
              : '—'
          }
          hint="months with records in this period"
        />
        <Fact
          label="Verified entries"
          value={evidence ? `${Number(evidence.verifiedShare)}%` : '—'}
          hint={evidence ? `${evidence.verified} of ${evidence.total} entries` : undefined}
        />
        <Fact label="Ghana Card" value={identity ? IDENTITY[identity] : '—'} />
        <Fact
          label="Recorded loans owed"
          value={summary ? formatGHS(Number(summary.obligations.outstanding)) : '—'}
          hint="as you recorded them"
        />
      </dl>

      <div className="mt-5">
        <p className="text-text text-sm font-semibold">Your latest eligibility checks</p>
        {checks === null ? null : checks.length === 0 ? (
          <p className="text-text-dim mt-1 text-sm">
            Open a lender’s loan product and use “Check your eligibility” to see what its stated
            requirements need from your records.
          </p>
        ) : (
          <ul className="divide-border mt-2 divide-y">
            {checks.slice(0, 3).map((check) => (
              <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 text-sm">
                  <span className="text-text font-semibold">{check.productName}</span>
                  <span className="text-text-mute"> · {check.lenderName}</span>
                  <span className="text-text-mute block text-xs">
                    {formatGHS(Number(check.amount))} over {check.months} months · checked{' '}
                    {formatGhanaDate(check.createdAt)}
                  </span>
                </span>
                <Badge color={OUTCOME_COLOR[check.outcome]}>{check.outcomeLabel}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-text-mute text-xs">
          Preliminary checks only. Each lender makes its own decision.
        </p>
        <Link
          href="/loans?tab=lenders"
          className="text-ink-green inline-flex items-center gap-1 text-sm font-semibold hover:underline"
        >
          See lenders <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  );
}

function Fact({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-border rounded-xl border p-3">
      <dt className="text-text-mute text-xs">{label}</dt>
      <dd className="text-text mt-0.5 text-sm font-semibold">{value}</dd>
      {hint && <dd className="text-text-mute text-[11px]">{hint}</dd>}
    </div>
  );
}
