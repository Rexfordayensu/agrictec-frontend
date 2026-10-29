import Link from 'next/link';
import { ArrowUpRight, Ban, CircleCheck, ShieldAlert, UserRound } from 'lucide-react';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { SeverityDot } from '@/components/admin/risk/risk-meta';
import { summarizeRisk } from '@/lib/admin/risk-rules';
import type { FarmerAccount, RiskFlag } from '@/types/admin';

const tile = 'border-border bg-glass min-w-0 rounded-2xl border px-4 py-3.5';
const label = 'text-text-mute flex items-center gap-1.5 text-xs font-semibold';
const value = 'font-display mt-1 text-2xl font-bold tabular-nums';

/**
 * Counts by severity (open flags) and by status, and the farmer most often flagged (open and
 * confirmed flags; dismissed ones don't count against anyone).
 */
export function RiskSummary({ flags, farmers }: { flags: RiskFlag[]; farmers: FarmerAccount[] }) {
  const { open, byStatus, mostFlagged } = summarizeRisk(flags);
  const top = mostFlagged ? farmers.find((f) => f.userId === mostFlagged.userId) : undefined;
  const totalOpen = open.high + open.medium + open.low;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className={tile}>
        <p className={label}>
          <ShieldAlert size={13} aria-hidden="true" />
          Open flags
        </p>
        <p className={`${value} ${open.high ? 'text-ink-red' : 'text-text'}`}>{totalOpen}</p>
        <ul aria-label="Open flags by severity" className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {(['high', 'medium', 'low'] as const).map((severity) => (
            <li key={severity} className="text-text-dim inline-flex items-center gap-1 text-xs">
              <SeverityDot severity={severity} />
              <span className="tabular-nums">
                {open[severity]} {severity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className={tile}>
        <p className={label}>
          <Ban size={13} aria-hidden="true" />
          Confirmed fraud
        </p>
        <p className={`${value} ${byStatus.confirmed ? 'text-ink-red' : 'text-text'}`}>
          {byStatus.confirmed}
        </p>
        <p className="text-text-mute mt-0.5 line-clamp-2 text-xs">Accounts show the Risk tag</p>
      </div>

      <div className={tile}>
        <p className={label}>
          <CircleCheck size={13} aria-hidden="true" />
          Dismissed
        </p>
        <p className={`${value} text-text`}>{byStatus.dismissed}</p>
        <p className="text-text-mute mt-0.5 line-clamp-2 text-xs">Checked and found genuine</p>
      </div>

      <div className={tile}>
        <p className={label}>
          <UserRound size={13} aria-hidden="true" />
          Most flagged
        </p>
        {top && mostFlagged ? (
          <Link
            href={`/admin/farmers/${top.userId}`}
            className="group mt-1.5 flex min-h-11 items-center gap-2.5 rounded-lg"
          >
            <InitialsAvatar name={top.profile.name || top.email} />
            <span className="min-w-0">
              <span className="text-text flex items-center gap-1 text-sm font-semibold group-hover:underline">
                <span className="truncate">{top.profile.name || top.email}</span>
                <ArrowUpRight size={13} aria-hidden="true" className="shrink-0" />
              </span>
              <span className="text-text-mute block text-xs tabular-nums">
                {mostFlagged.count} flag{mostFlagged.count === 1 ? '' : 's'}
              </span>
            </span>
          </Link>
        ) : (
          <p className="text-text-mute mt-2 text-sm">No one yet</p>
        )}
      </div>
    </div>
  );
}
