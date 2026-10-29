'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  BadgeCheck,
  ClipboardList,
  Gauge,
  Percent,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Sparkline } from '@/components/charts/sparkline';
import { useAdminRole } from '@/hooks/admin/use-can';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { DATE_RANGES, overviewKpis, type DateRange } from '@/lib/admin/overview';
import { can } from '@/lib/admin/permissions';
import { formatCompactGHS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAdminDataStore } from '@/store/admin/admin-data-store';
import type { CreditConfig, Permission } from '@/types/admin';

interface Kpi {
  key: string;
  label: string;
  icon: LucideIcon;
  value: string;
  hint: string;
  /** Colours the hint: something is waiting or wrong. */
  hintTone?: 'warn' | 'danger';
  /** % change vs the previous period (null: nothing to compare with). */
  delta?: number | null;
  /** Down is good (e.g. risk flags). */
  lowerIsBetter?: boolean;
  trend?: number[];
  href: string;
  /** The KPI shows only when the role can load its data… */
  needs: Permission;
  /** …and links only when the role can open the page. */
  linkNeeds: Permission;
}

/** "+12.5%" in a small green or red chip. */
function DeltaChip({ delta, lowerIsBetter }: { delta: number; lowerIsBetter?: boolean }) {
  const flat = delta === 0;
  const good = lowerIsBetter ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
        flat
          ? 'bg-glass-strong text-text-mute'
          : good
            ? 'bg-accent/12 text-ink-green'
            : 'bg-danger/12 text-ink-red',
      )}
    >
      {!flat && <Icon size={12} aria-hidden="true" />}
      {delta > 0 ? '+' : ''}
      {delta.toFixed(Math.abs(delta) < 10 ? 1 : 0)}%
      <span className="sr-only"> versus the previous period</span>
    </span>
  );
}

/**
 * The platform's key figures in one panel, split by hairlines (no card-per-number clutter).
 * Each cell opens the page behind it. Deltas compare the period with the one before it.
 */
