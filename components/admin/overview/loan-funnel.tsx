'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Ban, CircleAlert } from 'lucide-react';
import { MeterBar, Panel, PanelLink } from '@/components/admin/overview/panel';
import { useCan } from '@/hooks/admin/use-can';
import { DATE_RANGES, loanStageReach, type DateRange } from '@/lib/admin/overview';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';

/** Each stage's bar steps down in strength, so the drop-off reads at a glance (flat colours). */
const STAGE_BAR = ['bg-purple', 'bg-purple/85', 'bg-purple/70', 'bg-purple/55', 'bg-purple/40'];

/**
 * How far applications made in the period got: Submitted → Under review → Approved →
 * Disbursed → Repaid (from each application's history), with the conversion between steps.
 * Rejected and defaulted are counted beside the path. Each row opens the filtered list.
 */
export function LoanFunnel({ range, className }: { range: DateRange; className?: string }) {
  const apps = useAdminDataStore((s) => s.applications);
  const canLoans = useCan('loans.view');
  const { stages, rejected, defaulted, total } = loanStageReach(apps, range);
  const max = Math.max(1, stages[0]?.reached ?? 0);
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.label.toLowerCase() ?? '';
  const completion = total ? Math.round(((stages.at(-1)?.reached ?? 0) / total) * 100) : 0;

  const row = (href: string, children: ReactNode, key: string) =>
    canLoans ? (
      <Link
        key={key}
        href={href}
        className="hover:bg-glass-strong -mx-2 grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem_3.5rem] items-center gap-3 rounded-lg px-2 py-2 transition-colors"
      >
        {children}
      </Link>
    ) : (
      <div
        key={key}
        className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_3rem_3.5rem] items-center gap-3 py-2"
      >
        {children}
      </div>
    );

  return (
    <Panel
      title="Loan pipeline"
      description={`${total} application${total === 1 ? '' : 's'} made ${rangeLabel}`}
      action={canLoans && <PanelLink href="/admin/loans">Open pipeline</PanelLink>}
      className={className}
    >
      <ol aria-label="Stages reached">
        {stages.map((stage, index) => (
          <li key={stage.status}>
            {row(
              `/admin/loans?status=${stage.status}`,
              <>
                <span className="text-text truncate text-sm">{stage.label}</span>
                <MeterBar
                  value={stage.reached}
                  max={max}
                  barClassName={STAGE_BAR[index] ?? 'bg-purple/40'}
                />
                <span className="text-text text-right text-sm font-semibold tabular-nums">
                  {stage.reached}
                </span>
                <span className="text-text-mute text-right text-xs tabular-nums">
                  {index === 0 ? '100%' : stage.conversion === null ? '—' : `${stage.conversion}%`}
                  <span className="sr-only">
                    {index === 0 ? ' started' : ' of the previous stage'}
                  </span>
                </span>
              </>,
              stage.status,
            )}
          </li>
        ))}
      </ol>

      <div className="border-border mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-4 text-xs">
        <p className="text-text-mute">
          <span className="text-text font-semibold">{completion}%</span> repaid in full
        </p>
        {(
          [
            ['rejected', 'Rejected', rejected, Ban],
            ['defaulted', 'Defaulted', defaulted, CircleAlert],
          ] as const
        ).map(([status, label, count, Icon]) => {
          const content = (
            <>
              <Icon size={13} aria-hidden="true" />
              {label}
              <span className="text-text font-semibold tabular-nums">{count}</span>
            </>
          );
          const style = cn(
            'inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2',
            count ? 'text-ink-red' : 'text-text-mute',
          );
          return canLoans ? (
            <Link
              key={status}
              href={`/admin/loans?status=${status}`}
              className={cn(style, 'hover:bg-glass-strong transition-colors')}
            >
              {content}
            </Link>
          ) : (
            <span key={status} className={style}>
              {content}
            </span>
          );
        })}
        <p className="text-text-mute ml-auto hidden sm:block">% = share of the previous stage</p>
      </div>
    </Panel>
  );
}
