import { AlertTriangle, BadgeCheck, Banknote, HandCoins } from 'lucide-react';
import { StatTile } from '@/components/admin/shared/stat-tile';
import { APPROVED_LOAN_STATUSES } from '@/lib/admin/loan-status';
import { loanStats } from '@/lib/admin/loan-pipeline';
import { formatCompactGHS } from '@/lib/format';
import type { LoanApplication } from '@/types/admin';

/** Total requested, approved and disbursed amounts, and the default rate of closed loans. */
export function LoanStats({ applications }: { applications: LoanApplication[] }) {
  const stats = loanStats(applications);
  const approvedCount = applications.filter((a) =>
    APPROVED_LOAN_STATUSES.includes(a.status),
  ).length;
  const defaulted = applications.filter((a) => a.status === 'defaulted').length;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        icon={HandCoins}
        label="Total requested"
        value={formatCompactGHS(stats.totalRequested)}
        hint={`${applications.length} application${applications.length === 1 ? '' : 's'}`}
      />
      <StatTile
        icon={BadgeCheck}
        label="Approved amount"
        value={formatCompactGHS(stats.approvedAmount)}
        hint={`${approvedCount} approved`}
      />
      <StatTile
        icon={Banknote}
        label="Disbursed amount"
        value={formatCompactGHS(stats.disbursedAmount)}
        hint="Disbursed, repaid or defaulted"
      />
      <StatTile
        icon={AlertTriangle}
        label="Default rate"
        value={stats.defaultRate === null ? '—' : `${Math.round(stats.defaultRate * 100)}%`}
        hint={
          stats.closed
            ? `${defaulted} of ${stats.closed} closed loan${stats.closed === 1 ? '' : 's'}`
            : 'No closed loans yet'
        }
        tone={stats.defaultRate !== null && stats.defaultRate > 0.2 ? 'danger' : undefined}
      />
    </div>
  );
}