export function KpiGrid({ range, bands }: { range: DateRange; bands?: CreditConfig['bands'] }) {
  const role = useAdminRole();
  const farmers = useAdminDataStore((s) => s.farmers);
  const applications = useAdminDataStore((s) => s.applications);
  const riskFlags = useAdminDataStore((s) => s.riskFlags);
  const verifications = useAdminDataStore((s) => s.verifications);
  const k = overviewKpis(farmers, applications, riskFlags, verifications, range);
  const rangeLabel = DATE_RANGES.find((r) => r.value === range)?.short ?? '';

  const kpis: Kpi[] = [
    {
      key: 'farmers',
      label: 'Farmers',
      icon: Users,
      value: k.totalFarmers.toLocaleString(),
      hint: `+${k.newInRange} ${rangeLabel}`,
      delta: k.newDelta,
      trend: k.farmersTrend,
      href: '/admin/farmers',
      needs: 'farmers.view',
      linkNeeds: 'farmers.view',
    },
    {
      key: 'active',
      label: 'Active, 30 days',
      icon: UserCheck,
      value: k.active30.toLocaleString(),
      hint: `${k.activeShare}% of farmers`,
      href: '/admin/farmers?active=30',
      needs: 'farmers.view',
      linkNeeds: 'farmers.view',
    },
    {
      key: 'score',
      label: 'Average score',
      icon: Gauge,
      value: String(k.averageScore),
      hint: k.totalFarmers ? `${scoreLabel(k.averageScore, bands)} band` : 'No farmers yet',
      href: '/admin/credit-rules',
      needs: 'farmers.view',
      linkNeeds: 'credit.configure',
    },
    {
      key: 'income',
      label: 'Income tracked',
      icon: Wallet,
      value: formatCompactGHS(k.incomeTracked),
      hint: `${k.earningFarmers} earning farmers`,
      href: '/admin/reports',
      needs: 'farmers.view',
      linkNeeds: 'reports.export',
    },
    {
      key: 'loans',
      label: 'Loans requested',
      icon: ClipboardList,
      value: formatCompactGHS(k.loanRequested),
      hint: `${k.loanCount} application${k.loanCount === 1 ? '' : 's'} ${rangeLabel}`,
      delta: k.loanDelta,
      trend: k.loanTrend,
      href: '/admin/loans',
      needs: 'loans.view',
      linkNeeds: 'loans.view',
    },
    {
      key: 'approval',
      label: 'Approval rate',
      icon: Percent,
      value: k.approvalRate === null ? '—' : `${k.approvalRate}%`,
      hint: k.decidedCount ? `${k.approvedCount} of ${k.decidedCount} decided` : 'None decided',
      href: '/admin/loans?status=approved',
      needs: 'loans.view',
      linkNeeds: 'loans.view',
    },
    {
      key: 'verifications',
      label: 'Verifications waiting',
      icon: BadgeCheck,
      value: String(k.pendingVerifications),
      hint:
        k.oldestPendingDays === null
          ? 'Queue is clear'
          : `Oldest ${k.oldestPendingDays} day${k.oldestPendingDays === 1 ? '' : 's'}`,
      hintTone: (k.oldestPendingDays ?? 0) >= 3 ? 'warn' : undefined,
      href: '/admin/verifications',
      needs: 'verifications.review',
      linkNeeds: 'verifications.review',
    },
    {
      key: 'risk',
      label: 'Open risk flags',
      icon: ShieldAlert,
      value: String(k.openFlags),
      hint: k.openHighFlags ? `${k.openHighFlags} high severity` : 'None high',
      hintTone: k.openHighFlags ? 'danger' : undefined,
      lowerIsBetter: true,
      href: '/admin/risk',
      needs: 'risk.review',
      linkNeeds: 'risk.review',
    },
  ];

  const visible = kpis.filter((kpi) => can(role, kpi.needs));
  // Full rows only: 4 across for 8 figures, 3 across for 6 (e.g. analysts).
  const columns = visible.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';

  return (
    <section
      aria-label="Key figures"
      className="border-border bg-glass overflow-hidden rounded-2xl border"
    >
      {/* Hairlines: every cell draws its top and left border; -m-px hides the outer ones. */}
      <div className={cn('-mt-px -ml-px grid grid-cols-2', columns)}>
        {visible.map((kpi) => {
          const Icon = kpi.icon;
          const linked = can(role, kpi.linkNeeds);
          const hasDelta =
            kpi.delta !== undefined && kpi.delta !== null && Number.isFinite(kpi.delta);
          const body = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-mute flex min-w-0 items-center gap-2 text-xs font-medium">
                  <Icon size={14} aria-hidden="true" className="shrink-0" />
                  <span className="truncate">{kpi.label}</span>
                </span>
                {linked && (
                  <ArrowUpRight
                    size={14}
                    aria-hidden="true"
                    className="text-text-mute shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                )}
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="font-display text-text text-2xl leading-none font-bold whitespace-nowrap tabular-nums sm:text-[28px]">
                  {kpi.value}
                </p>
                {kpi.trend && kpi.trend.length > 1 && (
                  <Sparkline
                    data={kpi.trend}
                    fill="none"
                    ariaLabel={`${kpi.label}, last 12 months`}
                    className="text-ink-purple hidden h-7 w-20 min-w-0 shrink sm:block"
                  />
                )}
              </div>
              <div className="flex min-w-0 items-center gap-2 text-xs">
                {hasDelta && <DeltaChip delta={kpi.delta!} lowerIsBetter={kpi.lowerIsBetter} />}
                <span
                  className={cn(
                    'truncate',
                    kpi.hintTone === 'danger'
                      ? 'text-ink-red font-semibold'
                      : kpi.hintTone === 'warn'
                        ? 'text-ink-gold font-semibold'
                        : 'text-text-mute',
                  )}
                >
                  {kpi.hint}
                </span>
              </div>
            </>
          );
          const cell = 'border-border flex min-w-0 flex-col gap-3 border-t border-l p-4 sm:p-5';
          return linked ? (
            <Link
              key={kpi.key}
              href={kpi.href}
              className={cn(cell, 'group hover:bg-glass-strong transition-colors')}
            >
              {body}
            </Link>
          ) : (
            <div key={kpi.key} className={cell}>
              {body}
            </div>
          );
        })}
      </div>
    </section>
  );
}
