'use client';

import { Check, Clock, IdCard, MapPin, Smartphone, Sprout, X, type LucideIcon } from 'lucide-react';
import { InitialsAvatar } from '@/components/admin/shared/initials-avatar';
import { RiskTag } from '@/components/admin/risk/risk-tag';
import { bandTone, MAX_SCORE } from '@/lib/admin/score-tone';
import { scoreLabel } from '@/lib/calculations/credit-score';
import { cn } from '@/lib/utils';
import type { CheckView } from '@/lib/admin/farmer-checks';
import type { CreditConfig, FarmerAccount, VerificationKind } from '@/types/admin';

export { checksOf, type CheckState, type CheckView } from '@/lib/admin/farmer-checks';

export const nameOf = (f: FarmerAccount) => f.profile.name || f.email;

/** "Afigya Kwabre North, Ashanti" (the constituency, then the region). */
export const farmPlace = (f: FarmerAccount) =>
  [f.profile.constituency, f.profile.region].filter(Boolean).join(', ');

/** Avatar, name (with the risk tag) and email. */
export function FarmerCell({ farmer }: { farmer: FarmerAccount }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <InitialsAvatar name={nameOf(farmer)} />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="text-text truncate font-semibold">{nameOf(farmer)}</span>
          <RiskTag count={farmer.riskConfirmed} />
        </span>
        <span className="text-text-mute block truncate text-xs">{farmer.email}</span>
      </span>
    </span>
  );
}

/** The farm's place over its crops. */
export function FarmCropsCell({ farmer }: { farmer: FarmerAccount }) {
  const crops = farmer.profile.primaryCrops;
  const place = farmPlace(farmer);
  return (
    <span className="block min-w-0">
      <span title={place} className="text-text block truncate">
        {place || <span className="text-text-mute">No farm location</span>}
      </span>
      <span
        title={crops.join(', ')}
        className="text-text-mute mt-0.5 flex min-w-0 items-center gap-1 text-xs"
      >
        <Sprout size={12} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{crops.length ? crops.join(', ') : 'No crops yet'}</span>
      </span>
    </span>
  );
}

/** The AgriCtec score (from the scoring rules, never recalculated here), its band and a bar. */
export function ScoreCell({
  farmer,
  bands,
}: {
  farmer: FarmerAccount;
  bands?: CreditConfig['bands'];
}) {
  const label = scoreLabel(farmer.stats.score, bands);
  const tone = bandTone(label);
  return (
    <span className="block">
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-text text-sm font-bold tabular-nums">{farmer.stats.score}</span>
        <span className={cn('rounded-md px-1.5 py-0.5 text-xs font-semibold', tone.pill)}>
          {label}
        </span>
      </span>
      <span aria-hidden="true" className="bg-glass-strong mt-1.5 block h-1 w-14 rounded-full">
        <span
          className={cn('block h-full rounded-full', tone.bar)}
          style={{ width: `${Math.min(100, (farmer.stats.score / MAX_SCORE) * 100)}%` }}
        />
      </span>
    </span>
  );
}

/**
 * How many records the farmer keeps. Never amounts: a farmer's money is confidential and is seen
 * only in Transactions review, one entry at a time, while it is being checked.
 */
export function RecordsCell({ farmer }: { farmer: FarmerAccount }) {
  const n = farmer.stats.records;
  return (
    <span className="text-text block font-semibold whitespace-nowrap tabular-nums">
      {n.toLocaleString()} record{n === 1 ? '' : 's'}
    </span>
  );
}

const KIND_ICON: Record<VerificationKind, LucideIcon> = {
  phone: Smartphone,
  location: MapPin,
  ghanaCard: IdCard,
};

/** Filled green when verified (a tick, or the pin for the farm location), gold while waiting. */
function CheckDot({ check }: { check: CheckView }) {
  const Icon =
    check.state === 'verified'
      ? check.kind === 'location'
        ? MapPin
        : Check
      : check.state === 'pending'
        ? Clock
        : check.state === 'rejected'
          ? X
          : KIND_ICON[check.kind];
  return (
    <span
      title={check.description}
      className={cn(
        'inline-flex size-5 items-center justify-center rounded-full',
        check.state === 'verified' && 'bg-accent text-white',
        check.state === 'pending' && 'bg-gold/20 text-ink-gold',
        check.state === 'rejected' && 'bg-danger/15 text-ink-red',
        check.state === 'missing' && 'border-border text-text-mute border bg-transparent',
      )}
    >
      <Icon size={11} strokeWidth={check.state === 'verified' ? 3 : 2} aria-hidden="true" />
      <span className="sr-only">{check.description}</span>
    </span>
  );
}

export function VerificationCell({ checks }: { checks: CheckView[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {checks.map((check) => (
        <CheckDot key={check.kind} check={check} />
      ))}
    </span>
  );
}

const STATUS_PILL: Record<FarmerAccount['status'], { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-accent/15 text-ink-green' },
  pending_verification: { label: 'Pending', className: 'bg-gold/15 text-ink-gold' },
  suspended: { label: 'Suspended', className: 'bg-danger/12 text-ink-red' },
};

/** Active, Pending or Suspended: the account status as stored. */
export function AccountPill({
  status,
  className,
}: {
  status: FarmerAccount['status'];
  className?: string;
}) {
  const pill = STATUS_PILL[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap',
        pill.className,
        className,
      )}
    >
      {pill.label}
    </span>
  );
}
