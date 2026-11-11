import { Badge, type BadgeColor } from '@/components/ui/badge';
import { formatGhanaDate } from '@/lib/format';
import { LICENCE_LABELS, PUBLICATION_LABELS } from '@/lib/lenders';
import type { AdminLender, LicenceStatus, PublicationStatus } from '@/types/admin';

const PUBLICATION_COLORS: Record<PublicationStatus, BadgeColor> = {
  draft: 'blue',
  published: 'green',
  unpublished: 'gold',
  suspended: 'red',
};

const LICENCE_COLORS: Record<LicenceStatus, BadgeColor> = {
  unverified: 'gold',
  verified: 'green',
  expired: 'red',
  revoked: 'red',
};

export function PublicationBadge({ status }: { status: PublicationStatus }) {
  return <Badge color={PUBLICATION_COLORS[status]}>{PUBLICATION_LABELS[status]}</Badge>;
}

export function LicenceBadge({ lender }: { lender: AdminLender }) {
  if (lender.licenceStatus === 'verified' && lender.reviewDue)
    return <Badge color="gold">Review due</Badge>;
  return (
    <Badge color={LICENCE_COLORS[lender.licenceStatus]}>
      {LICENCE_LABELS[lender.licenceStatus]}
    </Badge>
  );
}

/** "Checked 3 Nov 2026 · expires 3 Nov 2027", or what is missing. */
export function licenceLine(lender: AdminLender): string {
  if (!lender.verifiedAt) return 'No licence check recorded';
  const checked = `Checked ${formatGhanaDate(lender.verifiedAt)}`;
  return lender.verificationExpiresAt
    ? `${checked} · valid until ${formatGhanaDate(lender.verificationExpiresAt)}`
    : checked;
}
