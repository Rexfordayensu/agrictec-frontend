import { Badge, type BadgeColor } from '@/components/ui/badge';
import { LOAN_STATUS_LABELS } from '@/lib/admin/loan-status';
import type {
  AccountStatus,
  AdminUser,
  LoanStatus,
  RiskFlag,
  VerificationRequest,
} from '@/types/admin';
import { announcementState, type AnnouncementState } from '@/lib/admin/announcements';

export type { AnnouncementState };

/** Every status the console shows, by kind. */
export interface StatusKinds {
  account: AccountStatus;
  verification: VerificationRequest['status'];
  loan: LoanStatus;
  risk: RiskFlag['status'];
  severity: RiskFlag['severity'];
  announcement: AnnouncementState;
  admin: AdminUser['status'];
}
export type StatusKind = keyof StatusKinds;

interface StatusStyle {
  label: string;
  color: BadgeColor;
}

/** The single map from a status to its colour and label (lists, detail modals and detail pages). */
export const STATUS_STYLES: { [K in StatusKind]: Record<StatusKinds[K], StatusStyle> } = {
  account: {
    active: { label: 'Active', color: 'green' },
    suspended: { label: 'Suspended', color: 'red' },
    pending_verification: { label: 'Pending verification', color: 'gold' },
  },
  verification: {
    pending: { label: 'Pending', color: 'gold' },
    approved: { label: 'Approved', color: 'green' },
    rejected: { label: 'Rejected', color: 'red' },
  },
  loan: {
    submitted: { label: LOAN_STATUS_LABELS.submitted, color: 'blue' },
    under_review: { label: LOAN_STATUS_LABELS.under_review, color: 'gold' },
    approved: { label: LOAN_STATUS_LABELS.approved, color: 'green' },
    rejected: { label: LOAN_STATUS_LABELS.rejected, color: 'red' },
    disbursed: { label: LOAN_STATUS_LABELS.disbursed, color: 'purple' },
    repaid: { label: LOAN_STATUS_LABELS.repaid, color: 'green' },
    defaulted: { label: LOAN_STATUS_LABELS.defaulted, color: 'red' },
  },
  // Open needs a decision (gold); confirmed fraud is red, like the farmer's "Risk" tag.
  risk: {
    open: { label: 'Open', color: 'gold' },
    dismissed: { label: 'Dismissed', color: 'green' },
    confirmed: { label: 'Confirmed', color: 'red' },
  },
  severity: {
    high: { label: 'High', color: 'red' },
    medium: { label: 'Medium', color: 'gold' },
    low: { label: 'Low', color: 'blue' },
  },
  announcement: {
    live: { label: 'Live', color: 'green' },
    scheduled: { label: 'Scheduled', color: 'blue' },
    ended: { label: 'Ended', color: 'gold' },
    off: { label: 'Off', color: 'red' },
  },
  admin: {
    active: { label: 'Active', color: 'green' },
    disabled: { label: 'Disabled', color: 'red' },
  },
};

export function statusStyle<K extends StatusKind>(kind: K, status: StatusKinds[K]): StatusStyle {
  return STATUS_STYLES[kind][status];
}

// The life cycle lives in lib/admin/announcements.ts (shared with the service and the list).
export { announcementState };

export function StatusBadge<K extends StatusKind>({
  kind,
  status,
  className,
}: {
  kind: K;
  status: StatusKinds[K];
  className?: string;
}) {
  const style = statusStyle(kind, status);
  return (
    <Badge color={style.color} className={className}>
      {style.label}
    </Badge>
  );
}
