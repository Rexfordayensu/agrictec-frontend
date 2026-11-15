'use client';

import {
  BadgeCheck,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock,
  Gauge,
  Smartphone,
} from 'lucide-react';
import { KpiCard } from '@/components/admin/shared/kpi-card';
import type { TabProps } from '@/components/admin/farmers/detail/types';
import { Card, CardHeader, CardSub, CardTitle } from '@/components/ui/card';
import { buildReadiness } from '@/lib/calculations/readiness';
import { cn } from '@/lib/utils';

const count = (counts: Record<string, number> | undefined, ...keys: string[]) =>
  keys.reduce((sum, key) => sum + (counts?.[key] ?? 0), 0);

/**
 * Counts, the score and the readiness checklist. A farmer's amounts are confidential: the
 * console never receives them (Transactions review shows one entry at a time while checking it).
 */
export function OverviewTab({ data }: TabProps) {
  const { account, creditConfig, transactionStatusCounts: counts } = data.detail;
  // The same checklist the farmer sees on their dashboard, from the counts.
  const readiness = buildReadiness({
    records: { length: account.stats.records },
    momo: { length: account.stats.momo },
    profile: account.profile,
    minRecords: creditConfig.eligibility.minRecords,
    cardUnderReview: Boolean(
      data.verifications?.some((v) => v.kind === 'ghanaCard' && v.status === 'pending'),
    ),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Farm records" icon={ClipboardList} value={String(account.stats.records)} />
        <KpiCard label="MoMo entries" icon={Smartphone} value={String(account.stats.momo)} />
        <KpiCard
          label="Verified with evidence"
          icon={BadgeCheck}
          value={String(count(counts, 'verified'))}
        />
        <KpiCard
          label="Waiting for review"
          icon={Clock}
          value={String(count(counts, 'verification_pending', 'disputed'))}
        />
        <KpiCard label="AgriCtec score" icon={Gauge} value={String(account.stats.score)} />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Loan readiness</CardTitle>
            <CardSub>
              What the farmer sees on their dashboard. Amounts stay private: entries are checked one
              at a time in Transactions review.
            </CardSub>
          </div>
        </CardHeader>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {readiness.map((item) => {
            const Icon = item.done ? CheckCircle2 : Circle;
            return (
              <li key={item.key} className="flex items-start gap-2.5">
                <Icon
                  size={18}
                  aria-hidden="true"
                  className={cn('mt-0.5 shrink-0', item.done ? 'text-ink-green' : 'text-text-mute')}
                />
                <span>
                  <span className="text-text block text-sm font-semibold">
                    {item.label}
                    <span className="sr-only">{item.done ? ' (done)' : ' (to do)'}</span>
                  </span>
                  <span className="text-text-mute block text-xs">{item.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
