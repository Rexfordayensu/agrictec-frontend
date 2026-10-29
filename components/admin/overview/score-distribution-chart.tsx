'use client';

import Link from 'next/link';
import { Panel, PanelLink } from '@/components/admin/overview/panel';
import { useCan } from '@/hooks/admin/use-can';
import { scoreDistribution } from '@/lib/admin/analytics';
import { overviewKpis } from '@/lib/admin/overview';
import { bandTone } from '@/lib/admin/score-tone';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { CreditConfig } from '@/types/admin';

/**
 * Farmers per credit-score band as one segmented bar, with a legend that opens the farmers in
 * each band. Bands are the admin's (default 500 / 650 / 750).
 */
export function ScoreDistributionChart({
  bands,
  className,
}: {
  bands?: CreditConfig['bands'];
  className?: string;
}) {
  const farmers = useAdminDataStore((s) => s.farmers);
  const canCredit = useCan('credit.configure');
  const buckets = scoreDistribution(farmers, bands);
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const { averageScore } = overviewKpis(farmers, [], [], [], 'all');
  const averageBand = scoreLabel(averageScore, bands);
  const share = (count: number) => (total ? Math.round((count / total) * 100) : 0);

  return (
    <Panel
      title="Credit scores"
      description="All farmers, by score band"
      action={canCredit && <PanelLink href="/admin/credit-rules">Rules</PanelLink>}
      className={className}
    >
      <p className="flex items-baseline gap-2">
        <span className="font-display text-text text-3xl leading-none font-bold tabular-nums">
          {averageScore}
        </span>
        <span className={cn('text-sm font-semibold', bandTone(averageBand).text)}>
          {averageBand}
        </span>
        <span className="text-text-mute text-xs">average</span>
      </p>

      {/* One bar, a segment per band. */}
      <div
        role="img"
        aria-label={`Score bands: ${buckets.map((b) => `${b.band} ${b.count}`).join(', ')}`}
        className="bg-glass-strong mt-4 flex h-3 gap-0.5 overflow-hidden rounded-full"
      >
        {buckets.map((b) =>
          b.count ? (
            <span
              key={b.band}
              className={cn(
                'h-full first:rounded-l-full last:rounded-r-full',
                bandTone(b.band).bar,
              )}
              style={{ width: `${(b.count / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <ul className="mt-4 space-y-0.5">
        {buckets.map((b) => (
          <li key={b.band}>
            <Link
              href={`/admin/farmers?band=${b.band.toLowerCase()}`}
              className="hover:bg-glass-strong -mx-2 flex min-h-10 items-center gap-3 rounded-lg px-2 transition-colors"
            >
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-full', bandTone(b.band).bar)}
              />
              <span className="text-text text-sm">{b.band}</span>
              <span className="text-text-mute text-xs tabular-nums">{b.label}</span>
              <span className="text-text ml-auto text-sm font-semibold tabular-nums">
                {b.count}
              </span>
              <span className="text-text-mute w-10 text-right text-xs tabular-nums">
                {share(b.count)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
